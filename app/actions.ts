"use server";

import { redirect } from "next/navigation";
import {
  archiveTaskRecord,
  completeTaskRecord,
  createBlockedTimeRecord,
  createContinuationTask,
  createTaskRecord,
  deleteBlockedTimeRecord,
  ensureCategoryRecord,
  getDashboardData,
  markSessionDone,
  runReschedule,
  updateBlockedTimeRecord,
  updateSettingsRecord,
  updateTaskRecord
} from "@/lib/data";
import { sanitizeString } from "@/lib/utils";
import { parseClock, zonedDateStringToUtc, zonedDateTimeStringToUtc } from "@/lib/time";
import { ScheduleTriggerType } from "@prisma/client";

function parseDate(value: string, timezone: string) {
  return zonedDateStringToUtc(value, timezone);
}

function parseDateTime(value: string, timezone: string) {
  return zonedDateTimeStringToUtc(value, timezone);
}

function parseEstimatedMinutes(formData: FormData) {
  const hours = Number(formData.get("estimatedHours") ?? 0);
  const minutes = Number(formData.get("estimatedMinutes") ?? 0);
  return hours * 60 + minutes;
}

function normalizeWorkEndTime(startTime: string, endTime: string) {
  const start = parseClock(startTime);
  const end = parseClock(endTime);
  const startTotal = start.hours * 60 + start.minutes;
  const endTotal = end.hours * 60 + end.minutes;

  if (endTotal > startTotal) {
    return endTime;
  }

  // Common user mistake: entering 5:00 PM as 05:00 in a 24-hour input.
  if (start.hours >= 6 && start.hours <= 12 && end.hours <= 6) {
    const normalizedHours = end.hours + 12;
    return `${String(normalizedHours).padStart(2, "0")}:${String(end.minutes).padStart(2, "0")}`;
  }

  return endTime;
}

export async function saveTaskAction(formData: FormData) {
  const dashboard = await getDashboardData();
  const taskId = sanitizeString(formData.get("taskId"));
  const name = sanitizeString(formData.get("name"));
  const selectedCategoryId = sanitizeString(formData.get("categoryId"));
  const newCategoryName = sanitizeString(formData.get("newCategoryName"));
  const doDate = sanitizeString(formData.get("doDate"));
  const dueDate = sanitizeString(formData.get("dueDate"));
  const dueTime = sanitizeString(formData.get("dueTime")) || null;
  const estimatedMinutes = parseEstimatedMinutes(formData);

  const ensuredCategory = newCategoryName
    ? await ensureCategoryRecord(dashboard.id, newCategoryName)
    : null;
  const categoryId = ensuredCategory?.id ?? selectedCategoryId;

  if (!name || !categoryId || !doDate || !dueDate || estimatedMinutes <= 0) {
    return;
  }

  const payload = {
    categoryId,
    name,
    doDate: parseDate(doDate, dashboard.timezone),
    dueDate: parseDate(dueDate, dashboard.timezone),
    dueTime,
    estimatedMinutes
  };

  if (taskId) {
    await updateTaskRecord(taskId, payload);
  } else {
    await createTaskRecord({
      userId: dashboard.id,
      ...payload
    });
  }
}

export async function archiveTaskAction(formData: FormData) {
  const taskId = sanitizeString(formData.get("taskId"));

  if (!taskId) {
    return;
  }

  await archiveTaskRecord(taskId);
  redirect("/");
}

export async function completeTaskAction(formData: FormData) {
  const taskId = sanitizeString(formData.get("taskId"));

  if (!taskId) {
    return;
  }

  await completeTaskRecord(taskId);
  redirect("/");
}

export async function saveBlockedTimeAction(formData: FormData) {
  const dashboard = await getDashboardData();
  const blockedTimeId = sanitizeString(formData.get("blockedTimeId"));
  const label = sanitizeString(formData.get("label")) || null;
  const startAt = sanitizeString(formData.get("startAt"));
  const endAt = sanitizeString(formData.get("endAt"));

  if (!startAt || !endAt) {
    return;
  }

  const payload = {
    label,
    startAt: parseDateTime(startAt, dashboard.timezone),
    endAt: parseDateTime(endAt, dashboard.timezone)
  };

  if (blockedTimeId) {
    await updateBlockedTimeRecord(blockedTimeId, payload);
  } else {
    await createBlockedTimeRecord({
      userId: dashboard.id,
      ...payload
    });
  }
}

export async function deleteBlockedTimeAction(formData: FormData) {
  const blockedTimeId = sanitizeString(formData.get("blockedTimeId"));

  if (!blockedTimeId) {
    return;
  }

  await deleteBlockedTimeRecord(blockedTimeId);
}

export async function updateSettingsAction(formData: FormData) {
  const dashboard = await getDashboardData();
  const timezone = sanitizeString(formData.get("timezone")) || dashboard.timezone;
  const requestedStartTime =
    sanitizeString(formData.get("defaultWorkStartTime")) || dashboard.defaultWorkStartTime;
  const requestedEndTime =
    sanitizeString(formData.get("defaultWorkEndTime")) || dashboard.defaultWorkEndTime;
  const defaultWorkStartTime = requestedStartTime;
  const defaultWorkEndTime = normalizeWorkEndTime(requestedStartTime, requestedEndTime);
  const defaultWorkDays = formData
    .getAll("defaultWorkDays")
    .map((item) => Number(item))
    .filter((value) => Number.isInteger(value));

  await updateSettingsRecord({
    userId: dashboard.id,
    timezone,
    defaultWorkDays: defaultWorkDays.length ? defaultWorkDays : dashboard.defaultWorkDays,
    defaultWorkStartTime,
    defaultWorkEndTime
  });
}

export async function markSessionDoneAction(formData: FormData) {
  const sessionId = sanitizeString(formData.get("sessionId"));
  const actualMinutesValue = sanitizeString(formData.get("actualMinutes"));

  if (!sessionId) {
    return;
  }

  await markSessionDone(sessionId, actualMinutesValue ? Number(actualMinutesValue) : undefined);
}

export async function reportOverrunAction(formData: FormData) {
  const taskId = sanitizeString(formData.get("taskId"));
  const hours = Number(formData.get("extraHours") ?? 0);
  const minutes = Number(formData.get("extraMinutes") ?? 0);
  const extraMinutes = hours * 60 + minutes;

  if (!taskId || extraMinutes <= 0) {
    return;
  }

  const continuation = await createContinuationTask({
    taskId,
    extraMinutes
  });

  redirect(`/tasks/${continuation.id}`);
}

export async function manualRescheduleAction() {
  const dashboard = await getDashboardData();
  await runReschedule(dashboard.id, ScheduleTriggerType.MANUAL_RESCHEDULE);
}
