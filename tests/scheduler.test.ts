import test from "node:test";
import assert from "node:assert/strict";
import { buildSchedule } from "@/lib/scheduler";
import { ExistingSession, SchedulerBlockedTime, SchedulerTask, WorkSettings } from "@/lib/types";

const settings: WorkSettings = {
  timezone: "America/New_York",
  defaultWorkDays: [1, 2, 3, 4, 5],
  defaultWorkStartTime: "09:00",
  defaultWorkEndTime: "17:00"
};

function task(overrides: Partial<SchedulerTask>): SchedulerTask {
  return {
    id: "task-1",
    name: "Test task",
    categoryId: "cat-1",
    doDate: new Date("2026-04-09T00:00:00"),
    dueDate: new Date("2026-04-10T00:00:00"),
    dueTime: null,
    estimatedMinutes: 180,
    status: "SCHEDULED",
    ...overrides
  };
}

test("schedules work on or near the do date inside working hours", () => {
  const result = buildSchedule({
    tasks: [task({ estimatedMinutes: 180 })],
    blockedTimes: [],
    existingSessions: [],
    settings,
    now: new Date("2026-04-08T08:00:00")
  });

  assert.equal(result.results[0]?.status, "SCHEDULED");
  assert.equal(result.results[0]?.unscheduledMinutes, 0);
  assert.equal(result.results[0]?.chunks.length, 2);
  assert.equal(result.results[0]?.chunks[0]?.startAt.getHours(), 9);
});

test("moves work around blocked time and flags at risk when the deadline cannot fit it all", () => {
  const blockedTimes: SchedulerBlockedTime[] = [
    {
      id: "block-1",
      startAt: new Date("2026-04-09T09:00:00"),
      endAt: new Date("2026-04-09T15:00:00"),
      label: "Meeting wall"
    }
  ];

  const result = buildSchedule({
    tasks: [task({ estimatedMinutes: 420 })],
    blockedTimes,
    existingSessions: [],
    settings,
    now: new Date("2026-04-08T08:00:00")
  });

  assert.equal(result.results[0]?.status, "AT_RISK");
  assert.ok((result.results[0]?.unscheduledMinutes ?? 0) > 0);
});

test("avoids overlaps with existing completed sessions and other planned work", () => {
  const tasks: SchedulerTask[] = [
    task({ id: "task-1", estimatedMinutes: 120 }),
    task({ id: "task-2", name: "Second task", estimatedMinutes: 120, doDate: new Date("2026-04-09T00:00:00") })
  ];
  const existingSessions: ExistingSession[] = [
    {
      id: "done-1",
      taskId: "historic",
      startAt: new Date("2026-04-09T09:00:00"),
      endAt: new Date("2026-04-09T11:00:00"),
      plannedMinutes: 120,
      status: "DONE"
    }
  ];

  const result = buildSchedule({
    tasks,
    blockedTimes: [],
    existingSessions,
    settings,
    now: new Date("2026-04-08T08:00:00")
  });

  const allChunks = result.results.flatMap((item) => item.chunks);

  assert.equal(allChunks.length, 2);
  assert.equal(allChunks[0]?.startAt.getHours(), 11);
  assert.equal(allChunks[1]?.startAt.getHours(), 13);
});
