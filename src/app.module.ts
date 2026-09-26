import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AttendanceRegistrationsModule } from './attendance-registrations/attendance-registrations.module.js';
import { validateEnvironment } from './config/environment.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(
        fileURLToPath(new URL('.', import.meta.url)),
        '..',
        'public',
      ),
      exclude: ['/api/{*path}'],
    }),
    PrismaModule,
    AttendanceRegistrationsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
