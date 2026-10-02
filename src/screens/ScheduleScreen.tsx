import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
} from 'react-native';
import { Plus, Search, Calendar, QrCode, Smartphone, Share2, LayoutGrid, List } from 'lucide-react-native';
import { Course, DayOfWeek, DAYS_OF_WEEK } from '../types';
import { CourseCard } from '../components/CourseCard';
import { EmptyState } from '../components/EmptyState';
import { HapticsService } from '../services/hapticsService';
import { sortCoursesByTime, getTodayDayOfWeek, timeToMinutes, formatMinutesHuman } from '../utils/time';
import { normalizeTurkish } from '../services/suggestions';
import { QRShareModal } from '../components/QRShareModal';
import { CourseDetailModal } from '../components/CourseDetailModal';
import { TimetablePosterModal } from '../components/TimetablePosterModal';
import { StorageService } from '../services/storage';

interface ScheduleScreenProps {
  courses: Course[];
  onAddCoursePress: (day?: DayOfWeek) => void;
  onEditCoursePress: (course: Course) => void;
  onDeleteCoursePress: (course: Course) => void;
  onRefreshCourses?: () => void;
  theme?: 'dark' | 'oled' | 'light';
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
  courses,
  onAddCoursePress,
  onEditCoursePress,
  onDeleteCoursePress,
  onRefreshCourses,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const todayDay = getTodayDayOfWeek();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [posterModalVisible, setPosterModalVisible] = useState(false);
  const [selectedDetailCourse, setSelectedDetailCourse] = useState<Course | null>(null);

  const handleShareSchedule = async () => {
    HapticsService.light();
    let text = '📚 AKADEMİK ASİSTAN - HAFTALIK DERS PROGRAMI\n';
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    for (const d of DAYS_OF_WEEK) {
      const dayCourses = sortCoursesByTime(courses.filter(c => c.day === d.id));
      if (dayCourses.length === 0) continue;
      text += `📅 ${d.name.toUpperCase()}\n`;
      for (const c of dayCourses) {
        text += `• ${c.startTime} - ${c.endTime} | ${c.name}`;
        if (c.classroom) text += ` (${c.classroom})`;
        if (c.instructor) text += ` - ${c.instructor}`;
        text += '\n';
      }
      text += '\n';
    }
    text += '🎓 Akademik Asistan ile oluşturuldu.';
    await Share.share({ message: text });
  };

  const handleImportCourses = async (imported: Course[]) => {
    for (const c of imported) {
      await StorageService.saveCourse(c);
    }
    onRefreshCourses?.();
  };

  const handleUpdateDetailCourse = async (updated: Course) => {
    await StorageService.updateCourse(updated);
    setSelectedDetailCourse(updated);
    onRefreshCourses?.();
  };

  // Course counts per day
  const countsPerDay = useMemo(() => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    courses.forEach(c => {
      counts[c.day] = (counts[c.day] || 0) + 1;
    });
    return counts;
  }, [courses]);

  // Filtered courses for selected day
  const filteredCourses = useMemo(() => {
    const q = normalizeTurkish(searchQuery);
    return sortCoursesByTime(
      courses.filter(c => {
        if (c.day !== selectedDay) return false;
        if (!q) return true;
        return (
          normalizeTurkish(c.name).includes(q) ||
          normalizeTurkish(c.instructor).includes(q) ||
          normalizeTurkish(c.classroom).includes(q)
        );
      })
    );
  }, [courses, selectedDay, searchQuery]);

  // Calculate total time for the day
  const totalDayMinutes = useMemo(() => {
    return filteredCourses.reduce((acc, c) => {
      const s = timeToMinutes(c.startTime);
      const e = timeToMinutes(c.endTime);
      return acc + Math.max(0, e - s);
    }, 0);
  }, [filteredCourses]);

  return (
    <View style={[styles.container, isLight && styles.containerLight]}>
      {/* Search Bar & QR Share Row */}
      <View style={styles.topActionRow}>
        <View style={[styles.searchContainer, isLight && styles.searchContainerLight]}>
          <Search size={16} color={isLight ? '#64748B' : '#64748B'} />
          <TextInput
            style={[styles.searchInput, isLight && styles.searchInputLight]}
            placeholder="Ders veya sınıf ara..."
            placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchText}>Temizle</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.qrHeaderBtn, isLight && styles.qrHeaderBtnLight]}
          onPress={() => {
            HapticsService.light();
            setQrModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <QrCode size={16} color={isLight ? '#0284C7' : '#38BDF8'} />
          <Text style={[styles.qrHeaderBtnText, isLight && styles.qrHeaderBtnTextLight]}>Karekod</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.posterHeaderBtn, isLight && styles.posterHeaderBtnLight]}
          onPress={() => {
            HapticsService.light();
            setPosterModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Smartphone size={16} color={isLight ? '#7C3AED' : '#A78BFA'} />
          <Text style={[styles.posterHeaderBtnText, isLight && styles.posterHeaderBtnTextLight]}>Duvar Kağıdı</Text>
        </TouchableOpacity>
      </View>

      {/* View Mode Switcher & Share Schedule */}
      <View style={styles.viewModeRow}>
        <View style={[styles.toggleContainer, isLight && styles.toggleContainerLight]}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              viewMode === 'list' && (isLight ? styles.toggleBtnActiveLight : styles.toggleBtnActive),
            ]}
            onPress={() => {
              HapticsService.selection();
              setViewMode('list');
            }}
            activeOpacity={0.8}
          >
            <List size={14} color={viewMode === 'list' ? (isLight ? '#0284C7' : '#FFFFFF') : (isLight ? '#64748B' : '#94A3B8')} />
            <Text
              style={[
                styles.toggleBtnText,
                isLight && styles.toggleBtnTextLight,
                viewMode === 'list' && (isLight ? styles.toggleBtnTextActiveLight : styles.toggleBtnTextActive),
              ]}
            >
              Günlük Liste
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleBtn,
              viewMode === 'matrix' && (isLight ? styles.toggleBtnActiveLight : styles.toggleBtnActive),
            ]}
            onPress={() => {
              HapticsService.selection();
              setViewMode('matrix');
            }}
            activeOpacity={0.8}
          >
            <LayoutGrid size={14} color={viewMode === 'matrix' ? (isLight ? '#0284C7' : '#FFFFFF') : (isLight ? '#64748B' : '#94A3B8')} />
            <Text
              style={[
                styles.toggleBtnText,
                isLight && styles.toggleBtnTextLight,
                viewMode === 'matrix' && (isLight ? styles.toggleBtnTextActiveLight : styles.toggleBtnTextActive),
              ]}
            >
              Haftalık Pano
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.shareHeaderBtn, isLight && styles.shareHeaderBtnLight]}
          onPress={handleShareSchedule}
          activeOpacity={0.8}
        >
          <Share2 size={14} color={isLight ? '#0284C7' : '#38BDF8'} />
          <Text style={[styles.shareHeaderBtnText, isLight && styles.shareHeaderBtnTextLight]}>Paylaş</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'list' ? (
        <>
          {/* Weekday Selector Strip */}
          <View style={styles.daysStripWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daysStrip}
            >
              {DAYS_OF_WEEK.map(d => {
                const isSelected = selectedDay === d.id;
                const isToday = todayDay === d.id;
                const count = countsPerDay[d.id] || 0;

                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.dayTab,
                      isLight && styles.dayTabLight,
                      isSelected && styles.dayTabSelected,
                      isToday && !isSelected && (isLight ? styles.dayTabTodayLight : styles.dayTabToday),
                    ]}
                    onPress={() => {
                      HapticsService.selection();
                      setSelectedDay(d.id as DayOfWeek);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayTabShort,
                        isLight && styles.dayTabShortLight,
                        isSelected && styles.dayTabShortSelected,
                        isToday && !isSelected && (isLight ? styles.dayTabShortTodayLight : styles.dayTabShortToday),
                      ]}
                    >
                      {d.shortName}
                    </Text>

                    <View
                      style={[
                        styles.countBadge,
                        isLight && styles.countBadgeLight,
                        isSelected && styles.countBadgeSelected,
                        count === 0 && styles.countBadgeEmpty,
                      ]}
                    >
                      <Text
                        style={[
                          styles.countBadgeText,
                          isLight && styles.countBadgeTextLight,
                          isSelected && styles.countBadgeTextSelected,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>

                    {isToday && <View style={styles.todayDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Summary Bar */}
          <View style={styles.summaryBar}>
            <Text style={[styles.dayTitle, isLight && styles.dayTitleLight]}>
              {DAYS_OF_WEEK.find(d => d.id === selectedDay)?.name}
            </Text>
            <Text style={[styles.summaryStats, isLight && styles.summaryStatsLight]}>
              {filteredCourses.length} Ders {totalDayMinutes > 0 ? `• ${formatMinutesHuman(totalDayMinutes)}` : ''}
            </Text>
          </View>

          {/* Course List or Empty State */}
          <ScrollView
            style={styles.courseList}
            contentContainerStyle={styles.courseListContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredCourses.length > 0 ? (
              filteredCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isToday={selectedDay === todayDay}
                  theme={theme}
                  onEdit={onEditCoursePress}
                  onDelete={onDeleteCoursePress}
                  onPress={c => {
                    HapticsService.selection();
                    setSelectedDetailCourse(c);
                  }}
                />
              ))
            ) : (
              <EmptyState
                icon={<Calendar size={32} color="#38BDF8" />}
                title={searchQuery ? 'Eşleşen Ders Bulunamadı' : 'Bu Güne Ait Ders Yok'}
                description={
                  searchQuery
                    ? 'Arama kriterlerinizi değiştirip tekrar deneyin.'
                    : 'Bu güne ait derslerini ekleyerek haftalık programını tamamla.'
                }
                actionText={!searchQuery ? '+ Ders Ekle' : undefined}
                onActionPress={
                  !searchQuery
                    ? () => {
                        HapticsService.medium();
                        onAddCoursePress(selectedDay);
                      }
                    : undefined
                }
              />
            )}
            <View style={{ height: 90 }} />
          </ScrollView>
        </>
      ) : (
        /* Haftalık Pano (Matrix View) */
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.matrixContainer}
        >
          {DAYS_OF_WEEK.map(d => {
            const isToday = todayDay === d.id;
            const dayCourses = sortCoursesByTime(courses.filter(c => c.day === d.id));

            return (
              <View
                key={d.id}
                style={[
                  styles.matrixColumn,
                  isLight && styles.matrixColumnLight,
                  isToday && (isLight ? styles.matrixColumnTodayLight : styles.matrixColumnToday),
                ]}
              >
                {/* Column Header */}
                <View style={[styles.matrixColHeader, isLight && styles.matrixColHeaderLight, isToday && styles.matrixColHeaderToday]}>
                  <Text style={[styles.matrixColTitle, isLight && styles.matrixColTitleLight, isToday && styles.matrixColTitleToday]}>
                    {d.name}
                  </Text>
                  {isToday && (
                    <View style={styles.matrixTodayTag}>
                      <Text style={styles.matrixTodayTagText}>BUGÜN</Text>
                    </View>
                  )}
                  <Text style={[styles.matrixCountText, isLight && styles.matrixCountTextLight]}>
                    {dayCourses.length} ders
                  </Text>
                </View>

                {/* Column Courses List */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.matrixColList}
                >
                  {dayCourses.length > 0 ? (
                    dayCourses.map(course => (
                      <TouchableOpacity
                        key={course.id}
                        style={[
                          styles.matrixCard,
                          isLight && styles.matrixCardLight,
                          { borderLeftColor: course.color || '#3B82F6' },
                        ]}
                        onPress={() => {
                          HapticsService.selection();
                          setSelectedDetailCourse(course);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.matrixCardTime, isLight && styles.matrixCardTimeLight]}>
                          {course.startTime} - {course.endTime}
                        </Text>
                        <Text
                          style={[styles.matrixCardName, isLight && styles.matrixCardNameLight]}
                          numberOfLines={2}
                        >
                          {course.name}
                        </Text>
                        {!!course.classroom && (
                          <Text style={[styles.matrixCardClass, isLight && styles.matrixCardClassLight]} numberOfLines={1}>
                            📍 {course.classroom}
                          </Text>
                        )}
                        {!!course.instructor && (
                          <Text style={[styles.matrixCardProf, isLight && styles.matrixCardProfLight]} numberOfLines={1}>
                            👤 {course.instructor}
                          </Text>
                        )}
                        {course.isFinishedEarlyToday && (
                          <View style={styles.matrixFinishedBadge}>
                            <Text style={styles.matrixFinishedBadgeText}>Bugün Bitti</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.matrixEmptySlot}>
                      <Text style={[styles.matrixEmptyText, isLight && styles.matrixEmptyTextLight]}>Ders yok</Text>
                      <TouchableOpacity
                        style={styles.matrixAddMiniBtn}
                        onPress={() => {
                          HapticsService.medium();
                          onAddCoursePress(d.id as DayOfWeek);
                        }}
                      >
                        <Plus size={14} color="#38BDF8" />
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          HapticsService.medium();
          onAddCoursePress(selectedDay);
        }}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* QR Share & Import Modal */}
      <QRShareModal
        visible={qrModalVisible}
        courses={courses}
        theme={theme}
        onClose={() => setQrModalVisible(false)}
        onImportCourses={handleImportCourses}
      />

      {/* Course Details & 14-Week Syllabus Tracker Modal */}
      <CourseDetailModal
        visible={selectedDetailCourse !== null}
        course={selectedDetailCourse}
        theme={theme}
        onClose={() => setSelectedDetailCourse(null)}
        onUpdateCourse={handleUpdateDetailCourse}
      />

      {/* Lockscreen Timetable Poster Modal */}
      <TimetablePosterModal
        visible={posterModalVisible}
        courses={courses}
        theme={theme}
        onClose={() => setPosterModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#F8FAFC',
  },
  clearSearchText: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '600',
  },
  daysStripWrapper: {
    marginBottom: 12,
  },
  daysStrip: {
    paddingHorizontal: 20,
    gap: 8,
  },
  dayTab: {
    width: 50,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    position: 'relative',
  },
  dayTabToday: {
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  dayTabSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  dayTabShort: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  dayTabShortToday: {
    color: '#38BDF8',
  },
  dayTabShortSelected: {
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countBadgeEmpty: {
    opacity: 0.4,
  },
  countBadgeSelected: {
    backgroundColor: '#1E40AF',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  countBadgeTextSelected: {
    color: '#FFFFFF',
  },
  todayDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  summaryStats: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  courseList: {
    flex: 1,
  },
  courseListContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  addFirstButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  qrHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  qrHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  posterHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  posterHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A78BFA',
  },
  viewModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  toggleContainerLight: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  toggleBtnActive: {
    backgroundColor: '#3B82F6',
  },
  toggleBtnActiveLight: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  toggleBtnTextLight: {
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  toggleBtnTextActiveLight: {
    color: '#0284C7',
    fontWeight: '700',
  },
  shareHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  shareHeaderBtnLight: {
    backgroundColor: '#F0F9FF',
    borderColor: 'rgba(2, 132, 199, 0.25)',
  },
  shareHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  shareHeaderBtnTextLight: {
    color: '#0284C7',
  },
  matrixContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  matrixColumn: {
    width: 175,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    maxHeight: '100%',
  },
  matrixColumnLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  matrixColumnToday: {
    borderColor: 'rgba(56, 189, 248, 0.5)',
  },
  matrixColumnTodayLight: {
    borderColor: 'rgba(2, 132, 199, 0.4)',
  },
  matrixColHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  matrixColHeaderLight: {
    borderBottomColor: '#F1F5F9',
  },
  matrixColHeaderToday: {
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  matrixColTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  matrixColTitleLight: {
    color: '#0F172A',
  },
  matrixColTitleToday: {
    color: '#38BDF8',
  },
  matrixTodayTag: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 3,
  },
  matrixTodayTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  matrixCountText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  matrixCountTextLight: {
    color: '#94A3B8',
  },
  matrixColList: {
    padding: 10,
    gap: 8,
  },
  matrixCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  matrixCardLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  matrixCardTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 4,
  },
  matrixCardTimeLight: {
    color: '#0284C7',
  },
  matrixCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  matrixCardNameLight: {
    color: '#0F172A',
  },
  matrixCardClass: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  matrixCardClassLight: {
    color: '#64748B',
  },
  matrixCardProf: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  matrixCardProfLight: {
    color: '#64748B',
  },
  matrixFinishedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  matrixFinishedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  matrixEmptySlot: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  matrixEmptyText: {
    fontSize: 12,
    color: '#64748B',
  },
  matrixEmptyTextLight: {
    color: '#94A3B8',
  },
  matrixAddMiniBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerLight: {
    backgroundColor: '#F8FAFC',
  },
  searchContainerLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInputLight: {
    color: '#0F172A',
  },
  qrHeaderBtnLight: {
    backgroundColor: '#F0F9FF',
    borderColor: 'rgba(2, 132, 199, 0.25)',
  },
  qrHeaderBtnTextLight: {
    color: '#0284C7',
  },
  posterHeaderBtnLight: {
    backgroundColor: '#F5F3FF',
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  posterHeaderBtnTextLight: {
    color: '#7C3AED',
  },
  dayTabLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  dayTabTodayLight: {
    borderColor: 'rgba(2, 132, 199, 0.5)',
  },
  dayTabShortLight: {
    color: '#64748B',
  },
  dayTabShortTodayLight: {
    color: '#0284C7',
  },
  countBadgeLight: {
    backgroundColor: '#F1F5F9',
  },
  countBadgeTextLight: {
    color: '#475569',
  },
  dayTitleLight: {
    color: '#0F172A',
  },
  summaryStatsLight: {
    color: '#64748B',
  },
});

