import {
  Prisma,
  ScheduleTriggerType,
  SessionStatus,
  TaskStatus
} from "@prisma/client";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildSchedule } from "@/lib/scheduler";
import { nextWorkingDayFrom, parseClock } from "@/lib/time";
import { ExistingSession, SchedulerBlockedTime, SchedulerTask, WorkSettings } from "@/lib/types";

const demoUserId = "demo-user";
const starterCategoryColors = ["#2a9d8f", "#f4a261", "#e76f51", "#7f95d1", "#d17fa3", "#8eb486"];

async function ensureDemoUser() {
  const existing = await prisma.user.findFirst({
    include: {
      categories: true
    }
  });

  if (existing) {
    return existing;
  }

  const created = await prisma.user.create({
    data: {
      id: demoUserId,
      name: "Demo User",
      timezone: "America/New_York",
      defaultWorkDays: [1, 2, 3, 4, 5],
      defaultWorkStartTime: "09:00",
      defaultWorkEndTime: "17:00",
      categories: {
        create: [
          { name: "Work", color: "#2a9d8f" },
          { name: "Personal", color: "#e76f51" },
          { name: "School", color: "#7f95d1" },
          { name: "Errands", color: "#f4a261" }
        ]
      }
    },
    include: {
      categories: true
    }
  });

  return created;
}

export async function getDashboardData() {
  const user = await ensureDemoUser();
  const fullUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: {
      categories: {
        orderBy: { name: "asc" }
      },
      blockedTimes: {
        orderBy: { startAt: "asc" }
      },
      tasks: {
        where: {
          archivedAt: null
        },
        include: {
          category: true,
          sessions: {
            orderBy: { startAt: "asc" }
          },
          continuations: {
            include: {
              category: true
            },
            orderBy: { createdAt: "asc" }
          },
          parentTask: true
        },
        orderBy: [{ dueDate: "asc" }, { doDate: "asc" }]
      },
      scheduleRuns: {
        orderBy: { startedAt: "desc" },
        take: 1
      }
    }
  });

  return fullUser;
}

function mapSettings(user: {
  timezone: string;
  defaultWorkDays: number[];
  defaultWorkStartTime: string;
  defaultWorkEndTime: string;
}): WorkSettings {
  return {
    timezone: user.timezone,
    defaultWorkDays: user.defaultWorkDays,
    defaultWorkStartTime: user.defaultWorkStartTime,
    defaultWorkEndTime: user.defaultWorkEndTime
  };
}

async function collectSchedulingInputs(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId }
  });

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      archivedAt: null
    },
    orderBy: [{ dueDate: "asc" }, { doDate: "asc" }]
  });

  const blockedTimes = await prisma.blockedTime.findMany({
    where: { userId },
    orderBy: { startAt: "asc" }
  });

  const sessions = await prisma.scheduledSession.findMany({
    where: {
      task: {
        userId,
        archivedAt: null
      }
    },
    include: {
      task: true
    }
  });

  const mappedTasks: SchedulerTask[] = tasks.map((task) => ({
    id: task.id,
    name: task.name,
    categoryId: task.categoryId,
    doDate: task.doDate,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    estimatedMinutes: task.estimatedMinutes,
    status: task.status
  }));

  const mappedBlockedTimes: SchedulerBlockedTime[] = blockedTimes.map((blockedTime) => ({
    id: blockedTime.id,
    startAt: blockedTime.startAt,
    endAt: blockedTime.endAt,
    label: blockedTime.label
  }));

  const existingSessions: ExistingSession[] = sessions.map((session) => ({
    id: session.id,
    taskId: session.taskId,
    startAt: session.startAt,
    endAt: session.endAt,
    plannedMinutes: session.plannedMinutes,
    status: session.status
  }));

  return {
    user,
    tasks,
    mappedTasks,
    mappedBlockedTimes,
    existingSessions
  };
}

export async function runReschedule(userId: string, triggerType: ScheduleTriggerType) {
  const { user, tasks, mappedTasks, mappedBlockedTimes, existingSessions } =
    await collectSchedulingInputs(userId);

  const scheduleResult = buildSchedule({
    tasks: mappedTasks,
    blockedTimes: mappedBlockedTimes,
    existingSessions,
    settings: mapSettings(user)
  });

  await prisma.$transaction(async (tx) => {
    await tx.scheduledSession.deleteMany({
      where: {
        task: {
          userId,
          archivedAt: null
        },
        status: SessionStatus.PLANNED
      }
    });

    for (const result of scheduleResult.results) {
      const task = tasks.find((item) => item.id === result.taskId);

      if (!task || task.status === TaskStatus.DONE || task.archivedAt) {
        continue;
      }

      await tx.task.update({
        where: { id: task.id },
        data: {
          status: result.unscheduledMinutes > 0 ? TaskStatus.AT_RISK : TaskStatus.SCHEDULED
        }
      });

      if (result.chunks.length) {
        await tx.scheduledSession.createMany({
          data: result.chunks.map((chunk) => ({
            taskId: chunk.taskId,
            startAt: chunk.startAt,
            endAt: chunk.endAt,
            plannedMinutes: chunk.plannedMinutes,
            status: SessionStatus.PLANNED
          }))
        });
      }
    }

    await tx.scheduleRun.create({
      data: {
        userId,
        triggerType,
        finishedAt: new Date(),
        resultSummary: scheduleResult.summary
      }
    });
  });

  revalidatePath("/");

  return scheduleResult;
}

export async function createTaskRecord(input: {
  userId: string;
  categoryId: string;
  name: string;
  doDate: Date;
  dueDate: Date;
  dueTime: string | null;
  estimatedMinutes: number;
}) {
  await prisma.task.create({
    data: {
      ...input,
      status: TaskStatus.SCHEDULED
    }
  });

  return runReschedule(input.userId, ScheduleTriggerType.TASK_CREATED);
}

export async function ensureCategoryRecord(userId: string, rawName: string) {
  const name = rawName.trim();

  if (!name) {
    return null;
  }

  const existing = await prisma.category.findFirst({
    where: {
      userId,
      name: {
        equals: name,
        mode: "insensitive"
      }
    }
  });

  if (existing) {
    return existing;
  }

  const count = await prisma.category.count({
    where: { userId }
  });

  return prisma.category.create({
    data: {
      userId,
      name,
      color: starterCategoryColors[count % starterCategoryColors.length]
    }
  });
}

export async function updateTaskRecord(
  taskId: string,
  input: {
    categoryId: string;
    name: string;
    doDate: Date;
    dueDate: Date;
    dueTime: string | null;
    estimatedMinutes: number;
  }
) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: input
  });

  return runReschedule(task.userId, ScheduleTriggerType.TASK_UPDATED);
}

export async function archiveTaskRecord(taskId: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      archivedAt: new Date(),
      status: TaskStatus.ARCHIVED
    }
  });

  return runReschedule(task.userId, ScheduleTriggerType.TASK_UPDATED);
}

export async function completeTaskRecord(taskId: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: TaskStatus.DONE,
      completedAt: new Date()
    }
  });

  await prisma.scheduledSession.updateMany({
    where: {
      taskId,
      status: SessionStatus.PLANNED
    },
    data: {
      status: SessionStatus.SKIPPED
    }
  });

  return runReschedule(task.userId, ScheduleTriggerType.TASK_COMPLETED);
}

export async function markSessionDone(sessionId: string, actualMinutes?: number) {
  const session = await prisma.scheduledSession.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.DONE,
      actualMinutes: actualMinutes ?? undefined
    },
    include: {
      task: true
    }
  });

  const remainingPlanned = await prisma.scheduledSession.count({
    where: {
      taskId: session.taskId,
      status: SessionStatus.PLANNED
    }
  });

  if (!remainingPlanned) {
    await prisma.task.update({
      where: { id: session.taskId },
      data: {
        status: TaskStatus.IN_PROGRESS
      }
    });
  }

  revalidatePath("/");
  revalidatePath(`/tasks/${session.taskId}`);
}

export async function createBlockedTimeRecord(input: {
  userId: string;
  label: string | null;
  startAt: Date;
  endAt: Date;
}) {
  await prisma.blockedTime.create({
    data: input
  });

  return runReschedule(input.userId, ScheduleTriggerType.BLOCKED_TIME_ADDED);
}

export async function updateBlockedTimeRecord(
  blockedTimeId: string,
  input: {
    label: string | null;
    startAt: Date;
    endAt: Date;
  }
) {
  const blockedTime = await prisma.blockedTime.update({
    where: { id: blockedTimeId },
    data: input
  });

  return runReschedule(blockedTime.userId, ScheduleTriggerType.BLOCKED_TIME_UPDATED);
}

export async function deleteBlockedTimeRecord(blockedTimeId: string) {
  const blockedTime = await prisma.blockedTime.delete({
    where: { id: blockedTimeId }
  });

  return runReschedule(blockedTime.userId, ScheduleTriggerType.BLOCKED_TIME_DELETED);
}

export async function updateSettingsRecord(input: {
  userId: string;
  timezone: string;
  defaultWorkDays: number[];
  defaultWorkStartTime: string;
  defaultWorkEndTime: string;
}) {
  const { userId, ...settingsData } = input;

  await prisma.user.update({
    where: { id: userId },
    data: settingsData
  });

  return runReschedule(userId, ScheduleTriggerType.MANUAL_RESCHEDULE);
}

export async function createContinuationTask(input: {
  taskId: string;
  extraMinutes: number;
}) {
  const sourceTask = await prisma.task.findUniqueOrThrow({
    where: { id: input.taskId }
  });
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sourceTask.userId }
  });
  const now = new Date();
  const { hours: workEndHour, minutes: workEndMinute } = parseClock(user.defaultWorkEndTime);
  const workdayHasEnded =
    now.getHours() > workEndHour ||
    (now.getHours() === workEndHour && now.getMinutes() >= workEndMinute);
  const continuationDoDate = nextWorkingDayFrom(
    workdayHasEnded ? addDays(now, 1) : now,
    user.defaultWorkDays
  );
  const continuationDueDate =
    sourceTask.dueDate.getTime() >= continuationDoDate.getTime()
      ? sourceTask.dueDate
      : continuationDoDate;

  const continuation = await prisma.task.create({
    data: {
      userId: sourceTask.userId,
      categoryId: sourceTask.categoryId,
      name: `${sourceTask.name} (Continuation)`,
      doDate: continuationDoDate,
      dueDate: continuationDueDate,
      dueTime: sourceTask.dueTime,
      estimatedMinutes: input.extraMinutes,
      status: TaskStatus.SCHEDULED,
      parentTaskId: sourceTask.id,
      createdFromOverrun: true
    }
  });

  await runReschedule(sourceTask.userId, ScheduleTriggerType.OVERRUN_REPORTED);

  return continuation;
}

export type TaskWithRelations = Prisma.TaskGetPayload<{
  include: {
    category: true;
    sessions: true;
    continuations: {
      include: {
        category: true;
      };
    };
    parentTask: true;
  };
}>;
