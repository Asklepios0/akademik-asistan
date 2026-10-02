import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  Course,
  AppSettings,
  LectureNote,
  AttendanceRecord,
  OBSMail,
  Assignment,
  Flashcard,
  CourseDocument,
  CourseGradeStatus,
  DEFAULT_PALETTES,
  BackupData,
  StudySession,
} from '../types';
import { WidgetService } from './widgetService';

export interface BackupSnapshot {
  id: string;
  createdAt: number;
  dateFormatted: string;
  courseCount: number;
  backup: BackupData;
}

const STORAGE_KEYS = {
  COURSES: '@akademik_asistan_courses_v2',
  SETTINGS: '@akademik_asistan_settings_v2',
  LECTURE_NOTES: '@akademik_asistan_notes_v2',
  ATTENDANCE: '@akademik_asistan_attendance_v2',
  OBS_MAILS: '@akademik_asistan_obs_mails_v2',
  ASSIGNMENTS: '@akademik_asistan_assignments_v2',
  FLASHCARDS: '@akademik_asistan_flashcards_v2',
  DOCUMENTS: '@akademik_asistan_documents_v2',
  STUDY_SESSIONS: '@akademik_asistan_study_sessions_v1',
  LOCAL_SNAPSHOTS: '@akademik_asistan_snapshots_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultReminderMinutes: 15,
  notificationsEnabled: true,
  theme: 'system',
  language: 'tr',
  universityName: '',
  departmentName: '',
  onboardingCompleted: false,
  obsConfig: {
    portalUrl: 'https://obs.universite.edu.tr',
    studentNumber: '',
    password: '',
    isScheduleBound: false,
    isGradesBound: false,
    isMailsBound: false,
    isLoggedIn: false,
  },
};

export const INITIAL_SAMPLE_COURSES: Omit<Course, 'id' | 'createdAt'>[] = [
  {
    name: 'Algoritmalar ve Programlama',
    instructor: 'Dr. Ahmet Yılmaz',
    classroom: 'D7',
    day: 0, // Pazartesi
    startTime: '09:00',
    endTime: '11:50',
    color: '#3B82F6',
    reminderMinutes: 15,
    category: 'zorunlu',
    mode: 'in_person',
    notes: 'Lab ödevi teslim edilecek.',
  },
  {
    name: 'Veri Yapıları',
    instructor: 'Dr. Ahmet Yılmaz',
    classroom: 'D4',
    day: 1, // Salı
    startTime: '13:30',
    endTime: '15:20',
    color: '#8B5CF6',
    reminderMinutes: 15,
    category: 'zorunlu',
    mode: 'in_person',
  },
  {
    name: 'Yapay Zeka ve Makine Öğrenmesi',
    instructor: 'Doç. Dr. Selin Kaya',
    classroom: 'Online (Zoom/Meet)',
    day: 2, // Çarşamba
    startTime: '10:00',
    endTime: '12:30',
    color: '#EC4899',
    reminderMinutes: 30,
    category: 'secmeli',
    mode: 'online',
    onlineLink: 'https://zoom.us/j/9876543210',
  },
  {
    name: 'Girişimcilik ve İnovasyon (ÜSD)',
    instructor: 'Prof. Dr. Hakan Öztürk',
    classroom: 'Amfi 2',
    day: 3, // Perşembe
    startTime: '14:00',
    endTime: '16:50',
    color: '#10B981',
    reminderMinutes: 15,
    category: 'usd', // Üniversite Seçmeli Ders
    mode: 'in_person',
    notes: 'Üniversite ortak seçmeli dersi.',
  },
  {
    name: 'İşletim Sistemleri',
    instructor: 'Doç. Dr. Selin Kaya',
    classroom: 'D7',
    day: 4, // Cuma
    startTime: '09:00',
    endTime: '11:50',
    color: '#F59E0B',
    reminderMinutes: 15,
    category: 'zorunlu',
    mode: 'in_person',
  }
];

export class StorageService {
  /**
   * Retrieves all courses from AsyncStorage
   */
  static async getCourses(): Promise<Course[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.COURSES);
      if (!json) {
        return [];
      }
      return JSON.parse(json) as Course[];
    } catch (e) {
      console.error('Failed to get courses from storage', e);
      return [];
    }
  }

  /**
   * Saves a new course
   */
  static async saveCourse(courseData: Omit<Course, 'id' | 'createdAt'>): Promise<Course> {
    const courses = await this.getCourses();
    const newCourse: Course = {
      ...courseData,
      id: 'course_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
      color: courseData.color || DEFAULT_PALETTES[courses.length % DEFAULT_PALETTES.length],
      category: courseData.category || 'zorunlu',
      mode: courseData.mode || 'in_person',
      createdAt: Date.now(),
    };

    const updated = [...courses, newCourse];
    await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(updated));
    WidgetService.updateWidget(updated);
    return newCourse;
  }

  /**
   * Restores a previously deleted course with its original ID intact.
   * Used by the Undo mechanism to preserve relationships (attendance, assignments, notifications).
   */
  static async restoreCourse(course: Course): Promise<Course> {
    const courses = await this.getCourses();
    // Avoid duplicates if somehow the course already exists
    const exists = courses.some(c => c.id === course.id);
    if (!exists) {
      courses.push(course);
      await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
      WidgetService.updateWidget(courses);
    }
    return course;
  }

  /**
   * Updates an existing course
   */
  static async updateCourse(course: Course): Promise<Course> {
    const courses = await this.getCourses();
    const index = courses.findIndex(c => c.id === course.id);
    if (index === -1) {
      return await this.saveCourse(course);
    }

    courses[index] = { ...course };
    await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    WidgetService.updateWidget(courses);
    return courses[index];
  }

  /**
   * Deletes a course by ID
   */
  static async deleteCourse(id: string): Promise<boolean> {
    const courses = await this.getCourses();
    const filtered = courses.filter(c => c.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(filtered));
    WidgetService.updateWidget(filtered);
    return true;
  }

  /**
   * Updates instructor delay (e.g. +15 mins)
   */
  static async updateCourseDelay(courseId: string, delayMinutes: number): Promise<void> {
    const courses = await this.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (course) {
      course.delayMinutes = delayMinutes;
      await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    }
  }

  /**
   * Toggles course cancellation for today (e.g. from OBS email)
   */
  static async toggleCourseCancellation(courseId: string, isCancelled: boolean): Promise<void> {
    const courses = await this.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (course) {
      course.isCancelledToday = isCancelled;
      await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    }
  }

  /**
   * Updates course grade status (Vize, Final, Büt, Harf Notu)
   */
  static async updateCourseGrades(courseId: string, gradeStatus: CourseGradeStatus): Promise<void> {
    const courses = await this.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (course) {
      course.gradeStatus = gradeStatus;
      await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    }
  }

  /**
   * Clears all courses
   */
  static async clearAllCourses(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify([]));
  }

  /**
   * Marks a course as finished early today (Hoca erken bıraktı)
   */
  static async finishCourseEarlyToday(courseId: string): Promise<void> {
    const courses = await this.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (course) {
      course.isFinishedEarlyToday = true;
      await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    }
  }

  /**
   * Resets daily flags (isCancelledToday, delayMinutes, isFinishedEarlyToday) on all courses.
   * Should be called on app startup to clear stale day-specific data.
   */
  static async resetDailyCourseFlags(): Promise<void> {
    const courses = await this.getCourses();
    let modified = false;
    for (const course of courses) {
      if (course.isCancelledToday || course.delayMinutes || course.isFinishedEarlyToday) {
        course.isCancelledToday = false;
        course.delayMinutes = undefined;
        course.isFinishedEarlyToday = false;
        modified = true;
      }
    }
    if (modified) {
      await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    }
  }

  // ===================== LECTURE NOTES & RECORDINGS =====================

  /**
   * Gets lecture notes, optionally filtered by courseId
   */
  static async getLectureNotes(courseId?: string): Promise<LectureNote[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.LECTURE_NOTES);
      if (!json) return [];
      const notes: LectureNote[] = JSON.parse(json);
      if (courseId) {
        return notes.filter(n => n.courseId === courseId);
      }
      return notes;
    } catch (e) {
      return [];
    }
  }

  /**
   * Saves a new lecture session note
   */
  static async saveLectureNote(noteData: Omit<LectureNote, 'id' | 'createdAt'>): Promise<LectureNote> {
    const notes = await this.getLectureNotes();
    const newNote: LectureNote = {
      ...noteData,
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
      createdAt: Date.now(),
    };
    const updated = [newNote, ...notes];
    await AsyncStorage.setItem(STORAGE_KEYS.LECTURE_NOTES, JSON.stringify(updated));
    return newNote;
  }

  /**
   * Updates an existing lecture note
   */
  static async updateLectureNote(note: LectureNote): Promise<LectureNote> {
    const notes = await this.getLectureNotes();
    const idx = notes.findIndex(n => n.id === note.id);
    if (idx !== -1) {
      notes[idx] = { ...note };
      await AsyncStorage.setItem(STORAGE_KEYS.LECTURE_NOTES, JSON.stringify(notes));
    }
    return note;
  }

  /**
   * Deletes a lecture note by ID
   */
  static async deleteLectureNote(id: string): Promise<void> {
    const notes = await this.getLectureNotes();
    const filtered = notes.filter(n => n.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.LECTURE_NOTES, JSON.stringify(filtered));
  }

  // ===================== ATTENDANCE SYSTEM =====================

  /**
   * Retrieves all attendance records
   */
  static async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      return json ? JSON.parse(json) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Records attendance (Derse Girdim / Girmedim)
   */
  static async recordAttendance(courseId: string, status: 'attended' | 'missed'): Promise<AttendanceRecord> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      const records: AttendanceRecord[] = json ? JSON.parse(json) : [];
      const todayStr = new Date().toISOString().split('T')[0];

      // Check if already logged for today
      const existingIdx = records.findIndex(r => r.courseId === courseId && r.date === todayStr);
      const record: AttendanceRecord = {
        id: 'att_' + Date.now(),
        courseId,
        date: todayStr,
        status,
        timestamp: Date.now(),
      };

      if (existingIdx !== -1) {
        records[existingIdx] = record;
      } else {
        records.push(record);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
      return record;
    } catch (e) {
      return {
        id: 'att_fallback',
        courseId,
        date: new Date().toISOString().split('T')[0],
        status,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Calculates attendance stats for a specific course
   */
  static async getAttendanceStats(courseId: string): Promise<{
    attended: number;
    missed: number;
    total: number;
    rate: number;
  }> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      const records: AttendanceRecord[] = json ? JSON.parse(json) : [];
      const courseRecords = records.filter(r => r.courseId === courseId);

      const attended = courseRecords.filter(r => r.status === 'attended').length;
      const missed = courseRecords.filter(r => r.status === 'missed').length;
      const total = attended + missed;
      const rate = total > 0 ? Math.round((attended / total) * 100) : 100;

      return { attended, missed, total, rate };
    } catch (e) {
      return { attended: 0, missed: 0, total: 0, rate: 100 };
    }
  }

  /**
   * Adjusts course absence by delta (+1 or -1)
   */
  static async adjustCourseAbsence(courseId: string, delta: number): Promise<{ attended: number; missed: number; total: number; rate: number }> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      let records: AttendanceRecord[] = json ? JSON.parse(json) : [];

      if (delta > 0) {
        const record: AttendanceRecord = {
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          courseId,
          date: new Date().toISOString().split('T')[0],
          status: 'missed',
          timestamp: Date.now(),
        };
        records.push(record);
      } else if (delta < 0) {
        // Find last missed index for this course and remove it
        let lastMissedIdx = -1;
        for (let i = records.length - 1; i >= 0; i--) {
          if (records[i].courseId === courseId && records[i].status === 'missed') {
            lastMissedIdx = i;
            break;
          }
        }
        if (lastMissedIdx !== -1) {
          records.splice(lastMissedIdx, 1);
        }
      }

      await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
      return await this.getAttendanceStats(courseId);
    } catch (e) {
      return await this.getAttendanceStats(courseId);
    }
  }

  // ===================== OBS & MAILS =====================

  /**
   * Retrieves OBS announcement/emails
   */
  static async getOBSMails(): Promise<OBSMail[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.OBS_MAILS);
      if (!json) {
        return [];
      }
      return JSON.parse(json) as OBSMail[];
    } catch (e) {
      return [];
    }
  }

  static async saveOBSMail(mail: OBSMail): Promise<void> {
    const mails = await this.getOBSMails();
    const updated = [mail, ...mails];
    await AsyncStorage.setItem(STORAGE_KEYS.OBS_MAILS, JSON.stringify(updated));
  }

  // ===================== ASSIGNMENTS & DEADLINES =====================

  static async getAssignments(): Promise<Assignment[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
      if (!json) {
        return [];
      }
      return JSON.parse(json) as Assignment[];
    } catch (e) {
      return [];
    }
  }

  static async saveAssignment(asgData: Omit<Assignment, 'id' | 'createdAt'>): Promise<Assignment> {
    const assignments = await this.getAssignments();
    const newAsg: Assignment = {
      ...asgData,
      id: 'asg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      createdAt: Date.now(),
    };
    const updated = [newAsg, ...assignments];
    await AsyncStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(updated));
    return newAsg;
  }

  static async updateAssignment(asg: Assignment): Promise<Assignment> {
    const assignments = await this.getAssignments();
    const idx = assignments.findIndex(a => a.id === asg.id);
    if (idx !== -1) {
      assignments[idx] = { ...asg };
      await AsyncStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    }
    return asg;
  }

  static async deleteAssignment(id: string): Promise<void> {
    const assignments = await this.getAssignments();
    const filtered = assignments.filter(a => a.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(filtered));
  }

  // ===================== FLASHCARDS (EZBER KARTLARI) =====================

  static async getFlashcards(courseId?: string): Promise<Flashcard[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.FLASHCARDS);
      if (!json) {
        return [];
      }
      const cards: Flashcard[] = JSON.parse(json);
      return courseId ? cards.filter(c => c.courseId === courseId) : cards;
    } catch (e) {
      return [];
    }
  }

  static async saveFlashcard(cardData: Omit<Flashcard, 'id' | 'createdAt'>): Promise<Flashcard> {
    const cards = await this.getFlashcards();
    const newCard: Flashcard = {
      ...cardData,
      id: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      isMastered: false,
      createdAt: Date.now(),
    };
    const updated = [newCard, ...cards];
    await AsyncStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(updated));
    return newCard;
  }

  static async toggleFlashcardMastered(id: string): Promise<void> {
    const cards = await this.getFlashcards();
    const card = cards.find(c => c.id === id);
    if (card) {
      card.isMastered = !card.isMastered;
      card.lastReviewed = Date.now();
      await AsyncStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(cards));
    }
  }

  static async deleteFlashcard(id: string): Promise<void> {
    const cards = await this.getFlashcards();
    const filtered = cards.filter(c => c.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(filtered));
  }

  // ===================== APP SETTINGS =====================

  static async getSettings(): Promise<AppSettings> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!json) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  static async saveSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...partial };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  }

  // ===================== COURSE DOCUMENTS (SLIDES & PAST EXAMS) =====================

  static async getDocuments(courseId?: string): Promise<CourseDocument[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (!json) {
        return [];
      }
      const docs: CourseDocument[] = JSON.parse(json);
      return courseId ? docs.filter(d => d.courseId === courseId) : docs;
    } catch (e) {
      return [];
    }
  }

  static async saveDocument(docData: Omit<CourseDocument, 'id' | 'uploadDate'>): Promise<CourseDocument> {
    const docs = await this.getDocuments();
    const newDoc: CourseDocument = {
      ...docData,
      id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      uploadDate: new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date()),
    };
    const updated = [newDoc, ...docs];
    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
    return newDoc;
  }

  static async deleteDocument(id: string): Promise<void> {
    const docs = await this.getDocuments();
    const filtered = docs.filter(d => d.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(filtered));
  }

  // ===================== WIPE ALL DEMO / USER DATA =====================

  static async clearAllDemoData(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.COURSES,
      STORAGE_KEYS.LECTURE_NOTES,
      STORAGE_KEYS.ATTENDANCE,
      STORAGE_KEYS.OBS_MAILS,
      STORAGE_KEYS.ASSIGNMENTS,
      STORAGE_KEYS.FLASHCARDS,
      STORAGE_KEYS.DOCUMENTS,
    ]);
    await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify([]));
  }

  static async seedInitialDemoCourses(): Promise<Course[]> {
    const initialList: Course[] = INITIAL_SAMPLE_COURSES.map((c, i) => ({
      ...c,
      id: 'course_' + Date.now() + '_' + i,
      createdAt: Date.now() + i,
    }));
    await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(initialList));
    return initialList;
  }

  // ===================== FULL BACKUP & RESTORE =====================

  static async exportFullBackup(): Promise<string> {
    const courses = await this.getCourses();
    const settings = await this.getSettings();
    const lectureNotes = await this.getLectureNotes();
    const attendance = await this.getAttendanceRecords();
    const assignments = await this.getAssignments();
    const flashcards = await this.getFlashcards();
    const documents = await this.getDocuments();

    const backupData: BackupData = {
      version: '1.1.0',
      exportDate: new Date().toISOString(),
      courses,
      settings,
      lectureNotes,
      attendance,
      assignments,
      flashcards,
      documents,
    };

    return JSON.stringify(backupData, null, 2);
  }

  /**
   * Normalizes different JSON backup payloads into a standard BackupData object
   */
  static normalizeBackupPayload(parsed: any): BackupData | null {
    if (!parsed) return null;
    if (Array.isArray(parsed)) {
      return {
        version: '1',
        exportDate: new Date().toISOString(),
        courses: parsed,
      };
    }
    if (typeof parsed === 'object') {
      const unwrapped = parsed.data || parsed.backup || parsed;
      if (unwrapped && Array.isArray(unwrapped.courses)) {
        return unwrapped as BackupData;
      }
    }
    return null;
  }

  /**
   * Sanitizes, auto-repairs truncated tokens/brackets, and extracts courses from raw backup text
   */
  static sanitizeAndRepairJSON(rawString: string): { data: BackupData | null; repaired: boolean; message?: string } {
    if (!rawString || typeof rawString !== 'string' || !rawString.trim()) {
      return { data: null, repaired: false, message: 'Yedek metni boş.' };
    }

    let cleaned = rawString.replace(/[\uFEFF\u200B\u200C\u200D]/g, '').trim();

    // 1. Strip Markdown code fences if present (```json ... ``` or ``` ... ```)
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    // 2. Normalize smart / curly quotes copied from chat apps
    cleaned = cleaned
      .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'");

    // 3. Extract valid JSON substring starting from first { or [
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let startIndex = -1;
    if (firstBrace !== -1 && firstBracket !== -1) {
      startIndex = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      startIndex = firstBrace;
    } else if (firstBracket !== -1) {
      startIndex = firstBracket;
    }

    if (startIndex > 0) {
      cleaned = cleaned.substring(startIndex);
    }

    // Attempt 1: Direct parse
    try {
      const parsed = JSON.parse(cleaned);
      const data = this.normalizeBackupPayload(parsed);
      if (data && Array.isArray(data.courses) && data.courses.length > 0) {
        return { data, repaired: false };
      }
    } catch {}

    // Attempt 2: Auto-repair cut-off / truncated JSON (e.g. copied from WhatsApp where ending was cut off)
    try {
      const lastBrace = cleaned.lastIndexOf('}');
      if (lastBrace !== -1) {
        const candidate = cleaned.substring(0, lastBrace + 1);
        let openBraces = 0;
        let openBrackets = 0;
        let inString = false;
        let escaped = false;
        for (let i = 0; i < candidate.length; i++) {
          const ch = candidate[i];
          if (escaped) { escaped = false; continue; }
          if (ch === '\\') { escaped = true; continue; }
          if (ch === '"') { inString = !inString; continue; }
          if (!inString) {
            if (ch === '{') openBraces++;
            else if (ch === '}') openBraces--;
            else if (ch === '[') openBrackets++;
            else if (ch === ']') openBrackets--;
          }
        }
        let fixer = candidate;
        while (openBrackets > 0) { fixer += ']'; openBrackets--; }
        while (openBraces > 0) { fixer += '}'; openBraces--; }

        const parsed = JSON.parse(fixer);
        const data = this.normalizeBackupPayload(parsed);
        if (data && Array.isArray(data.courses) && data.courses.length > 0) {
          return { data, repaired: true, message: 'Kesilmiş yedek onarıldı ve dersler başarıyla kurtarıldı.' };
        }
      }
    } catch {}

    // Attempt 3: Regex-based individual course object extraction fallback
    try {
      const extractedCourses: Course[] = [];
      const objRegex = /\{[^{}]*"(?:name|startTime)"[^{}]*\}/g;
      let match;
      let idx = 1;
      while ((match = objRegex.exec(cleaned)) !== null) {
        try {
          const parsedCourse = JSON.parse(match[0]);
          if (parsedCourse && parsedCourse.name) {
            extractedCourses.push({
              id: parsedCourse.id || `rec_${Date.now()}_${idx++}`,
              name: parsedCourse.name,
              instructor: parsedCourse.instructor || '',
              classroom: parsedCourse.classroom || '',
              day: typeof parsedCourse.day === 'number' ? parsedCourse.day : 0,
              startTime: parsedCourse.startTime || '09:00',
              endTime: parsedCourse.endTime || '10:30',
              color: parsedCourse.color || '#3B82F6',
              reminderMinutes: parsedCourse.reminderMinutes || 15,
              category: parsedCourse.category || 'zorunlu',
              mode: parsedCourse.mode || 'fiziksel',
              akts: parsedCourse.akts || 4,
              createdAt: parsedCourse.createdAt || Date.now(),
              ...parsedCourse,
            });
          }
        } catch {}
      }

      if (extractedCourses.length > 0) {
        return {
          data: {
            version: '1',
            exportDate: new Date().toISOString(),
            courses: extractedCourses,
          },
          repaired: true,
          message: `Metin yarım kopyalanmıştı ancak ${extractedCourses.length} ders başarıyla kurtarıldı.`,
        };
      }
    } catch {}

    return { data: null, repaired: false, message: 'Metin geçerli bir yedek veya ders içermiyor.' };
  }

  static async importFullBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data, repaired, message } = this.sanitizeAndRepairJSON(jsonString);

      if (!data || !Array.isArray(data.courses) || data.courses.length === 0) {
        return {
          success: false,
          message: message || 'Geçersiz yedek içeriği: Ders listesi bulunamadı veya metin okunamadı.',
        };
      }

      if (data.courses) {
        await AsyncStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(data.courses));
      }
      if (data.settings && typeof data.settings === 'object') {
        await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      }
      if (data.lectureNotes && Array.isArray(data.lectureNotes)) {
        await AsyncStorage.setItem(STORAGE_KEYS.LECTURE_NOTES, JSON.stringify(data.lectureNotes));
      }
      if (data.attendance && Array.isArray(data.attendance)) {
        await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(data.attendance));
      }
      if (data.assignments && Array.isArray(data.assignments)) {
        await AsyncStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(data.assignments));
      }
      if (data.flashcards && Array.isArray(data.flashcards)) {
        await AsyncStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(data.flashcards));
      }
      if (data.documents && Array.isArray(data.documents)) {
        await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(data.documents));
      }

      const repairNotice = repaired ? `\n(⚠️ ${message || 'Eksik metin otomatik onarıldı'})` : '';

      return {
        success: true,
        message: `Yedek başarıyla yüklendi!\n• ${data.courses.length} Ders\n• ${data.assignments?.length || 0} Ödev/Proje\n• ${data.lectureNotes?.length || 0} Ders Notu\n• ${data.flashcards?.length || 0} Flaş Kart${repairNotice}`,
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Yedek yükleme hatası: ${e?.message || 'Bilinmeyen hata'}`,
      };
    }
  }

  /**
   * Exports backup to a real .json file in cache and opens the native file sharing sheet
   */
  static async exportBackupToFile(): Promise<{ success: boolean; message: string }> {
    try {
      const backupStr = await this.exportFullBackup();
      const dateTag = new Date().toISOString().slice(0, 10);
      const fileUri = `${FileSystem.cacheDirectory}akademik_asistan_yedek_${dateTag}.json`;
      await FileSystem.writeAsStringAsync(fileUri, backupStr, { encoding: FileSystem.EncodingType.UTF8 });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Akademik Asistan Veri Yedeği (.json)',
          UTI: 'public.json',
        });
        return { success: true, message: 'Yedek dosyası hazırlandı ve paylaşım penceresi açıldı.' };
      } else {
        return { success: false, message: 'Cihazınızda dosya paylaşımı desteklenmiyor.' };
      }
    } catch (e: any) {
      return { success: false, message: `Dosya oluşturulamadı: ${e?.message || 'Bilinmeyen hata'}` };
    }
  }

  /**
   * Opens Android document picker to let user choose a .json backup file, reads and restores it
   */
  static async importBackupFromFile(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, message: 'Dosya seçimi iptal edildi.' };
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      return await this.importFullBackup(fileContent);
    } catch (e: any) {
      return { success: false, message: `Dosya okunamadı: ${e?.message || 'Geçersiz dosya'}` };
    }
  }

  // ===================== LOCAL SNAPSHOTS (CİHAZ İÇİ YEDEK) =====================

  static async getLocalSnapshots(): Promise<BackupSnapshot[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_SNAPSHOTS);
      if (!json) return [];
      return JSON.parse(json) as BackupSnapshot[];
    } catch {
      return [];
    }
  }

  static async createLocalSnapshot(): Promise<{ success: boolean; message: string; snapshot?: BackupSnapshot }> {
    try {
      const backupJson = await this.exportFullBackup();
      const parsed: BackupData = JSON.parse(backupJson);
      const courses = parsed.courses || [];
      const now = new Date();
      const dateFormatted = `${now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;

      const newSnapshot: BackupSnapshot = {
        id: 'snapshot_' + Date.now(),
        createdAt: Date.now(),
        dateFormatted,
        courseCount: courses.length,
        backup: parsed,
      };

      const existing = await this.getLocalSnapshots();
      const updated = [newSnapshot, ...existing.slice(0, 9)];
      await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_SNAPSHOTS, JSON.stringify(updated));

      return {
        success: true,
        message: `Hızlı yedek cihazınıza kaydedildi!\n• ${courses.length} Ders\n• ${dateFormatted}`,
        snapshot: newSnapshot,
      };
    } catch (e: any) {
      return { success: false, message: `Yedek alınamadı: ${e?.message || 'Bilinmeyen hata'}` };
    }
  }

  static async restoreLocalSnapshot(snapshotId: string): Promise<{ success: boolean; message: string }> {
    const snapshots = await this.getLocalSnapshots();
    const target = snapshots.find(s => s.id === snapshotId);
    if (!target) {
      return { success: false, message: 'Kayıtlı yedek bulunamadı.' };
    }
    return await this.importFullBackup(JSON.stringify(target.backup));
  }

  static async deleteLocalSnapshot(snapshotId: string): Promise<void> {
    const snapshots = await this.getLocalSnapshots();
    const filtered = snapshots.filter(s => s.id !== snapshotId);
    await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_SNAPSHOTS, JSON.stringify(filtered));
  }

  // ===================== POMODORO & STUDY SESSIONS =====================

  static async getStudySessions(): Promise<StudySession[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.STUDY_SESSIONS);
      if (!json) return [];
      return JSON.parse(json) as StudySession[];
    } catch (e) {
      return [];
    }
  }

  static async saveStudySession(sessionData: Omit<StudySession, 'id' | 'completedAt'>): Promise<StudySession> {
    const sessions = await this.getStudySessions();
    const newSession: StudySession = {
      ...sessionData,
      id: 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      completedAt: Date.now(),
    };
    const updated = [newSession, ...sessions];
    await AsyncStorage.setItem(STORAGE_KEYS.STUDY_SESSIONS, JSON.stringify(updated));
    return newSession;
  }

  static async getWeeklyStudyStats(): Promise<{ totalMinutes: number; sessionCount: number; courseBreakdown: Record<string, number> }> {
    const sessions = await this.getStudySessions();
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = sessions.filter(s => s.completedAt >= oneWeekAgo && s.type === 'focus');

    let totalMinutes = 0;
    const courseBreakdown: Record<string, number> = {};

    thisWeek.forEach(s => {
      totalMinutes += s.durationMinutes;
      const cName = s.courseName || 'Genel Çalışma';
      courseBreakdown[cName] = (courseBreakdown[cName] || 0) + s.durationMinutes;
    });

    return {
      totalMinutes,
      sessionCount: thisWeek.length,
      courseBreakdown,
    };
  }
}
