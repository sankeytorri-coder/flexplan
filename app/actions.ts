"use server";

import { redirect } from "next/navigation";
import {
  archiveTaskRecord,
  completeTaskRecord,
  createBlockedTimeRecord,
  createContinuationTask,
  createTaskRecord,
  deleteBlockedTimeRecord,
  getDashboardData,
  markSessionDone,
  runReschedule,
  updateBlockedTimeRecord,
  updateSettingsRecord,
  updateTaskRecord
} from "@/lib/data";
import { sanitizeString } from "@/lib/utils";
import { ScheduleTriggerType } from "@prisma/client";

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function parseDateTime(value: string) {
  return new Date(value);
}

function parseEstimatedMinutes(formData: FormData) {
  const hours = Number(formData.get("estimatedHours") ?? 0);
  const minutes = Number(formData.get("estimatedMinutes") ?? 0);
  return hours * 60 + minutes;
}

export async function saveTaskAction(formData: FormData) {
  const dashboard = await getDashboardData();
  const taskId = sanitizeString(formData.get("taskId"));
  const name = sanitizeString(formData.get("name"));
  const categoryId = sanitizeString(formData.get("categoryId"));
  const doDate = sanitizeString(formData.get("doDate"));
  const dueDate = sanitizeString(formData.get("dueDate"));
  const dueTime = sanitizeString(formData.get("dueTime")) || null;
  const estimatedMinutes = parseEstimatedMinutes(formData);

  if (!name || !categoryId || !doDate || !dueDate || estimatedMinutes <= 0) {
    return;
  }

  const payload = {
    categoryId,
    name,
    doDate: parseDate(doDate),
    dueDate: parseDate(dueDate),
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
    startAt: parseDateTime(startAt),
    endAt: parseDateTime(endAt)
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
  const defaultWorkStartTime =
    sanitizeString(formData.get("defaultWorkStartTime")) || dashboard.defaultWorkStartTime;
  const defaultWorkEndTime =
    sanitizeString(formData.get("defaultWorkEndTime")) || dashboard.defaultWorkEndTime;
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
