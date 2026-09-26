import { describe, expect, it } from 'vitest';
import { selectDueReminder } from './reminder-schedule.js';

const startsAt = new Date('2026-09-28T08:00:00.000Z');

describe('selectDueReminder', () => {
  it('waits until 24 hours before the broadcast', () => {
    expect(selectDueReminder(startsAt, new Date('2026-09-27T07:59:00.000Z'))).toBeNull();
  });

  it('sends the 24-hour reminder inside its window', () => {
    expect(selectDueReminder(startsAt, new Date('2026-09-27T08:00:00.000Z'))).toEqual({
      send: 'REMINDER_24H',
      skip: [],
    });
  });

  it('skips the day reminder once the one-hour window opens', () => {
    expect(selectDueReminder(startsAt, new Date('2026-09-28T07:30:00.000Z'))).toEqual({
      send: 'REMINDER_1H',
      skip: ['REMINDER_24H'],
    });
  });

  it('sends the start reminder during the 30-minute grace and skips earlier ones', () => {
    expect(selectDueReminder(startsAt, new Date('2026-09-28T08:10:00.000Z'))).toEqual({
      send: 'START',
      skip: ['REMINDER_24H', 'REMINDER_1H'],
    });
  });

  it('drops every reminder after the start grace', () => {
    expect(selectDueReminder(startsAt, new Date('2026-09-28T08:31:00.000Z'))).toEqual({
      send: null,
      skip: ['REMINDER_24H', 'REMINDER_1H', 'START'],
    });
  });
});
