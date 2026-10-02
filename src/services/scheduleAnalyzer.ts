import { Course, DayOfWeek, ScheduleGap, SemesterProgress } from '../types';
import { timeToMinutes } from '../utils/time';

export class ScheduleAnalyzer {
  /**
   * Finds free time gaps between consecutive courses on a given day.
   * Gaps of at least 20 minutes are highlighted as high-value study/lunch windows.
   */
  static findFreeWindows(courses: Course[], day: DayOfWeek): ScheduleGap[] {
    const dayCourses = courses
      .filter(c => c.day === day && !c.isCancelledToday)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    if (dayCourses.length < 2) return [];

    const gaps: ScheduleGap[] = [];

    for (let i = 0; i < dayCourses.length - 1; i++) {
      const current = dayCourses[i];
      const next = dayCourses[i + 1];

      const currentEnd = timeToMinutes(current.endTime);
      const nextStart = timeToMinutes(next.startTime);

      const diff = nextStart - currentEnd;
      if (diff >= 20) {
        let suggestion = '';
        if (diff >= 90) {
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          const timeStr = m > 0 ? `${h}s ${m}dk` : `${h} saat`;
          suggestion = `${timeStr} boşluk - Kütüphane çalışması veya yemek için harika!`;
        } else if (diff >= 45) {
          suggestion = `${diff} dk boşluk - Kahve molası veya konu tekrarı için ideal.`;
        } else {
          suggestion = `${diff} dk ara - Derslik değişimi ve dinlenme süresi.`;
        }

        gaps.push({
          start: current.endTime,
          end: next.startTime,
          durationMinutes: diff,
          prevCourseName: current.name,
          nextCourseName: next.name,
          suggestion,
        });
      }
    }

    return gaps;
  }

  /**
   * Detects scheduling conflicts (two courses overlapping on the same day and time).
   */
  static detectConflicts(courses: Course[]): {
    hasConflict: boolean;
    conflicts: { course1: Course; course2: Course; day: DayOfWeek; overlapMinutes: number }[];
  } {
    const conflicts: { course1: Course; course2: Course; day: DayOfWeek; overlapMinutes: number }[] = [];

    for (let day = 0; day <= 6; day++) {
      const dayCourses = courses.filter(c => c.day === day);
      for (let i = 0; i < dayCourses.length; i++) {
        for (let j = i + 1; j < dayCourses.length; j++) {
          const c1 = dayCourses[i];
          const c2 = dayCourses[j];

          const start1 = timeToMinutes(c1.startTime);
          const end1 = timeToMinutes(c1.endTime);
          const start2 = timeToMinutes(c2.startTime);
          const end2 = timeToMinutes(c2.endTime);

          const maxStart = Math.max(start1, start2);
          const minEnd = Math.min(end1, end2);

          if (maxStart < minEnd) {
            conflicts.push({
              course1: c1,
              course2: c2,
              day: day as DayOfWeek,
              overlapMinutes: minEnd - maxStart,
            });
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Computes semester progress (Week 1..14) based on semester start date.
   * If not set, defaults to an estimated academic semester start.
   */
  static calculateSemesterWeek(semesterStartDate?: string): SemesterProgress {
    let startDate: Date;
    if (semesterStartDate) {
      startDate = new Date(semesterStartDate);
    } else {
      const now = new Date();
      const month = now.getMonth(); // 0-indexed (8 is Sept)
      if (month >= 8 || month <= 0) {
        const year = month === 0 ? now.getFullYear() - 1 : now.getFullYear();
        startDate = new Date(year, 8, 15);
      } else {
        startDate = new Date(now.getFullYear(), 1, 15);
      }
    }

    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const calculatedWeek = Math.max(1, Math.min(14, Math.floor(diffDays / 7) + 1));

    const totalWeeks = 14;
    const vizeWeek = 7;
    const finalWeek = 14;

    const weeksToVize = Math.max(0, vizeWeek - calculatedWeek);
    const weeksToFinal = Math.max(0, finalWeek - calculatedWeek);

    let statusText = '';
    if (calculatedWeek < vizeWeek) {
      statusText = `Vize Haftasına ${weeksToVize} Hafta Kaldı`;
    } else if (calculatedWeek === vizeWeek) {
      statusText = `🔥 Vize Sınavları Haftasındasınız!`;
    } else if (calculatedWeek < finalWeek) {
      statusText = `Final Sınavlarına ${weeksToFinal} Hafta Kaldı`;
    } else {
      statusText = `🎓 Final Sınavları / Dönem Sonu`;
    }

    return {
      currentWeek: calculatedWeek,
      totalWeeks,
      vizeWeek,
      finalWeek,
      weeksToVize,
      weeksToFinal,
      statusText,
    };
  }
}
