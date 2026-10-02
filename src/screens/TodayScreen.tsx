import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Clock,
  MapPin,
  User,
  CheckCircle2,
  Video,
  BookOpen,
  Camera,
  Flame,
  GraduationCap,
  Calendar,
  Coffee,
  Sparkles,
  Timer,
  BellOff,
  CheckSquare,
  Square,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react-native';
import { Course, AppSettings, ScheduleGap } from '../types';
import { CourseCard } from '../components/CourseCard';
import { EmptyState } from '../components/EmptyState';
import { HapticsService } from '../services/hapticsService';
import { ScheduleAnalyzer } from '../services/scheduleAnalyzer';
import { StorageService } from '../services/storage';
import { PomodoroModal } from '../components/PomodoroModal';
import {
  getTodayDayOfWeek,
  sortCoursesByTime,
  getCourseStatusToday,
  formatMinutesHuman,
  timeToMinutes,
} from '../utils/time';
import { useLanguage } from '../context/LanguageContext';

interface TodayScreenProps {
  courses: Course[];
  theme?: 'dark' | 'oled' | 'light';
  onAddCoursePress: () => void;
  onEditCoursePress: (course: Course) => void;
  onDeleteCoursePress: (course: Course) => void;
  onAttendCourse: (course: Course) => void;
  onMissCourse: (course: Course) => void;
  onFinishCourseEarly?: (course: Course) => void;
  onOpenOCRScan?: () => void;
  onNavigateTab?: (tabKey: string) => void;
}

const DEFAULT_CHECKLIST_ITEMS = [
  { id: 'id_card', label: 'Öğrenci Kimliği / Sınav Giriş Belgesi' },
  { id: 'pencils', label: '2 Adet Kurşun Kalem & Kaliteli Silgi' },
  { id: 'calculator', label: 'İzinli / Bilimsel Hesap Makinesi' },
  { id: 'water', label: 'Şeffaf Şişe Su & Mendil' },
  { id: 'notes', label: 'Formül Kağıdı & Son Tekrar Notları' },
];

export const TodayScreen: React.FC<TodayScreenProps> = ({
  courses,
  theme = 'dark',
  onAddCoursePress,
  onEditCoursePress,
  onDeleteCoursePress,
  onAttendCourse,
  onMissCourse,
  onFinishCourseEarly,
  onOpenOCRScan,
  onNavigateTab,
}) => {
  const { t, language } = useLanguage();
  const todayDay = getTodayDayOfWeek();
  const [isExamMode, setIsExamMode] = useState(false);
  const [pomodoroVisible, setPomodoroVisible] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    StorageService.getSettings().then(setSettings);
  }, []);

  const isLight = theme === 'light' || settings?.theme === 'light';
  const isOled = theme === 'oled' || settings?.theme === 'oled';

  const toggleCheckItem = (id: string) => {
    HapticsService.selection();
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const semesterCountdown = useMemo(() => {
    if (!settings?.semesterStartDate) return null;
    const startDay = new Date(settings.semesterStartDate);
    startDay.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const diffMs = startDay.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft > 0) {
      return {
        daysLeft,
        startDate: settings.semesterStartDate,
      };
    }
    return null;
  }, [settings?.semesterStartDate]);

  const semesterProgress = useMemo(() => {
    return ScheduleAnalyzer.calculateSemesterWeek(settings?.semesterStartDate);
  }, [settings?.semesterStartDate]);

  const freeWindows = useMemo(() => {
    return ScheduleAnalyzer.findFreeWindows(courses, todayDay);
  }, [courses, todayDay]);

  const todayCourses = useMemo(() => {
    const list = courses.filter(c => c.day === todayDay);
    return sortCoursesByTime(list);
  }, [courses, todayDay]);

  const { ongoingCourse, upcomingCourse, finishedCount } = useMemo(() => {
    let ongoing: Course | null = null;
    let upcoming: Course | null = null;
    let finished = 0;

    for (const c of todayCourses) {
      if (c.isCancelledToday) continue;
      const status = getCourseStatusToday(c);
      if (status.status === 'ongoing' && !ongoing) {
        ongoing = c;
      } else if (status.status === 'upcoming' && !upcoming && !ongoing) {
        upcoming = c;
      } else if (status.status === 'finished') {
        finished++;
      }
    }

    return {
      ongoingCourse: ongoing,
      upcomingCourse: upcoming,
      finishedCount: finished,
    };
  }, [todayCourses]);

  const allUpcomingExams = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const list: {
      courseName: string;
      type: string;
      date: string;
      time: string;
      classroom: string;
      daysLeft: number;
    }[] = [];

    courses.forEach(c => {
      if (c.exams) {
        Object.entries(c.exams).forEach(([type, ex]) => {
          if (ex && ex.date && ex.date >= todayStr) {
            const examD = new Date(ex.date);
            const nowD = new Date(todayStr);
            const diffDays = Math.ceil((examD.getTime() - nowD.getTime()) / (1000 * 60 * 60 * 24));
            list.push({
              courseName: c.name,
              type: type === 'vize' ? 'Vize' : type === 'final' ? 'Final' : 'Bütünleme',
              date: ex.date,
              time: ex.time || '10:00',
              classroom: ex.classroom || c.classroom || 'Sınav Salonu',
              daysLeft: diffDays,
            });
          }
        });
      }
    });

    list.sort((a, b) => a.daysLeft - b.daysLeft);
    return list;
  }, [courses]);

  const nextExam = allUpcomingExams[0] || null;

  const weeklyStats = useMemo(() => {
    const totalWeeklyHours = courses.reduce((acc, c) => {
      const s = timeToMinutes(c.startTime);
      const e = timeToMinutes(c.endTime);
      return acc + Math.max(0, e - s);
    }, 0);

    const totalCredits = courses.reduce((sum, c) => sum + (c.akts || 4), 0);

    return {
      totalCourses: courses.length,
      totalHoursText: `${(totalWeeklyHours / 60).toFixed(1)} Saat`,
      totalCredits,
    };
  }, [courses]);

  const ongoingStatus = ongoingCourse ? getCourseStatusToday(ongoingCourse) : null;
  const upcomingStatus = upcomingCourse ? getCourseStatusToday(upcomingCourse) : null;

  return (
    <ScrollView
      style={[
        styles.container,
        isOled && styles.containerOled,
        isLight && styles.containerLight,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        {/* Semester Start Date Countdown Guard Banner */}
        {semesterCountdown && (
          <View style={[styles.semesterCountdownBanner, isLight && styles.cardLight]}>
            <View style={styles.semesterCountdownHeader}>
              <View style={styles.semesterCountdownBadge}>
                <Calendar size={13} color="#38BDF8" />
                <Text style={styles.semesterCountdownBadgeText}>DÖNEM BAŞLANGIÇ GERİ SAYIMI</Text>
              </View>
              <View style={styles.semesterDaysLeftPill}>
                <Clock size={12} color="#0F172A" />
                <Text style={styles.semesterDaysLeftText}>{semesterCountdown.daysLeft} Gün Kaldı</Text>
              </View>
            </View>
            <Text style={[styles.semesterCountdownTitle, isLight && { color: '#0F172A' }]}>
              Dersler {semesterCountdown.startDate} Tarihinde Başlıyor
            </Text>
            <View style={styles.semesterMutedRow}>
              <BellOff size={13} color={isLight ? '#64748B' : '#94A3B8'} />
              <Text style={[styles.semesterCountdownSub, isLight && { color: '#64748B' }]}>
                Haftalık ders alarmları dönem başlayana kadar sessizde tutulur. Programınızı önceden rahatça hazırlayabilirsiniz.
              </Text>
            </View>
          </View>
        )}

        {/* Semester Progress Week Badge */}
        <View style={[styles.semesterBadge, isLight && styles.semesterBadgeLight]}>
          <Calendar size={13} color="#38BDF8" />
          <Text style={[styles.semesterBadgeText, isLight && { color: '#0284C7' }]}>
            Dönem: <Text style={{ fontWeight: '800' }}>{semesterProgress.currentWeek}. Hafta</Text> • {semesterProgress.statusText}
          </Text>
        </View>

        {/* Responsive Quick Tools Banner (No text overflow) */}
        <View style={styles.quickToolsBanner}>
          <TouchableOpacity
            style={[styles.quickToolBtn, isLight && styles.quickToolBtnLight]}
            onPress={() => {
              HapticsService.light();
              setPomodoroVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Clock size={15} color="#F59E0B" />
            <Text style={[styles.quickToolText, { color: '#F59E0B' }]} numberOfLines={1}>
              ⏱️ Odaklan
            </Text>
          </TouchableOpacity>

          {onOpenOCRScan && (
            <TouchableOpacity
              style={[styles.quickToolBtn, isLight && styles.quickToolBtnLight]}
              onPress={() => {
                HapticsService.light();
                onOpenOCRScan();
              }}
              activeOpacity={0.8}
            >
              <Camera size={15} color="#38BDF8" />
              <Text style={[styles.quickToolText, { color: '#38BDF8' }]} numberOfLines={1}>
                📸 OCR Tara
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.quickToolBtn,
              isExamMode ? styles.examModeBtnActive : isLight && styles.quickToolBtnLight,
            ]}
            onPress={() => {
              HapticsService.medium();
              setIsExamMode(!isExamMode);
            }}
            activeOpacity={0.8}
          >
            <Flame size={15} color={isExamMode ? '#FFFFFF' : '#EF4444'} />
            <Text
              style={[
                styles.quickToolText,
                { color: isExamMode ? '#FFFFFF' : '#EF4444' },
              ]}
              numberOfLines={1}
            >
              {isExamMode ? 'Sınav: Açık' : '🎯 Sınav Modu'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Enhanced Interactive Exam Mode Dashboard */}
        {isExamMode && (
          <View style={[styles.examFocusHero, isLight && styles.cardLight]}>
            <View style={styles.examFocusTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Flame size={20} color="#EF4444" />
                <Text style={[styles.examFocusTitle, isLight && { color: '#0F172A' }]}>
                  Vize & Final Sınav Modu
                </Text>
              </View>
              <View style={styles.examProtectionBadge}>
                <ShieldCheck size={13} color="#10B981" />
                <Text style={styles.examProtectionText}>Odak Koruması</Text>
              </View>
            </View>

            <Text style={[styles.examFocusSub, isLight && { color: '#64748B' }]}>
              Ders alarmları susturuldu; sadece sınav saatleri ve tekrar hatırlatıcıları devrede.
            </Text>

            {/* Upcoming Exams in Exam Mode */}
            {allUpcomingExams.length > 0 ? (
              <View style={styles.examCardsList}>
                <Text style={[styles.examMiniHeading, isLight && { color: '#0F172A' }]}>
                  📅 Yaklaşan Sınavlarınız:
                </Text>
                {allUpcomingExams.slice(0, 3).map((ex, idx) => (
                  <View key={idx} style={[styles.examItemRow, isLight && styles.examItemRowLight]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.examItemCourse, isLight && { color: '#0F172A' }]}>
                        {ex.courseName}
                      </Text>
                      <Text style={styles.examItemMeta}>
                        {ex.type} • {ex.date} {ex.time} • {ex.classroom}
                      </Text>
                    </View>
                    <View style={styles.examDaysBadge}>
                      <Text style={styles.examDaysBadgeText}>
                        {ex.daysLeft === 0 ? 'Bugün!' : ex.daysLeft === 1 ? 'Yarın!' : `${ex.daysLeft} Gün`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noExamsBox}>
                <Text style={[styles.noExamsText, isLight && { color: '#64748B' }]}>
                  Henüz sınav tarihi girilmedi. Sınavlar sekmesinden vize/final tarihlerinizi ekleyebilirsiniz.
                </Text>
              </View>
            )}

            {/* Sınav Çantası Kontrol Listesi (Checklist) */}
            <View style={styles.checklistCard}>
              <Text style={[styles.checklistTitle, isLight && { color: '#0F172A' }]}>
                🎒 Sınav Çantası & Hazırlık Kontrolü:
              </Text>
              {DEFAULT_CHECKLIST_ITEMS.map(item => {
                const isChecked = !!checkedItems[item.id];
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.checkItemRow}
                    onPress={() => toggleCheckItem(item.id)}
                    activeOpacity={0.7}
                  >
                    {isChecked ? (
                      <CheckSquare size={18} color="#10B981" />
                    ) : (
                      <Square size={18} color={isLight ? '#94A3B8' : '#64748B'} />
                    )}
                    <Text
                      style={[
                        styles.checkItemText,
                        isLight && { color: '#0F172A' },
                        isChecked && styles.checkItemTextChecked,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Regular Upcoming Exam Card (if not in full exam mode) */}
        {!isExamMode && nextExam && (
          <View style={[styles.examCountdownCard, isLight && styles.cardLight]}>
            <View style={styles.examCountdownHeader}>
              <View style={styles.examTypeBadge}>
                <Calendar size={13} color="#F59E0B" />
                <Text style={styles.examTypeBadgeText}>Yaklaşan Sınav</Text>
              </View>
              <View style={styles.daysLeftPill}>
                <Clock size={12} color="#EF4444" />
                <Text style={styles.daysLeftText}>
                  {nextExam.daysLeft === 0
                    ? 'Bugün!'
                    : nextExam.daysLeft === 1
                    ? 'Yarın!'
                    : `${nextExam.daysLeft} Gün Kaldı`}
                </Text>
              </View>
            </View>
            <Text style={[styles.examCourseTitle, isLight && { color: '#0F172A' }]}>
              {nextExam.courseName} ({nextExam.type})
            </Text>
            <View style={styles.examMetaRow}>
              <View style={styles.examMetaItem}>
                <Calendar size={12} color={isLight ? '#64748B' : '#94A3B8'} />
                <Text style={[styles.examMetaText, isLight && { color: '#64748B' }]}>
                  {nextExam.date} • {nextExam.time}
                </Text>
              </View>
              <View style={styles.examMetaItem}>
                <MapPin size={12} color={isLight ? '#64748B' : '#94A3B8'} />
                <Text style={[styles.examMetaText, isLight && { color: '#64748B' }]}>
                  {nextExam.classroom}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Active Class Hero Banner */}
        {ongoingCourse && ongoingStatus ? (
          <View
            style={[
              styles.heroCard,
              isLight && styles.cardLight,
              { borderColor: ongoingCourse.color || '#10B981' },
            ]}
          >
            <View style={styles.heroHeader}>
              <View style={styles.ongoingPill}>
                <View style={styles.pulsingDot} />
                <Text style={styles.ongoingPillText}>Şu An Devam Ediyor</Text>
              </View>
              <Text style={styles.heroTimeRemaining}>{ongoingStatus.minutesUntilEnd} dk kaldı</Text>
            </View>

            <Text style={[styles.heroCourseTitle, isLight && { color: '#0F172A' }]}>
              {ongoingCourse.name}
            </Text>

            <View style={styles.heroMetaRow}>
              {ongoingCourse.classroom && (
                <View style={styles.heroMetaItem}>
                  <MapPin size={14} color="#F59E0B" />
                  <Text style={[styles.heroMetaText, isLight && { color: '#64748B' }]}>
                    {ongoingCourse.classroom}
                  </Text>
                </View>
              )}
              {ongoingCourse.instructor && (
                <View style={styles.heroMetaItem}>
                  <User size={14} color="#A78BFA" />
                  <Text style={[styles.heroMetaText, isLight && { color: '#64748B' }]}>
                    {ongoingCourse.instructor}
                  </Text>
                </View>
              )}
              <View style={styles.heroMetaItem}>
                <Clock size={14} color="#38BDF8" />
                <Text style={[styles.heroMetaText, isLight && { color: '#64748B' }]}>
                  {ongoingCourse.startTime} - {ongoingCourse.endTime}
                </Text>
              </View>
            </View>

            <View style={styles.heroActionBtnsRow}>
              <TouchableOpacity
                style={styles.heroAttendBtn}
                onPress={() => onAttendCourse(ongoingCourse)}
                activeOpacity={0.8}
              >
                <CheckCircle2 size={16} color="#FFFFFF" />
                <Text style={styles.heroAttendBtnText}>Ders Modu</Text>
              </TouchableOpacity>

              {onFinishCourseEarly && (
                <TouchableOpacity
                  style={styles.heroFinishEarlyBtn}
                  onPress={() => onFinishCourseEarly(ongoingCourse)}
                  activeOpacity={0.8}
                >
                  <Sparkles size={16} color="#FFFFFF" />
                  <Text style={styles.heroFinishEarlyBtnText}>Ders Bitti (Erken Bitir)</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : upcomingCourse && upcomingStatus ? (
          <View style={[styles.upcomingHeroCard, isLight && styles.cardLight]}>
            <View style={styles.heroHeader}>
              <View style={styles.upcomingPill}>
                <Clock size={12} color="#38BDF8" />
                <Text style={styles.upcomingPillText}>Sıradaki Ders</Text>
              </View>
              <Text style={styles.upcomingStartsIn}>
                {upcomingStatus.minutesUntilStart} dakika sonra başlıyor
              </Text>
            </View>

            <Text style={[styles.heroCourseTitle, isLight && { color: '#0F172A' }]}>
              {upcomingCourse.name}
            </Text>

            <View style={styles.heroMetaRow}>
              {upcomingCourse.classroom && (
                <View style={styles.heroMetaItem}>
                  <MapPin size={14} color="#F59E0B" />
                  <Text style={[styles.heroMetaText, isLight && { color: '#64748B' }]}>
                    {upcomingCourse.classroom}
                  </Text>
                </View>
              )}
              {upcomingCourse.instructor && (
                <View style={styles.heroMetaItem}>
                  <User size={14} color="#A78BFA" />
                  <Text style={[styles.heroMetaText, isLight && { color: '#64748B' }]}>
                    {upcomingCourse.instructor}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* Free Windows Analysis */}
        {freeWindows.length > 0 && (
          <View style={[styles.freeWindowsCard, isLight && styles.cardLight]}>
            <View style={styles.freeWindowsHeader}>
              <Coffee size={16} color="#10B981" />
              <Text style={styles.freeWindowsTitle}>Bugünkü Boşluk Saatleri</Text>
            </View>
            {freeWindows.map((fw: ScheduleGap, idx: number) => (
              <View key={idx} style={[styles.gapRow, isLight && styles.gapRowLight]}>
                <View style={styles.gapTimeBox}>
                  <Text style={styles.gapTimeText}>
                    {fw.start} - {fw.end}
                  </Text>
                  <Text style={styles.gapDurationText}>{formatMinutesHuman(fw.durationMinutes)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.gapBetweenText, isLight && { color: '#0F172A' }]}>
                    {fw.prevCourseName && fw.nextCourseName
                      ? `${fw.prevCourseName} ➔ ${fw.nextCourseName}`
                      : (fw.prevCourseName || 'Dersler Arası Boşluk')}
                  </Text>
                  <Text style={[styles.gapSuggestionText, isLight && { color: '#64748B' }]}>
                    {fw.suggestion}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Timeline of Today's Courses */}
        <View style={styles.timelineSection}>
          <Text style={[styles.sectionTitle, isLight && { color: '#0F172A' }]}>
            {language === 'en' ? `Today's Schedule (${todayCourses.length})` : `Günün Ders Akışı (${todayCourses.length})`}
          </Text>

          {todayCourses.length === 0 ? (
            <View style={[styles.noClassesCard, isLight && styles.cardLight]}>
              <Coffee size={36} color="#10B981" />
              <Text style={[styles.noClassesTitle, isLight && { color: '#0F172A' }]}>
                {t('noClassesToday')}
              </Text>
              <Text style={[styles.noClassesSubtitle, isLight && { color: '#64748B' }]}>
                {t('noClassesTodaySub')}
              </Text>
              <TouchableOpacity
                style={styles.addCourseSmallBtn}
                onPress={onAddCoursePress}
                activeOpacity={0.8}
              >
                <Text style={styles.addCourseSmallBtnText}>+ {t('addCourseAction')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            todayCourses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                isToday
                theme={theme}
                onPress={() => onEditCoursePress(course)}
                onEdit={() => onEditCoursePress(course)}
                onDelete={() => onDeleteCoursePress(course)}
                onAttend={() => onAttendCourse(course)}
                onMiss={() => onMissCourse(course)}
              />
            ))
          )}
        </View>
      </View>

      {/* Pomodoro Modal */}
      <PomodoroModal
        visible={pomodoroVisible}
        courses={courses}
        theme={theme}
        initialCourse={ongoingCourse || upcomingCourse || courses[0] || null}
        onClose={() => setPomodoroVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  containerOled: {
    backgroundColor: '#000000',
  },
  containerLight: {
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  semesterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  semesterBadgeLight: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: 'rgba(2, 132, 199, 0.2)',
  },
  semesterBadgeText: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '600',
  },
  quickToolsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  quickToolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickToolBtnLight: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  quickToolText: {
    fontSize: 11,
    fontWeight: '700',
  },
  examModeBtnActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  examFocusHero: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  examFocusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  examFocusTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#EF4444',
  },
  examProtectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  examProtectionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  examFocusSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
    lineHeight: 16,
  },
  examCardsList: {
    marginBottom: 12,
  },
  examMiniHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  examItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  examItemRowLight: {
    backgroundColor: '#F1F5F9',
  },
  examItemCourse: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  examItemMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  examDaysBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  examDaysBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EF4444',
  },
  noExamsBox: {
    padding: 8,
    marginBottom: 10,
  },
  noExamsText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  checklistCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  checklistTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  checkItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    flex: 1,
  },
  checkItemTextChecked: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  semesterCountdownBanner: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  semesterCountdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  semesterCountdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  semesterCountdownBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  semesterDaysLeftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  semesterDaysLeftText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  semesterCountdownTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  semesterMutedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  semesterCountdownSub: {
    fontSize: 11,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 16,
  },
  examCountdownCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  examCountdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  examTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  examTypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  daysLeftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysLeftText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EF4444',
  },
  examCourseTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  examMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  examMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  examMetaText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  heroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    marginBottom: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ongoingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  ongoingPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  heroTimeRemaining: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
  },
  heroCourseTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroMetaText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  heroActionBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroAttendBtn: {
    flex: 1,
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroAttendBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroFinishEarlyBtn: {
    flex: 1.1,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroFinishEarlyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  upcomingHeroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginBottom: 16,
  },
  upcomingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  upcomingPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  upcomingStartsIn: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  freeWindowsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  freeWindowsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  freeWindowsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  gapRowLight: {
    backgroundColor: '#F1F5F9',
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  gapTimeBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  gapTimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  gapDurationText: {
    fontSize: 10,
    color: '#CBD5E1',
    fontWeight: '600',
    marginTop: 2,
  },
  gapBetweenText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  gapSuggestionText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
  },
  timelineSection: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  noClassesCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  noClassesTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 8,
    marginBottom: 4,
  },
  noClassesSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 14,
  },
  addCourseSmallBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addCourseSmallBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
