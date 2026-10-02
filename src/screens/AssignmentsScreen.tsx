import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import {
  ClipboardList,
  Plus,
  Clock,
  CheckCircle2,
  ExternalLink,
  Trash2,
  X,
  Flame,
  Calendar,
} from 'lucide-react-native';
import { Course, Assignment } from '../types';
import { StorageService } from '../services/storage';
import { EmptyState } from '../components/EmptyState';
import { HapticsService } from '../services/hapticsService';
import { CalendarDatePickerModal } from '../components/CalendarDatePickerModal';

interface AssignmentsScreenProps {
  courses: Course[];
  onRefreshAssignments?: () => void;
  theme?: 'dark' | 'oled' | 'light';
}

export const AssignmentsScreen: React.FC<AssignmentsScreenProps> = ({
  courses,
  onRefreshAssignments,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [calendarPickerVisible, setCalendarPickerVisible] = useState(false);

  // New assignment form state
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('high');

  useEffect(() => {
    loadAssignments();
    // Ensure selectedCourseId always points to a valid course
    if (courses.length > 0) {
      const isValid = courses.some(c => c.id === selectedCourseId);
      if (!isValid) {
        setSelectedCourseId(courses[0].id);
      }
    }
  }, [courses, selectedCourseId]);

  const loadAssignments = async () => {
    const data = await StorageService.getAssignments();
    setAssignments(data);
  };

  const handleSaveNewAssignment = async () => {
    if (!title.trim() || !dueDate.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen ödev başlığı ve son teslim tarihini girin.');
      return;
    }

    const course = courses.find(c => c.id === selectedCourseId);
    await StorageService.saveAssignment({
      courseId: selectedCourseId,
      courseName: course ? course.name : 'Ders',
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate.trim(),
      dueTime: dueTime.trim() || '23:59',
      status: 'pending',
      priority,
      uzemSubmissionLink: course?.uzemLink || 'https://uzem.universite.edu.tr',
    });

    setTitle('');
    setDescription('');
    setDueDate('');
    setModalVisible(false);
    await loadAssignments();
    onRefreshAssignments?.();
    Alert.alert('✅ Başarılı', 'Yeni ödev teslim takviminize eklendi.');
  };

  const handleToggleStatus = async (asg: Assignment) => {
    const nextStatus: 'completed' | 'in_progress' = asg.status === 'completed' ? 'in_progress' : 'completed';
    if (nextStatus === 'completed') {
      HapticsService.success();
    } else {
      HapticsService.light();
    }
    const updated = { ...asg, status: nextStatus };
    await StorageService.updateAssignment(updated);
    await loadAssignments();
    onRefreshAssignments?.();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Ödevi Sil', 'Bu ödevi takvimden silmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          HapticsService.warning();
          await StorageService.deleteAssignment(id);
          await loadAssignments();
          onRefreshAssignments?.();
        },
      },
    ]);
  };

  // Helper to calculate remaining time
  const getRemainingTimeText = (dueDateStr: string, dueTimeStr: string, status: string) => {
    if (status === 'completed') return '✅ Teslim Edildi';

    const now = new Date().getTime();
    const target = new Date(`${dueDateStr}T${dueTimeStr || '23:59'}:00`).getTime();
    const diffMs = target - now;

    if (isNaN(target)) return dueDateStr;
    if (diffMs <= 0) return '⚠️ Teslim Süresi Doldu';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;

    if (days === 0) {
      return `🔴 Son ${remainingHours} saat kaldı!`;
    } else if (days <= 2) {
      return `🟡 Son ${days} gün ${remainingHours} saat kaldı`;
    } else {
      return `🟢 ${days} gün kaldı (${dueDateStr})`;
    }
  };

  const filtered = assignments.filter(a => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const pendingCount = assignments.filter(a => a.status !== 'completed').length;

  return (
    <ScrollView style={[styles.container, isLight && styles.containerLight]} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Header Hero Banner */}
        <View style={[styles.heroBanner, isLight && styles.heroBannerLight]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={[styles.heroTitle, isLight && styles.heroTitleLight]}>Ödev & Proje Takibi</Text>
              <Text style={styles.heroSub}>
                {pendingCount > 0 ? `Teslim edilecek ${pendingCount} aktif ödeviniz var.` : 'Tüm ödevleriniz tamamlandı! 🎉'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Yeni Ödev</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              isLight && styles.filterPillLight,
              filter === 'all' && (isLight ? styles.filterPillActiveLight : styles.filterPillActive),
            ]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterPillText,
                isLight && styles.filterPillTextLight,
                filter === 'all' && (isLight ? styles.filterPillTextActiveLight : styles.filterPillTextActive),
              ]}
            >
              Tümü ({assignments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              isLight && styles.filterPillLight,
              filter === 'in_progress' && (isLight ? styles.filterPillActiveLight : styles.filterPillActive),
            ]}
            onPress={() => setFilter('in_progress')}
          >
            <Text
              style={[
                styles.filterPillText,
                isLight && styles.filterPillTextLight,
                filter === 'in_progress' && (isLight ? styles.filterPillTextActiveLight : styles.filterPillTextActive),
              ]}
            >
              Devam Eden
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              isLight && styles.filterPillLight,
              filter === 'completed' && (isLight ? styles.filterPillActiveLight : styles.filterPillActive),
            ]}
            onPress={() => setFilter('completed')}
          >
            <Text
              style={[
                styles.filterPillText,
                isLight && styles.filterPillTextLight,
                filter === 'completed' && (isLight ? styles.filterPillTextActiveLight : styles.filterPillTextActive),
              ]}
            >
              Tamamlanan
            </Text>
          </TouchableOpacity>
        </View>

        {/* Assignments List */}
        {filtered.map(asg => {
          const isCompleted = asg.status === 'completed';
          const countdown = getRemainingTimeText(asg.dueDate, asg.dueTime, asg.status);

          return (
            <View key={asg.id} style={[styles.card, isLight && styles.cardLight, isCompleted && styles.cardCompleted]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseBadgeText}>{asg.courseName}</Text>
                  <Text style={[styles.asgTitle, isLight && styles.asgTitleLight, isCompleted && styles.asgTitleCompleted]}>
                    {asg.title}
                  </Text>
                </View>

                {/* Priority Badge */}
                <View
                  style={[
                    styles.priorityBadge,
                    asg.priority === 'high'
                      ? styles.priorityHigh
                      : asg.priority === 'medium'
                      ? styles.priorityMedium
                      : styles.priorityLow,
                  ]}
                >
                  <Flame size={11} color="#FFFFFF" />
                  <Text style={styles.priorityText}>
                    {asg.priority === 'high' ? 'Önemli' : asg.priority === 'medium' ? 'Normal' : 'Düşük'}
                  </Text>
                </View>
              </View>

              {asg.description ? (
                <Text style={styles.asgDesc} numberOfLines={3}>
                  {asg.description}
                </Text>
              ) : null}

              {/* Deadline & Remaining Time */}
              <View style={styles.deadlineContainer}>
                <Clock size={14} color={isCompleted ? '#10B981' : '#38BDF8'} />
                <Text
                  style={[
                    styles.deadlineText,
                    countdown.includes('🔴') && { color: '#EF4444', fontWeight: '800' },
                  ]}
                >
                  {countdown}
                </Text>
              </View>

              {/* Actions Row */}
              <View style={styles.cardActions}>
                {asg.uzemSubmissionLink ? (
                  <TouchableOpacity
                    style={styles.uzemBtn}
                    onPress={() => {
                      if (asg.uzemSubmissionLink) {
                        Linking.openURL(
                          asg.uzemSubmissionLink.startsWith('http')
                            ? asg.uzemSubmissionLink
                            : 'https://' + asg.uzemSubmissionLink
                        ).catch(() => {});
                      }
                    }}
                  >
                    <ExternalLink size={13} color="#8B5CF6" />
                    <Text style={styles.uzemBtnText}>Ödev Linki</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.statusToggleBtn, isCompleted && styles.statusToggleBtnDone]}
                  onPress={() => handleToggleStatus(asg)}
                >
                  <CheckCircle2 size={15} color={isCompleted ? '#10B981' : '#94A3B8'} />
                  <Text style={[styles.statusToggleText, isCompleted && styles.statusToggleTextDone]}>
                    {isCompleted ? 'Teslim Edildi' : 'Teslim Ettim'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(asg.id)}>
                  <Trash2 size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState
            icon={<ClipboardList size={32} color="#38BDF8" />}
            title={filter === 'all' ? 'Henüz Ödev Eklenmedi' : 'Bu Filtrede Ödev Yok'}
            description={
              filter === 'all'
                ? 'Teslim tarihi yaklaşan vize ödevlerini, projelerini ve sunumlarını ekleyerek takip etmeye başla.'
                : 'Filtreyi değiştirerek diğer ödevlerini görebilir veya yeni bir ödev ekleyebilirsin.'
            }
            actionText="+ Yeni Ödev Ekle"
            onActionPress={() => {
              HapticsService.medium();
              setModalVisible(true);
            }}
          />
        )}

        <View style={{ height: 90 }} />
      </View>

      {/* Add Assignment Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isLight && styles.modalContentLight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isLight && { color: '#0F172A' }]}>Yeni Ödev / Proje Ekle</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.closeBtn, isLight && { backgroundColor: '#F1F5F9' }]}>
                <X size={20} color={isLight ? '#64748B' : '#94A3B8'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Course Selector */}
              <Text style={[styles.inputLabel, isLight && styles.inputLabelLight]}>Ders Seçin</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseScroll}>
                {courses.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.courseSelectPill,
                      isLight && styles.courseSelectPillLight,
                      selectedCourseId === c.id && styles.courseSelectPillActive,
                    ]}
                    onPress={() => setSelectedCourseId(c.id)}
                  >
                    <Text
                      style={[
                        styles.courseSelectPillText,
                        isLight && { color: '#475569' },
                        selectedCourseId === c.id && styles.courseSelectPillTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Title */}
              <Text style={[styles.inputLabel, isLight && styles.inputLabelLight]}>Ödev Başlığı</Text>
              <TextInput
                style={[styles.input, isLight && styles.inputLight]}
                value={title}
                onChangeText={setTitle}
                placeholder="Örn: Lab Ödevi 3, Sunum Raporu"
                placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
              />

              {/* Description */}
              <Text style={[styles.inputLabel, isLight && styles.inputLabelLight]}>Açıklama / Yönergeler</Text>
              <TextInput
                style={[styles.input, styles.textArea, isLight && styles.inputLight]}
                value={description}
                onChangeText={setDescription}
                placeholder="Hocanın istediği detaylar..."
                placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                multiline
                numberOfLines={3}
              />

              {/* Due Date & Time */}
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, isLight && styles.inputLabelLight]}>Son Teslim Tarihi</Text>
                  <TouchableOpacity
                    style={[styles.dateInputButton, isLight && styles.dateInputButtonLight]}
                    onPress={() => setCalendarPickerVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Calendar size={16} color={isLight ? '#0284C7' : '#38BDF8'} />
                    <Text
                      style={[
                        styles.dateInputButtonText,
                        !dueDate && { color: isLight ? '#94A3B8' : '#64748B' },
                        isLight && dueDate && styles.dateInputButtonTextLight,
                      ]}
                    >
                      {dueDate || 'Tarih Seçin (Takvim)'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ width: 100 }}>
                  <Text style={[styles.inputLabel, isLight && styles.inputLabelLight]}>Saat</Text>
                  <TextInput
                    style={[styles.input, isLight && styles.inputLight]}
                    value={dueTime}
                    onChangeText={setDueTime}
                    placeholder="23:59"
                    placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  />
                </View>
              </View>

              {/* Priority */}
              <Text style={[styles.inputLabel, isLight && styles.inputLabelLight]}>Öncelik Seviyesi</Text>
              <View style={styles.priorityRow}>
                {(['low', 'medium', 'high'] as const).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.pSelectBtn,
                      isLight && styles.pSelectBtnLight,
                      priority === p && styles.pSelectBtnActive,
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.pSelectText,
                        isLight && { color: '#475569' },
                        priority === p && styles.pSelectTextActive,
                      ]}
                    >
                      {p === 'high' ? '🔥 Yüksek' : p === 'medium' ? '⚡ Orta' : '☕ Düşük'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.saveSubmitBtn}
                onPress={handleSaveNewAssignment}
                activeOpacity={0.85}
              >
                <Text style={styles.saveSubmitBtnText}>Ödevi Kaydet</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CalendarDatePickerModal
        visible={calendarPickerVisible}
        initialDate={dueDate}
        theme={theme}
        onClose={() => setCalendarPickerVisible(false)}
        onSelectDate={d => {
          setDueDate(d);
          setCalendarPickerVisible(false);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heroBanner: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  heroSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  filterPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  filterPillTextActive: {
    color: '#38BDF8',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardCompleted: {
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  courseBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 2,
  },
  asgTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  asgTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityHigh: { backgroundColor: '#EF4444' },
  priorityMedium: { backgroundColor: '#F59E0B' },
  priorityLow: { backgroundColor: '#64748B' },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  asgDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 10,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  deadlineText: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  uzemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  uzemBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  statusToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusToggleBtnDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  statusToggleTextDone: {
    color: '#10B981',
  },
  deleteBtn: {
    padding: 6,
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
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
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  courseScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  courseSelectPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  courseSelectPillActive: {
    backgroundColor: '#3B82F6',
  },
  courseSelectPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  courseSelectPillTextActive: {
    color: '#FFFFFF',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  pSelectBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  pSelectBtnActive: {
    backgroundColor: '#3B82F6',
  },
  pSelectText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  pSelectTextActive: {
    color: '#FFFFFF',
  },
  saveSubmitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveSubmitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  containerLight: {
    backgroundColor: '#F8FAFC',
  },
  heroBannerLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  heroTitleLight: {
    color: '#0F172A',
  },
  filterPillLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActiveLight: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  filterPillTextLight: {
    color: '#64748B',
  },
  filterPillTextActiveLight: {
    color: '#0284C7',
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  asgTitleLight: {
    color: '#0F172A',
  },
  inputLabelLight: {
    color: '#475569',
  },
  inputLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    color: '#0F172A',
  },
  dateInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dateInputButtonLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  dateInputButtonText: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  dateInputButtonTextLight: {
    color: '#0F172A',
  },
  modalContentLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  courseSelectPillLight: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pSelectBtnLight: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});

