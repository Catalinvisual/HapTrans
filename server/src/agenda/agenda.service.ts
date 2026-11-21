import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { ResendService } from '../email/resend.service';
import { AgendaEvent } from './agenda-event.entity';
import { AgendaParticipant } from './agenda-participant.entity';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const KINDS = ['event', 'note'];
const COLORS = ['orange', 'amber', 'green', 'blue', 'violet', 'rose', 'slate'];
const REMINDERS = [0, 5, 10, 15, 30, 60, 120, 1440];
const STATUSES = ['confirmed', 'tentative', 'cancelled'];
const DAY = 24 * 60 * 60 * 1000;

type AgendaViewer = Pick<User, 'id' | 'name' | 'email' | 'role' | 'companyId'>;

export interface AgendaMutationBody {
  title?: string;
  description?: string | null;
  location?: string | null;
  kind?: string;
  color?: string;
  startAt?: string;
  endAt?: string | null;
  allDay?: boolean;
  reminderMinutes?: number | string;
  status?: string;
  invitees?: string[];
}

@Injectable()
export class AgendaService {
  private readonly logger = new Logger(AgendaService.name);

  constructor(
    @InjectRepository(AgendaEvent)
    private readonly eventsRepo: Repository<AgendaEvent>,
    @InjectRepository(AgendaParticipant)
    private readonly participantsRepo: Repository<AgendaParticipant>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly resend: ResendService,
  ) {}

  async list(viewer: AgendaViewer, fromRaw?: string, toRaw?: string) {
    const now = Date.now();
    const from = this.parseDate(fromRaw, new Date(now - 30 * DAY));
    const to = this.parseDate(toRaw, new Date(now + 90 * DAY));
    if (to.getTime() < from.getTime()) {
      throw new BadRequestException('AGENDA_RANGE_INVALID');
    }
    // A single request may not scan years of history: the calendar only needs
    // the visible month plus a margin.
    const safeTo = new Date(Math.min(to.getTime(), from.getTime() + 400 * DAY));

    const [events, people, invites] = await Promise.all([
      this.scopedEvents(viewer.id, from, safeTo),
      this.people(viewer),
      this.pendingInvites(viewer.id),
    ]);

    return {
      events: await this.buildDetails(events, viewer.id),
      people,
      invites: await this.buildDetails(invites, viewer.id),
    };
  }

  async create(viewer: AgendaViewer, body: AgendaMutationBody) {
    const title = this.requireTitle(body?.title);
    const kind = KINDS.includes(String(body?.kind)) ? String(body.kind) : 'event';
    const startAt = this.requireDate(body?.startAt, 'AGENDA_START_REQUIRED');
    const endAt = body?.endAt ? this.requireDate(body.endAt, 'AGENDA_END_INVALID') : null;
    if (endAt && endAt.getTime() < startAt.getTime()) {
      throw new BadRequestException('AGENDA_END_BEFORE_START');
    }
    const allDay = kind === 'note' ? true : body?.allDay === true;
    this.assertStartNotPast(kind, allDay, startAt);

    const event = this.eventsRepo.create({
      userId: viewer.id,
      companyId: viewer.companyId || null,
      title,
      description: this.optionalText(body?.description, 5000),
      location: this.optionalText(body?.location, 300),
      kind: kind as AgendaEvent['kind'],
      color: COLORS.includes(String(body?.color)) ? String(body.color) : 'orange',
      startAt,
      endAt,
      allDay,
      reminderMinutes: kind === 'note' ? 0 : this.reminder(body?.reminderMinutes),
      status: STATUSES.includes(String(body?.status))
        ? (String(body.status) as AgendaEvent['status'])
        : 'confirmed',
      reminderSentAt: null,
    });

    const saved = await this.eventsRepo.save(event);
    const invitees = kind === 'event' ? await this.resolveInvitees(viewer, body?.invitees) : [];
    if (invitees.length) {
      await this.participantsRepo.save(
        invitees.map((invitee) =>
          this.participantsRepo.create({
            eventId: saved.id,
            userId: invitee.id,
            invitedById: viewer.id,
            status: 'pending',
          }),
        ),
      );
      this.sendInvites(viewer, saved, invitees);
    }

    const full = await this.eventsRepo.findOne({
      where: { id: saved.id },
      relations: ['participants'],
    });
    return (await this.buildDetails([full as AgendaEvent], viewer.id))[0];
  }

  async update(viewer: AgendaViewer, id: string, body: AgendaMutationBody) {
    const event = await this.eventsRepo.findOne({
      where: { id },
      relations: ['participants'],
    });
    if (!event) throw new NotFoundException('AGENDA_EVENT_NOT_FOUND');
    if (event.userId !== viewer.id) throw new ForbiddenException('AGENDA_NOT_OWNER');

    const previousStart = new Date(event.startAt).getTime();

    if (body?.title !== undefined) event.title = this.requireTitle(body.title);
    if (body?.description !== undefined) {
      event.description = this.optionalText(body.description, 5000);
    }
    if (body?.location !== undefined) event.location = this.optionalText(body.location, 300);
    if (body?.kind !== undefined && KINDS.includes(String(body.kind))) {
      event.kind = String(body.kind) as AgendaEvent['kind'];
    }
    if (body?.color !== undefined && COLORS.includes(String(body.color))) {
      event.color = String(body.color);
    }

    const startChanged = body?.startAt !== undefined;
    if (startChanged) event.startAt = this.requireDate(body.startAt, 'AGENDA_START_INVALID');
    if (body?.endAt !== undefined) {
      event.endAt = body.endAt ? this.requireDate(body.endAt, 'AGENDA_END_INVALID') : null;
    }
    if (event.endAt && event.endAt.getTime() < event.startAt.getTime()) {
      throw new BadRequestException('AGENDA_END_BEFORE_START');
    }
    if (body?.allDay !== undefined) event.allDay = body.allDay === true;
    if (body?.reminderMinutes !== undefined) {
      event.reminderMinutes = this.reminder(body.reminderMinutes);
    }
    if (body?.status !== undefined && STATUSES.includes(String(body.status))) {
      event.status = String(body.status) as AgendaEvent['status'];
    }

    if (startChanged && event.kind === 'event') {
      const moved = Math.abs(event.startAt.getTime() - previousStart) > 60_000;
      const wasPast = previousStart < Date.now() - 60_000;
      // A future event may not be dragged into the past; editing an old event's
      // details (or another already-past slot) stays allowed.
      if (moved && !wasPast) this.assertStartNotPast(event.kind, event.allDay, event.startAt);
    }

    if (event.kind === 'note') {
      event.allDay = true;
      event.reminderMinutes = 0;
      await this.participantsRepo.delete({ eventId: event.id });
      event.participants = [];
    } else if (
      startChanged ||
      body?.endAt !== undefined ||
      body?.reminderMinutes !== undefined
    ) {
      // A moved event must be allowed to notify again.
      event.reminderSentAt = null;
    }

    const saved = await this.eventsRepo.save(event);

    if (event.kind === 'event' && Array.isArray(body?.invitees)) {
      const invitees = await this.resolveInvitees(viewer, body.invitees);
      const current = event.participants || [];
      const desiredIds = new Set(invitees.map((invitee) => invitee.id));
      const removed = current.filter((participant) => !desiredIds.has(participant.userId));
      if (removed.length) await this.participantsRepo.remove(removed);

      const existingIds = new Set(current.map((participant) => participant.userId));
      const added = invitees.filter((invitee) => !existingIds.has(invitee.id));
      if (added.length) {
        await this.participantsRepo.save(
          added.map((invitee) =>
            this.participantsRepo.create({
              eventId: saved.id,
              userId: invitee.id,
              invitedById: viewer.id,
              status: 'pending',
            }),
          ),
        );
        this.sendInvites(viewer, saved, added);
      }
    }

    const full = await this.eventsRepo.findOne({
      where: { id: saved.id },
      relations: ['participants'],
    });
    return (await this.buildDetails([full as AgendaEvent], viewer.id))[0];
  }

  async remove(viewer: AgendaViewer, id: string) {
    const event = await this.eventsRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('AGENDA_EVENT_NOT_FOUND');
    if (event.userId !== viewer.id) throw new ForbiddenException('AGENDA_NOT_OWNER');

    await this.participantsRepo.delete({ eventId: id });
    await this.eventsRepo.delete(id);
    return { success: true };
  }

  async respond(viewer: AgendaViewer, inviteId: string, status: string) {
    if (!['accepted', 'declined'].includes(status)) {
      throw new BadRequestException('AGENDA_INVALID_RESPONSE');
    }

    const invite = await this.participantsRepo.findOne({ where: { id: inviteId } });
    if (!invite) throw new NotFoundException('AGENDA_INVITE_NOT_FOUND');
    if (invite.userId !== viewer.id) throw new ForbiddenException('AGENDA_NOT_INVITEE');

    invite.status = status as AgendaParticipant['status'];
    invite.respondedAt = new Date();
    await this.participantsRepo.save(invite);

    const event = await this.eventsRepo.findOne({
      where: { id: invite.eventId },
      relations: ['participants'],
    });
    if (!event) throw new NotFoundException('AGENDA_EVENT_NOT_FOUND');
    return (await this.buildDetails([event], viewer.id))[0];
  }

  /**
   * Emails one reminder per event, once. The client also surfaces reminders
   * in-app; this cron is what reaches people while the TMS is closed.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendDueReminders() {
    if (!process.env.RESEND_API_KEY) return;

    const now = new Date();
    const horizon = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    let due: AgendaEvent[] = [];
    try {
      const candidates = await this.eventsRepo
        .createQueryBuilder('e')
        .leftJoinAndSelect('e.participants', 'p')
        .where('e."startAt" > :now', { now })
        .andWhere('e."startAt" <= :horizon', { horizon })
        .andWhere('e."reminderSentAt" IS NULL')
        .andWhere('e.kind = :kind', { kind: 'event' })
        .andWhere('e.status != :cancelled', { cancelled: 'cancelled' })
        .orderBy('e."startAt"', 'ASC')
        .take(200)
        .getMany();
      due = candidates.filter(
        (event) =>
          new Date(event.startAt).getTime() - (event.reminderMinutes || 0) * 60000 <=
          now.getTime(),
      );
    } catch (error) {
      this.logger.warn(`Agenda reminder scan failed: ${(error as Error).message}`);
      return;
    }

    for (const event of due) {
      try {
        const recipientIds = new Set<string>([event.userId]);
        (event.participants || [])
          .filter((participant) => participant.status === 'accepted')
          .forEach((participant) => recipientIds.add(participant.userId));

        const users = await this.usersRepo.find({
          where: { id: In([...recipientIds]) },
          select: ['id', 'name', 'email'],
        });
        for (const user of users) {
          if (user.email) {
            await this.resend.sendAgendaReminderEmail(user.email, user.name, event);
          }
        }
      } catch (error) {
        this.logger.warn(`Agenda reminder failed for ${event.id}: ${(error as Error).message}`);
      }
      event.reminderSentAt = new Date();
      await this.eventsRepo.save(event).catch(() => undefined);
    }
  }

  private async scopedEvents(userId: string, from: Date, to: Date): Promise<AgendaEvent[]> {
    const invites = await this.participantsRepo.find({
      where: { userId },
      select: ['eventId', 'status'],
    });
    const visibleInviteIds = invites
      .filter((invite) => invite.status !== 'declined')
      .map((invite) => invite.eventId);

    const query = this.eventsRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.participants', 'p')
      .where('e."startAt" <= :to', { to })
      .andWhere('(e."endAt" IS NULL OR e."endAt" >= :from)', { from });

    if (visibleInviteIds.length) {
      query.andWhere('(e."userId" = :userId OR e.id IN (:...ids))', {
        userId,
        ids: visibleInviteIds,
      });
    } else {
      query.andWhere('e."userId" = :userId', { userId });
    }

    return query.orderBy('e."startAt"', 'ASC').getMany();
  }

  /** Pending invitations are returned independently of the visible month. */
  private async pendingInvites(userId: string): Promise<AgendaEvent[]> {
    const rows = await this.participantsRepo.find({
      where: { userId, status: 'pending' },
      select: ['eventId'],
    });
    const ids = rows.map((row) => row.eventId);
    if (!ids.length) return [];

    return this.eventsRepo.find({
      where: {
        id: In(ids),
        startAt: MoreThan(new Date(Date.now() - DAY)),
      },
      relations: ['participants'],
      order: { startAt: 'ASC' },
      take: 100,
    });
  }

  private async people(viewer: AgendaViewer) {
    const users = await this.usersRepo.find({
      select: ['id', 'name', 'email', 'role', 'companyId', 'isActive'],
      order: { name: 'ASC' },
      take: 1000,
    });
    return users
      .filter(
        (user) =>
          user.id !== viewer.id &&
          user.isActive !== false &&
          // Drivers work in the mobile app and cannot open the TMS agenda.
          user.role !== UserRole.DRIVER &&
          (!viewer.companyId || !user.companyId || user.companyId === viewer.companyId),
      )
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }));
  }

  private async resolveInvitees(viewer: AgendaViewer, raw: unknown) {
    if (!Array.isArray(raw)) return [];
    const ids = [
      ...new Set(
        raw
          .map((value) => String(value || ''))
          .filter((value) => UUID_RE.test(value) && value !== viewer.id),
      ),
    ].slice(0, 50);
    if (!ids.length) return [];

    const users = await this.usersRepo.find({
      where: { id: In(ids) },
      select: ['id', 'name', 'email', 'role', 'companyId', 'isActive'],
    });
    return users.filter(
      (user) =>
        user.isActive !== false &&
        user.role !== UserRole.DRIVER &&
        (!viewer.companyId || !user.companyId || user.companyId === viewer.companyId),
    );
  }

  private sendInvites(viewer: AgendaViewer, event: AgendaEvent, users: User[]) {
    for (const user of users) {
      if (!user.email) continue;
      this.resend
        .sendAgendaInviteEmail(user.email, user.name, event, viewer.name)
        .catch((error) =>
          this.logger.warn(`Agenda invite email failed: ${(error as Error).message}`),
        );
    }
  }

  private async buildDetails(events: AgendaEvent[], viewerId: string) {
    const userIds = new Set<string>();
    for (const event of events) {
      userIds.add(event.userId);
      (event.participants || []).forEach((participant) => userIds.add(participant.userId));
    }
    const users = userIds.size
      ? await this.usersRepo.find({
          where: { id: In([...userIds]) },
          select: ['id', 'name', 'email'],
        })
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));

    return events.map((event) => {
      const mine = (event.participants || []).find(
        (participant) => participant.userId === viewerId,
      );
      return {
        id: event.id,
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        kind: event.kind,
        color: event.color,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        reminderMinutes: event.reminderMinutes,
        status: event.status,
        ownerId: event.userId,
        ownerName: usersById.get(event.userId)?.name || '',
        canEdit: event.userId === viewerId,
        myStatus: event.userId === viewerId ? 'owner' : mine?.status || 'none',
        participants: (event.participants || []).map((participant) => ({
          id: participant.id,
          userId: participant.userId,
          name: usersById.get(participant.userId)?.name || '',
          email: usersById.get(participant.userId)?.email || '',
          status: participant.status,
        })),
      };
    });
  }

  private assertStartNotPast(kind: string, allDay: boolean, startAt: Date) {
    if (kind !== 'event' || allDay) return;
    if (startAt.getTime() < Date.now() - 60_000) {
      throw new BadRequestException('AGENDA_START_IN_PAST');
    }
  }

  private requireTitle(value: unknown): string {
    const title = String(value ?? '').trim();
    if (!title) throw new BadRequestException('AGENDA_TITLE_REQUIRED');
    return title.slice(0, 200);
  }

  private optionalText(value: unknown, max: number): string | null {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text ? text.slice(0, max) : null;
  }

  private parseDate(value: unknown, fallback: Date): Date {
    if (!value) return fallback;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? fallback : date;
  }

  private requireDate(value: unknown, code: string): Date {
    if (!value) throw new BadRequestException(code);
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) throw new BadRequestException(code);
    return date;
  }

  private reminder(value: unknown): number {
    const minutes = Number(value);
    return REMINDERS.includes(minutes) ? minutes : 15;
  }
}
