import { Share, Platform } from 'react-native';
import { Course, DAYS_OF_WEEK } from '../types';

export class CalendarExportService {
  /**
   * Generates standard RFC 5545 iCalendar (.ics) text from courses and exams
   */
  static generateICS(courses: Course[]): string {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Akademik Asistan//TR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Ders Programım',
      'X-WR-TIMEZONE:Europe/Istanbul',
    ];

    // Day mapping for RRULE: 0: Monday -> MO, 1: TU, 2: WE, 3: TH, 4: FR, 5: SA, 6: SU
    const dayToIcalDay: Record<number, string> = {
      0: 'MO',
      1: 'TU',
      2: 'WE',
      3: 'TH',
      4: 'FR',
      5: 'SA',
      6: 'SU',
    };

    // Calculate reference date for the current week's days
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday

    for (const course of courses) {
      const dayDiff = course.day - currentDayOfWeek;
      const courseDate = new Date(now);
      courseDate.setDate(now.getDate() + dayDiff);

      const year = courseDate.getFullYear();
      const month = String(courseDate.getMonth() + 1).padStart(2, '0');
      const dateStr = String(courseDate.getDate()).padStart(2, '0');

      const [startH, startM] = course.startTime.split(':');
      const [endH, endM] = course.endTime.split(':');

      const dtStart = `${year}${month}${dateStr}T${startH || '09'}${startM || '00'}00`;
      const dtEnd = `${year}${month}${dateStr}T${endH || '10'}${endM || '30'}00`;
      const uid = `course_${course.id}@akademikasistan.app`;
      const rruleDay = dayToIcalDay[course.day] || 'MO';

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${year}${month}${dateStr}T000000Z`);
      lines.push(`DTSTART;TZID=Europe/Istanbul:${dtStart}`);
      lines.push(`DTEND;TZID=Europe/Istanbul:${dtEnd}`);
      lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${rruleDay}`);
      lines.push(`SUMMARY:${course.name}`);
      lines.push(
        `DESCRIPTION:Hoca: ${course.instructor || '-'} | AKTS: ${course.akts || 4} | Not: ${course.notes || '-'}`
      );
      lines.push(`LOCATION:${course.classroom || 'Derslik'}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');

      // Also export scheduled exams if any
      if (course.exams) {
        for (const [examType, exam] of Object.entries(course.exams)) {
          if (exam && exam.date && exam.time) {
            const cleanDate = exam.date.replace(/-/g, '');
            const [exH, exM] = exam.time.split(':');
            const exStart = `${cleanDate}T${exH || '10'}${exM || '00'}00`;
            const exEnd = `${cleanDate}T${String(Number(exH || '10') + 1).padStart(2, '0')}${exM || '00'}00`;
            const examTitle = `${course.name} (${examType.toUpperCase()} Sınavı)`;

            lines.push('BEGIN:VEVENT');
            lines.push(`UID:exam_${exam.id || course.id + '_' + examType}@akademikasistan.app`);
            lines.push(`DTSTAMP:${cleanDate}T000000Z`);
            lines.push(`DTSTART;TZID=Europe/Istanbul:${exStart}`);
            lines.push(`DTEND;TZID=Europe/Istanbul:${exEnd}`);
            lines.push(`SUMMARY:${examTitle}`);
            lines.push(`DESCRIPTION:Sınav Salonu: ${exam.classroom || course.classroom || '-'}`);
            lines.push(`LOCATION:${exam.classroom || course.classroom || 'Sınav Salonu'}`);
            lines.push('STATUS:CONFIRMED');
            lines.push('END:VEVENT');
          }
        }
      }
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /**
   * Generates a nicely formatted text schedule ready to share via WhatsApp, Telegram, or Notes
   */
  static generateTextSummary(courses: Course[]): string {
    let summary = '📚 AKADEMİK ASİSTAN - HAFTALIK DERS PROGRAMIM\n';
    summary += '=======================================\n\n';

    DAYS_OF_WEEK.forEach(day => {
      const dayCourses = courses.filter(c => c.day === day.id);
      if (dayCourses.length > 0) {
        summary += `📅 ${day.name.toUpperCase()} (${dayCourses.length} Ders)\n`;
        dayCourses.forEach(c => {
          summary += `  ⏰ ${c.startTime} - ${c.endTime} | ${c.name}\n`;
          summary += `     📍 ${c.classroom || 'Derslik'} | 👨‍🏫 ${c.instructor || 'Hoca'}\n`;
          if (c.akts) summary += `     ⭐ ${c.akts} AKTS\n`;
        });
        summary += '\n';
      }
    });

    summary += '=======================================\n';
    summary += '✨ Akademik Asistan ile oluşturuldu.\n';
    return summary;
  }

  /**
   * Opens the native share dialog with the formatted text schedule or ICS content
   */
  static async shareSchedule(courses: Course[], asICS = false): Promise<boolean> {
    try {
      if (asICS) {
        const icsContent = this.generateICS(courses);
        await Share.share({
          title: 'Ders Programı (.ics Takvim Dosyası)',
          message: icsContent,
        });
      } else {
        const textContent = this.generateTextSummary(courses);
        await Share.share({
          title: 'Haftalık Ders Programım',
          message: textContent,
        });
      }
      return true;
    } catch (e) {
      console.warn('Share cancelled or failed', e);
      return false;
    }
  }
}
