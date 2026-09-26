import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminApiKeyGuard } from '../common/guards/admin-api-key.guard.js';
import {
  AttendanceRegistrationsService,
  type PaginatedAttendanceRegistrations,
} from './attendance-registrations.service.js';
import { ListAttendanceRegistrationsQueryDto } from './dto/list-attendance-registrations.query.dto.js';

@Controller('admin/attendance-registrations')
@UseGuards(AdminApiKeyGuard)
export class AdminAttendanceRegistrationsController {
  constructor(
    private readonly attendanceRegistrationsService: AttendanceRegistrationsService,
  ) {}

  @Get()
  list(
    @Query() query: ListAttendanceRegistrationsQueryDto,
  ): Promise<PaginatedAttendanceRegistrations> {
    return this.attendanceRegistrationsService.findAllForAdmin({
      page: query.page,
      size: query.size,
      search: query.search,
    });
  }

  @Delete(':id')
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<{ id: string }> {
    await this.attendanceRegistrationsService.deleteForAdmin(id);
    return { id };
  }
}
