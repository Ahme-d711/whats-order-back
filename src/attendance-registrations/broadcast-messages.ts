import { formatCairoDate, formatCairoTime } from './cairo-time.js';

export function buildConfirmationMessage(startsAt: Date | null): string {
  const lines = ['🎉 تم تأكيد تسجيلك في البث المباشر لتدريب WhatsOrder'];
  if (startsAt) {
    lines.push(`📅 ${formatCairoDate(startsAt)}`);
    lines.push(`🕒 ${formatCairoTime(startsAt)} بتوقيت القاهرة`);
  }
  lines.push('سنذكّرك قبل موعد البث.');
  return lines.join('\n');
}

export function buildScheduleUpdateMessage(startsAt: Date): string {
  return [
    'تم تحديث موعد البث المباشر لتدريب WhatsOrder.',
    `📅 الموعد الجديد: ${formatCairoDate(startsAt)}`,
    `🕒 ${formatCairoTime(startsAt)} بتوقيت القاهرة`,
    'يرجى الاعتماد على هذا الموعد بدلاً من الموعد السابق.',
  ].join('\n');
}

export function buildReminder24hMessage(
  startsAt: Date,
  meetingUrl: string | null,
): string {
  const lines = [
    '🔔 تذكير بموعد تدريب WhatsOrder',
    `البث المباشر غدًا، ${formatCairoDate(startsAt)}، الساعة ${formatCairoTime(startsAt)} بتوقيت القاهرة.`,
  ];
  if (meetingUrl) {
    lines.push(`🔗 رابط الحضور: ${meetingUrl}`);
  }
  return lines.join('\n');
}

export function buildReminder1hMessage(
  startsAt: Date,
  meetingUrl: string | null,
): string {
  const lines = [
    '⏰ باقي ساعة واحدة على البث المباشر لتدريب WhatsOrder',
    `نبدأ الساعة ${formatCairoTime(startsAt)} بتوقيت القاهرة.`,
  ];
  if (meetingUrl) {
    lines.push(`🔗 ادخل من هنا: ${meetingUrl}`);
  }
  return lines.join('\n');
}

export function buildStartMessage(meetingUrl: string | null): string {
  const lines = ['🔴 بدأ الآن البث المباشر لتدريب WhatsOrder'];
  if (meetingUrl) {
    lines.push('يمكنك الانضمام مباشرة من هنا:');
    lines.push(meetingUrl);
  }
  return lines.join('\n');
}
