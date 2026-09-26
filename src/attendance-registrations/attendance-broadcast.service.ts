import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  AttendanceNotificationKind,
  Prisma,
  type AttendanceBroadcast,
  type AttendanceNotification,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  buildConfirmationMessage,
  buildReminder1hMessage,
  buildReminder24hMessage,
  buildScheduleUpdateMessage,
  buildStartMessage,
} from './broadcast-messages.js';
import { cairoLocalToUtc, formatCairoLocalInput } from './cairo-time.js';
import { selectDueReminder, type ReminderKind } from './reminder-schedule.js';
import { WhatsAppClient } from './whatsapp.client.js';

const BROADCAST_ID = 1;
const SEND_GAP_MS = 1_500;

export interface AttendanceBroadcastView {
  startsAt: Date | null;
  startsAtLocal: string | null;
  version: number;
  meetingUrl: string | null;
  updatedAt: Date;
}

interface RegistrationRef {
  id: string;
  whatsOrderPhone: string;
}

type PendingNotification = AttendanceNotification & {
  registration: { whatsOrderPhone: string };
};

@Injectable()
export class AttendanceBroadcastService {
  private readonly logger = new Logger(AttendanceBroadcastService.name);
  private pumping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppClient,
  ) {}

  async getSettings(): Promise<AttendanceBroadcastView> {
    return toView(await this.ensureBroadcast());
  }

  async setStartsAt(startsAtLocal: string): Promise<AttendanceBroadcastView> {
    let startsAt: Date;
    try {
      startsAt = cairoLocalToUtc(startsAtLocal);
    } catch {
      throw new BadRequestException(
        'startsAtLocal must be a valid Cairo date and time',
      );
    }

    const current = await this.ensureBroadcast();
    if (current.startsAt?.getTime() === startsAt.getTime()) {
      return toView(current);
    }

    const nextVersion = current.version + 1;
    const kind: AttendanceNotificationKind = current.startsAt
      ? 'SCHEDULE_UPDATE'
      : 'CONFIRMATION';

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.attendanceBroadcast.update({
        where: { id: BROADCAST_ID },
        data: { startsAt, version: nextVersion },
      });
      const registrations = await tx.attendanceRegistration.findMany({
        select: { id: true },
      });
      if (registrations.length > 0) {
        await tx.attendanceNotification.createMany({
          data: registrations.map((registration) => ({
            registrationId: registration.id,
            scheduleVersion: nextVersion,
            kind,
            status: 'PENDING' as const,
          })),
          skipDuplicates: true,
        });
      }
      return row;
    });

    this.kick();
    return toView(updated);
  }

  async setMeetingUrl(value: string | null): Promise<AttendanceBroadcastView> {
    const meetingUrl = normalizeMeetingUrl(value);
    await this.ensureBroadcast();
    const updated = await this.prisma.attendanceBroadcast.update({
      where: { id: BROADCAST_ID },
      data: { meetingUrl },
    });
    return toView(updated);
  }

  async enqueueConfirmation(registration: RegistrationRef): Promise<void> {
    try {
      const broadcast = await this.ensureBroadcast();
      await this.prisma.attendanceNotification.create({
        data: {
          registrationId: registration.id,
          scheduleVersion: broadcast.version,
          kind: 'CONFIRMATION',
          status: 'PENDING',
        },
      });
      this.kick();
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }

      this.logger.error(
        `Failed to queue confirmation for ${registration.id}`,
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  async dispatchDueReminders(now = new Date()): Promise<void> {
    const broadcast = await this.ensureBroadcast();
    if (broadcast.startsAt && broadcast.version >= 1) {
      const decision = selectDueReminder(broadcast.startsAt, now);
      if (decision && (decision.send || decision.skip.length > 0)) {
        const registrations = await this.prisma.attendanceRegistration.findMany({
          select: { id: true },
        });
        await this.queueReminderRows(
          registrations.map((registration) => registration.id),
          broadcast.version,
          decision.skip,
          decision.send,
        );
      }
    }

    this.kick();
  }

  private async queueReminderRows(
    registrationIds: string[],
    scheduleVersion: number,
    skip: ReminderKind[],
    send: ReminderKind | null,
  ): Promise<void> {
    if (registrationIds.length === 0) {
      return;
    }

    for (const kind of skip) {
      await this.prisma.attendanceNotification.createMany({
        data: registrationIds.map((registrationId) => ({
          registrationId,
          scheduleVersion,
          kind,
          status: 'SKIPPED' as const,
        })),
        skipDuplicates: true,
      });
    }

    if (!send) {
      return;
    }

    await this.prisma.attendanceNotification.createMany({
      data: registrationIds.map((registrationId) => ({
        registrationId,
        scheduleVersion,
        kind: send,
        status: 'PENDING' as const,
      })),
      skipDuplicates: true,
    });
  }

  private kick(): void {
    void this.pump().catch((error: unknown) => {
      this.logger.error(
        'Broadcast delivery stopped',
        error instanceof Error ? error.message : undefined,
      );
    });
  }

  private async pump(): Promise<void> {
    if (this.pumping) {
      return;
    }

    this.pumping = true;
    try {
      for (;;) {
        const row = await this.prisma.attendanceNotification.findFirst({
          where: { status: 'PENDING', sentAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            registration: { select: { whatsOrderPhone: true } },
          },
        });
        if (!row) {
          break;
        }

        const claim = await this.prisma.attendanceNotification.updateMany({
          where: { id: row.id, status: 'PENDING', sentAt: null },
          data: { sentAt: new Date() },
        });
        if (claim.count !== 1) {
          continue;
        }

        await this.deliverClaimed(row);
        const remaining = await this.prisma.attendanceNotification.count({
          where: { status: 'PENDING', sentAt: null },
        });
        if (remaining === 0) {
          break;
        }
        await sleep(SEND_GAP_MS);
      }
    } finally {
      this.pumping = false;
    }

    const remaining = await this.prisma.attendanceNotification.count({
      where: { status: 'PENDING', sentAt: null },
    });
    if (remaining > 0) {
      void this.pump();
    }
  }

  private async deliverClaimed(row: PendingNotification): Promise<void> {
    const broadcast = await this.prisma.attendanceBroadcast.findUnique({
      where: { id: BROADCAST_ID },
    });
    if (!broadcast || broadcast.version !== row.scheduleVersion) {
      await this.mark(row.id, 'SKIPPED', null);
      if (broadcast && row.kind === 'CONFIRMATION') {
        await this.enqueueConfirmation({
          id: row.registrationId,
          whatsOrderPhone: row.registration.whatsOrderPhone,
        });
      }
      return;
    }

    const text = renderMessage(row.kind, broadcast.startsAt, broadcast.meetingUrl);
    if (!text) {
      await this.mark(row.id, 'SKIPPED', 'Broadcast time is not set');
      return;
    }

    try {
      await this.whatsapp.sendText(row.registration.whatsOrderPhone, text);
      await this.mark(row.id, 'SENT', null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'WhatsApp send failed';
      this.logger.error(`WhatsApp send failed for notification ${row.id}: ${message}`);
      await this.mark(row.id, 'FAILED', message);
    }
  }

  private async mark(
    id: string,
    status: 'SENT' | 'FAILED' | 'SKIPPED',
    error: string | null,
  ): Promise<void> {
    await this.prisma.attendanceNotification.update({
      where: { id },
      data: {
        status,
        error: error ? error.slice(0, 500) : null,
        sentAt: status === 'SENT' ? new Date() : undefined,
      },
    });
  }

  private async ensureBroadcast(): Promise<AttendanceBroadcast> {
    return this.prisma.attendanceBroadcast.upsert({
      where: { id: BROADCAST_ID },
      update: {},
      create: { id: BROADCAST_ID, version: 0 },
    });
  }
}

function renderMessage(
  kind: AttendanceNotificationKind,
  startsAt: Date | null,
  meetingUrl: string | null,
): string | null {
  switch (kind) {
    case 'CONFIRMATION':
      return buildConfirmationMessage(startsAt);
    case 'SCHEDULE_UPDATE':
      return startsAt ? buildScheduleUpdateMessage(startsAt) : null;
    case 'REMINDER_24H':
      return startsAt ? buildReminder24hMessage(startsAt, meetingUrl) : null;
    case 'REMINDER_1H':
      return startsAt ? buildReminder1hMessage(startsAt, meetingUrl) : null;
    case 'START':
      return buildStartMessage(meetingUrl);
    default:
      return null;
  }
}

function normalizeMeetingUrl(value: string | null): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > 2000) {
    throw new BadRequestException('meetingUrl is too long');
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new BadRequestException('meetingUrl must be an http or https URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('meetingUrl must be an http or https URL');
  }

  return trimmed;
}

function toView(row: AttendanceBroadcast): AttendanceBroadcastView {
  return {
    startsAt: row.startsAt,
    startsAtLocal: row.startsAt ? formatCairoLocalInput(row.startsAt) : null,
    version: row.version,
    meetingUrl: row.meetingUrl,
    updatedAt: row.updatedAt,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
