import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import {
  Clock,
  MapPin,
  User,
  Video,
  Edit2,
  Trash2,
  XCircle,
  ExternalLink,
  Sparkles,
  AlertTriangle,
} from 'lucide-react-native';
import { Course } from '../types';
import { getCourseStatusToday, formatMinutesHuman } from '../utils/time';
import { HapticsService } from '../services/hapticsService';
import { StorageService } from '../services/storage';
import { useLanguage } from '../context/LanguageContext';

interface CourseCardProps {
  course: Course;
  isToday?: boolean;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
  onAttend?: (course: Course) => void;
  onMiss?: (course: Course) => void;
  onPress?: (course: Course) => void;
  theme?: 'dark' | 'oled' | 'light';
}

const CourseCardComponent: React.FC<CourseCardProps> = ({
  course,
  isToday = false,
  onEdit,
  onDelete,
  onAttend,
  onMiss,
  onPress,
  theme = 'dark',
}) => {
  const { t, language } = useLanguage();
  const isLight = theme === 'light';
  const statusInfo = isToday ? getCourseStatusToday(course) : null;
  const [missedCount, setMissedCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    StorageService.getAttendanceStats(course.id).then(stats => {
      if (isMounted) {
        setMissedCount(stats.missed);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [course.id]);

  const handleEdit = () => {
    HapticsService.light();
    onEdit(course);
  };

  const handleDelete = () => {
    HapticsService.warning();
    onDelete(course);
  };

  const handleAttend = () => {
    HapticsService.success();
    onAttend?.(course);
  };

  const handleMiss = () => {
    HapticsService.medium();
    onMiss?.(course);
  };

  const handleOpenOnlineLink = () => {
    if (course.onlineLink) {
      Linking.openURL(course.onlineLink).catch(() => {});
    }
  };

  return (
    <View
      style={[
        styles.card,
        isLight && styles.cardLight,
        { borderLeftColor: course.isCancelledToday ? '#EF4444' : course.color || '#3B82F6' },
        course.isCancelledToday && styles.cancelledCard,
      ]}
    >
      {/* Top row: Time, Category & Status Badges */}
      <View style={styles.topRow}>
        <View style={[styles.timeBadge, isLight && styles.timeBadgeLight]}>
          <Clock size={13} color={isLight ? '#64748B' : '#94A3B8'} />
          <Text style={[styles.timeText, isLight && styles.timeTextLight]}>
            {course.startTime} - {course.endTime}
            {course.delayMinutes ? ` (+${course.delayMinutes} dk)` : ''}
          </Text>
        </View>

        <View style={styles.statusGroup}>
          {/* Category Badge (Zorunlu / Seçmeli / ÜSD) */}
          <View
            style={[
              styles.categoryBadge,
              course.category === 'usd'
                ? (isLight ? styles.categoryUsdLight : styles.categoryUsd)
                : course.category === 'secmeli'
                ? (isLight ? styles.categorySecmeliLight : styles.categorySecmeli)
                : (isLight ? styles.categoryZorunluLight : styles.categoryZorunlu),
            ]}
          >
            <Text
              style={[
                styles.categoryBadgeText,
                isLight && (
                  course.category === 'usd'
                    ? styles.categoryBadgeTextUsdLight
                    : course.category === 'secmeli'
                    ? styles.categoryBadgeTextSecmeliLight
                    : styles.categoryBadgeTextZorunluLight
                ),
              ]}
            >
              {course.category === 'usd'
                ? 'ÜSD'
                : course.category === 'secmeli'
                ? 'Seçmeli'
                : 'Zorunlu'}
            </Text>
          </View>

          {/* Mode Badge (Online vs In-person) */}
          {course.mode === 'online' && (
            <View style={[styles.onlineBadge, isLight && styles.onlineBadgeLight]}>
              <Video size={11} color={isLight ? '#0284C7' : '#38BDF8'} />
              <Text style={[styles.onlineBadgeText, isLight && styles.onlineBadgeTextLight]}>Online</Text>
            </View>
          )}

          {/* AKTS Badge */}
          {course.akts !== undefined && (
            <View style={[styles.aktsBadge, isLight && styles.aktsBadgeLight]}>
              <Text style={[styles.aktsBadgeText, isLight && styles.aktsBadgeTextLight]}>{course.akts} AKTS</Text>
            </View>
          )}

          {course.isCancelledToday && (
            <View style={styles.cancelledBadge}>
              <Text style={styles.cancelledBadgeText}>İptal Edildi</Text>
            </View>
          )}

          {statusInfo && statusInfo.status === 'ongoing' && !course.isCancelledToday && (
            <View style={styles.ongoingBadge}>
              <View style={styles.pulsingDot} />
              <Text style={styles.ongoingText}>Devam Ediyor</Text>
            </View>
          )}

          {statusInfo && statusInfo.status === 'upcoming' && statusInfo.minutesUntilStart <= 120 && !course.isCancelledToday && (
            <View style={styles.upcomingBadge}>
              <Text style={styles.upcomingText}>
                {formatMinutesHuman(statusInfo.minutesUntilStart)} kaldı
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Course Title */}
      <TouchableOpacity
        onPress={() => onPress?.(course)}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <Text style={[styles.courseName, isLight && styles.courseNameLight]}>{course.name}</Text>
      </TouchableOpacity>

      {/* Details Row: Classroom & Instructor */}
      <View style={styles.metaRow}>
        {course.classroom ? (
          <View style={[styles.metaPill, isLight && styles.metaPillLight]}>
            <MapPin size={13} color="#F59E0B" />
            <Text style={[styles.classroomText, isLight && styles.classroomTextLight]}>{course.classroom}</Text>
          </View>
        ) : null}

        {course.instructor ? (
          <View style={[styles.metaPill, isLight && styles.metaPillLight]}>
            <User size={13} color="#A78BFA" />
            <Text style={[styles.instructorText, isLight && styles.instructorTextLight]} numberOfLines={1}>
              {course.instructor}
            </Text>
          </View>
        ) : null}

        {course.onlineLink && (
          <TouchableOpacity
            style={[styles.joinOnlineBtn, isLight && styles.joinOnlineBtnLight]}
            onPress={handleOpenOnlineLink}
            activeOpacity={0.8}
          >
            <ExternalLink size={12} color={isLight ? '#0284C7' : '#38BDF8'} />
            <Text style={[styles.joinOnlineBtnText, isLight && styles.joinOnlineBtnTextLight]}>Derse Katıl</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Smart Absence Limit Badge */}
      {course.maxAbsenceCount !== undefined && (
        <View
          style={[
            styles.absencePill,
            missedCount >= course.maxAbsenceCount
              ? styles.absenceExceeded
              : course.maxAbsenceCount - missedCount <= 1
              ? styles.absenceCritical
              : styles.absenceSafe,
          ]}
        >
          <AlertTriangle
            size={12}
            color={
              missedCount >= course.maxAbsenceCount
                ? '#EF4444'
                : course.maxAbsenceCount - missedCount <= 1
                ? '#F59E0B'
                : '#10B981'
            }
          />
          <Text
            style={[
              styles.absencePillText,
              {
                color:
                  missedCount >= course.maxAbsenceCount
                    ? '#EF4444'
                    : course.maxAbsenceCount - missedCount <= 1
                    ? '#F59E0B'
                    : '#10B981',
              },
            ]}
          >
            {missedCount >= course.maxAbsenceCount
              ? language === 'en'
                ? `Absence Limit Exceeded! (${missedCount}/${course.maxAbsenceCount})`
                : `Devamsızlık Sınırı Aşıldı! (${missedCount}/${course.maxAbsenceCount})`
              : course.maxAbsenceCount - missedCount <= 1
              ? language === 'en'
                ? `Critical Absence: ${missedCount}/${course.maxAbsenceCount} (Only ${course.maxAbsenceCount - missedCount} left!)`
                : `Kritik Devamsızlık: ${missedCount}/${course.maxAbsenceCount} (Son ${course.maxAbsenceCount - missedCount} hak!)`
              : language === 'en'
              ? `Absence: ${missedCount}/${course.maxAbsenceCount} (${course.maxAbsenceCount - missedCount} left)`
              : `Devamsızlık: ${missedCount}/${course.maxAbsenceCount} (${course.maxAbsenceCount - missedCount} hak kaldı)`}
          </Text>
        </View>
      )}

      {/* Ongoing Progress Bar */}
      {statusInfo && statusInfo.status === 'ongoing' && !course.isCancelledToday && (
        <View style={[styles.progressContainer, isLight && styles.progressContainerLight]}>
          <View
            style={[
              styles.progressBar,
              { width: `${statusInfo.progressPercent}%`, backgroundColor: course.color || '#3B82F6' },
            ]}
          />
        </View>
      )}

      {/* Attendance & Class Session Action Bar (If Today) */}
      {isToday && !course.isCancelledToday && onAttend && onMiss && (
        <View style={[styles.attendanceActionRow, isLight && styles.attendanceActionRowLight]}>
          <TouchableOpacity
            style={styles.attendBtn}
            onPress={handleAttend}
            activeOpacity={0.8}
          >
            <Sparkles size={14} color="#FFFFFF" />
            <Text style={styles.attendBtnText}>{t('attendedBtn')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.missBtn, isLight && styles.missBtnLight]}
            onPress={handleMiss}
            activeOpacity={0.8}
          >
            <XCircle size={14} color="#EF4444" />
            <Text style={styles.missBtnText}>{t('missedBtn')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Footer Actions */}
      <View style={[styles.footerRow, isLight && styles.footerRowLight]}>
        {course.notes ? (
          <Text style={[styles.notesText, isLight && styles.notesTextLight]} numberOfLines={1}>
            📝 {course.notes}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionIconButton, isLight && styles.actionIconButtonLight]}
            onPress={handleEdit}
            activeOpacity={0.7}
          >
            <Edit2 size={14} color={isLight ? '#475569' : '#94A3B8'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionIconButton, isLight && styles.actionIconButtonLight]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={14} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export const CourseCard = React.memo(CourseCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  cancelledCard: {
    opacity: 0.75,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryZorunlu: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  categorySecmeli: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  categoryUsd: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
  },
  cancelledBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cancelledBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
  },
  ongoingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  ongoingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  upcomingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  upcomingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  courseName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  classroomText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  instructorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    maxWidth: 160,
  },
  joinOnlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  joinOnlineBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  attendanceActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  attendBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  attendBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  missBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  missBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  notesText: {
    flex: 1,
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aktsBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  aktsBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
  },
  absencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  absenceSafe: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  absenceCritical: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  absenceExceeded: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  absencePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
  },
  timeBadgeLight: {
    backgroundColor: '#F1F5F9',
  },
  timeTextLight: {
    color: '#0F172A',
  },
  courseNameLight: {
    color: '#0F172A',
  },
  metaPillLight: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  instructorTextLight: {
    color: '#334155',
  },
  joinOnlineBtnLight: {
    backgroundColor: '#F0F9FF',
    borderColor: 'rgba(2, 132, 199, 0.3)',
  },
  joinOnlineBtnTextLight: {
    color: '#0284C7',
  },
  progressContainerLight: {
    backgroundColor: '#E2E8F0',
  },
  attendanceActionRowLight: {
    borderTopColor: '#E2E8F0',
  },
  missBtnLight: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  footerRowLight: {
    borderTopColor: '#E2E8F0',
  },
  notesTextLight: {
    color: '#64748B',
  },
  actionIconButtonLight: {
    backgroundColor: '#F1F5F9',
  },
  categoryZorunluLight: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  categorySecmeliLight: {
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  categoryUsdLight: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  categoryBadgeTextZorunluLight: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  categoryBadgeTextSecmeliLight: {
    color: '#6D28D9',
    fontWeight: '800',
  },
  categoryBadgeTextUsdLight: {
    color: '#047857',
    fontWeight: '800',
  },
  onlineBadgeLight: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  onlineBadgeTextLight: {
    color: '#0284C7',
    fontWeight: '800',
  },
  aktsBadgeLight: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  aktsBadgeTextLight: {
    color: '#0284C7',
    fontWeight: '800',
  },
  classroomTextLight: {
    color: '#B45309',
    fontWeight: '700',
  },
});

