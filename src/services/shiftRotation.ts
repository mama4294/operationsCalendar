// Computes the standing "2-2-3" (Pitman) crew rotation: each of the two
// day/night pairs works 7 of every 14 days, alternating so exactly one pair
// is on duty on any given date. Anchored so Jan 5-6, 2026 (Mon-Tue) is a
// confirmed A/B work block.
export type DayCrew = "A" | "C";
export type NightCrew = "B" | "D";

export interface OnDutyCrews {
  day: DayCrew;
  night: NightCrew;
}

const ANCHOR = new Date(2026, 0, 5); // Monday Jan 5, 2026 - local midnight
const CYCLE_LENGTH_DAYS = 14;

// Dataverse returns date-only fields (shift assignment/time off start/end
// dates) as UTC midnight, e.g. "2026-01-15T00:00:00Z". Parsing that directly
// with `new Date(...)` and then reading local getFullYear/Month/Date shifts
// the calendar day back by one in any timezone behind UTC. This extracts the
// literal Y-M-D from the string and builds a local-midnight Date from it,
// so the calendar date always matches what's stored in Dataverse regardless
// of the browser's timezone.
export function parseDateOnly(value?: string): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

// Index 0 = anchor day. true = A/B on duty, false = C/D on duty.
// Mon,Tue on / Wed,Thu,Fri off / Sat,Sun on / Mon,Tue off / Wed,Thu,Fri on / Sat,Sun off
const AB_ON_DUTY = [
  true, true,
  false, false, false,
  true, true,
  false, false,
  true, true, true,
  false, false,
];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / msPerDay);
}

export function getOnDutyCrews(date: Date): OnDutyCrews {
  const diff = daysBetween(ANCHOR, date);
  const idx = ((diff % CYCLE_LENGTH_DAYS) + CYCLE_LENGTH_DAYS) % CYCLE_LENGTH_DAYS;
  return AB_ON_DUTY[idx] ? { day: "A", night: "B" } : { day: "C", night: "D" };
}

// Groups consecutive days that share the same on-duty pair into single
// [start, end) ranges, so the banner can render one bar per stretch instead
// of one per day.
export interface ShiftSegment {
  start: Date;
  end: Date; // exclusive
  day: DayCrew;
  night: NightCrew;
}

export function getShiftSegments(rangeStart: Date, rangeEnd: Date): ShiftSegment[] {
  const segments: ShiftSegment[] = [];
  let cursor = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  while (cursor < end) {
    const crews = getOnDutyCrews(cursor);
    const segmentStart = new Date(cursor);
    let segmentEnd = new Date(cursor);
    segmentEnd.setDate(segmentEnd.getDate() + 1);
    while (
      segmentEnd < end &&
      getOnDutyCrews(segmentEnd).day === crews.day &&
      getOnDutyCrews(segmentEnd).night === crews.night
    ) {
      segmentEnd.setDate(segmentEnd.getDate() + 1);
    }
    segments.push({ start: segmentStart, end: segmentEnd, ...crews });
    cursor = segmentEnd;
  }
  return segments;
}
