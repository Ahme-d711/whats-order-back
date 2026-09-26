import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AttendanceRegistrationsService } from './attendance-registrations.service.js';
import { CreateAttendanceRegistrationDto } from './dto/create-attendance-registration.dto.js';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface AttendanceRegistrationResponse {
  id: string;
  fullName: string;
  whatsOrderPhone: string;
  activity: string;
  address: string;
  createdAt: Date;
}

@Controller('attendance-registrations')
export class AttendanceRegistrationsController {
  constructor(
    private readonly attendanceRegistrationsService: AttendanceRegistrationsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateAttendanceRegistrationDto,
    @Headers('idempotency-key') submissionKey: string | undefined,
  ): Promise<AttendanceRegistrationResponse> {
    if (!submissionKey || !UUID_V4_PATTERN.test(submissionKey)) {
      throw new BadRequestException('Idempotency-Key must be a valid UUID v4');
    }

    return this.createResponse(dto, submissionKey);
  }

  private async createResponse(
    dto: CreateAttendanceRegistrationDto,
    submissionKey: string,
  ): Promise<AttendanceRegistrationResponse> {
    const { id, fullName, whatsOrderPhone, activity, address, createdAt } =
      await this.attendanceRegistrationsService.create(dto, submissionKey);

    return { id, fullName, whatsOrderPhone, activity, address, createdAt };
  }
}
