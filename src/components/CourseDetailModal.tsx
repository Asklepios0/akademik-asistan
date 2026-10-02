import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import {
  X,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  Circle,
  ExternalLink,
  GraduationCap,
  Sparkles,
  AlertTriangle,
} from 'lucide-react-native';
import { Course, SyllabusWeek, DAYS_OF_WEEK } from '../types';
import { HapticsService } from '../services/hapticsService';

interface CourseDetailModalProps {
  visible: boolean;
  course?: Course | null;
  onClose: () => void;
  onUpdateCourse: (updatedCourse: Course) => void;
  theme?: 'dark' | 'oled' | 'light';
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  visible,
  course,
  onClose,
  onUpdateCourse,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const isOled = theme === 'oled';

  const [syllabus, setSyllabus] = useState<SyllabusWeek[]>([]);
  const [editingWeekIndex, setEditingWeekIndex] = useState<number | null>(null);
  const [editingTopicText, setEditingTopicText] = useState('');

  // Default 14-week curriculum generator if empty
  useEffect(() => {
    if (course) {
      if (course.syllabus && course.syllabus.length > 0) {
        setSyllabus(course.syllabus);
      } else {
        const initial14Weeks: SyllabusWeek[] = Array.from({ length: 14 }, (_, i) => {
          const weekNum = i + 1;
          return {
            weekNumber: weekNum,
            topic:
              weekNum === 7
                ? 'Ara Sınav / Vize Haftası'
                : weekNum === 14
                ? 'Final Sınavı & Genel Tekrar'
                : `${weekNum}. Hafta Konusu`,
            isCompleted: false,
            isExamWeek: weekNum === 7 ? 'vize' : weekNum === 14 ? 'final' : undefined,
          };
        });
        setSyllabus(initial14Weeks);
      }
    }
  }, [course]);

  const completedCount = useMemo(() => {
    return syllabus.filter(w => w.isCompleted).length;
  }, [syllabus]);

  const progressPercent = useMemo(() => {
    return syllabus.length > 0 ? Math.round((completedCount / syllabus.length) * 100) : 0;
  }, [completedCount, syllabus.length]);

  if (!course) return null;

  const dayName = DAYS_OF_WEEK.find(d => d.id === course.day)?.name || 'Pazartesi';

  const handleToggleWeek = (index: number) => {
    HapticsService.light();
    const updated = [...syllabus];
    updated[index] = {
      ...updated[index],
      isCompleted: !updated[index].isCompleted,
    };
    setSyllabus(updated);
    onUpdateCourse({
      ...course,
      syllabus: updated,
    });
  };

  const handleStartEditTopic = (index: number) => {
    setEditingWeekIndex(index);
    setEditingTopicText(syllabus[index].topic);
  };

  const handleSaveTopic = () => {
    if (editingWeekIndex === null) return;
    const updated = [...syllabus];
    updated[editingWeekIndex] = {
      ...updated[editingWeekIndex],
      topic: editingTopicText.trim() || `${editingWeekIndex + 1}. Hafta Konusu`,
    };
    setSyllabus(updated);
    setEditingWeekIndex(null);
    onUpdateCourse({
      ...course,
      syllabus: updated,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, isLight && { backgroundColor: 'rgba(15, 23, 42, 0.45)' }]}>
        <View style={[
          styles.container,
          isLight && { backgroundColor: '#FFFFFF', borderColor: 'rgba(0, 0, 0, 0.08)' },
          isOled && { backgroundColor: '#080808', borderColor: 'rgba(255, 255, 255, 0.15)' }
        ]}>
          {/* Header */}
          <View style={[styles.header, isLight && { borderBottomColor: 'rgba(0, 0, 0, 0.06)' }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View style={[styles.colorDot, { backgroundColor: course.color || '#3B82F6' }]} />
                <Text style={[styles.categoryBadgeText, isLight && { color: '#64748B' }]}>
                  {course.category.toUpperCase()} • {course.akts || 4} AKTS
                </Text>
              </View>
              <Text style={[styles.title, isLight && { color: '#0F172A' }]}>{course.name}</Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, isLight && { backgroundColor: '#F1F5F9' }]}
              onPress={onClose}
            >
              <X size={18} color={isLight ? '#475569' : '#94A3B8'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Course Quick Meta */}
            <View style={[
              styles.metaCard,
              isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0, 0, 0, 0.06)' }
            ]}>
              <View style={styles.metaItem}>
                <Calendar size={14} color={isLight ? '#0284C7' : '#38BDF8'} />
                <Text style={[styles.metaText, isLight && { color: '#334155' }]}>{dayName}</Text>
              </View>
              <View style={styles.metaItem}>
                <Clock size={14} color={isLight ? '#D97706' : '#F59E0B'} />
                <Text style={[styles.metaText, isLight && { color: '#334155' }]}>
                  {course.startTime} - {course.endTime}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <MapPin size={14} color={isLight ? '#059669' : '#10B981'} />
                <Text style={[styles.metaText, isLight && { color: '#334155' }]}>{course.classroom || 'Derslik'}</Text>
              </View>
              {course.instructor ? (
                <View style={styles.metaItem}>
                  <User size={14} color={isLight ? '#7C3AED' : '#A78BFA'} />
                  <Text style={[styles.metaText, isLight && { color: '#334155' }]}>{course.instructor}</Text>
                </View>
              ) : null}
            </View>

            {/* 14-Week Syllabus Tracker Section */}
            <View style={styles.sectionHeaderRow}>
              <BookOpen size={16} color={isLight ? '#0284C7' : '#38BDF8'} />
              <Text style={[styles.sectionTitle, isLight && { color: '#0F172A' }]}>14 Haftalık Dönem Müfredatı</Text>
            </View>

            {/* Progress Bar */}
            <View style={[
              styles.progressBox,
              isLight && { backgroundColor: '#F8FAFC' }
            ]}>
              <View style={styles.progressLabelRow}>
                <Text style={[styles.progressTitle, isLight && { color: '#475569' }]}>Konu İlerlemesi</Text>
                <Text style={[styles.progressPercentText, isLight && { color: '#0284C7' }]}>
                  {completedCount} / {syllabus.length} Hafta (%{progressPercent})
                </Text>
              </View>
              <View style={[styles.progressBarTrack, isLight && { backgroundColor: 'rgba(0, 0, 0, 0.06)' }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: course.color || '#38BDF8',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Week List */}
            <View style={styles.syllabusList}>
              {syllabus.map((week, idx) => {
                const isEditing = editingWeekIndex === idx;

                return (
                  <View
                    key={week.weekNumber}
                    style={[
                      styles.weekItem,
                      isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0, 0, 0, 0.06)' },
                      week.isCompleted && styles.weekItemCompleted,
                      week.isExamWeek && styles.weekItemExam,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.checkTouch}
                      onPress={() => handleToggleWeek(idx)}
                      activeOpacity={0.7}
                    >
                      {week.isCompleted ? (
                        <CheckCircle2 size={20} color="#10B981" />
                      ) : (
                        <Circle size={20} color={isLight ? '#94A3B8' : '#64748B'} />
                      )}
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                      <View style={styles.weekNumberRow}>
                        <Text
                          style={[
                            styles.weekNumText,
                            isLight && { color: '#0284C7' },
                            week.isCompleted && styles.completedText,
                          ]}
                        >
                          Hafta {week.weekNumber}
                        </Text>
                        {week.isExamWeek && (
                          <View style={styles.examTag}>
                            <AlertTriangle size={10} color="#F59E0B" />
                            <Text style={styles.examTagText}>
                              {week.isExamWeek.toUpperCase()} HAFTASI
                            </Text>
                          </View>
                        )}
                      </View>

                      {isEditing ? (
                        <View style={styles.inlineEditRow}>
                          <TextInput
                            style={[
                              styles.inlineInput,
                              isLight && { backgroundColor: '#FFFFFF', color: '#0F172A', borderColor: '#0284C7' }
                            ]}
                            value={editingTopicText}
                            onChangeText={setEditingTopicText}
                            autoFocus
                          />
                          <TouchableOpacity
                            style={[styles.inlineSaveBtn, isLight && { backgroundColor: '#0284C7' }]}
                            onPress={handleSaveTopic}
                          >
                            <Text style={[styles.inlineSaveText, isLight && { color: '#FFFFFF' }]}>Tamam</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleStartEditTopic(idx)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.weekTopicText,
                              isLight && { color: '#0F172A' },
                              week.isCompleted && styles.completedText,
                            ]}
                          >
                            {week.topic}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  metaCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  progressBox: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  syllabusList: {
    gap: 8,
  },
  weekItem: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  weekItemCompleted: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
  },
  weekItemExam: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
  },
  checkTouch: {
    padding: 2,
  },
  weekNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  weekNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
  },
  examTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  examTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
  },
  weekTopicText: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  completedText: {
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  inlineEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: '#F8FAFC',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  inlineSaveBtn: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  inlineSaveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
});
