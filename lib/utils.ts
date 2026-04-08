import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) {
    return `${minutes}m`;
  }

  if (!minutes) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function toDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function sanitizeString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseMinutes(hours: number, minutes: number) {
  return hours * 60 + minutes;
}
