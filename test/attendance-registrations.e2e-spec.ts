import { json } from 'express';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AttendanceRegistration } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceRegistrationsController } from '../src/attendance-registrations/attendance-registrations.controller.js';
import { AttendanceRegistrationsService } from '../src/attendance-registrations/attendance-registrations.service.js';
import { CreateAttendanceRegistrationDto } from '../src/attendance-registrations/dto/create-attendance-registration.dto.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { ApiResponseInterceptor } from '../src/common/interceptors/api-response.interceptor.js';

const SUBMISSION_KEY = '6352d10a-9e37-4b69-8b1f-0d928edb1200';

describe('Attendance registrations API (e2e)', () => {
  let app: INestApplication<App>;
  const createRegistration = vi.fn(
    async (
      dto: CreateAttendanceRegistrationDto,
      submissionKey: string,
    ): Promise<AttendanceRegistration> => ({
      id: '4ddbe2f1-43d0-42b9-a22d-2a9626048dc0',
      ...dto,
      submissionKey,
      createdAt: new Date('2026-09-24T10:00:00.000Z'),
    }),
  );

  beforeEach(async () => {
    createRegistration.mockClear();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceRegistrationsController],
      providers: [
        {
          provide: AttendanceRegistrationsService,
          useValue: { create: createRegistration },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.use(json({ limit: '16kb' }));
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('normalizes and creates a registration', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/attendance-registrations')
      .set('Idempotency-Key', SUBMISSION_KEY)
      .send({
        fullName: '  محمود   محمد  ',
        whatsOrderPhone: '٠١٠١٢٣٤٥٦٧٨',
        activity: '  مطعم  ',
        address: '  القاهرة، مدينة نصر، شارع الطيران  ',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        fullName: 'محمود محمد',
        whatsOrderPhone: '201012345678',
        activity: 'مطعم',
        address: 'القاهرة، مدينة نصر، شارع الطيران',
      },
    });
    expect(response.body.data).not.toHaveProperty('submissionKey');
    expect(createRegistration).toHaveBeenCalledOnce();
  });

  it('returns the consistent error envelope for invalid input', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/attendance-registrations')
      .set('Idempotency-Key', SUBMISSION_KEY)
      .send({
        fullName: '',
        whatsOrderPhone: '123',
        activity: '',
        address: 'قصير',
        unexpected: true,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Please correct the submitted fields',
      },
      path: '/api/attendance-registrations',
    });
    expect(response.body.error.details.length).toBeGreaterThan(0);
    expect(createRegistration).not.toHaveBeenCalled();
  });

  it('rejects a missing idempotency key', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/attendance-registrations')
      .send({
        fullName: 'محمود محمد',
        whatsOrderPhone: '201012345678',
        activity: 'مطعم',
        address: 'القاهرة، مدينة نصر، شارع الطيران',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Idempotency-Key must be a valid UUID v4',
      },
    });
  });

  it('returns conflict when phone is already registered', async () => {
    const { ConflictException } = await import('@nestjs/common');
    createRegistration.mockRejectedValueOnce(
      new ConflictException(
        'This phone number is already registered for attendance',
      ),
    );

    const response = await request(app.getHttpServer())
      .post('/api/attendance-registrations')
      .set('Idempotency-Key', SUBMISSION_KEY)
      .send({
        fullName: 'محمود محمد',
        whatsOrderPhone: '201012345678',
        activity: 'مطعم',
        address: 'القاهرة، مدينة نصر، شارع الطيران',
      })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'This phone number is already registered for attendance',
      },
    });
  });
});
