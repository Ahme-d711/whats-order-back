import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttendanceBroadcastService } from './attendance-broadcast.service.js';

const TICK_MS = 60_000;

@Injectable()
export class AttendanceBroadcastScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly broadcasts: AttendanceBroadcastService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (this.config.get<string>('NODE_ENV') === 'test') {
      return;
    }

    void this.broadcasts.dispatchDueReminders();
    this.timer = setInterval(() => {
      void this.broadcasts.dispatchDueReminders();
    }, TICK_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
