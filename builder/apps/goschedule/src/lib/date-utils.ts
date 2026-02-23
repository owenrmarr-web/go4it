import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMinutes,
  addDays,
  isBefore,
  isAfter,
  isSameDay,
  differenceInMinutes,
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMinutes,
  addDays,
  isBefore,
  isAfter,
  isSameDay,
  differenceInMinutes,
  toZonedTime,
  fromZonedTime,
};

/** Parse a time string like "09:00" into hours and minutes */
export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { hours: h, minutes: m };
}

/** Set hours/minutes on a date */
export function setTime(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/** Format a date to "HH:mm" */
export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

/** Format a date for display in business timezone */
export function formatDateTime(date: Date, timezone: string): string {
  const zoned = toZonedTime(date, timezone);
  return format(zoned, "MMM d, yyyy h:mm a");
}

/** Format just the date portion */
export function formatDate(date: Date, timezone: string): string {
  const zoned = toZonedTime(date, timezone);
  return format(zoned, "MMM d, yyyy");
}

/** Format just the time portion */
export function formatTimeInTz(date: Date, timezone: string): string {
  const zoned = toZonedTime(date, timezone);
  return format(zoned, "h:mm a");
}

/** Get day of week (0=Sunday) for a date in a given timezone */
export function getDayOfWeek(date: Date, timezone: string): number {
  const zoned = toZonedTime(date, timezone);
  return zoned.getDay();
}

/** Get ISO date string "2026-03-15" for a date in a timezone */
export function toDateString(date: Date, timezone: string): string {
  const zoned = toZonedTime(date, timezone);
  return format(zoned, "yyyy-MM-dd");
}

/** Create a Date from a date string and time string in a timezone */
export function createDateTime(
  dateStr: string,
  timeStr: string,
  timezone: string
): Date {
  const { hours, minutes } = parseTime(timeStr);
  const localDate = parseISO(dateStr);
  localDate.setHours(hours, minutes, 0, 0);
  return fromZonedTime(localDate, timezone);
}
