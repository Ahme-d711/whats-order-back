import { Module } from '@nestjs/common';
import { AdminApiKeyGuard } from '../common/guards/admin-api-key.guard.js';
import { AdminAttendanceBroadcastController } from './admin-attendance-broadcast.controller.js';
import { AdminAttendanceRegistrationsController } from './admin-attendance-registrations.controller.js';
import { AttendanceBroadcastScheduler } from './attendance-broadcast.scheduler.js';
import { AttendanceBroadcastService } from './attendance-broadcast.service.js';
import { AttendanceRegistrationsController } from './attendance-registrations.controller.js';
import { PublicAttendanceBroadcastController } from './public-attendance-broadcast.controller.js';
import { AttendanceRegistrationsService } from './attendance-registrations.service.js';
import { WhatsAppClient } from './whatsapp.client.js';

@Module({
  controllers: [
    AttendanceRegistrationsController,
    PublicAttendanceBroadcastController,
    AdminAttendanceRegistrationsController,
    AdminAttendanceBroadcastController,
  ],
  providers: [
    AttendanceRegistrationsService,
    AttendanceBroadcastService,
    AttendanceBroadcastScheduler,
    WhatsAppClient,
    AdminApiKeyGuard,
  ],
})
export class AttendanceRegistrationsModule {}
