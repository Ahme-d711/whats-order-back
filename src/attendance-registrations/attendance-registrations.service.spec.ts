import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceRegistrationsService } from './attendance-registrations.service.js';

describe('AttendanceRegistrationsService admin operations', () => {
  const count = vi.fn();
  const findMany = vi.fn();
  const deleteOne = vi.fn();
  const transaction = vi.fn();

  const prisma = {
    attendanceRegistration: {
      count,
      findMany,
      delete: deleteOne,
    },
    $transaction: transaction,
  };

  let service: AttendanceRegistrationsService;

  beforeEach(() => {
    count.mockReset();
    findMany.mockReset();
    deleteOne.mockReset();
    transaction.mockReset();
    transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
    service = new AttendanceRegistrationsService(prisma as never);
  });

  it('lists newest registrations first with pagination metadata', async () => {
    const newer = {
      id: '11111111-1111-4111-8111-111111111111',
      fullName: 'أحدث',
      whatsOrderPhone: '201011111111',
      activity: 'مطعم',
      address: 'القاهرة',
      createdAt: new Date('2026-09-24T12:00:00.000Z'),
    };
    const older = {
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'أقدم',
      whatsOrderPhone: '201022222222',
      activity: 'مقهى',
      address: 'الجيزة',
      createdAt: new Date('2026-09-23T12:00:00.000Z'),
    };

    count.mockResolvedValue(12);
    findMany.mockResolvedValue([newer, older]);

    const result = await service.findAllForAdmin({ page: 1, size: 2 });

    expect(findMany).toHaveBeenCalledWith({
      where: {},
      select: {
        id: true,
        fullName: true,
        whatsOrderPhone: true,
        activity: true,
        address: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: 2,
      take: 2,
    });
    expect(result).toEqual({
      items: [newer, older],
      total: 12,
      page: 1,
      size: 2,
      totalPages: 6,
    });
  });

  it('applies case-insensitive search across useful fields', async () => {
    count.mockResolvedValue(0);
    findMany.mockResolvedValue([]);

    await service.findAllForAdmin({ page: 0, size: 10, search: 'نصر' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { fullName: { contains: 'نصر', mode: 'insensitive' } },
            { whatsOrderPhone: { contains: 'نصر', mode: 'insensitive' } },
            { activity: { contains: 'نصر', mode: 'insensitive' } },
            { address: { contains: 'نصر', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });

  it('deletes an existing registration', async () => {
    deleteOne.mockResolvedValue({});

    await expect(
      service.deleteForAdmin('4ddbe2f1-43d0-42b9-a22d-2a9626048dc0'),
    ).resolves.toBeUndefined();

    expect(deleteOne).toHaveBeenCalledWith({
      where: { id: '4ddbe2f1-43d0-42b9-a22d-2a9626048dc0' },
    });
  });

  it('maps missing records to NotFoundException', async () => {
    deleteOne.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record to delete does not exist', {
        code: 'P2025',
        clientVersion: '6.12.0',
      }),
    );

    await expect(
      service.deleteForAdmin('4ddbe2f1-43d0-42b9-a22d-2a9626048dc0'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
