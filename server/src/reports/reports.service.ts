import { Injectable, NotFoundException, ForbiddenException, BadRequestException, StreamableFile, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { promises as fs } from 'fs';
import { isAbsolute, join } from 'path';
import { createReadStream } from 'fs';
import { AnalyticsService } from '../analytics/analytics.service';
import { AnalyticsFilters } from '../analytics/filters.dto';
import { PdfService } from '../invoices/pdf.service';
import { ActionLogsService } from '../action-logs/action-logs.service';
import {
  REPORT_CATALOG, getReportDef, reportAllowedForUser, ReportDef, ReportPayload,
} from './reports.catalog';
import { localizeText, localizePayload } from './reports-i18n';
import { buildReportWorkbook } from './excel-export';
import { renderReportHtml } from './pdf-renderer';
import { SavedReport } from './saved-report.entity';
import { ReportHistory } from './report-history.entity';
import { ScheduledReport } from './scheduled-report.entity';

export interface GenerateOptions {
  reportKey: string;
  filters?: any;
  format?: 'xlsx' | 'pdf';
  locale?: string;
  name?: string;
  /** Internal (cron/scheduler) generation: skips the role re-check,
   *  since access was already verified when the schedule was created. */
  system?: boolean;
}

const UPLOADS_ROOT = join(process.cwd(), 'uploads');
const REPORTS_DIR = join(UPLOADS_ROOT, 'reports');

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly analytics: AnalyticsService,
    private readonly pdf: PdfService,
    private readonly actionLogs: ActionLogsService,
    @InjectRepository(SavedReport) private readonly savedRepo: Repository<SavedReport>,
    @InjectRepository(ReportHistory) private readonly historyRepo: Repository<ReportHistory>,
    @InjectRepository(ScheduledReport) private readonly scheduleRepo: Repository<ScheduledReport>,
    private readonly dataSource: DataSource,
  ) {}

  // -------------------------------------------------------------------------
  // Catalogue
  // -------------------------------------------------------------------------
  getCatalog(role?: string, locale?: string) {
    return REPORT_CATALOG
      .filter((d) => reportAllowedForUser(d, role))
      .map((d) => ({
        key: d.key,
        name: localizeText(d.name, locale),
        description: localizeText(d.description, locale),
        section: d.section,
      }));
  }

  resolveDef(reportKey: string, role?: string, system = false): ReportDef {
    const def = getReportDef(reportKey);
    if (!def) throw new NotFoundException(`Unknown report '${reportKey}'`);
    if (!system && !reportAllowedForUser(def, role)) throw new ForbiddenException('You do not have access to this report');
    return def;
  }

  // -------------------------------------------------------------------------
  // Preview + generation
  // -------------------------------------------------------------------------
  async preview(opts: GenerateOptions, user?: any): Promise<ReportPayload> {
    const def = this.resolveDef(opts.reportKey, user?.role, opts.system);
    const filters = (opts.filters || {}) as AnalyticsFilters;
    const payload = await def.build(this.analytics, filters, user);
    const logo = await this.resolveLogoDataUri();
    if (logo) payload.companyLogo = logo;
    return localizePayload(payload, opts.locale);
  }

  async generate(opts: GenerateOptions, user?: any) {
    const def = this.resolveDef(opts.reportKey, user?.role, opts.system);
    const format = opts.format === 'pdf' ? 'pdf' : 'xlsx';
    const parts = opts.filters || {};
    try {
      const payload = await def.build(this.analytics, parts as AnalyticsFilters, user);
      const logo = await this.resolveLogoDataUri();
      if (logo) payload.companyLogo = logo;
      localizePayload(payload, opts.locale);

      await fs.mkdir(REPORTS_DIR, { recursive: true });

      const id = crypto.randomUUID();
      const stamp = payload.generatedAt.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `${def.key}_${stamp}.${format}`;
      const relPath = `reports/${fileName}`;
      const absPath = join(REPORTS_DIR, fileName);

      if (format === 'xlsx') {
        const browser: any = typeof (this.pdf as any).getBrowser === 'function'
          ? await (this.pdf as any).getBrowser()
          : undefined;
        const wb = await buildReportWorkbook(payload, browser, opts.locale);
        await wb.xlsx.writeFile(absPath);
      } else {
        const html = renderReportHtml(payload, opts.locale);
        const buf = await this.pdf.generatePdfFromHtml(html);
        await fs.writeFile(absPath, buf);
      }

      const record = await this.historyRepo.save(this.historyRepo.create({
        companyId: user?.companyId ?? null,
        userId: user?.id ?? null,
        reportKey: def.key,
        reportName: opts.name || def.name,
        filters: parts,
        format,
        status: 'generated',
        filePath: relPath,
        fileName,
        locale: opts.locale || 'en',
      }));

      await this.actionLogs.logAction(
        'report', record.id, 'REPORT_GENERATED', user,
        { reportKey: def.key, format, fileName }, user?.companyId,
      ).catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

      return {
        historyId: record.id,
        fileName,
        format,
        reportKey: def.key,
        reportName: def.name,
        downloadUrl: `/api/reports/history/${record.id}/download`,
        generatedAt: payload.generatedAt,
        payload,
      };
    } catch (err) {
      const msg = (err as Error)?.message || 'Unknown error';
      this.logger.error(`Report ${def.key} generation failed: ${msg}`);
      await this.historyRepo.save(this.historyRepo.create({
        companyId: user?.companyId ?? null,
        userId: user?.id ?? null,
        reportKey: def.key,
        reportName: opts.name || def.name,
        filters: parts,
        format,
        status: 'failed',
        error: msg,
        locale: opts.locale || 'en',
      })).catch(() => undefined);
      throw new BadRequestException(`Report generation failed: ${msg}`);
    }
  }

  // -------------------------------------------------------------------------
  // History + download
  // -------------------------------------------------------------------------
  async listHistory(user?: any) {
    const q: any = {};
    if (user?.companyId) q.companyId = user.companyId;
    return this.historyRepo.find({ where: q, order: { generatedAt: 'DESC' }, take: 100 });
  }

  async getHistory(id: string, user?: any) {
    const rec = await this.historyRepo.findOne({ where: { id } });
    if (!rec) throw new NotFoundException('Report record not found');
    if (user?.companyId && rec.companyId && rec.companyId !== user.companyId) {
      throw new ForbiddenException('Access to this report record is restricted');
    }
    return rec;
  }

  getHistoryStream(rec: ReportHistory): StreamableFile {
    if (!rec.filePath) throw new NotFoundException('Report file not generated');
    const abs = join(UPLOADS_ROOT, rec.filePath);
    const ext = rec.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const stream = createReadStream(abs);
    return new StreamableFile(stream, {
      type: ext,
      disposition: `attachment; filename="${rec.fileName || `report.${rec.format}`}"`,
    });
  }

  // -------------------------------------------------------------------------
  // Saved report configurations
  // -------------------------------------------------------------------------
  async listSaved(user?: any) {
    const q: any = {};
    if (user?.companyId) q.companyId = user.companyId;
    if (user?.id) q.userId = user.id;
    return this.savedRepo.find({ where: q, order: { createdAt: 'DESC' } });
  }

  async saveReportConfig(body: { name: string; reportKey: string; filters?: any; format?: string; locale?: string }, user?: any) {
    if (!body.name?.trim() || !body.reportKey) throw new BadRequestException('name and reportKey are required');
    return this.savedRepo.save(this.savedRepo.create({
      companyId: user?.companyId ?? null,
      userId: user?.id ?? null,
      name: body.name,
      reportKey: body.reportKey,
      filters: body.filters || {},
      format: body.format === 'pdf' ? 'pdf' : 'xlsx',
      locale: body.locale || 'en',
    }));
  }

  async updateSaved(id: string, body: any) {
    const rec = await this.savedRepo.findOne({ where: { id } });
    if (!rec) throw new NotFoundException('Saved report not found');
    if (body.name !== undefined) rec.name = body.name;
    if (body.filters !== undefined) rec.filters = body.filters;
    if (body.format !== undefined) rec.format = body.format === 'pdf' ? 'pdf' : 'xlsx';
    if (body.locale !== undefined) rec.locale = body.locale;
    return this.savedRepo.save(rec);
  }

  async deleteSaved(id: string) {
    await this.savedRepo.delete({ id });
    return { ok: true };
  }

  // -------------------------------------------------------------------------
  // Scheduled reports
  // -------------------------------------------------------------------------
  async listScheduled(user?: any) {
    const q: any = {};
    if (user?.companyId) q.companyId = user.companyId;
    if (user?.id) q.userId = user.id;
    return this.scheduleRepo.find({ where: q, order: { createdAt: 'DESC' } });
  }

  async createSchedule(body: any, user?: any) {
    const def = this.resolveDef(body.reportKey, user?.role);
    const nextRunAt = this.nextRun(body.frequency || 'weekly');
    return this.scheduleRepo.save(this.scheduleRepo.create({
      companyId: user?.companyId ?? null,
      userId: user?.id ?? null,
      name: body.name || def.name,
      reportKey: def.key,
      filters: body.filters || {},
      format: body.format === 'pdf' ? 'pdf' : 'xlsx',
      frequency: ['daily', 'weekly', 'monthly'].includes(body.frequency) ? body.frequency : 'weekly',
      recipients: Array.isArray(body.recipients) ? body.recipients : [],
      active: body.active !== false,
      locale: body.locale || 'en',
      nextRunAt,
      lastRunAt: null,
    }));
  }

  async updateSchedule(id: string, body: any) {
    const rec = await this.scheduleRepo.findOne({ where: { id } });
    if (!rec) throw new NotFoundException('Scheduled report not found');
    if (body.name !== undefined) rec.name = body.name;
    if (body.filters !== undefined) rec.filters = body.filters;
    if (body.format !== undefined) rec.format = body.format === 'pdf' ? 'pdf' : 'xlsx';
    if (body.frequency !== undefined) rec.frequency = ['daily', 'weekly', 'monthly'].includes(body.frequency) ? body.frequency : rec.frequency;
    if (body.locale !== undefined) rec.locale = body.locale;
    if (body.recipients !== undefined) rec.recipients = Array.isArray(body.recipients) ? body.recipients : [];
    if (body.active !== undefined) rec.active = body.active !== false;
    return this.scheduleRepo.save(rec);
  }

  async deleteSchedule(id: string) {
    await this.scheduleRepo.delete({ id });
    return { ok: true };
  }

  async runScheduleNow(id: string, user?: any) {
    const rec = await this.scheduleRepo.findOne({ where: { id } });
    if (!rec) throw new NotFoundException('Scheduled report not found');
    await this.generate(
      {
        reportKey: rec.reportKey,
        filters: rec.filters || {},
        format: rec.format === 'pdf' ? 'pdf' : 'xlsx',
        name: rec.name,
        locale: rec.locale || 'en',
        system: true,
      },
      { id: rec.userId || user?.id, companyId: rec.companyId ?? user?.companyId, role: user?.role },
    );
    rec.lastRunAt = new Date();
    rec.nextRunAt = this.nextRun(rec.frequency);
    return this.scheduleRepo.save(rec);
  }

  // -------------------------------------------------------------------------
  // Cron entry point
  // -------------------------------------------------------------------------
  async runDueSchedules(limit = 10): Promise<number> {
    const now = new Date();
    const due = await this.scheduleRepo.find({
      where: { active: true },
      take: limit,
    });
    let ran = 0;
    for (const rec of due) {
      if (rec.nextRunAt && rec.nextRunAt.getTime() > now.getTime()) continue;
      const schedulerUser = { id: rec.userId ?? '', companyId: rec.companyId };
      try {
        await this.generate({
          reportKey: rec.reportKey,
          filters: rec.filters || {},
          format: rec.format === 'pdf' ? 'pdf' : 'xlsx',
          name: rec.name,
          locale: rec.locale || 'en',
          system: true,
        }, schedulerUser);
        rec.lastRunAt = new Date();
        rec.lastErrorAt = null;
      } catch (err) {
        rec.lastErrorAt = new Date();
        rec.lastRunAt = new Date();
        this.logger.warn(`Scheduled report '${rec.name}' failed: ${(err as Error).message}`);
      }
      rec.nextRunAt = this.nextRun(rec.frequency);
      await this.scheduleRepo.save(rec).catch((e) => this.logger.warn(`schedule save failed: ${e.message}`));
      ran++;
    }
    return ran;
  }

  // -------------------------------------------------------------------------
  // Logo resolution (mirrors ResendService.getLogoUrl + excel/pdf embedding)
  // -------------------------------------------------------------------------
  private async resolveLogoSources(): Promise<string[]> {
    const candidates: string[] = [];
    try {
      const cms = await this.dataSource.query(`SELECT value FROM website_cms WHERE key = 'company_settings'`);
      if (cms && cms[0]?.value) {
        try {
          const parsed = JSON.parse(cms[0].value);
          if (parsed?.logo) candidates.push(String(parsed.logo));
          if (parsed?.companyLogoUrl) candidates.push(String(parsed.companyLogoUrl));
        } catch { /* ignore malformed JSON */ }
      }
      const cmsLogo = await this.dataSource.query(`SELECT value FROM website_cms WHERE key IN ('logo', 'company_logo', 'site_logo') AND value != '' LIMIT 1`);
      if (cmsLogo && cmsLogo[0]?.value) candidates.push(String(cmsLogo[0].value));
      const adminLogo = await this.dataSource.query(`SELECT "companyLogoUrl" FROM users WHERE role = 'admin' AND "companyLogoUrl" IS NOT NULL AND "companyLogoUrl" != '' LIMIT 1`);
      if (adminLogo && adminLogo[0]?.companyLogoUrl) candidates.push(String(adminLogo[0].companyLogoUrl));
      const anyLogo = await this.dataSource.query(`SELECT "companyLogoUrl" FROM users WHERE "companyLogoUrl" IS NOT NULL AND "companyLogoUrl" != '' LIMIT 1`);
      if (anyLogo && anyLogo[0]?.companyLogoUrl) candidates.push(String(anyLogo[0].companyLogoUrl));
    } catch { /* DB unavailable -> fall through */ }

    const unique = [...new Set(candidates)];
    const filtered = unique.filter((u) => typeof u === 'string' && u.trim().length > 0 && !u.includes('email-logo.png'));

    // The Settings page additionally mirrors the uploaded logo to
    // web/public/email-logo.png, so prefer that file directly when present.
    const localCandidates = [
      join(process.cwd(), '..', 'web', 'public', 'email-logo.png'),
      join(__dirname, '..', '..', '..', 'web', 'public', 'email-logo.png'),
      join(process.cwd(), 'web', 'public', 'email-logo.png'),
    ];
    for (const p of localCandidates) {
      try {
        const st = await fs.stat(p);
        if (st.isFile()) filtered.push(p);
      } catch { /* path does not exist */ }
    }

    if (filtered.length === 0) return [];
    return filtered;
  }

  private async resolveLogoDataUri(): Promise<string | null> {
    const sources = await this.resolveLogoSources();
    for (const url of sources) {
      try {
        if (url.startsWith('data:image/')) return url;

        let buffer: Buffer;
        let mime = 'image/png';
        if (/^https?:\/\//.test(url)) {
          const res = await fetch(url);
          if (!res.ok) continue;
          const arr = await res.arrayBuffer();
          buffer = Buffer.from(arr);
          const type = res.headers.get('content-type');
          if (type && type.toLowerCase().startsWith('image/')) mime = type.toLowerCase();
          return `data:${mime};base64,${buffer.toString('base64')}`;
        }

        // Local path. Absolute filesystem paths (e.g. the email-logo.png mirror
        // detected in resolveLogoSources) are read directly; '/...' web paths
        // are resolved relative to the repo roots.
        const candidates = isAbsolute(url)
          ? [url]
          : [process.cwd(), join(process.cwd(), '..'), join(__dirname, '..', '..', '..')]
              .map((root) => join(root, url.replace(/^[\\/]+/, '')));
        for (const file of candidates) {
          try {
            buffer = await fs.readFile(file);
            mime = file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg') ? 'image/jpeg'
              : file.toLowerCase().endsWith('.svg') ? 'image/svg+xml'
              : file.toLowerCase().endsWith('.webp') ? 'image/webp'
              : 'image/png';
            return `data:${mime};base64,${buffer.toString('base64')}`;
          } catch { /* try next root */ }
        }
      } catch { /* try next source */ }
    }
    return null;
  }

  private nextRun(frequency: string): Date {
    const now = new Date();
    const out = new Date(now);
    if (frequency === 'daily') out.setDate(out.getDate() + 1);
    else if (frequency === 'monthly') out.setMonth(out.getMonth() + 1);
    else out.setDate(out.getDate() + 7);
    out.setHours(6, 0, 0, 0);
    return out;
  }
}