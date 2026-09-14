import { Injectable, NotFoundException, ForbiddenException, BadRequestException, StreamableFile, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { promises as fs, existsSync } from 'fs';
import { isAbsolute, join } from 'path';
import { createReadStream } from 'fs';
import { AnalyticsService } from '../analytics/analytics.service';
import { AnalyticsFilters } from '../analytics/filters.dto';
import { PdfService } from '../invoices/pdf.service';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { UserRole } from '../users/user.entity';
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
  /** Exact company logo (data-URI) supplied by the client with the request. */
  logo?: string;
  /** Chart PNGs rasterised on the client (browser canvas), sent so Excel always
   *  gets real chart images even if the server cannot rasterise SVGs. */
  chartPngs?: { key: string; dataUrl: string }[];
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
    const logo = this.requestedLogo(opts) ?? await this.resolveLogoDataUri();
    if (logo) payload.companyLogo = logo;
    return localizePayload(payload, opts.locale);
  }

  async generate(opts: GenerateOptions, user?: any) {
    const def = this.resolveDef(opts.reportKey, user?.role, opts.system);
    const format = opts.format === 'pdf' ? 'pdf' : 'xlsx';
    const parts = opts.filters || {};
    try {
      const payload = await def.build(this.analytics, parts as AnalyticsFilters, user);
      const logo = this.requestedLogo(opts) ?? await this.resolveLogoDataUri();
      if (logo) payload.companyLogo = logo;
      this.persistReportLogo(logo).catch((e) => this.logger.warn(`Logo persist failed: ${e.message}`));
      if (Array.isArray(opts.chartPngs) && opts.chartPngs.length) {
        payload.chartPngs = opts.chartPngs.filter(
          (c) => c && typeof c.key === 'string' && typeof c.dataUrl === 'string' && c.dataUrl.startsWith('data:image/png;base64,'),
        );
      }
      localizePayload(payload, opts.locale);

      await fs.mkdir(REPORTS_DIR, { recursive: true });

      const id = crypto.randomUUID();
      const fileName = await this.buildExportFileName(def, opts, payload, format);
      const relPath = `reports/${fileName}`;
      const absPath = join(REPORTS_DIR, fileName);

      if (format === 'xlsx') {
        const wb = await buildReportWorkbook(payload, undefined, opts.locale);
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
    if (!existsSync(abs)) throw new NotFoundException(`Report file missing on this instance: ${rec.filePath}`);
    const ext = rec.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const fallbackName = `report.${rec.format}`;
    const safeName = String(rec.fileName || fallbackName).replace(/"/g, "'");
    const stream = createReadStream(abs);
    stream.on('error', (err: any) => {
      this.logger.error(`Download ${rec.id} failed: ${err?.message} (${abs})`);
    });
    return new StreamableFile(stream, {
      type: ext,
      disposition: `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    });
  }

  // On container platforms (Railway/Render) local storage is ephemeral and can
  // be split across multiple instances, so a stored report file can be missing
  // when the download request lands on another instance. Regenerate on the fly.
  async ensureHistoryStream(rec: ReportHistory): Promise<StreamableFile> {
    const abs = rec.filePath ? join(UPLOADS_ROOT, rec.filePath) : '';
    if (rec.filePath && existsSync(abs)) return this.getHistoryStream(rec);
    if (rec.reportKey) {
      try {
        this.logger.warn(`Report file missing for history ${rec.id}, regenerating…`);
        const res = await this.generate(
          {
            reportKey: rec.reportKey,
            filters: rec.filters || {},
            format: rec.format === 'pdf' ? 'pdf' : 'xlsx',
            locale: rec.locale || 'en',
            system: true,
          },
          { id: rec.userId ?? undefined, companyId: rec.companyId ?? undefined, role: UserRole.ADMIN },
        );
        const fresh = await this.getHistory(res.historyId, { companyId: rec.companyId });
        if (fresh?.filePath && existsSync(join(UPLOADS_ROOT, fresh.filePath))) {
          return this.getHistoryStream(fresh);
        }
      } catch (e) {
        this.logger.error(`Regenerate failed for history ${rec.id}: ${(e as Error).message}`);
      }
    }
    throw new NotFoundException('Report file not available');
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
  // Filename + logo helpers for exports
  // -------------------------------------------------------------------------
  private requestedLogo(opts: GenerateOptions): string | null {
    const l = opts.logo;
    if (!l || typeof l !== 'string') return null;
    if (l.startsWith('data:image/') && l.length < 2_000_000) return l;
    if (/^https?:\/\//.test(l) && l.length < 2000) return l;
    if (l.startsWith('/') && l.length < 500) return l;
    return null;
  }

  // Persists a client-supplied logo (e.g. data-URI) into the report_logo CMS
  // row so scheduled / cron exports pick it up even without a browser session.
  private async persistReportLogo(logo: string | null | undefined): Promise<void> {
    if (!logo || !logo.startsWith('data:image/')) return;
    await this.dataSource.query(
      `INSERT INTO website_cms (key, value, updated_at) VALUES ('report_logo', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [logo],
    );
  }

  private sanitizeName(name: string, limit = 90): string {
    const clean = String(name || '')
      .replace(/[_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
      .replace(/-+/g, '-')
      .replace(/\s+-+\s*/g, ' - ')
      .trim();
    return (clean || 'Report').slice(0, limit);
  }

  private async buildExportFileName(
    def: ReportDef,
    opts: GenerateOptions,
    payload: ReportPayload,
    format: 'xlsx' | 'pdf',
  ): Promise<string> {
    const parts = opts.filters || {};
    let base = '';

    // Prefer the filtered entity name (client > truck > driver) so a per-client
    // report is named after the client itself.
    try {
      if (parts.clientId) {
        const rows: any[] = await this.dataSource.query('SELECT name FROM clients WHERE id = $1 LIMIT 1', [parts.clientId]);
        if (rows[0]?.name) base = String(rows[0].name);
      }
    } catch { /* keep default */ }
    if (!base) {
      try {
        if (parts.truckId) {
          const rows: any[] = await this.dataSource.query('SELECT plate_number, name FROM trucks WHERE id = $1 LIMIT 1', [parts.truckId]);
          if (rows[0]) base = String(rows[0].name || rows[0].plate_number || '');
        }
      } catch { /* keep default */ }
    }
    if (!base) {
      try {
        if (parts.driverId) {
          const rows: any[] = await this.dataSource.query('SELECT name FROM drivers WHERE id = $1 LIMIT 1', [parts.driverId]);
          if (rows[0]?.name) base = String(rows[0].name);
        }
      } catch { /* keep default */ }
    }
    if (!base) base = opts.name?.trim() || localizeText(def.name, opts.locale);

    const pretty = this.sanitizeName(base);
    const stamp = this.formatStamp(payload.generatedAt);
    return `${pretty} - ${stamp}.${format}`;
  }

  private formatStamp(d: string | Date | null | undefined): string {
    const dt = d instanceof Date ? d : d ? new Date(d) : new Date();
    if (isNaN(dt.getTime())) dt.setTime(Date.now());
    const p2 = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${p2(dt.getMonth() + 1)}-${p2(dt.getDate())} ${p2(dt.getHours())}-${p2(dt.getMinutes())}`;
  }

  // -------------------------------------------------------------------------
  // Logo resolution (mirrors ResendService.getLogoUrl + excel/pdf embedding)
  // -------------------------------------------------------------------------
  private async resolveLogoSources(): Promise<string[]> {
    const candidates: string[] = [];
    try {
      // Highest-priority source: the exact logo bytes the admin uploaded in
      // TMS Settings (stored as a base64 data-URI by POST /settings/logo).
      const reportLogo = await this.dataSource.query(
        `SELECT value FROM website_cms WHERE key = 'report_logo' AND value != '' LIMIT 1`,
      );
      if (reportLogo && reportLogo[0]?.value) candidates.push(String(reportLogo[0].value));

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
            // Skip the tiny seeded default (email-logo.png placeholder) so a
            // real company logo is never replaced by the generic envelope.
            if (file.toLowerCase().endsWith('email-logo.png') && buffer.length < 1500) continue;
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