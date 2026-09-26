import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceBroadcastService } from './attendance-broadcast.service.js';

describe('AttendanceBroadcastService', () => {
  const upsert = vi.fn();
  const update = vi.fn();
  const findMany = vi.fn();
  const createMany = vi.fn();
  const create = vi.fn();
  const findFirst = vi.fn();
  const count = vi.fn();
  const sendText = vi.fn();

  const prisma = {
    attendanceBroadcast: { upsert, update },
    attendanceRegistration: { findMany },
    attendanceNotification: { createMany, create, findFirst, count },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        attendanceBroadcast: { update },
        attendanceRegistration: { findMany },
        attendanceNotification: { createMany },
      }),
    ),
  };

  const emptyBroadcast = {
    id: 1,
    startsAt: null as Date | null,
    version: 0,
    meetingUrl: null as string | null,
    updatedAt: new Date('2026-09-26T09:00:00.000Z'),
  };

  let service: AttendanceBroadcastService;

  beforeEach(() => {
    vi.clearAllMocks();
    upsert.mockResolvedValue(emptyBroadcast);
    update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...emptyBroadcast,
      ...data,
      updatedAt: emptyBroadcast.updatedAt,
    }));
    findMany.mockResolvedValue([{ id: 'reg-1' }]);
    createMany.mockResolvedValue({ count: 1 });
    create.mockResolvedValue({ id: 'notice-1' });
    findFirst.mockResolvedValue(null);
    count.mockResolvedValue(0);
    sendText.mockResolvedValue(undefined);
    service = new AttendanceBroadcastService(prisma as never, {
      sendText,
    } as never);
  });

  it('queues a confirmation for everyone the first time a broadcast time is saved', async () => {
    const view = await service.setStartsAt('2026-09-28T11:00');

    expect(view.version).toBe(1);
    expect(view.startsAtLocal).toBe('2026-09-28T11:00');
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          registrationId: 'reg-1',
          scheduleVersion: 1,
          kind: 'CONFIRMATION',
          status: 'PENDING',
        },
      ],
      skipDuplicates: true,
    });
    expect(sendText).not.toHaveBeenCalled();
  });

  it('queues an update message when the broadcast time changes', async () => {
    upsert.mockResolvedValue({
      ...emptyBroadcast,
      startsAt: new Date('2026-09-28T08:00:00.000Z'),
      version: 1,
    });

    await service.setStartsAt('2026-09-28T12:30');

    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            scheduleVersion: 2,
            kind: 'SCHEDULE_UPDATE',
          }),
        ],
      }),
    );
  });

  it('stores a meeting link without queueing a message', async () => {
    const view = await service.setMeetingUrl('https://live.example/room');

    expect(view.meetingUrl).toBe('https://live.example/room');
    expect(createMany).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { meetingUrl: 'https://live.example/room' },
    });
  });

  it('rejects a meeting link that is not http or https', async () => {
    await expect(service.setMeetingUrl('javascript:alert(1)')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('does not send another confirmation when the registration retry hits the same version', async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.12.0',
      }),
    );

    await service.enqueueConfirmation({
      id: 'reg-1',
      whatsOrderPhone: '201012345678',
    });

    expect(findFirst).not.toHaveBeenCalled();
  });
});
