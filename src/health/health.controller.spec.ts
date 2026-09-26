import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('reports that the process is ready', () => {
    expect(new HealthController().check()).toEqual({ status: 'ok' });
  });
});
