import { Controller, Get } from '@nestjs/common';
import { AttendanceBroadcastService } from './attendance-broadcast.service.js';

@Controller('attendance-broadcast')
export class PublicAttendanceBroadcastController {
  constructor(private readonly broadcasts: AttendanceBroadcastService) {}

  @Get()
  async get(): Promise<{ startsAt: Date | null }> {
    const settings = await this.broadcasts.getSettings();
    return { startsAt: settings.startsAt };
  }
}
