import { Course, CourseGradeStatus, DayOfWeek, CourseCategory, CourseMode, DEFAULT_PALETTES } from '../types';
import { StorageService } from './storage';
import { ExamEngine } from './examEngine';

export interface ParsedCourseItem {
  name: string;
  instructor?: string;
  classroom?: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  category: CourseCategory;
  mode: CourseMode;
}

export interface ParsedGradeItem {
  courseName: string;
  vizeScore?: number;
  finalScore?: number;
  butScore?: number;
}

export class SmartImportService {
  /**
   * Smartly parses raw timetable text copied from university portals (OBS, SABIS, AKSIS, etc.)
   */
  static parseTimetableText(rawText: string): ParsedCourseItem[] {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedCourses: ParsedCourseItem[] = [];

    const dayKeywords: Record<string, DayOfWeek> = {
      pazartesi: 0,
      mon: 0,
      salı: 1,
      sali: 1,
      tue: 1,
      çarşamba: 2,
      carsamba: 2,
      wed: 2,
      perşembe: 3,
      persembe: 3,
      thu: 3,
      cuma: 4,
      fri: 4,
      cumartesi: 5,
      sat: 5,
      pazar: 6,
      sun: 6,
    };

    // Regex for matching time ranges like 09:00 - 11:50 or 09:00-11:50 or 09.00 - 11.50 or 9:00 - 12:00
    const timeRegex = /(\d{1,2})[:.](\d{2})\s*[-–—/]\s*(\d{1,2})[:.](\d{2})/;

    let currentDay: DayOfWeek = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();

      // Check if line is a day header
      let matchedDay: DayOfWeek | null = null;
      for (const [key, dayVal] of Object.entries(dayKeywords)) {
        if (lower.startsWith(key) || lower.includes(` ${key}`) || lower === key) {
          matchedDay = dayVal;
          break;
        }
      }

      if (matchedDay !== null && !line.match(timeRegex)) {
        currentDay = matchedDay;
        continue;
      }

      // Check if line contains a time interval
      const timeMatch = line.match(timeRegex);
      if (timeMatch) {
        const startH = timeMatch[1].padStart(2, '0');
        const startM = timeMatch[2];
        const endH = timeMatch[3].padStart(2, '0');
        const endM = timeMatch[4];
        const startTime = `${startH}:${startM}`;
        const endTime = `${endH}:${endM}`;

        // Look for course name in same line or previous/next line
        let courseName = line.replace(timeRegex, '').replace(/[-–—]/g, ' ').trim();
        let instructor = '';
        let classroom = '';

        if (!courseName || courseName.length < 3) {
          if (i > 0 && lines[i - 1].length > 2 && !lines[i - 1].match(timeRegex)) {
            courseName = lines[i - 1];
          } else if (i < lines.length - 1 && lines[i + 1].length > 2 && !lines[i + 1].match(timeRegex)) {
            courseName = lines[i + 1];
          }
        }

        // Clean up common prefix symbols (e.g. "BLM101", "Ders:", etc.)
        courseName = courseName.replace(/^[\d\sA-Z_.-]{2,10}:\s*/, '').trim();

        if (!courseName) {
          courseName = 'Ders ' + (parsedCourses.length + 1);
        }

        // Detect classroom keywords (e.g. D4, D7, Amfi 1, Lab 2, B204, C-101, Online)
        const classMatch = line.match(/\b(D\d{1,2}|Amfi\s*\d{1,2}|Lab\s*\d{1,2}|B\d{3}|C\d{3}|A\d{3}|Online|Zoom|Meet)\b/i);
        if (classMatch) {
          classroom = classMatch[0].toUpperCase();
        } else {
          classroom = 'Derslik';
        }

        // Detect instructor keywords (Prof., Doç., Dr., Öğr. Gör., vb.)
        const instrMatch = line.match(/\b(Prof\.|Doç\.|Dr\.|Öğr\.\s*Gör\.|Arş\.\s*Gör\.)\s*([A-Za-zÇĞİÖŞÜçğıöşü\s]{3,25})/i);
        if (instrMatch) {
          instructor = instrMatch[0].trim();
        } else {
          instructor = 'Ders Hocası';
        }

        // Detect Category (ÜSD, Seçmeli, Zorunlu)
        let category: CourseCategory = 'zorunlu';
        if (line.toLowerCase().includes('üsd') || line.toLowerCase().includes('usd') || courseName.toLowerCase().includes('seçmeli')) {
          category = line.toLowerCase().includes('üsd') || line.toLowerCase().includes('usd') ? 'usd' : 'secmeli';
        }

        const mode: CourseMode = line.toLowerCase().includes('online') || classroom.toLowerCase().includes('online') ? 'online' : 'in_person';

        parsedCourses.push({
          name: courseName,
          instructor,
          classroom,
          day: matchedDay !== null ? matchedDay : currentDay,
          startTime,
          endTime,
          category,
          mode,
        });
      } else if (line.includes(' - ') || line.includes(':')) {
        // Tabular fallback parsing (e.g. "Fizik 1 - Pazartesi 09:00-11:50 - D4 - Dr. Ahmet")
        const parts = line.split(/[-–,|]/).map(p => p.trim());
        if (parts.length >= 2) {
          let foundTime = false;
          let startTime = '09:00';
          let endTime = '11:50';
          let day: DayOfWeek = currentDay;

          for (const p of parts) {
            const tm = p.match(timeRegex);
            if (tm) {
              startTime = `${tm[1].padStart(2, '0')}:${tm[2]}`;
              endTime = `${tm[3].padStart(2, '0')}:${tm[4]}`;
              foundTime = true;
            }
            for (const [k, d] of Object.entries(dayKeywords)) {
              if (p.toLowerCase().includes(k)) day = d;
            }
          }

          if (foundTime && parts[0].length > 2) {
            parsedCourses.push({
              name: parts[0],
              instructor: parts.length > 2 ? parts[2] : 'Ders Hocası',
              classroom: parts.length > 3 ? parts[3] : 'Derslik',
              day,
              startTime,
              endTime,
              category: parts[0].toLowerCase().includes('üsd') ? 'usd' : 'zorunlu',
              mode: parts[0].toLowerCase().includes('online') ? 'online' : 'in_person',
            });
          }
        }
      }
    }

    return parsedCourses;
  }

  /**
   * Parses raw grades text copied from university portals (Vize: 50, Final: 70, vb.)
   */
  static parseGradesText(rawText: string): ParsedGradeItem[] {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedGrades: ParsedGradeItem[] = [];

    for (const line of lines) {
      // Matches course name and scores: "Algoritmalar: Vize 45, Final 60" or "Veri Yapıları 75 80"
      const scoreMatches = line.match(/\b\d{1,3}\b/g);
      if (scoreMatches && scoreMatches.length >= 1) {
        const scores = scoreMatches.map(Number).filter(n => n >= 0 && n <= 100);
        const nameClean = line.replace(/\b\d{1,3}\b/g, '').replace(/[:,\-–|]/g, ' ').replace(/\b(vize|final|büt|but|notu|notlar|ara\s*sınav)\b/gi, '').trim();

        if (nameClean.length > 2 && scores.length > 0) {
          parsedGrades.push({
            courseName: nameClean,
            vizeScore: scores[0],
            finalScore: scores.length > 1 ? scores[1] : undefined,
            butScore: scores.length > 2 ? scores[2] : undefined,
          });
        }
      }
    }

    return parsedGrades;
  }

  /**
   * Imports parsed courses into persistent storage, replacing or merging
   */
  static async importParsedCourses(items: ParsedCourseItem[], replaceAll: boolean = true): Promise<Course[]> {
    let existing = replaceAll ? [] : await StorageService.getCourses();

    const newCourses: Course[] = items.map((item, idx) => ({
      id: 'course_' + Date.now() + '_' + idx,
      name: item.name,
      instructor: item.instructor || '',
      classroom: item.classroom || '',
      day: item.day,
      startTime: item.startTime,
      endTime: item.endTime,
      color: DEFAULT_PALETTES[(existing.length + idx) % DEFAULT_PALETTES.length],
      reminderMinutes: 15,
      category: item.category,
      mode: item.mode,
      createdAt: Date.now() + idx,
    }));

    const combined = [...existing, ...newCourses];
    await StorageService.clearAllCourses();
    for (const c of combined) {
      await StorageService.updateCourse(c);
    }
    return combined;
  }

  /**
   * Merges imported grades into actual courses in storage
   */
  static async applyGradesToCourses(grades: ParsedGradeItem[]): Promise<Course[]> {
    const courses = await StorageService.getCourses();

    for (const grade of grades) {
      // Find matching course by fuzzy name
      const targetCourse = courses.find(c =>
        c.name.toLowerCase().includes(grade.courseName.toLowerCase()) ||
        grade.courseName.toLowerCase().includes(c.name.toLowerCase())
      );

      if (targetCourse) {
        const vize = grade.vizeScore ?? targetCourse.gradeStatus?.vizeScore;
        const final = grade.finalScore ?? targetCourse.gradeStatus?.finalScore;
        const but = grade.butScore ?? targetCourse.gradeStatus?.butScore;

        targetCourse.gradeStatus = ExamEngine.calculateGradeStatus(vize, final, but);
        await StorageService.updateCourse(targetCourse);
      }
    }

    return await StorageService.getCourses();
  }
}
