export const REMINDER_KINDS = ['REMINDER_24H', 'REMINDER_1H', 'START'] as const;

export type ReminderKind = (typeof REMINDER_KINDS)[number];

export interface ReminderDecision {
  send: ReminderKind | null;
  skip: ReminderKind[];
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const START_GRACE_MS = 30 * 60 * 1000;

export function selectDueReminder(
  startsAt: Date,
  now: Date,
): ReminderDecision | null {
  const start = startsAt.getTime();
  const current = now.getTime();
  if (current < start - DAY_MS) {
    return null;
  }

  const windows: Array<{ kind: ReminderKind; open: number; close: number }> = [
    { kind: 'REMINDER_24H', open: start - DAY_MS, close: start - HOUR_MS },
    { kind: 'REMINDER_1H', open: start - HOUR_MS, close: start },
    { kind: 'START', open: start, close: start + START_GRACE_MS },
  ];

  const due = windows.filter((window) => current >= window.open);
  const sendable = due.filter((window) =>
    window.kind === 'START' ? current <= window.close : current < window.close,
  );
  const send = sendable.at(-1)?.kind ?? null;
  const skip = due
    .filter((window) => window.kind !== send)
    .map((window) => window.kind);

  if (!send && skip.length === 0) {
    return null;
  }

  return { send, skip };
}
