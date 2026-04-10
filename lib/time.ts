import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  isBefore,
  set,
  startOfDay
} from "date-fns";

export const supportedTimezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney"
] as const;

const fallbackTimezone = "America/New_York";

export function normalizeTimezone(timezone: string | null | undefined) {
  const value = timezone?.trim();

  if (!value) {
    return fallbackTimezone;
  }

  try {
    Intl.DateTimeFormat("en-US", {
      timeZone: value
    }).format(new Date());
    return value;
  } catch {
    return fallbackTimezone;
  }
}

export function parseClock(clock: string) {
  const [hours, minutes] = clock.split(":").map(Number);
  return { hours, minutes };
}

export function setDayTime(day: Date, clock: string) {
  const { hours, minutes } = parseClock(clock);
  return set(startOfDay(day), {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0
  });
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

export function dateKeyToUtcMidday(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

export function setDayTimeInTimezone(day: Date, clock: string, timezone: string) {
  return zonedDateTimeStringToUtc(`${getDateKeyInTimezone(day, timezone)}T${clock}`, timezone);
}

export function getDeadline(dueDate: Date, dueTime: string | null, timezone: string) {
  if (!dueTime) {
    return zonedDateTimeStringToUtc(`${getDateKeyInTimezone(dueDate, timezone)}T23:59`, timezone);
  }

  return setDayTimeInTimezone(dueDate, dueTime, timezone);
}

export function listCandidateDays(doDate: Date, dueDate: Date, timezone: string, now = new Date()) {
  const floorKey = getDateKeyInTimezone(now, timezone);
  const doKey = getDateKeyInTimezone(doDate, timezone);
  const dueKey = getDateKeyInTimezone(dueDate, timezone);
  const floor = dateKeyToUtcMidday(floorKey);
  const preferred = dateKeyToUtcMidday(doKey);
  const start = isBefore(preferred, floor) ? floor : preferred;
  const end = dateKeyToUtcMidday(dueKey);
  const totalDays = differenceInCalendarDays(end, start) + 1;

  if (totalDays <= 0) {
    return [];
  }

  const days = Array.from({ length: totalDays }, (_, index) => addDays(start, index));

  return [...days].sort((left, right) => {
    const leftDistance = Math.abs(differenceInCalendarDays(left, preferred));
    const rightDistance = Math.abs(differenceInCalendarDays(right, preferred));

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    return left.getTime() - right.getTime();
  });
}

export function sameCalendarDay(left: Date, right: Date) {
  return format(left, "yyyy-MM-dd") === format(right, "yyyy-MM-dd");
}

export function roundUpToIncrement(date: Date, incrementMinutes: number) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);

  const minutes = rounded.getMinutes();
  const remainder = minutes % incrementMinutes;

  if (remainder === 0) {
    return rounded;
  }

  rounded.setMinutes(minutes + (incrementMinutes - remainder));
  return rounded;
}

export function nextWorkingDayFrom(date: Date, workDays: number[]) {
  let candidate = startOfDay(date);

  for (let index = 0; index < 14; index += 1) {
    if (workDays.includes(candidate.getDay())) {
      return candidate;
    }

    candidate = addDays(candidate, 1);
  }

  return startOfDay(date);
}

export function getZonedNow(timezone: string, source = new Date()) {
  const safeTimezone = normalizeTimezone(timezone);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(source);
  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");

  return new Date(
    getPart("year"),
    getPart("month") - 1,
    getPart("day"),
    getPart("hour"),
    getPart("minute"),
    getPart("second"),
    0
  );
}

export function getZonedParts(date: Date, timezone: string) {
  const safeTimezone = normalizeTimezone(timezone);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
    second: getPart("second")
  };
}

export function getDateKeyInTimezone(date: Date, timezone: string) {
  const parts = getZonedParts(date, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function getClockMinutesInTimezone(date: Date, timezone: string) {
  const parts = getZonedParts(date, timezone);
  return parts.hour * 60 + parts.minute;
}

export function formatTimeInTimezone(date: Date, timezone: string) {
  const safeTimezone = normalizeTimezone(timezone);

  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

export function formatDateLabelInTimezone(date: Date, timezone: string, options: Intl.DateTimeFormatOptions) {
  const safeTimezone = normalizeTimezone(timezone);

  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone,
    ...options
  }).format(date);
}

export function zonedDateTimeStringToUtc(value: string, timezone: string) {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const zonedGuess = getZonedParts(utcGuess, timezone);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const zonedGuessAsUtc = Date.UTC(
    zonedGuess.year,
    zonedGuess.month - 1,
    zonedGuess.day,
    zonedGuess.hour,
    zonedGuess.minute,
    zonedGuess.second,
    0
  );

  return new Date(utcGuess.getTime() + (targetAsUtc - zonedGuessAsUtc));
}

export function zonedDateStringToUtc(value: string, timezone: string) {
  return zonedDateTimeStringToUtc(`${value}T00:00`, timezone);
}
