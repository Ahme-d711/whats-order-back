import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment.js';

describe('validateEnvironment', () => {
  it('normalizes valid configuration', () => {
    expect(
      validateEnvironment({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/attendance',
        PORT: '4000',
        CORS_ORIGINS: 'https://one.example, https://two.example',
        NODE_ENV: 'production',
        ADMIN_API_KEY: 'prod-admin-key',
      }),
    ).toMatchObject({
      port: 4000,
      corsOrigins: ['https://one.example', 'https://two.example'],
      NODE_ENV: 'production',
      adminApiKey: 'prod-admin-key',
    });
  });

  it('requires a PostgreSQL database URL', () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL: 'mysql://localhost/database' }),
    ).toThrow('DATABASE_URL must be a PostgreSQL connection URL');
  });

  it('requires ADMIN_API_KEY in production', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/attendance',
        NODE_ENV: 'production',
      }),
    ).toThrow('ADMIN_API_KEY is required in production');
  });

  it('accepts ADMIN_API_KEY in production', () => {
    expect(
      validateEnvironment({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/attendance',
        NODE_ENV: 'production',
        ADMIN_API_KEY: '  secret-admin-key  ',
      }),
    ).toMatchObject({
      NODE_ENV: 'production',
      adminApiKey: 'secret-admin-key',
    });
  });
});
