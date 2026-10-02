import { Course, DayOfWeek } from '../types';

/**
 * Converts a time string "HH:MM" to total minutes from 00:00
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Converts minutes from midnight to "HH:MM" format
 */
export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Returns current day of week as 0 (Monday) .. 6 (Sunday)
 */
export function getTodayDayOfWeek(): DayOfWeek {
  const jsDay = new Date().getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  if (jsDay === 0) return 6; // Sunday -> 6
  return (jsDay - 1) as DayOfWeek; // Monday (1) -> 0, etc.
}

/**
 * Returns current time in minutes from midnight
 */
export function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Returns course status: 'upcoming' | 'ongoing' | 'finished' for today
 */
export function getCourseStatusToday(course: Course): {
  status: 'ongoing' | 'upcoming' | 'finished';
  minutesUntilStart: number;
  minutesUntilEnd: number;
  progressPercent: number;
} {
  if (course.isFinishedEarlyToday) {
    return {
      status: 'finished',
      minutesUntilStart: 0,
      minutesUntilEnd: 0,
      progressPercent: 100,
    };
  }

  const currentMinutes = getCurrentTimeMinutes();
  const startMinutes = timeToMinutes(course.startTime);
  const endMinutes = timeToMinutes(course.endTime);

  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
    const totalDuration = endMinutes - startMinutes || 1;
    const elapsed = currentMinutes - startMinutes;
    const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
    return {
      status: 'ongoing',
      minutesUntilStart: 0,
      minutesUntilEnd: endMinutes - currentMinutes,
      progressPercent: progress,
    };
  } else if (currentMinutes < startMinutes) {
    return {
      status: 'upcoming',
      minutesUntilStart: startMinutes - currentMinutes,
      minutesUntilEnd: endMinutes - currentMinutes,
      progressPercent: 0,
    };
  } else {
    return {
      status: 'finished',
      minutesUntilStart: 0,
      minutesUntilEnd: 0,
      progressPercent: 100,
    };
  }
}

/**
 * Sorts an array of courses by start time
 */
export function sortCoursesByTime(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

/**
 * Formats a duration in minutes to human readable string (e.g. "45 dk", "1 sa 15 dk")
 */
export function formatMinutesHuman(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (remMinutes === 0) return `${hours} saat`;
  return `${hours} sa ${remMinutes} dk`;
}
