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
import {
  createUserWithSession,
  requireCurrentUser,
  signInWithPassword,
  signOutCurrentSession
} from "@/lib/auth";
import { sanitizeString } from "@/lib/utils";
import {
  normalizeTimezone,
  parseClock,
  zonedDateStringToUtc,
  zonedDateTimeStringToUtc
} from "@/lib/time";
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
  const currentUser = await requireCurrentUser();
  const dashboard = await getDashboardData();
  const taskId = sanitizeString(formData.get("taskId"));
  const name = sanitizeString(formData.get("name"));
  const selectedCategoryId = sanitizeString(formData.get("categoryId"));
  const newCategoryName = sanitizeString(formData.get("newCategoryName"));
  const dependsOnTaskId = sanitizeString(formData.get("dependsOnTaskId")) || null;
  const doDate = sanitizeString(formData.get("doDate"));
  const dueDate = sanitizeString(formData.get("dueDate"));
  const dueTime = sanitizeString(formData.get("dueTime")) || null;
  const estimatedMinutes = parseEstimatedMinutes(formData);

  const ensuredCategory = newCategoryName
    ? await ensureCategoryRecord(currentUser.id, newCategoryName)
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
    estimatedMinutes,
    dependsOnTaskId
  };

  if (taskId) {
    await updateTaskRecord(taskId, payload);
  } else {
    await createTaskRecord({
      userId: currentUser.id,
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
  redirect("/planner");
}

export async function completeTaskAction(formData: FormData) {
  const taskId = sanitizeString(formData.get("taskId"));

  if (!taskId) {
    return;
  }

  await completeTaskRecord(taskId);
  redirect("/planner");
}

export async function saveBlockedTimeAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
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
      userId: currentUser.id,
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
  const currentUser = await requireCurrentUser();
  const dashboard = await getDashboardData();
  const timezone = normalizeTimezone(sanitizeString(formData.get("timezone")) || dashboard.timezone);
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
    userId: currentUser.id,
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

  redirect(`/planner/tasks/${continuation.id}`);
}

export async function manualRescheduleAction() {
  const currentUser = await requireCurrentUser();
  await runReschedule(currentUser.id, ScheduleTriggerType.MANUAL_RESCHEDULE);
}

export async function signUpAction(formData: FormData) {
  const name = sanitizeString(formData.get("name"));
  const email = sanitizeString(formData.get("email"));
  const password = sanitizeString(formData.get("password"));

  if (!name || !email || password.length < 8) {
    redirect("/signup?error=Please%20enter%20your%20name,%20email,%20and%20an%208-character%20password.");
  }

  const result = await createUserWithSession({
    name,
    email,
    password
  });

  if ("error" in result) {
    redirect(`/signup?error=${encodeURIComponent(result.error ?? "Unable to create account.")}`);
  }

  redirect("/planner");
}

export async function logInAction(formData: FormData) {
  const email = sanitizeString(formData.get("email"));
  const password = sanitizeString(formData.get("password"));

  if (!email || !password) {
    redirect("/login?error=Please%20enter%20both%20your%20email%20and%20password.");
  }

  const result = await signInWithPassword(email, password);

  if ("error" in result) {
    redirect(`/login?error=${encodeURIComponent(result.error ?? "Unable to log in.")}`);
  }

  redirect("/planner");
}

export async function logOutAction() {
  await signOutCurrentSession();
  redirect("/");
}
