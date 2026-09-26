import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma, type AttendanceRegistration } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AttendanceBroadcastService } from './attendance-broadcast.service.js';
import { CreateAttendanceRegistrationDto } from './dto/create-attendance-registration.dto.js';

export interface AttendanceRegistrationListItem {
  id: string;
  fullName: string;
  whatsOrderPhone: string;
  activity: string;
  address: string;
  createdAt: Date;
}

export interface PaginatedAttendanceRegistrations {
  items: AttendanceRegistrationListItem[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

const ADMIN_LIST_SELECT = {
  id: true,
  fullName: true,
  whatsOrderPhone: true,
  activity: true,
  address: true,
  createdAt: true,
} satisfies Prisma.AttendanceRegistrationSelect;

@Injectable()
export class AttendanceRegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    private readonly broadcastNotifications?: AttendanceBroadcastService,
  ) {}

  async create(
    dto: CreateAttendanceRegistrationDto,
    submissionKey: string,
  ): Promise<AttendanceRegistration> {
    try {
      const created = await this.prisma.attendanceRegistration.create({
        data: {
          fullName: dto.fullName,
          whatsOrderPhone: dto.whatsOrderPhone,
          activity: dto.activity,
          address: dto.address,
          submissionKey,
        },
      });
      void this.broadcastNotifications?.enqueueConfirmation(created);
      return created;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingByKey = await this.prisma.attendanceRegistration.findUnique({
          where: { submissionKey },
        });

        // Idempotent retry with the same Idempotency-Key.
        if (existingByKey) {
          return existingByKey;
        }

        throw new ConflictException(
          'This phone number is already registered for attendance',
        );
      }

      throw error;
    }
  }

  async findAllForAdmin(options: {
    page: number;
    size: number;
    search?: string;
  }): Promise<PaginatedAttendanceRegistrations> {
    const { page, size, search } = options;
    const where = buildSearchWhere(search);

    const [total, items] = await this.prisma.$transaction([
      this.prisma.attendanceRegistration.count({ where }),
      this.prisma.attendanceRegistration.findMany({
        where,
        select: ADMIN_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: page * size,
        take: size,
      }),
    ]);

    return {
      items,
      total,
      page,
      size,
      totalPages: total === 0 ? 0 : Math.ceil(total / size),
    };
  }

  async deleteForAdmin(id: string): Promise<void> {
    try {
      await this.prisma.attendanceRegistration.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Attendance registration not found');
      }

      throw error;
    }
  }
}

function buildSearchWhere(
  search?: string,
): Prisma.AttendanceRegistrationWhereInput {
  if (!search) {
    return {};
  }

  return {
    OR: [
      { fullName: { contains: search, mode: 'insensitive' } },
      { whatsOrderPhone: { contains: search, mode: 'insensitive' } },
      { activity: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ],
  };
}
