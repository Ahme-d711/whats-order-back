import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { AdminApiKeyGuard } from '../common/guards/admin-api-key.guard.js';
import {
  AttendanceBroadcastService,
  type AttendanceBroadcastView,
} from './attendance-broadcast.service.js';
import { SendAttendanceTestMessageDto } from './dto/send-attendance-test-message.dto.js';
import { UpsertAttendanceBroadcastDto } from './dto/upsert-attendance-broadcast.dto.js';
import { UpsertAttendanceMeetingUrlDto } from './dto/upsert-attendance-meeting-url.dto.js';
import {
  ATTENDANCE_TEST_MESSAGE,
  WhatsAppClient,
} from './whatsapp.client.js';

@Controller('admin')
@UseGuards(AdminApiKeyGuard)
export class AdminAttendanceBroadcastController {
  constructor(
    private readonly broadcasts: AttendanceBroadcastService,
    private readonly whatsapp: WhatsAppClient,
  ) {}

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

  @Post('attendance-test-message')
  async sendTest(
    @Body() dto: SendAttendanceTestMessageDto,
  ): Promise<{ phone: string; response: unknown }> {
    const response = await this.whatsapp.sendText(
      dto.phone,
      ATTENDANCE_TEST_MESSAGE,
    );
    return { phone: dto.phone, response };
  }
}
