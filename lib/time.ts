import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  isBefore,
  set,
  startOfDay
} from "date-fns";

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

export function getDeadline(dueDate: Date, dueTime: string | null) {
  if (!dueTime) {
    return endOfDay(dueDate);
  }

  return setDayTime(dueDate, dueTime);
}

export function listCandidateDays(doDate: Date, dueDate: Date, now = new Date()) {
  const floor = startOfDay(now);
  const start = isBefore(startOfDay(doDate), floor) ? floor : startOfDay(doDate);
  const end = startOfDay(dueDate);
  const totalDays = differenceInCalendarDays(end, start) + 1;

  if (totalDays <= 0) {
    return [];
  }

  const days = Array.from({ length: totalDays }, (_, index) => addDays(start, index));

  return [...days].sort((left, right) => {
    const leftDistance = Math.abs(differenceInCalendarDays(left, startOfDay(doDate)));
    const rightDistance = Math.abs(differenceInCalendarDays(right, startOfDay(doDate)));

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
