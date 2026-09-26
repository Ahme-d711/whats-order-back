import { json } from 'express';
import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAttendanceRegistrationsController } from '../src/attendance-registrations/admin-attendance-registrations.controller.js';
import { AttendanceRegistrationsService } from '../src/attendance-registrations/attendance-registrations.service.js';
import { AdminApiKeyGuard } from '../src/common/guards/admin-api-key.guard.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { ApiResponseInterceptor } from '../src/common/interceptors/api-response.interceptor.js';

const ADMIN_API_KEY = 'test-admin-api-key';
const REGISTRATION_ID = '4ddbe2f1-43d0-42b9-a22d-2a9626048dc0';

const sampleRegistration = {
  id: REGISTRATION_ID,
  fullName: 'محمود محمد',
  whatsOrderPhone: '201012345678',
  activity: 'مطعم',
  address: 'القاهرة، مدينة نصر، شارع الطيران',
  createdAt: new Date('2026-09-24T10:00:00.000Z'),
};

describe('Admin attendance registrations API (e2e)', () => {
  let app: INestApplication<App>;
  const findAllForAdmin = vi.fn();
  const deleteForAdmin = vi.fn();

  beforeEach(async () => {
    findAllForAdmin.mockReset();
    deleteForAdmin.mockReset();
    findAllForAdmin.mockResolvedValue({
      items: [sampleRegistration],
      total: 1,
      page: 0,
      size: 10,
      totalPages: 1,
    });
    deleteForAdmin.mockResolvedValue(undefined);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AdminAttendanceRegistrationsController],
      providers: [
        AdminApiKeyGuard,
        {
          provide: AttendanceRegistrationsService,
          useValue: {
            findAllForAdmin,
            deleteForAdmin,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'adminApiKey' ? ADMIN_API_KEY : undefined,
          },
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

  it('allows an authorized admin to list registrations', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/admin/attendance-registrations')
      .set('X-Admin-Api-Key', ADMIN_API_KEY)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        items: [
          {
            id: REGISTRATION_ID,
            fullName: 'محمود محمد',
            whatsOrderPhone: '201012345678',
          },
        ],
        total: 1,
        page: 0,
        size: 10,
        totalPages: 1,
      },
    });
    expect(findAllForAdmin).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      search: undefined,
    });
  });

  it('rejects unauthorized list requests', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/admin/attendance-registrations')
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
      },
    });
    expect(findAllForAdmin).not.toHaveBeenCalled();
  });

  it('forwards pagination and search to the service', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/attendance-registrations')
      .query({ page: 2, size: 5, search: 'محمود' })
      .set('X-Admin-Api-Key', ADMIN_API_KEY)
      .expect(200);

    expect(findAllForAdmin).toHaveBeenCalledWith({
      page: 2,
      size: 5,
      search: 'محمود',
    });
  });

  it('deletes a registration for an authorized admin', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/admin/attendance-registrations/${REGISTRATION_ID}`)
      .set('Authorization', `Bearer ${ADMIN_API_KEY}`)
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: { id: REGISTRATION_ID },
    });
    expect(deleteForAdmin).toHaveBeenCalledWith(REGISTRATION_ID);
  });

  it('returns 404 when deleting a nonexistent registration', async () => {
    deleteForAdmin.mockRejectedValueOnce(
      new NotFoundException('Attendance registration not found'),
    );

    const response = await request(app.getHttpServer())
      .delete(`/api/admin/attendance-registrations/${REGISTRATION_ID}`)
      .set('X-Admin-Api-Key', ADMIN_API_KEY)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Attendance registration not found',
      },
    });
  });

  it('rejects unauthorized deletion', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/admin/attendance-registrations/${REGISTRATION_ID}`)
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
      },
    });
    expect(deleteForAdmin).not.toHaveBeenCalled();
  });

  it('rejects an invalid registration id', async () => {
    await request(app.getHttpServer())
      .delete('/api/admin/attendance-registrations/not-a-uuid')
      .set('X-Admin-Api-Key', ADMIN_API_KEY)
      .expect(400);

    expect(deleteForAdmin).not.toHaveBeenCalled();
  });
});
