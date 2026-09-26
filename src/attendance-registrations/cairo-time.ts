const CAIRO_TIME_ZONE = 'Africa/Cairo';

const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function cairoLocalToUtc(local: string): Date {
  const match = LOCAL_DATETIME.exec(local);
  if (!match) {
    throw new Error('Invalid Cairo datetime');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    throw new Error('Invalid Cairo datetime');
  }

  let utc = Date.UTC(year, month - 1, day, hour, minute);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    utc = Date.UTC(year, month - 1, day, hour, minute) - timeZoneOffset(new Date(utc), CAIRO_TIME_ZONE);
  }

  const result = new Date(utc);
  if (formatCairoLocalInput(result) !== local) {
    throw new Error('Invalid Cairo datetime');
  }

  return result;
}

export function formatCairoLocalInput(date: Date): string {
  const parts = cairoParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function formatCairoDate(date: Date): string {
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: CAIRO_TIME_ZONE,
  })
    .format(date)
    .replace(/[،,]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function formatCairoTime(date: Date): string {
  const parts = cairoParts(date);
  return `${parts.hour}:${parts.minute}`;
}

function cairoParts(date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);

  const mapped = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  if (mapped.hour === '24') {
    mapped.hour = '00';
  }
  return mapped;
}

function timeZoneOffset(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  const hour = value.hour === '24' ? '00' : value.hour;

  return (
    Date.UTC(
      Number(value.year),
      Number(value.month) - 1,
      Number(value.day),
      Number(hour),
      Number(value.minute),
      Number(value.second),
    ) - date.getTime()
  );
}
