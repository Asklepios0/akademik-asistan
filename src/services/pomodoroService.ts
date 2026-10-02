import { StorageService } from './storage';
import { StudySession, Course } from '../types';

export type PomodoroMode = 'focus' | 'short_break' | 'long_break';

export interface PomodoroConfig {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

export const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
};

export const MOTIVATIONAL_QUOTES = [
  '“Gelecek, bugünden hazırlananlara aittir.”',
  '“Zorluklar, başarının değerini artıran süslerdir.”',
  '“Bugün ektiğin çalışma tohumları, final haftasında sana rahat nefes aldıracak.”',
  '“Odaklan! 25 dakika sadece sen ve hedefin varsınız.”',
  '“Büyük işler, küçük adımların kararlılıkla tekrarlanmasıyla başarılır.”',
  '“Sınav salonunda kendine güvenmek için kütüphanede ter dökmek gerekir.”',
];

export class PomodoroService {
  /**
   * Formats seconds into "MM:SS"
   */
  static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Returns random motivational study quote
   */
  static getRandomQuote(): string {
    const idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[idx];
  }

  /**
   * Records a completed session into local storage
   */
  static async completeSession(
    course: Course | null,
    durationMinutes: number,
    topic?: string,
    type: PomodoroMode = 'focus'
  ): Promise<StudySession> {
    return await StorageService.saveStudySession({
      courseId: course?.id,
      courseName: course?.name || 'Genel Çalışma',
      durationMinutes,
      topic: topic || 'Ders Çalışma & Odak',
      type,
    });
  }

  /**
   * Returns weekly study summary
   */
  static async getWeeklyReport(): Promise<{
    totalHours: string;
    totalMinutes: number;
    sessionCount: number;
    courseBreakdown: Record<string, number>;
  }> {
    const stats = await StorageService.getWeeklyStudyStats();
    const hours = (stats.totalMinutes / 60).toFixed(1);
    return {
      totalHours: hours,
      totalMinutes: stats.totalMinutes,
      sessionCount: stats.sessionCount,
      courseBreakdown: stats.courseBreakdown,
    };
  }
}
