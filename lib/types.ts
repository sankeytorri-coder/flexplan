export type WorkSettings = {
  timezone: string;
  defaultWorkDays: number[];
  defaultWorkStartTime: string;
  defaultWorkEndTime: string;
};

export type SchedulerTask = {
  id: string;
  name: string;
  categoryId: string;
  doDate: Date;
  dueDate: Date;
  dueTime: string | null;
  estimatedMinutes: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "WAITING" | "DONE" | "AT_RISK" | "ARCHIVED";
  dependsOnTaskId?: string | null;
  createdFromOverrun?: boolean;
};

export type SchedulerBlockedTime = {
  id: string;
  startAt: Date;
  endAt: Date;
  label?: string | null;
};

export type ExistingSession = {
  id: string;
  taskId: string;
  startAt: Date;
  endAt: Date;
  plannedMinutes: number;
  status: "PLANNED" | "DONE" | "SKIPPED";
};

export type ScheduledChunk = {
  taskId: string;
  startAt: Date;
  endAt: Date;
  plannedMinutes: number;
};

export type TaskSchedulingResult = {
  taskId: string;
  chunks: ScheduledChunk[];
  unscheduledMinutes: number;
  status: "SCHEDULED" | "AT_RISK" | "WAITING";
};

export type ScheduleResult = {
  results: TaskSchedulingResult[];
  summary: string;
};
