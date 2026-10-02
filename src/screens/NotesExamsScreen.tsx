import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  Platform,
  Image,
  Modal,
  Clipboard,
} from 'react-native';
import {
  GraduationCap,
  Award,
  FileText,
  Plus,
  Sparkles,
  Clock,
  BookOpen,
  Calendar,
  CheckCircle2,
  Play,
  Camera,
  FolderLock,
  Calculator,
  Target,
  Share2,
  Trash2,
  Search,
  Bell,
  X,
  Edit3,
  Copy,
  Save,
  Sigma,
} from 'lucide-react-native';
import { Course, LectureNote, ExamType, Exam, CourseDocument, AppSettings } from '../types';
import { StorageService } from '../services/storage';
import { ExamEngine } from '../services/examEngine';
import { GradeGoalCalculator } from '../services/gradeGoalCalculator';
import { GPACalculator } from '../services/gpaCalculator';
import { EmptyState } from '../components/EmptyState';
import { HapticsService } from '../services/hapticsService';
import { NotificationService } from '../services/notifications';
import { CalendarExportService } from '../services/calendarExportService';
import { OCRScannerModal } from './OCRScannerModal';
import { PinLockModal } from '../components/PinLockModal';

interface NotesExamsScreenProps {
  courses: Course[];
  onRefreshCourses?: () => void;
  theme?: 'dark' | 'oled' | 'light';
}

export const NotesExamsScreen: React.FC<NotesExamsScreenProps> = ({
  courses,
  onRefreshCourses,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [activeMainTab, setActiveMainTab] = useState<'exams' | 'calculator' | 'notes_archive' | 'vault'>('exams');
  const [examPhase, setExamPhase] = useState<ExamType>('vize');
  const [lectureNotes, setLectureNotes] = useState<LectureNote[]>([]);
  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  // Vault PIN Lock State
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);

  // OCR Modal State
  const [ocrModalVisible, setOcrModalVisible] = useState(false);

  // Target Calculator State
  const [selectedCalcCourseId, setSelectedCalcCourseId] = useState<string>(courses[0]?.id || '');
  const [customVizeInput, setCustomVizeInput] = useState('50');

  // Add Document Modal State
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCourseId, setNewDocCourseId] = useState(courses[0]?.id || '');
  const [newDocType, setNewDocType] = useState<'slide' | 'past_exam' | 'cheat_sheet' | 'notes'>('past_exam');
  const [showAddDocForm, setShowAddDocForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceStats, setAttendanceStats] = useState<Record<string, { attended: number; missed: number; total: number; rate: number }>>({});

  const loadAttendance = useCallback(async () => {
    const map: Record<string, { attended: number; missed: number; total: number; rate: number }> = {};
    for (const c of courses) {
      map[c.id] = await StorageService.getAttendanceStats(c.id);
    }
    setAttendanceStats(map);
  }, [courses]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleQuickAbsence = async (courseId: string, delta: number) => {
    HapticsService.selection();
    const updated = await StorageService.adjustCourseAbsence(courseId, delta);
    setAttendanceStats(prev => ({ ...prev, [courseId]: updated }));
  };

  const handleSyncExamAlarms = async () => {
    HapticsService.success();
    await NotificationService.syncExamNotifications(courses);
    Alert.alert(
      '🔔 Sınav Alarmları Senkronize Edildi',
      'Tüm sınavlarınız için 1 gün önce (saat 19:00) ve sınavdan 2 saat önce hatırlatıcı bildirimler kuruldu!'
    );
  };

  const handleShareIcs = async () => {
    HapticsService.light();
    await CalendarExportService.shareSchedule(courses, true);
  };

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return lectureNotes;
    const q = searchQuery.toLowerCase();
    return lectureNotes.filter(n =>
      n.courseName.toLowerCase().includes(q) ||
      n.textNotes.toLowerCase().includes(q) ||
      n.date.toLowerCase().includes(q)
    );
  }, [lectureNotes, searchQuery]);

  const [filteredDocuments, setFilteredDocuments] = useState<CourseDocument[]>([]);

  // Note Detail & Editing Modal State
  const [selectedNoteForDetail, setSelectedNoteForDetail] = useState<LectureNote | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedNoteContent, setEditedNoteContent] = useState('');

  const handleOpenNoteDetail = (note: LectureNote) => {
    HapticsService.selection();
    setSelectedNoteForDetail(note);
    setEditedNoteContent(note.textNotes || '');
    setIsEditingNote(false);
  };

  const handleSaveEditedNote = async () => {
    if (!selectedNoteForDetail) return;
    HapticsService.success();
    const updated: LectureNote = {
      ...selectedNoteForDetail,
      textNotes: editedNoteContent.trim(),
    };
    await StorageService.updateLectureNote(updated);
    setSelectedNoteForDetail(updated);
    setIsEditingNote(false);
    await loadData();
    Alert.alert('✅ Not Güncellendi', 'Ders notunuz başarıyla kaydedildi.');
  };

  const handleCopyNoteText = (text: string) => {
    HapticsService.light();
    Clipboard.setString(text);
    Alert.alert('📋 Kopyalandı', 'Not metni panoya kopyalandı.');
  };

  const handleShareNoteText = async (note: LectureNote) => {
    HapticsService.light();
    await Share.share({
      title: `${note.courseName} - Ders Notu`,
      message: `${note.courseName} (${note.date})\n\n${note.textNotes}${
        note.transcript ? `\n\nFormüller:\n${note.transcript}` : ''
      }${
        note.summaryPoints && note.summaryPoints.length > 0
          ? `\n\nSınav Vurguları:\n${note.summaryPoints.map(p => `• ${p}`).join('\n')}`
          : ''
      }`,
    });
  };

  useEffect(() => {
    loadData();
    const detected = ExamEngine.determineActivePhase(courses);
    setExamPhase(detected);
    // Validate selectedCalcCourseId and newDocCourseId against current courses
    if (courses.length > 0) {
      const isCalcValid = courses.some(c => c.id === selectedCalcCourseId);
      if (!isCalcValid) {
        setSelectedCalcCourseId(courses[0].id);
      }
      const isDocValid = courses.some(c => c.id === newDocCourseId);
      if (!isDocValid) {
        setNewDocCourseId(courses[0].id);
      }
    }
  }, [courses]);

  const loadData = async () => {
    const [notes, docs, settings] = await Promise.all([
      StorageService.getLectureNotes(),
      StorageService.getDocuments(),
      StorageService.getSettings(),
    ]);
    setLectureNotes(notes);
    setDocuments(docs);
    setAppSettings(settings);
  };

  const handleScoreChange = async (course: Course, field: 'vize' | 'final' | 'but', valueStr: string) => {
    const val = valueStr === '' ? undefined : parseInt(valueStr, 10);
    const validVal = isNaN(val as number) ? undefined : Math.min(100, Math.max(0, val as number));

    const currentVize = field === 'vize' ? validVal : course.gradeStatus?.vizeScore;
    const currentFinal = field === 'final' ? validVal : course.gradeStatus?.finalScore;
    const currentBut = field === 'but' ? validVal : course.gradeStatus?.butScore;

    const newGradeStatus = ExamEngine.calculateGradeStatus(
      currentVize,
      currentFinal,
      currentBut,
      40,
      60,
      appSettings?.gradingScale
    );

    const updatedCourse: Course = {
      ...course,
      gradeStatus: newGradeStatus,
    };

    await StorageService.updateCourse(updatedCourse);
    if (onRefreshCourses) {
      onRefreshCourses();
    }
  };

  const handleDeleteCourseGrades = (course: Course) => {
    Alert.alert(
      'Notları Sıfırla',
      `"${course.name}" dersinin girilmiş tüm sınav notları sıfırlansın mı?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: async () => {
            const updatedCourse: Course = {
              ...course,
              gradeStatus: undefined,
            };
            await StorageService.updateCourse(updatedCourse);
            if (onRefreshCourses) onRefreshCourses();
          },
        },
      ]
    );
  };

  const handleDeleteNote = (noteId: string, courseName: string) => {
    Alert.alert(
      'Notu Sil',
      `"${courseName}" dersine ait bu not silinsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteLectureNote(noteId);
            loadData();
          },
        },
      ]
    );
  };

  const handleAddDocument = async () => {
    if (!newDocTitle.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen belge başlığını girin.');
      return;
    }
    const c = courses.find((item: Course) => item.id === newDocCourseId) || courses[0];
    await StorageService.saveDocument({
      courseId: c ? c.id : 'genel',
      courseName: c ? c.name : 'Genel',
      title: newDocTitle.trim(),
      type: newDocType,
      sizeText: '2.4 MB',
    });
    setNewDocTitle('');
    setShowAddDocForm(false);
    loadData();
    Alert.alert('✅ Eklendi', 'Belge başarıyla kasanıza kaydedildi.');
  };

  const handleDeleteDocument = (docId: string, title: string) => {
    Alert.alert(
      'Belgeyi Sil',
      `"${title}" belgesi kasanızdan silinsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteDocument(docId);
            loadData();
          },
        },
      ]
    );
  };

  const selectedCourse = courses.find(c => c.id === selectedCalcCourseId) || courses[0];
  const vizeNum = parseInt(customVizeInput, 10) || 0;
  const targetRequirements = selectedCourse
    ? GradeGoalCalculator.calculateRequirements(vizeNum, 40, 60, appSettings?.gradingScale)
    : [];

  const gpaResult = useMemo(() => GPACalculator.calculate(courses), [courses]);

  return (
    <View style={[styles.container, isLight && styles.containerLight]}>
      {/* 4 Main Tabs Selector */}
      <View style={[styles.mainTabWrapper, isLight && styles.mainTabWrapperLight]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mainTabRow}
        >
          <TouchableOpacity
            style={[
              styles.mainTabBtn,
              isLight && styles.mainTabBtnLight,
              activeMainTab === 'exams' && (isLight ? styles.mainTabBtnActiveLight : styles.mainTabBtnActive),
            ]}
            onPress={() => setActiveMainTab('exams')}
            activeOpacity={0.8}
          >
            <Award size={14} color={activeMainTab === 'exams' ? '#FFFFFF' : (isLight ? '#64748B' : '#94A3B8')} />
            <Text
              style={[
                styles.mainTabBtnText,
                isLight && styles.mainTabBtnTextLight,
                activeMainTab === 'exams' && styles.mainTabBtnTextActive,
              ]}
              numberOfLines={1}
            >
              Sınavlar & Notlar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainTabBtn,
              isLight && styles.mainTabBtnLight,
              activeMainTab === 'calculator' && (isLight ? styles.mainTabBtnActiveLight : styles.mainTabBtnActive),
            ]}
            onPress={() => setActiveMainTab('calculator')}
            activeOpacity={0.8}
          >
            <Target size={14} color={activeMainTab === 'calculator' ? '#FFFFFF' : (isLight ? '#64748B' : '#94A3B8')} />
            <Text
              style={[
                styles.mainTabBtnText,
                isLight && styles.mainTabBtnTextLight,
                activeMainTab === 'calculator' && styles.mainTabBtnTextActive,
              ]}
              numberOfLines={1}
            >
              Kaç Almalıyım?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainTabBtn,
              isLight && styles.mainTabBtnLight,
              activeMainTab === 'notes_archive' && (isLight ? styles.mainTabBtnActiveLight : styles.mainTabBtnActive),
            ]}
            onPress={() => setActiveMainTab('notes_archive')}
            activeOpacity={0.8}
          >
            <BookOpen size={14} color={activeMainTab === 'notes_archive' ? '#FFFFFF' : (isLight ? '#64748B' : '#94A3B8')} />
            <Text
              style={[
                styles.mainTabBtnText,
                isLight && styles.mainTabBtnTextLight,
                activeMainTab === 'notes_archive' && styles.mainTabBtnTextActive,
              ]}
              numberOfLines={1}
            >
              Ders Notları ({lectureNotes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainTabBtn,
              isLight && styles.mainTabBtnLight,
              activeMainTab === 'vault' && (isLight ? styles.mainTabBtnActiveLight : styles.mainTabBtnActive),
            ]}
            onPress={() => {
              if (appSettings?.isVaultProtected && appSettings?.vaultPin && !isVaultUnlocked) {
                HapticsService.warning();
                setPinModalVisible(true);
              } else {
                setActiveMainTab('vault');
              }
            }}
            activeOpacity={0.8}
          >
            <FolderLock size={14} color={activeMainTab === 'vault' ? '#FFFFFF' : (isLight ? '#64748B' : '#94A3B8')} />
            <Text
              style={[
                styles.mainTabBtnText,
                isLight && styles.mainTabBtnTextLight,
                activeMainTab === 'vault' && styles.mainTabBtnTextActive,
              ]}
              numberOfLines={1}
            >
              Slayt Kasası ({documents.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ==================== TAB 1: EXAMS & PASSING STATUS ==================== */}
        {activeMainTab === 'exams' && (
          <View>
            {/* GPA Summary Card */}
            {courses.length > 0 && (
              <View style={[styles.gpaSummaryCard, isLight && styles.gpaSummaryCardLight]}>
                <View style={styles.gpaTopRow}>
                  <View>
                    <Text style={[styles.gpaLabel, isLight && styles.gpaLabelLight]}>Dönem Genel Not Ortalaması (GNO)</Text>
                    <View style={styles.gpaValueRow}>
                      <Text style={[styles.gpaValue, isLight && styles.gpaValueLight]}>{gpaResult.gpa.toFixed(2)}</Text>
                      <Text style={styles.gpaMax}>/ 4.00</Text>
                    </View>
                  </View>
                  <View style={styles.honorBadge}>
                    <Sparkles size={13} color="#F59E0B" />
                    <Text style={styles.honorBadgeText}>{gpaResult.honorText}</Text>
                  </View>
                </View>
                <View style={styles.gpaProgressRow}>
                  <Text style={styles.gpaAktsText}>
                    Notu Girilen: <Text style={{ color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: '800' }}>{gpaResult.gradedAkts} AKTS</Text> / Toplam: {gpaResult.totalAkts} AKTS
                  </Text>
                </View>
              </View>
            )}

            {/* Quick Actions Row: Alarm Sync */}
            {courses.length > 0 && (
              <View style={styles.examActionsRow}>
                <TouchableOpacity
                  style={[styles.examActionBtn, isLight && styles.examActionBtnLight]}
                  onPress={handleSyncExamAlarms}
                  activeOpacity={0.8}
                >
                  <Bell size={14} color="#10B981" />
                  <Text style={styles.examActionBtnText}>Sınav Hatırlatıcılarını Otomatik Kur</Text>
                </TouchableOpacity>
              </View>
            )}

            {courses.length === 0 ? (
              <EmptyState
                icon={<Award size={32} color="#38BDF8" />}
                title="Henüz Ders Eklenmedi"
                description="Sınav notlarınızı ve harf notlarınızı hesaplayabilmek için önce Program sekmesinden derslerinizi ekleyin."
              />
            ) : (
              courses.map(course => {
                const gs = course.gradeStatus;
                const vize = gs?.vizeScore !== undefined ? String(gs.vizeScore) : '';
                const final = gs?.finalScore !== undefined ? String(gs.finalScore) : '';
                const but = gs?.butScore !== undefined ? String(gs.butScore) : '';

                // Attendance calculation
                const maxAbsence = course.maxAbsenceCount || 4;
                const courseAtt = attendanceStats[course.id];
                const missedCount = courseAtt?.missed || 0;
                const remainingAbsence = Math.max(0, maxAbsence - missedCount);

                return (
                  <View key={course.id} style={[styles.courseExamCard, isLight && styles.courseExamCardLight]}>
                    <View style={styles.courseExamHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.courseExamTitle, isLight && styles.courseExamTitleLight]}>{course.name}</Text>
                        <Text style={styles.courseExamInstructor}>{course.instructor || 'Hoca Belirtilmedi'}</Text>
                      </View>
                      {gs && gs.status !== 'in_progress' ? (
                        <View style={[styles.letterBadge, gs.status === 'passed' ? styles.badgeGreen : gs.status === 'conditional_passed' ? styles.badgeYellow : styles.badgeRed]}>
                          <Text style={styles.letterBadgeText}>{gs.letterGrade || 'CC'}</Text>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => handleDeleteCourseGrades(course)} style={styles.trashSmallBtn}>
                          <Trash2 size={15} color="#64748B" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Attendance Tracker & Alarm Row */}
                    <View style={[styles.attendanceCardRow, isLight && styles.attendanceCardRowLight]}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.attendanceLabel, isLight && styles.attendanceLabelLight]}>Devamsızlık:</Text>
                          <View style={[
                            styles.attendancePill,
                            remainingAbsence <= 0 ? styles.pillRed : remainingAbsence === 1 ? styles.pillOrange : styles.pillGreen
                          ]}>
                            <Text style={styles.attendancePillText}>
                              {missedCount} / {maxAbsence} Hafta {remainingAbsence <= 1 ? (remainingAbsence <= 0 ? '• KALDIN!' : '• SINIR!') : ''}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.attendanceSubText, isLight && styles.attendanceSubTextLight]}>
                          {remainingAbsence > 0 ? `Kalan hak: ${remainingAbsence} ders` : 'Devamsızlık hakkı doldu!'}
                        </Text>
                      </View>
                      <View style={styles.attendanceBtnGroup}>
                        <TouchableOpacity
                          style={[styles.attBtn, isLight && styles.attBtnLight]}
                          onPress={() => handleQuickAbsence(course.id, -1)}
                          disabled={missedCount <= 0}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.attBtnText, isLight && styles.attBtnTextLight]}>-</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.attBtn, styles.attBtnPlus, isLight && styles.attBtnPlusLight]}
                          onPress={() => handleQuickAbsence(course.id, 1)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.attBtnPlusText}>+ Yoklama</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Inputs Row for Vize / Final / Büt (Fixed light theme colors) */}
                    <View style={styles.gradeInputRow}>
                      <View style={[styles.gradeInputBox, isLight && styles.gradeInputBoxLight]}>
                        <Text style={[styles.gradeInputLabel, isLight && styles.gradeInputLabelLight]}>VİZE (%40)</Text>
                        <TextInput
                          style={[styles.gradeInputField, isLight && styles.gradeInputFieldLight]}
                          keyboardType="numeric"
                          maxLength={3}
                          value={vize}
                          onChangeText={txt => handleScoreChange(course, 'vize', txt)}
                          placeholder="-"
                          placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                        />
                      </View>

                      <View style={[styles.gradeInputBox, isLight && styles.gradeInputBoxLight]}>
                        <Text style={[styles.gradeInputLabel, isLight && styles.gradeInputLabelLight]}>FİNAL (%60)</Text>
                        <TextInput
                          style={[styles.gradeInputField, isLight && styles.gradeInputFieldLight]}
                          keyboardType="numeric"
                          maxLength={3}
                          value={final}
                          onChangeText={txt => handleScoreChange(course, 'final', txt)}
                          placeholder="-"
                          placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                        />
                      </View>

                      <View style={[
                        styles.gradeInputBox,
                        isLight ? styles.gradeInputBoxButLight : styles.gradeInputBoxButDark
                      ]}>
                        <Text style={[styles.gradeInputLabel, { color: isLight ? '#7C3AED' : '#A78BFA' }]}>BÜTÜNLEME</Text>
                        <TextInput
                          style={[styles.gradeInputField, isLight ? styles.gradeInputFieldButLight : { color: '#A78BFA' }]}
                          keyboardType="numeric"
                          maxLength={3}
                          value={but}
                          onChangeText={txt => handleScoreChange(course, 'but', txt)}
                          placeholder="-"
                          placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                        />
                      </View>
                    </View>

                    {/* Status & Average Result Footer */}
                    {gs && gs.calculatedAverage !== undefined && (
                      <View style={styles.gradeResultFooter}>
                        <View>
                          <Text style={styles.avgLabel}>Dönem Ortalaması:</Text>
                          <Text style={styles.avgValue}>{gs.calculatedAverage} / 100</Text>
                        </View>
                        <View style={[styles.statusPill, isLight && styles.statusPillLight]}>
                          <Text style={[styles.statusPillText, gs.status === 'passed' ? { color: '#10B981' } : gs.status === 'conditional_passed' ? { color: '#F59E0B' } : { color: '#EF4444' }]}>
                            {gs.butEligibilityReason || 'Durum Hesaplanıyor'}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ==================== TAB 2: TARGET GRADE CALCULATOR ==================== */}
        {activeMainTab === 'calculator' && (
          <View>
            <View style={[styles.calcHeroCard, isLight && styles.calcHeroCardLight]}>
              <Calculator size={24} color={isLight ? '#0284C7' : '#38BDF8'} />
              <Text style={[styles.calcHeroTitle, isLight && styles.calcHeroTitleLight]}>"Kaç Alırsam Geçerim?" Simülatörü</Text>
              <Text style={[styles.calcHeroDesc, isLight && styles.calcHeroDescLight]}>
                Vize notunuzu girin; CC ile geçmek veya AA (Yüksek Onur) almak için finalden kaç puan almanız gerektiğini otomatik hesaplayın.
              </Text>
            </View>

            {/* Course Picker Selector */}
            {courses.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.calcCourseScroll}>
                {courses.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.calcCourseChip,
                      isLight && styles.calcCourseChipLight,
                      selectedCalcCourseId === c.id && styles.calcCourseChipActive,
                    ]}
                    onPress={() => {
                      setSelectedCalcCourseId(c.id);
                      if (c.gradeStatus?.vizeScore !== undefined) {
                        setCustomVizeInput(String(c.gradeStatus.vizeScore));
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.calcCourseChipText,
                        isLight && styles.calcCourseChipTextLight,
                        selectedCalcCourseId === c.id && styles.calcCourseChipTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Custom Vize Input Card */}
            <View style={[styles.vizeInputCard, isLight && styles.vizeInputCardLight]}>
              <Text style={[styles.vizeInputCardLabel, isLight && styles.vizeInputCardLabelLight]}>Alınan Vize Notu:</Text>
              <TextInput
                style={[styles.vizeInputCardField, isLight && styles.vizeInputCardFieldLight]}
                keyboardType="numeric"
                maxLength={3}
                value={customVizeInput}
                onChangeText={setCustomVizeInput}
                placeholder="50"
                placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
              />
            </View>

            {/* Target Breakdown Table */}
            <View style={[styles.targetBreakdown, isLight && styles.targetBreakdownLight]}>
              <Text style={[styles.targetBreakdownTitle, isLight && styles.targetBreakdownTitleLight]}>Hedeflenen Harf Notu & Gereken Final Puanı</Text>
              {targetRequirements.map(item => (
                <View key={item.letterGrade} style={[styles.targetRow, item.isAchievable ? styles.targetRowAchievable : styles.targetRowImpossible]}>
                  <View style={styles.targetLeft}>
                    <View style={[styles.targetLetterBox, item.letterGrade.startsWith('A') ? styles.bgBlue : item.letterGrade.startsWith('B') ? styles.bgGreen : item.letterGrade.startsWith('C') ? styles.bgYellow : styles.bgRed]}>
                      <Text style={styles.targetLetterText}>{item.letterGrade}</Text>
                    </View>
                    <View>
                      <Text style={[styles.targetLabel, isLight && styles.targetLabelLight]}>{item.label}</Text>
                      <Text style={[styles.targetStatusNote, isLight && styles.targetStatusNoteLight]}>{item.statusNote}</Text>
                    </View>
                  </View>
                  <View style={styles.targetRight}>
                    <Text style={[styles.requiredScoreText, !item.isAchievable && { color: '#EF4444' }]}>
                      {item.isAchievable ? `${item.requiredFinalScore}` : 'İmkansız'}
                    </Text>
                    {item.isAchievable && <Text style={styles.requiredScoreSub}>Puan Lazım</Text>}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ==================== TAB 3: NOTES & VISUAL ARCHIVE ==================== */}
        {activeMainTab === 'notes_archive' && (
          <View>
            <TouchableOpacity
              style={[styles.ocrBannerBtn, isLight && styles.ocrBannerBtnLight]}
              onPress={() => setOcrModalVisible(true)}
              activeOpacity={0.85}
            >
              <Camera size={18} color={isLight ? '#0284C7' : '#38BDF8'} />
              <Text style={[styles.ocrBannerBtnText, isLight && styles.ocrBannerBtnTextLight]}>
                📸 Tahta / Ders Notu Fotoğrafı Ekle
              </Text>
            </TouchableOpacity>

            {/* Search Filter Box */}
            {lectureNotes.length > 0 && (
              <View style={[styles.searchBarBox, isLight && styles.searchBarBoxLight]}>
                <Search size={15} color={isLight ? '#64748B' : '#94A3B8'} />
                <TextInput
                  style={[styles.searchBarInput, isLight && styles.searchBarInputLight]}
                  placeholder="Notlarda veya derslerde ara..."
                  placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={15} color={isLight ? '#64748B' : '#94A3B8'} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {filteredNotes.length === 0 ? (
              <View style={[styles.emptyCard, isLight && styles.emptyCardLight]}>
                <BookOpen size={36} color={isLight ? '#94A3B8' : '#64748B'} />
                <Text style={[styles.emptyTitle, isLight && styles.emptyTitleLight]}>
                  {searchQuery ? 'Aramanıza Uygun Not Bulunamadı' : 'Henüz Ders Notu Yok'}
                </Text>
                <Text style={[styles.emptySubtitle, isLight && styles.emptySubtitleLight]}>
                  {searchQuery
                    ? 'Farklı bir anahtar kelime ile aramayı deneyebilirsiniz.'
                    : 'Derste "Derse Girdim" butonuna basarak anlık not alabilir veya tahta/slayt fotoğrafı ekleyerek kütüphanenizi oluşturabilirsiniz.'}
                </Text>
              </View>
            ) : (
              filteredNotes.map(note => (
                <TouchableOpacity
                  key={note.id}
                  style={[styles.noteCard, isLight && styles.noteCardLight]}
                  onPress={() => handleOpenNoteDetail(note)}
                  activeOpacity={0.8}
                >
                  <View style={styles.noteHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.noteCourseName, isLight && styles.noteCourseNameLight]}>{note.courseName}</Text>
                        {note.imageUris && note.imageUris.length > 0 && (
                          <View style={styles.hasImageBadge}>
                            <Camera size={10} color="#38BDF8" />
                            <Text style={styles.hasImageBadgeText}>Fotoğraflı</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.noteDate}>{note.date}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleDeleteNote(note.id, note.courseName);
                      }}
                      style={styles.trashSmallBtn}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {note.textNotes ? (
                    <Text style={[styles.noteTextContent, isLight && styles.noteTextContentLight]} numberOfLines={3}>
                      {note.textNotes}
                    </Text>
                  ) : null}

                  {note.transcript ? (
                    <View style={styles.noteFormulaPreview}>
                      <Sigma size={12} color="#F59E0B" />
                      <Text style={styles.noteFormulaPreviewText} numberOfLines={1}>
                        {note.transcript}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.noteCardFooter}>
                    <Text style={styles.noteCardFooterHint}>🔍 Notun tamamını görmek veya düzenlemek için dokunun →</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ==================== TAB 4: DOCUMENT VAULT ==================== */}
        {activeMainTab === 'vault' && (
          <View>
            <View style={styles.vaultHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.vaultTitle}>Ders Slaytları & Çıkmış Sorular</Text>
                <Text style={styles.vaultSub}>İnternetsiz ortamda da açabileceğiniz offline belge arşivi</Text>
              </View>
              <TouchableOpacity
                style={styles.addDocBtn}
                onPress={() => setShowAddDocForm(!showAddDocForm)}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addDocBtnText}>Yeni Belge</Text>
              </TouchableOpacity>
            </View>

            {/* Add Document Inline Form */}
            {showAddDocForm && (
              <View style={styles.addDocCard}>
                <Text style={styles.addDocCardTitle}>Yeni Belge / Çıkmış Soru Ekle</Text>
                <TextInput
                  style={styles.docInput}
                  value={newDocTitle}
                  onChangeText={setNewDocTitle}
                  placeholder="Örn: 2025 Vize Çıkmış Soruları..."
                  placeholderTextColor="#64748B"
                />

                <View style={styles.docTypeRow}>
                  {(['past_exam', 'slide', 'cheat_sheet', 'notes'] as const).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.docTypeChip, newDocType === t && styles.docTypeChipActive]}
                      onPress={() => setNewDocType(t)}
                    >
                      <Text style={[styles.docTypeChipText, newDocType === t && styles.docTypeChipTextActive]}>
                        {t === 'past_exam' ? 'Çıkmış Soru' : t === 'slide' ? 'Slayt' : t === 'cheat_sheet' ? 'Özet/Formül' : 'Ders Notu'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.saveDocBtn} onPress={handleAddDocument}>
                  <Text style={styles.saveDocBtnText}>Kayıt Et</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Search Filter Box */}
            {documents.length > 0 && (
              <View style={[styles.searchBarBox, isLight && styles.searchBarBoxLight]}>
                <Search size={15} color={isLight ? '#64748B' : '#94A3B8'} />
                <TextInput
                  style={[styles.searchBarInput, isLight && styles.searchBarInputLight]}
                  placeholder="Belgelerde veya çıkmış sorularda ara..."
                  placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={15} color={isLight ? '#64748B' : '#94A3B8'} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {filteredDocuments.length === 0 ? (
              <View style={styles.emptyCard}>
                <FolderLock size={36} color="#64748B" />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'Aramanıza Uygun Belge Bulunamadı' : 'Kasanızda Belge Yok'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'Farklı bir terim ile aramayı deneyebilirsiniz.'
                    : 'Vize/Final çıkmış sorularını ve slaytları ekleyerek tek noktada toplayabilirsiniz.'}
                </Text>
              </View>
            ) : (
              filteredDocuments.map(doc => (
                <View key={doc.id} style={[styles.documentItem, isLight && styles.documentItemLight]}>
                  <View style={[styles.docIconBox, isLight && styles.docIconBoxLight]}>
                    <FileText size={20} color={isLight ? '#0284C7' : '#38BDF8'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.docTitle, isLight && styles.docTitleLight]}>{doc.title}</Text>
                    <Text style={styles.docSub}>{doc.courseName} • {doc.uploadDate}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteDocument(doc.id, doc.title)}
                    style={styles.trashSmallBtn}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* OCR Scanner Modal */}
      <OCRScannerModal
        visible={ocrModalVisible}
        courses={courses}
        theme={theme}
        onClose={() => setOcrModalVisible(false)}
        onSavedNote={loadData}
      />

      {/* Vault PIN Lock Modal */}
      <PinLockModal
        visible={pinModalVisible}
        expectedPin={appSettings?.vaultPin}
        theme={theme}
        title="Gizli Not Kasası"
        subtitle="Hassas ders materyallerine ve çıkmış sınav sorularına erişmek için 4 haneli PIN kodunuzu girin:"
        onSuccess={() => {
          setIsVaultUnlocked(true);
          setPinModalVisible(false);
          setActiveMainTab('vault');
        }}
        onClose={() => setPinModalVisible(false)}
      />

      {/* Note Detail & Editing Modal */}
      <Modal
        visible={Boolean(selectedNoteForDetail)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedNoteForDetail(null)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={[styles.detailModalBox, isLight && styles.detailModalBoxLight]}>
            {/* Header */}
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailCourseTitle, isLight && styles.detailCourseTitleLight]}>
                  {selectedNoteForDetail?.courseName}
                </Text>
                <Text style={styles.detailDateText}>{selectedNoteForDetail?.date}</Text>
              </View>
              <TouchableOpacity
                style={styles.detailCloseBtn}
                onPress={() => setSelectedNoteForDetail(null)}
              >
                <X size={20} color={isLight ? '#64748B' : '#94A3B8'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.detailScrollContent}>
              {/* Photo Thumbnail if exists */}
              {selectedNoteForDetail?.imageUris && selectedNoteForDetail.imageUris.length > 0 && (
                <View style={styles.detailImageCard}>
                  <Text style={[styles.detailSectionTitle, isLight && styles.detailSectionTitleLight]}>
                    📷 Taranan Tahta / Defter Fotoğrafı:
                  </Text>
                  <Image
                    source={{ uri: selectedNoteForDetail.imageUris[0] }}
                    style={styles.detailImageThumb}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* Action Toolbar */}
              <View style={styles.detailActionToolbar}>
                <TouchableOpacity
                  style={[styles.detailToolbarBtn, isEditingNote && styles.detailToolbarBtnActive]}
                  onPress={() => {
                    if (isEditingNote) {
                      handleSaveEditedNote();
                    } else {
                      setIsEditingNote(true);
                    }
                  }}
                >
                  {isEditingNote ? (
                    <>
                      <Save size={14} color="#FFFFFF" />
                      <Text style={[styles.detailToolbarBtnText, { color: '#FFFFFF' }]}>Kaydet</Text>
                    </>
                  ) : (
                    <>
                      <Edit3 size={14} color="#38BDF8" />
                      <Text style={styles.detailToolbarBtnText}>Düzenle</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailToolbarBtn}
                  onPress={() => handleCopyNoteText(selectedNoteForDetail?.textNotes || '')}
                >
                  <Copy size={14} color="#38BDF8" />
                  <Text style={styles.detailToolbarBtnText}>Kopyala</Text>
                </TouchableOpacity>

                {selectedNoteForDetail && (
                  <TouchableOpacity
                    style={styles.detailToolbarBtn}
                    onPress={() => handleShareNoteText(selectedNoteForDetail)}
                  >
                    <Share2 size={14} color="#38BDF8" />
                    <Text style={styles.detailToolbarBtnText}>Paylaş</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Note Content (Viewer or Editor) */}
              <View style={styles.detailContentBox}>
                <Text style={[styles.detailSectionTitle, isLight && styles.detailSectionTitleLight]}>
                  {isEditingNote ? '✏️ Not Metnini Düzenleyin:' : '📝 Ders Notu Metni:'}
                </Text>

                {isEditingNote ? (
                  <TextInput
                    style={[styles.detailTextInputEditor, isLight && styles.detailTextInputEditorLight]}
                    multiline
                    value={editedNoteContent}
                    onChangeText={setEditedNoteContent}
                    placeholder="Ders notunu buraya yazın..."
                    placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  />
                ) : (
                  <Text style={[styles.detailFullText, isLight && styles.detailFullTextLight]}>
                    {selectedNoteForDetail?.textNotes || 'Kayıtlı not metni bulunamadı.'}
                  </Text>
                )}
              </View>

              {/* Identified Formulas */}
              {selectedNoteForDetail?.transcript ? (
                <View style={styles.detailFormulasBox}>
                  <Text style={[styles.detailSectionTitle, isLight && styles.detailSectionTitleLight]}>
                    📐 Tespit Edilen Formül & Bağıntılar:
                  </Text>
                  <View style={styles.formulaPillRow}>
                    <Text style={styles.formulaPillText}>{selectedNoteForDetail.transcript}</Text>
                  </View>
                </View>
              ) : null}

              {/* Summary Points */}
              {selectedNoteForDetail?.summaryPoints && selectedNoteForDetail.summaryPoints.length > 0 ? (
                <View style={styles.detailSummaryBox}>
                  <Text style={[styles.detailSectionTitle, isLight && styles.detailSectionTitleLight]}>
                    💡 Sınav Vurguları:
                  </Text>
                  {selectedNoteForDetail.summaryPoints.map((pt, pIdx) => (
                    <Text key={pIdx} style={styles.summaryBulletText}>
                      • {pt}
                    </Text>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  containerLight: {
    backgroundColor: '#F8FAFC',
  },
  mainTabWrapper: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  mainTabWrapperLight: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E2E8F0',
  },
  mainTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  mainTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  mainTabBtnLight: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  mainTabBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  mainTabBtnActiveLight: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  mainTabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  mainTabBtnTextLight: {
    color: '#64748B',
  },
  mainTabBtnTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  quickImportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  quickImportBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  emptyActionBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  courseExamCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  courseExamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  courseExamTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  courseExamInstructor: {
    fontSize: 12,
    color: '#94A3B8',
  },
  letterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  letterBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  badgeGreen: { backgroundColor: '#10B981' },
  badgeYellow: { backgroundColor: '#F59E0B' },
  badgeRed: { backgroundColor: '#EF4444' },
  trashSmallBtn: {
    padding: 6,
  },
  gradeInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  gradeInputBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  gradeInputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 4,
  },
  gradeInputField: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    width: '100%',
    padding: 0,
  },
  gradeResultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  avgLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  avgValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
  },
  statusPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  calcHeroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  calcHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#38BDF8',
    marginTop: 6,
    marginBottom: 4,
  },
  calcHeroDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  calcCourseScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  calcCourseChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  calcCourseChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  calcCourseChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  calcCourseChipTextActive: {
    color: '#FFFFFF',
  },
  vizeInputCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  vizeInputCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  vizeInputCardField: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 18,
    fontWeight: '800',
    color: '#38BDF8',
    width: 80,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  targetBreakdown: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  targetBreakdownTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  targetRowAchievable: {},
  targetRowImpossible: {
    opacity: 0.5,
  },
  targetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  targetLetterBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetLetterText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  bgBlue: { backgroundColor: '#3B82F6' },
  bgGreen: { backgroundColor: '#10B981' },
  bgYellow: { backgroundColor: '#F59E0B' },
  bgRed: { backgroundColor: '#EF4444' },
  targetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  targetStatusNote: {
    fontSize: 11,
    color: '#94A3B8',
  },
  targetRight: {
    alignItems: 'flex-end',
  },
  requiredScoreText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#38BDF8',
  },
  requiredScoreSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  ocrBannerBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  ocrBannerBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
  },
  noteCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteCourseName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  noteDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  noteTextContent: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 10,
  },
  audioPlayBar: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioPlayBarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  vaultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  vaultTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  vaultSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  addDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addDocBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addDocCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  addDocCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 8,
  },
  docInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    color: '#F8FAFC',
    fontSize: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  docTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  docTypeChip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  docTypeChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  docTypeChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  docTypeChipTextActive: {
    color: '#FFFFFF',
  },
  saveDocBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveDocBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  documentItem: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  docSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  gpaSummaryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  gpaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gpaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 2,
  },
  gpaValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  gpaValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  gpaMax: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  honorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  honorBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  gpaProgressRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  gpaAktsText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  examActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  examActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  examActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchBarInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: '#F8FAFC',
  },
  courseExamCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  courseExamTitleLight: {
    color: '#0F172A',
  },
  gradeInputBoxLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  gradeInputBoxButLight: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  gradeInputBoxButDark: {
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  gradeInputLabelLight: {
    color: '#475569',
  },
  gradeInputFieldLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 8,
    color: '#0F172A',
  },
  gradeInputFieldButLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDD6FE',
    borderWidth: 1,
    borderRadius: 8,
    color: '#7C3AED',
  },
  statusPillLight: {
    backgroundColor: '#F1F5F9',
  },
  examActionBtnLight: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  attendanceCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  attendanceCardRowLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  attendanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  attendanceLabelLight: {
    color: '#475569',
  },
  attendanceSubText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  attendanceSubTextLight: {
    color: '#94A3B8',
  },
  attendancePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  attendancePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pillGreen: { backgroundColor: '#10B981' },
  pillOrange: { backgroundColor: '#F59E0B' },
  pillRed: { backgroundColor: '#EF4444' },
  attendanceBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attBtn: {
    backgroundColor: '#0F172A',
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  attBtnLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  attBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#94A3B8',
    lineHeight: 18,
  },
  attBtnTextLight: {
    color: '#475569',
  },
  attBtnPlus: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    width: 'auto',
    paddingHorizontal: 8,
  },
  attBtnPlusLight: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  attBtnPlusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
  },
  calcCourseChipLight: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  calcCourseChipTextLight: {
    color: '#64748B',
  },
  targetLabelLight: {
    color: '#0F172A',
  },
  targetStatusNoteLight: {
    color: '#64748B',
  },
  ocrBannerBtnLight: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  ocrBannerBtnTextLight: {
    color: '#0284C7',
  },
  emptyCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  emptyTitleLight: {
    color: '#0F172A',
  },
  emptySubtitleLight: {
    color: '#64748B',
  },
  noteCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  noteCourseNameLight: {
    color: '#0F172A',
  },
  documentItemLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  docTitleLight: {
    color: '#0F172A',
  },
  gpaSummaryCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gpaValueLight: {
    color: '#0F172A',
  },
  gpaLabelLight: {
    color: '#64748B',
  },
  calcHeroCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  calcHeroTitleLight: {
    color: '#0F172A',
  },
  calcHeroDescLight: {
    color: '#64748B',
  },
  vizeInputCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  vizeInputCardLabelLight: {
    color: '#0F172A',
  },
  vizeInputCardFieldLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    color: '#0F172A',
  },
  targetBreakdownLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  targetBreakdownTitleLight: {
    color: '#0F172A',
  },
  searchBarBoxLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  searchBarInputLight: {
    color: '#0F172A',
  },
  docIconBoxLight: {
    backgroundColor: '#E0F2FE',
  },
  hasImageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hasImageBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
  },
  noteFormulaPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  noteFormulaPreviewText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
    flex: 1,
  },
  noteTextContentLight: {
    color: '#334155',
  },
  noteCardFooter: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  noteCardFooterHint: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '600',
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  detailModalBox: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailModalBoxLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailCourseTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  detailCourseTitleLight: {
    color: '#0F172A',
  },
  detailDateText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  detailCloseBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  detailImageCard: {
    marginBottom: 14,
  },
  detailImageThumb: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginTop: 8,
    backgroundColor: '#1E293B',
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 6,
  },
  detailSectionTitleLight: {
    color: '#0284C7',
  },
  detailActionToolbar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  detailToolbarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  detailToolbarBtnActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  detailToolbarBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  detailContentBox: {
    marginBottom: 14,
  },
  detailFullText: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  detailFullTextLight: {
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  detailTextInputEditor: {
    fontSize: 14,
    color: '#F8FAFC',
    lineHeight: 22,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    minHeight: 140,
    textAlignVertical: 'top',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  detailTextInputEditorLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0284C7',
    color: '#0F172A',
  },
  detailFormulasBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  formulaPillRow: {
    marginTop: 4,
  },
  formulaPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  detailSummaryBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  summaryBulletText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginTop: 4,
  },
});

