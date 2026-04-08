import { PrismaClient, ScheduleTriggerType, SessionStatus, TaskStatus } from "@prisma/client";
import { addHours, addMinutes, startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  await prisma.scheduledSession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.blockedTime.deleteMany();
  await prisma.category.deleteMany();
  await prisma.scheduleRun.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      name: "Demo User",
      timezone: "America/New_York",
      defaultWorkDays: [1, 2, 3, 4, 5],
      defaultWorkStartTime: "09:00",
      defaultWorkEndTime: "17:00"
    }
  });

  const deepWork = await prisma.category.create({
    data: { userId: user.id, name: "Deep Work", color: "#2a9d8f" }
  });
  const admin = await prisma.category.create({
    data: { userId: user.id, name: "Admin", color: "#f4a261" }
  });
  await prisma.category.create({
    data: { userId: user.id, name: "Personal", color: "#e76f51" }
  });

  const today = startOfDay(new Date());
  const reportTask = await prisma.task.create({
    data: {
      userId: user.id,
      categoryId: deepWork.id,
      name: "Finish quarterly planning memo",
      doDate: addHours(today, 24),
      dueDate: addHours(today, 48),
      estimatedMinutes: 240,
      status: TaskStatus.SCHEDULED
    }
  });

  await prisma.scheduledSession.createMany({
    data: [
      {
        taskId: reportTask.id,
        startAt: addHours(today, 33),
        endAt: addHours(today, 35),
        plannedMinutes: 120,
        status: SessionStatus.PLANNED
      },
      {
        taskId: reportTask.id,
        startAt: addHours(today, 39),
        endAt: addHours(today, 41),
        plannedMinutes: 120,
        status: SessionStatus.PLANNED
      }
    ]
  });

  await prisma.task.create({
    data: {
      userId: user.id,
      categoryId: admin.id,
      name: "Expense reimbursements",
      doDate: addHours(today, 24),
      dueDate: addHours(today, 24 * 3),
      dueTime: "16:00",
      estimatedMinutes: 90,
      status: TaskStatus.SCHEDULED
    }
  });

  await prisma.blockedTime.createMany({
    data: [
      {
        userId: user.id,
        label: "Therapy",
        startAt: addHours(today, 34),
        endAt: addMinutes(addHours(today, 35), 30)
      },
      {
        userId: user.id,
        label: "Team sync",
        startAt: addHours(today, 58),
        endAt: addHours(today, 59)
      }
    ]
  });

  await prisma.scheduleRun.create({
    data: {
      userId: user.id,
      triggerType: ScheduleTriggerType.TASK_CREATED,
      finishedAt: new Date(),
      resultSummary: "Seeded demo schedule"
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
