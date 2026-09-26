import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AdminApiKeyGuard } from '../common/guards/admin-api-key.guard.js';
import {
  AttendanceBroadcastService,
  type AttendanceBroadcastView,
} from './attendance-broadcast.service.js';
import { UpsertAttendanceBroadcastDto } from './dto/upsert-attendance-broadcast.dto.js';
import { UpsertAttendanceMeetingUrlDto } from './dto/upsert-attendance-meeting-url.dto.js';

@Controller('admin')
@UseGuards(AdminApiKeyGuard)
export class AdminAttendanceBroadcastController {
  constructor(private readonly broadcasts: AttendanceBroadcastService) {}

  @Get('attendance-broadcast')
  getSettings(): Promise<AttendanceBroadcastView> {
    return this.broadcasts.getSettings();
  }

  @Put('attendance-broadcast')
  setStartsAt(
    @Body() dto: UpsertAttendanceBroadcastDto,
  ): Promise<AttendanceBroadcastView> {
    return this.broadcasts.setStartsAt(dto.startsAtLocal);
  }

  @Put('attendance-meeting-url')
  setMeetingUrl(
    @Body() dto: UpsertAttendanceMeetingUrlDto,
  ): Promise<AttendanceBroadcastView> {
    return this.broadcasts.setMeetingUrl(dto.meetingUrl ?? null);
  }
}
