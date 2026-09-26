import { describe, expect, it } from 'vitest';
import {
  buildConfirmationMessage,
  buildReminder1hMessage,
  buildReminder24hMessage,
  buildScheduleUpdateMessage,
  buildStartMessage,
} from './broadcast-messages.js';
import { cairoLocalToUtc } from './cairo-time.js';

const startsAt = cairoLocalToUtc('2026-09-28T11:00');

describe('broadcast messages', () => {
  it('confirms a registration without a date until one is saved', () => {
    expect(buildConfirmationMessage(null)).toBe(
      [
        '🎉 تم تأكيد تسجيلك في البث المباشر لتدريب WhatsOrder',
        'سنذكّرك قبل موعد البث.',
      ].join('\n'),
    );
  });

  it('fills the Cairo date and time into the confirmation', () => {
    const message = buildConfirmationMessage(startsAt);
    expect(message).toContain('📅');
    expect(message).toContain('28');
    expect(message).toContain('2026');
    expect(message).toContain('🕒 11:00 بتوقيت القاهرة');
    expect(message).not.toContain('http');
  });

  it('uses the update copy when the time changes', () => {
    const message = buildScheduleUpdateMessage(startsAt);
    expect(message).toContain('تم تحديث موعد البث المباشر لتدريب WhatsOrder.');
    expect(message).toContain('📅 الموعد الجديد:');
    expect(message).toContain('🕒 11:00 بتوقيت القاهرة');
    expect(message).toContain('يرجى الاعتماد على هذا الموعد بدلاً من الموعد السابق.');
  });

  it('adds the meeting link only when the admin saved one', () => {
    const url = 'https://live.example/whatsorder';
    expect(buildReminder24hMessage(startsAt, null)).not.toContain('رابط الحضور');
    expect(buildReminder24hMessage(startsAt, url)).toContain(`🔗 رابط الحضور: ${url}`);
    expect(buildReminder1hMessage(startsAt, null)).not.toContain('ادخل من هنا');
    expect(buildReminder1hMessage(startsAt, url)).toContain(`🔗 ادخل من هنا: ${url}`);
    expect(buildStartMessage(null)).toBe('🔴 بدأ الآن البث المباشر لتدريب WhatsOrder');
    expect(buildStartMessage(url)).toContain(url);
    expect(buildStartMessage(url)).toContain('يمكنك الانضمام مباشرة من هنا:');
  });
});
