export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0: Pazartesi, 1: Salı, ..., 6: Pazar

export type CourseCategory = 'zorunlu' | 'secmeli' | 'usd'; // Zorunlu, Bölüm Seçmeli, Üniversite Seçmeli (ÜSD)
export type CourseMode = 'in_person' | 'online'; // Yüz Yüze veya Online

export type ExamType = 'vize' | 'final' | 'but';

export interface Exam {
  id: string;
  courseId: string;
  courseName: string;
  type: ExamType;
  date: string; // "2026-11-15"
  time: string; // "10:00"
  classroom: string; // "Amfi 1"
  grade?: number; // 0 - 100
  weightPercent?: number; // 40 (vize), 60 (final)
}

export type PassingStatus = 'passed' | 'conditional_passed' | 'failed' | 'in_progress';

export interface CourseGradeStatus {
  vizeScore?: number;
  finalScore?: number;
  butScore?: number;
  calculatedAverage?: number;
  letterGrade?: string; // 'AA', 'BA', 'BB', 'CB', 'CC', 'DC', 'DD', 'FD', 'FF'
  status: PassingStatus; // 'passed' (Geçti), 'conditional_passed' (Koşullu), 'failed' (Kaldı)
  hasButEligibility: boolean; // Büt hakkı var mı?
  butEligibilityReason: string; // "Kaldı (Büt Zorunlu)", "Koşullu Geçti (İsteğe Bağlı)", "Geçti (Büt Hakkı Yok)"
}

export interface TargetGradeRequirement {
  letterGrade: string;
  label: string;
  gpaPoint: number;
  requiredFinalScore: number;
  isAchievable: boolean;
  statusNote: string;
}

export interface CourseDocument {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  type: 'slide' | 'past_exam' | 'cheat_sheet' | 'notes';
  fileUrl?: string;
  sizeText: string;
  uploadDate: string;
}

export interface OCRResult {
  extractedText: string;
  identifiedFormulas: string[];
  summaryPoints: string[];
  confidencePercent: number;
}

export interface Assignment {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description: string;
  dueDate: string; // "2026-11-20"
  dueTime: string; // "23:59"
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  weightPercent?: number;
  uzemSubmissionLink?: string;
  createdAt: number;
}

export interface Flashcard {
  id: string;
  courseId: string;
  courseName: string;
  front: string; // Soru / Terim / Formül
  back: string; // Cevap / Tanım / Açıklama
  categoryTag?: string; // "Formül", "Tanım", "Sınav Sorusu"
  isMastered?: boolean;
  lastReviewed?: number;
  createdAt: number;
}

export interface QuizQuestion {
  id: string;
  courseId: string;
  courseName: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Course {
  id: string;
  name: string; // Ders Adı
  instructor: string; // Dersin Hocası
  classroom: string; // Sınıf / Derslik (D7, D4, Amfi 1 vb.)
  day: DayOfWeek; // Haftanın günü
  startTime: string; // "09:00" formatında
  endTime: string; // "10:30" formatında
  color: string; // Hex renk kodu
  reminderMinutes: number; // Dersten kaç dakika önce bildirim (10, 15, 30 vb.)
  notes?: string;
  category: CourseCategory; // Zorunlu, Seçmeli veya ÜSD
  mode: CourseMode; // Yüz Yüze veya Online
  onlineLink?: string; // Zoom, Teams, Meet linki
  uzemLink?: string; // Dersin UZEM bağlantı linki
  uzemType?: 'department' | 'usd'; // Bölüm UZEM mi, ÜSD UZEM mi?
  delayMinutes?: number; // Hoca gecikmesi (örn. 15 dk)
  isCancelledToday?: boolean; // Bugün ders iptal mi?
  isFinishedEarlyToday?: boolean; // Hoca erken bıraktı, bugün ders bitti mi?
  gradeStatus?: CourseGradeStatus;
  akts?: number; // Dersin AKTS / Kredisi (örn. 5)
  maxAbsenceCount?: number; // Dönemlik maksimum devamsızlık hakkı (örn. 4 hafta)
  syllabus?: SyllabusWeek[]; // 14 Haftalık Müfredat & Konu İzlencesi
  exams?: {
    vize?: Exam;
    final?: Exam;
    but?: Exam;
  };
  createdAt: number;
}

export interface SyllabusWeek {
  weekNumber: number; // 1 - 14
  topic: string;
  isCompleted: boolean;
  isExamWeek?: 'vize' | 'final';
  notes?: string;
}

export interface GradingScaleConfig {
  passingThreshold: number;
  aa: number;
  ba: number;
  bb: number;
  cb: number;
  cc: number;
  dc: number;
  dd: number;
  fd: number;
}

export const DEFAULT_GRADING_SCALE: GradingScaleConfig = {
  passingThreshold: 50,
  aa: 90,
  ba: 85,
  bb: 80,
  cb: 75,
  cc: 70,
  dc: 60,
  dd: 50,
  fd: 40,
};

export interface GPACalculationResult {
  gpa: number; // 0.00 - 4.00
  totalAkts: number;
  gradedAkts: number;
  honorStatus: 'none' | 'honor' | 'high_honor';
  honorText: string;
  courseDetails: {
    courseId: string;
    courseName: string;
    akts: number;
    letterGrade?: string;
    gpaPoint?: number;
    isGraded: boolean;
  }[];
}

export interface BackupData {
  version: string;
  exportDate: string;
  courses: Course[];
  settings?: AppSettings;
  lectureNotes?: LectureNote[];
  attendance?: AttendanceRecord[];
  assignments?: Assignment[];
  flashcards?: Flashcard[];
  documents?: CourseDocument[];
}

export interface LectureNote {
  id: string;
  courseId: string;
  courseName: string;
  date: string;
  textNotes: string;
  audioUri?: string;
  audioDurationSeconds: number;
  transcript: string;
  summaryPoints: string[];
  imageUris?: string[];
  createdAt: number;
}

export interface AttendanceRecord {
  id: string;
  courseId: string;
  date: string;
  status: 'attended' | 'missed';
  timestamp: number;
}

export interface OBSMail {
  id: string;
  sender: string;
  subject: string;
  body: string;
  date: string;
  isCancellationNotice: boolean;
  relatedCourseName?: string;
  read: boolean;
}

export interface UZEMConfig {
  departmentUzemUrl: string; // örn: https://uzem.universite.edu.tr
  usdUzemUrl: string; // örn: https://usd-uzem.universite.edu.tr
  isDepartmentBound: boolean;
  isUsdBound: boolean;
}

export interface OBSConfig {
  portalUrl: string;
  studentNumber: string;
  password: string;
  isScheduleBound: boolean;
  isGradesBound: boolean;
  isMailsBound: boolean;
  lastSyncTime?: number;
  isLoggedIn: boolean;
}

export interface StudySession {
  id: string;
  courseId?: string;
  courseName: string;
  durationMinutes: number; // örn. 25
  completedAt: number; // timestamp
  topic?: string;
  type: 'focus' | 'short_break' | 'long_break';
}

export interface ScheduleGap {
  start: string; // "11:45"
  end: string; // "13:30"
  durationMinutes: number; // 105
  prevCourseName: string;
  nextCourseName: string;
  suggestion: string;
}

export interface SemesterProgress {
  currentWeek: number; // 1 - 14
  totalWeeks: number; // 14
  vizeWeek: number; // 7
  finalWeek: number; // 14
  weeksToVize: number;
  weeksToFinal: number;
  statusText: string;
}

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'deepseek' | 'custom';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string; // örn: gemini-1.5-flash, gemini-1.5-pro, gpt-4o, vb.
  customBaseUrl?: string; // DeepSeek veya yerel model için
}

export interface AppSettings {
  defaultReminderMinutes: number;
  notificationsEnabled: boolean;
  theme: 'dark' | 'oled' | 'light' | 'system';
  language?: 'tr' | 'en';
  isExamWeekMode?: boolean; // Sınav haftası özel odak modu
  universityName?: string;
  departmentName?: string;
  gradingScale?: GradingScaleConfig;
  obsConfig?: OBSConfig;
  uzemConfig?: UZEMConfig;
  onboardingCompleted?: boolean;
  vaultPin?: string; // 4 haneli özel not kasası şifresi
  isVaultProtected?: boolean; // Not Kasası PIN ile kilitli mi?
  semesterStartDate?: string; // Dönem başlangıç tarihi (YYYY-MM-DD)
  aiSettings?: AISettings;
}

export const DAYS_OF_WEEK = [
  { id: 0, name: 'Pazartesi', shortName: 'Pzt' },
  { id: 1, name: 'Salı', shortName: 'Sal' },
  { id: 2, name: 'Çarşamba', shortName: 'Çar' },
  { id: 3, name: 'Perşembe', shortName: 'Per' },
  { id: 4, name: 'Cuma', shortName: 'Cum' },
  { id: 5, name: 'Cumartesi', shortName: 'Cmt' },
  { id: 6, name: 'Pazar', shortName: 'Paz' },
] as const;

export function getDaysOfWeek(lang: 'tr' | 'en' = 'tr') {
  if (lang === 'en') {
    return [
      { id: 0 as DayOfWeek, name: 'Monday', shortName: 'Mon' },
      { id: 1 as DayOfWeek, name: 'Tuesday', shortName: 'Tue' },
      { id: 2 as DayOfWeek, name: 'Wednesday', shortName: 'Wed' },
      { id: 3 as DayOfWeek, name: 'Thursday', shortName: 'Thu' },
      { id: 4 as DayOfWeek, name: 'Friday', shortName: 'Fri' },
      { id: 5 as DayOfWeek, name: 'Saturday', shortName: 'Sat' },
      { id: 6 as DayOfWeek, name: 'Sunday', shortName: 'Sun' },
    ];
  }
  return DAYS_OF_WEEK;
}

export const DEFAULT_PALETTES = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#6366F1', // Indigo
];

export const COMMON_CLASSROOMS = [
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8',
  'Amfi 1', 'Amfi 2', 'Amfi 3', 'Lab 1', 'Lab 2', 'Bilişim Lab', 'Online (Zoom/Meet)'
];

export const REMINDER_OPTIONS = [
  { label: 'Bildirim Yok', value: 0 },
  { label: '5 dakika önce', value: 5 },
  { label: '10 dakika önce', value: 10 },
  { label: '15 dakika önce', value: 15 },
  { label: '30 dakika önce', value: 30 },
  { label: '45 dakika önce', value: 45 },
  { label: '1 saat önce', value: 60 },
];
