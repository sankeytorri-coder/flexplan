import { addMinutes, differenceInMinutes, isAfter, isBefore, max, min, startOfDay } from "date-fns";
import { getDeadline, listCandidateDays, roundUpToIncrement, setDayTime } from "@/lib/time";
import {
  ExistingSession,
  ScheduleResult,
  ScheduledChunk,
  SchedulerBlockedTime,
  SchedulerTask,
  WorkSettings
} from "@/lib/types";

type TimeRange = {
  startAt: Date;
  endAt: Date;
};

const SESSION_INCREMENT_MINUTES = 30;
const DEFAULT_CHUNK_MINUTES = 120;

function overlaps(left: TimeRange, right: TimeRange) {
  return left.startAt < right.endAt && right.startAt < left.endAt;
}

function subtractRange(source: TimeRange, removal: TimeRange) {
  if (!overlaps(source, removal)) {
    return [source];
  }

  const result: TimeRange[] = [];

  if (isBefore(source.startAt, removal.startAt)) {
    result.push({
      startAt: source.startAt,
      endAt: removal.startAt
    });
  }

  if (isAfter(source.endAt, removal.endAt)) {
    result.push({
      startAt: removal.endAt,
      endAt: source.endAt
    });
  }

  return result.filter((range) => isBefore(range.startAt, range.endAt));
}

function normalizeRanges(ranges: TimeRange[]) {
  return [...ranges].sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
}

function getWorkingWindow(day: Date, settings: WorkSettings, now: Date, deadline: Date) {
  const weekday = day.getDay();

  if (!settings.defaultWorkDays.includes(weekday)) {
    return null;
  }

  let startAt = setDayTime(day, settings.defaultWorkStartTime);
  let endAt = setDayTime(day, settings.defaultWorkEndTime);

  if (isBefore(endAt, startAt) || endAt.getTime() === startAt.getTime()) {
    return null;
  }

  if (startOfDay(day).getTime() === startOfDay(now).getTime() && isAfter(now, startAt)) {
    startAt = now;
  }

  startAt = roundUpToIncrement(startAt, SESSION_INCREMENT_MINUTES);

  endAt = min([endAt, deadline]);

  if (!isBefore(startAt, endAt)) {
    return null;
  }

  return { startAt, endAt };
}

function getUnavailableRanges(
  taskId: string,
  blockedTimes: SchedulerBlockedTime[],
  existingSessions: ExistingSession[],
  plannedChunks: ScheduledChunk[]
) {
  const blocked = blockedTimes.map((item) => ({ startAt: item.startAt, endAt: item.endAt }));
  const sessions = existingSessions
    .filter((session) => session.status === "DONE" || session.taskId !== taskId)
    .map((session) => ({ startAt: session.startAt, endAt: session.endAt }));
  const chunks = plannedChunks.map((chunk) => ({ startAt: chunk.startAt, endAt: chunk.endAt }));

  return normalizeRanges([...blocked, ...sessions, ...chunks]);
}

function carveAvailability(window: TimeRange, unavailable: TimeRange[]) {
  return unavailable.reduce<TimeRange[]>((availableRanges, busyRange) => {
    return availableRanges.flatMap((availableRange) => subtractRange(availableRange, busyRange));
  }, [window]);
}

function buildChunk(
  task: SchedulerTask,
  range: TimeRange,
  remainingMinutes: number
): { chunk: ScheduledChunk; usedMinutes: number } | null {
  const snappedStart = roundUpToIncrement(range.startAt, SESSION_INCREMENT_MINUTES);
  const availableMinutes = differenceInMinutes(range.endAt, snappedStart);
  const idealMinutes = Math.min(remainingMinutes, DEFAULT_CHUNK_MINUTES, availableMinutes);
  const roundedMinutes = Math.max(
    Math.min(idealMinutes, availableMinutes),
    Math.min(SESSION_INCREMENT_MINUTES, availableMinutes)
  );
  const snappedMinutes = roundedMinutes >= SESSION_INCREMENT_MINUTES
    ? Math.floor(roundedMinutes / SESSION_INCREMENT_MINUTES) * SESSION_INCREMENT_MINUTES
    : roundedMinutes;

  if (snappedMinutes <= 0) {
    return null;
  }

  return {
    usedMinutes: snappedMinutes,
    chunk: {
      taskId: task.id,
      startAt: snappedStart,
      endAt: addMinutes(snappedStart, snappedMinutes),
      plannedMinutes: snappedMinutes
    }
  };
}

export function buildSchedule({
  tasks,
  blockedTimes,
  existingSessions,
  settings,
  now = new Date()
}: {
  tasks: SchedulerTask[];
  blockedTimes: SchedulerBlockedTime[];
  existingSessions: ExistingSession[];
  settings: WorkSettings;
  now?: Date;
}): ScheduleResult {
  const activeTasks = tasks
    .filter((task) => task.status !== "DONE" && task.status !== "ARCHIVED")
    .sort((left, right) => {
      const leftDeadline = getDeadline(left.dueDate, left.dueTime);
      const rightDeadline = getDeadline(right.dueDate, right.dueTime);

      if (leftDeadline.getTime() !== rightDeadline.getTime()) {
        return leftDeadline.getTime() - rightDeadline.getTime();
      }

      return left.doDate.getTime() - right.doDate.getTime();
    });

  const plannedChunks: ScheduledChunk[] = [];
  const results = activeTasks.map((task) => {
    let remainingMinutes = task.estimatedMinutes;
    const deadline = getDeadline(task.dueDate, task.dueTime);
    const candidateDays = listCandidateDays(task.doDate, task.dueDate, now);
    const chunks: ScheduledChunk[] = [];

    for (const day of candidateDays) {
      if (remainingMinutes <= 0) {
        break;
      }

      const window = getWorkingWindow(day, settings, now, deadline);

      if (!window) {
        continue;
      }

      const unavailable = getUnavailableRanges(task.id, blockedTimes, existingSessions, plannedChunks);
      const availableRanges = carveAvailability(window, unavailable);

      for (const availableRange of availableRanges) {
        if (remainingMinutes <= 0) {
          break;
        }

        const chunkResult = buildChunk(task, availableRange, remainingMinutes);

        if (!chunkResult) {
          continue;
        }

        chunks.push(chunkResult.chunk);
        plannedChunks.push(chunkResult.chunk);
        remainingMinutes -= chunkResult.usedMinutes;
      }
    }

    return {
      taskId: task.id,
      chunks,
      unscheduledMinutes: remainingMinutes,
      status: remainingMinutes > 0 ? "AT_RISK" : "SCHEDULED"
    } as const;
  });

  const atRiskCount = results.filter((result) => result.unscheduledMinutes > 0).length;
  const scheduledCount = results.length - atRiskCount;

  return {
    results,
    summary: `${scheduledCount} task(s) fully scheduled, ${atRiskCount} task(s) marked at risk`
  };
}
