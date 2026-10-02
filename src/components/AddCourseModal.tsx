import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  Keyboard,
  Dimensions,
} from 'react-native';
import {
  X,
  Sparkles,
  User,
  MapPin,
  BookOpen,
  Clock,
  Bell,
  Palette,
  Check,
  Zap,
  GraduationCap,
  Video,
  Globe,
} from 'lucide-react-native';
import { Course, DayOfWeek, CourseCategory, CourseMode, DAYS_OF_WEEK, DEFAULT_PALETTES, REMINDER_OPTIONS, getDaysOfWeek } from '../types';
import { SuggestionEngine, normalizeTurkish } from '../services/suggestions';
import { TimePickerModal } from './TimePickerModal';
import { timeToMinutes, minutesToTime } from '../utils/time';
import { HapticsService } from '../services/hapticsService';
import { useLanguage } from '../context/LanguageContext';

interface AddCourseModalProps {
  visible: boolean;
  editingCourse?: Course | null;
  allCourses: Course[];
  initialDay?: DayOfWeek;
  onSave: (courseData: Omit<Course, 'id' | 'createdAt'>, editingId?: string) => void;
  onClose: () => void;
  theme?: 'dark' | 'oled' | 'light';
}

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  visible,
  editingCourse,
  allCourses,
  initialDay = 0,
  onSave,
  onClose,
  theme = 'dark',
}) => {
  const { t, language } = useLanguage();
  const isLight = theme === 'light';
  const isOled = theme === 'oled';

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onShow = (e: any) => {
      setKeyboardHeight(e.endCoordinates.height);
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [name, setName] = useState('');
  const [instructor, setInstructor] = useState('');
  const [classroom, setClassroom] = useState('');
  const [day, setDay] = useState<DayOfWeek>(initialDay);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:50');
  const [color, setColor] = useState(DEFAULT_PALETTES[0]);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<CourseCategory>('zorunlu');
  const [mode, setMode] = useState<CourseMode>('in_person');
  const [onlineLink, setOnlineLink] = useState('');
  const [akts, setAkts] = useState('4');
  const [maxAbsenceCount, setMaxAbsenceCount] = useState('4');

  // Time picker modal state
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end' | null>(null);

  // Suggestion engine instance
  const suggestionEngine = useMemo(() => new SuggestionEngine(allCourses), [allCourses]);

  // Real-time predictions
  const predictions = useMemo(() => {
    return suggestionEngine.getPredictions({ name, instructor, classroom });
  }, [suggestionEngine, name, instructor, classroom]);

  // Reset form or populate for edit
  useEffect(() => {
    if (editingCourse) {
      setName(editingCourse.name);
      setInstructor(editingCourse.instructor);
      setClassroom(editingCourse.classroom);
      setDay(editingCourse.day);
      setStartTime(editingCourse.startTime);
      setEndTime(editingCourse.endTime);
      setColor(editingCourse.color || DEFAULT_PALETTES[0]);
      setReminderMinutes(editingCourse.reminderMinutes ?? 15);
      setNotes(editingCourse.notes || '');
      setCategory(editingCourse.category || 'zorunlu');
      setMode(editingCourse.mode || 'in_person');
      setOnlineLink(editingCourse.onlineLink || '');
      setAkts(editingCourse.akts ? String(editingCourse.akts) : '4');
      setMaxAbsenceCount(editingCourse.maxAbsenceCount ? String(editingCourse.maxAbsenceCount) : '4');
    } else {
      setName('');
      setInstructor('');
      setClassroom('');
      setDay(initialDay);
      setStartTime('09:00');
      setEndTime('11:50');
      setColor(DEFAULT_PALETTES[Math.floor(Math.random() * DEFAULT_PALETTES.length)]);
      setReminderMinutes(15);
      setNotes('');
      setCategory('zorunlu');
      setMode('in_person');
      setOnlineLink('');
      setAkts('4');
      setMaxAbsenceCount('4');
    }
  }, [editingCourse, initialDay, visible]);

  // Auto-duration calculation shortcuts
  const applyDuration = (addMinutes: number) => {
    const startMin = timeToMinutes(startTime);
    const endMin = startMin + addMinutes;
    setEndTime(minutesToTime(endMin));
  };

  // Quick auto-fill handler when smart suggestion banner is pressed
  const applyAutoFill = (hint: NonNullable<typeof predictions.autoFillHint>) => {
    if (hint.courseName && !name) setName(hint.courseName);
    if (hint.instructor && !instructor) setInstructor(hint.instructor);
    if (hint.classroom && !classroom) setClassroom(hint.classroom);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen ders adını giriniz.');
      return;
    }

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (endMin <= startMin) {
      Alert.alert('Geçersiz Saat', 'Dersin bitiş saati başlangıç saatinden sonra olmalıdır.');
      return;
    }

    HapticsService.success();
    const parsedAkts = parseInt(akts, 10);
    const parsedAbsence = parseInt(maxAbsenceCount, 10);

    onSave(
      {
        name: name.trim(),
        instructor: instructor.trim(),
        classroom: classroom.trim(),
        day,
        startTime,
        endTime,
        color,
        reminderMinutes,
        notes: notes.trim(),
        category,
        mode,
        onlineLink: mode === 'online' ? onlineLink.trim() : undefined,
        akts: isNaN(parsedAkts) ? 4 : Math.max(1, parsedAkts),
        maxAbsenceCount: isNaN(parsedAbsence) ? 4 : Math.max(1, parsedAbsence),
      },
      editingCourse?.id
    );
  };

  const screenHeight = Dimensions.get('window').height;
  const sheetMaxHeight = keyboardHeight > 0
    ? Math.max(280, screenHeight - keyboardHeight - (Platform.OS === 'android' ? 24 : 44))
    : '90%';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.overlay,
          isLight && { backgroundColor: 'rgba(15, 23, 42, 0.45)' },
          { paddingBottom: keyboardHeight }
        ]}
      >
        <View style={[
          styles.sheetContainer,
          { maxHeight: sheetMaxHeight },
          isLight && { backgroundColor: '#FFFFFF', borderColor: 'rgba(0, 0, 0, 0.08)' },
          isOled && { backgroundColor: '#080808', borderColor: 'rgba(255, 255, 255, 0.15)' }
        ]}>
          {/* Header */}
          <View style={[styles.sheetHeader, isLight && { borderBottomColor: 'rgba(0, 0, 0, 0.06)' }]}>
            <View style={styles.sheetTitleRow}>
              <View style={[styles.colorIndicator, { backgroundColor: color }]} />
              <Text style={[styles.sheetTitle, isLight && { color: '#0F172A' }]}>
                {editingCourse ? t('editCourseTitle') : t('newCourseTitle')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, isLight && { backgroundColor: '#F1F5F9' }]}>
              <X size={20} color={isLight ? '#475569' : '#94A3B8'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Smart Predictive Banner */}
            {predictions.autoFillHint && (
              <View style={[styles.smartHintCard, isLight && { backgroundColor: 'rgba(2, 132, 199, 0.08)', borderColor: 'rgba(2, 132, 199, 0.2)' }]}>
                <View style={styles.smartHintHeader}>
                  <Sparkles size={16} color={isLight ? '#0284C7' : '#38BDF8'} />
                  <Text style={[styles.smartHintTitle, isLight && { color: '#0284C7' }]}>Akıllı Tahmin</Text>
                </View>
                <Text style={[styles.smartHintDesc, isLight && { color: '#334155' }]}>{predictions.autoFillHint.description}</Text>
                <TouchableOpacity
                  style={[styles.autoFillBtn, isLight && { backgroundColor: '#0284C7' }]}
                  onPress={() => applyAutoFill(predictions.autoFillHint!)}
                  activeOpacity={0.8}
                >
                  <Zap size={14} color="#FFFFFF" />
                  <Text style={[styles.autoFillBtnText, isLight && { color: '#FFFFFF' }]}>Tek Tıkla Otomatik Doldur</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Course Category (Zorunlu / Seçmeli / ÜSD) */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <GraduationCap size={15} color={isLight ? '#0284C7' : '#38BDF8'} />
                <Text style={[styles.fieldLabel, isLight && { color: '#334155' }]}>Ders Türü</Text>
              </View>
              <View style={styles.categoryRow}>
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' },
                    category === 'zorunlu' && styles.categoryOptionActive
                  ]}
                  onPress={() => setCategory('zorunlu')}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    isLight && { color: '#475569' },
                    category === 'zorunlu' && styles.categoryOptionTextActive
                  ]}>
                    🔵 Zorunlu
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' },
                    category === 'secmeli' && styles.categoryOptionActive
                  ]}
                  onPress={() => setCategory('secmeli')}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    isLight && { color: '#475569' },
                    category === 'secmeli' && styles.categoryOptionTextActive
                  ]}>
                    🟣 Bölüm Seçmeli
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' },
                    category === 'usd' && styles.categoryOptionActive
                  ]}
                  onPress={() => setCategory('usd')}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    isLight && { color: '#475569' },
                    category === 'usd' && styles.categoryOptionTextActive
                  ]}>
                    🟢 ÜSD (Seçmeli)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Course Format (Yüz Yüze / Online) */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Video size={15} color="#10B981" />
                <Text style={[styles.fieldLabel, isLight && { color: '#334155' }]}>Ders Formatı</Text>
              </View>
              <View style={styles.categoryRow}>
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' },
                    mode === 'in_person' && styles.categoryOptionActive
                  ]}
                  onPress={() => setMode('in_person')}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    isLight && { color: '#475569' },
                    mode === 'in_person' && styles.categoryOptionTextActive
                  ]}>
                    🏫 Yüz Yüze
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' },
                    mode === 'online' && styles.categoryOptionActive
                  ]}
                  onPress={() => setMode('online')}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    isLight && { color: '#475569' },
                    mode === 'online' && styles.categoryOptionTextActive
                  ]}>
                    💻 Online Ders
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* If Online, Link Input */}
            {mode === 'online' && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, isLight && { color: '#334155' }]}>Online Ders Linki (Zoom / Meet / Teams)</Text>
                <TextInput
                  style={[styles.textInput, isLight && { backgroundColor: '#F1F5F9', color: '#0F172A', borderColor: 'rgba(0, 0, 0, 0.08)' }]}
                  placeholder="https://zoom.us/j/123456789"
                  placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  value={onlineLink}
                  onChangeText={setOnlineLink}
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* 1. Course Name Input */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <BookOpen size={15} color={isLight ? '#0284C7' : '#3B82F6'} />
                <Text style={[styles.fieldLabel, isLight && { color: '#334155' }]}>Ders Adı *</Text>
              </View>
              <TextInput
                style={[styles.textInput, isLight && { backgroundColor: '#F1F5F9', color: '#0F172A', borderColor: 'rgba(0, 0, 0, 0.08)' }]}
                placeholder="Örn: Algoritmalar, Veri Yapıları, Girişimcilik..."
                placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                value={name}
                onChangeText={setName}
              />
              {predictions.suggestedCourseNames.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {predictions.suggestedCourseNames.map((s, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.chip,
                        isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' },
                        name === s.name && styles.chipActive
                      ]}
                      onPress={() => setName(s.name)}
                    >
                      <Text style={[
                        styles.chipText,
                        isLight && { color: '#475569' },
                        name === s.name && styles.chipTextActive
                      ]}>
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* 2. Instructor Input (Hoca) */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <User size={15} color={isLight ? '#7C3AED' : '#A78BFA'} />
                <Text style={[styles.fieldLabel, isLight && { color: '#334155' }]}>Dersin Hocası</Text>
              </View>
              <TextInput
                style={[styles.textInput, isLight && { backgroundColor: '#F1F5F9', color: '#0F172A', borderColor: 'rgba(0, 0, 0, 0.08)' }]}
                placeholder="Örn: Dr. Ahmet Yılmaz, Doç. Dr. Selin Kaya..."
                placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                value={instructor}
                onChangeText={setInstructor}
              />
              {predictions.suggestedInstructors.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {predictions.suggestedInstructors.map((s, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.chip,
                        isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' },
                        instructor === s.name && styles.chipActive
                      ]}
                      onPress={() => setInstructor(s.name)}
                    >
                      <Text style={[
                        styles.chipText,
                        isLight && { color: '#475569' },
                        instructor === s.name && styles.chipTextActive
                      ]}>
                        👨‍🏫 {s.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* 3. Classroom Input (If In-Person) */}
            {mode === 'in_person' && (
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <MapPin size={15} color={isLight ? '#D97706' : '#F59E0B'} />
                  <Text style={[styles.fieldLabel, isLight && { color: '#334155' }]}>Sınıf / Derslik (D7, D4, Amfi vb.)</Text>
                </View>
                <TextInput
                  style={[styles.textInput, isLight && { backgroundColor: '#F1F5F9', color: '#0F172A', borderColor: 'rgba(0, 0, 0, 0.08)' }]}
                  placeholder="Örn: D7, D4, Amfi 1, Lab 2..."
                  placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  value={classroom}
                  onChangeText={setClassroom}
                />
                {predictions.suggestedClassrooms.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    {predictions.suggestedClassrooms.map((s, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.chip,
                          isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' },
                          classroom === s.name && styles.chipActive
                        ]}
                        onPress={() => setClassroom(s.name)}
                      >
                        <Text style={[
                          styles.chipText,
                          isLight && { color: '#475569' },
                          classroom === s.name && styles.chipTextActive
                        ]}>
                          🏫 {s.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {/* 4. Day of the Week Selector */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isLight && { color: '#334155' }]}>{language === 'en' ? 'Day of Week' : 'Haftanın Günü'}</Text>
              <View style={styles.daysRow}>
                {getDaysOfWeek(language).map(d => {
                  const isSelected = day === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[
                        styles.dayPill,
                        isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' },
                        isSelected && styles.dayPillSelected
                      ]}
                      onPress={() => setDay(d.id as DayOfWeek)}
                    >
                      <Text style={[
                        styles.dayPillText,
                        isLight && { color: '#475569' },
                        isSelected && styles.dayPillTextSelected
                      ]}>
                        {d.shortName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 5. Time Selection Row */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Clock size={15} color={isLight ? '#059669' : '#10B981'} />
                <Text style={[styles.fieldLabel, isLight && { color: '#334155' }]}>Ders Saati (Başlangıç - Bitiş)</Text>
              </View>
              <View style={styles.timeButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.timeSelectButton,
                    isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.08)' }
                  ]}
                  onPress={() => setTimePickerTarget('start')}
                >
                  <Text style={[styles.timeButtonLabel, isLight && { color: '#64748B' }]}>Başlangıç</Text>
                  <Text style={[styles.timeButtonValue, isLight && { color: '#0F172A' }]}>{startTime}</Text>
                </TouchableOpacity>

                <View style={styles.timeSeparator}>
                  <Text style={[styles.timeSeparatorText, isLight && { color: '#64748B' }]}>→</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.timeSelectButton,
                    isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.08)' }
                  ]}
                  onPress={() => setTimePickerTarget('end')}
                >
                  <Text style={[styles.timeButtonLabel, isLight && { color: '#64748B' }]}>Bitiş</Text>
                  <Text style={[styles.timeButtonValue, isLight && { color: '#0F172A' }]}>{endTime}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickDurationRow}>
                <Text style={[styles.quickDurationLabel, isLight && { color: '#64748B' }]}>Hızlı Süre:</Text>
                <TouchableOpacity
                  style={[styles.durationChip, isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' }]}
                  onPress={() => applyDuration(50)}
                >
                  <Text style={[styles.durationChipText, isLight && { color: '#475569' }]}>+50 dk</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.durationChip, isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' }]}
                  onPress={() => applyDuration(110)}
                >
                  <Text style={[styles.durationChipText, isLight && { color: '#475569' }]}>+1 sa 50 dk</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.durationChip, isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' }]}
                  onPress={() => applyDuration(170)}
                >
                  <Text style={[styles.durationChipText, isLight && { color: '#475569' }]}>+2 sa 50 dk</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 6. Notification Reminder Selector */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Bell size={15} color={isLight ? '#0284C7' : '#38BDF8'} />
                <Text style={[styles.fieldLabel, isLight && { color: '#334155' }]}>Hatırlatma Bildirimi</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {REMINDER_OPTIONS.map(opt => {
                  const isSelected = reminderMinutes === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.reminderChip,
                        isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' },
                        isSelected && styles.reminderChipActive
                      ]}
                      onPress={() => setReminderMinutes(opt.value)}
                    >
                      <Text
                        style={[
                          styles.reminderChipText,
                          isLight && { color: '#475569' },
                          isSelected && styles.reminderChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 7. Color Palette Selector */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Palette size={15} color="#EC4899" />
                <Text style={[styles.fieldLabel, isLight && { color: '#334155' }]}>Kart Rengi</Text>
              </View>
              <View style={styles.paletteRow}>
                {DEFAULT_PALETTES.map(c => {
                  const isSelected = color === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.paletteCircle, { backgroundColor: c }]}
                      onPress={() => setColor(c)}
                    >
                      {isSelected && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 8. AKTS and Absence Limits */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <View style={styles.labelRow}>
                  <GraduationCap size={15} color={isLight ? '#0284C7' : '#38BDF8'} />
                  <Text style={[styles.fieldLabel, isLight && { color: '#334155' }]}>AKTS / Kredi</Text>
                </View>
                <TextInput
                  style={[styles.textInput, isLight && { backgroundColor: '#F1F5F9', color: '#0F172A', borderColor: 'rgba(0, 0, 0, 0.08)' }]}
                  placeholder="4"
                  placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  value={akts}
                  onChangeText={setAkts}
                  keyboardType="numeric"
                />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.labelRow}>
                  <Clock size={15} color={isLight ? '#D97706' : '#F59E0B'} />
                  <Text style={[styles.fieldLabel, isLight && { color: '#334155' }]}>Devamsızlık Sınırı</Text>
                </View>
                <TextInput
                  style={[styles.textInput, isLight && { backgroundColor: '#F1F5F9', color: '#0F172A', borderColor: 'rgba(0, 0, 0, 0.08)' }]}
                  placeholder="4"
                  placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  value={maxAbsenceCount}
                  onChangeText={setMaxAbsenceCount}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* 9. Optional Notes */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isLight && { color: '#334155' }]}>Notlar (Opsiyonel)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.notesInput,
                  isLight && { backgroundColor: '#F1F5F9', color: '#0F172A', borderColor: 'rgba(0, 0, 0, 0.08)' }
                ]}
                placeholder="Örn: Ders kitabı bölüm 3, laboratuvar..."
                placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={{ height: 30 }} />
          </ScrollView>

          {/* Footer Save / Cancel */}
          <View style={[styles.sheetFooter, isLight && { borderTopColor: 'rgba(0, 0, 0, 0.06)' }]}>
            <TouchableOpacity
              style={[styles.cancelButton, isLight && { backgroundColor: '#F1F5F9' }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, isLight && { color: '#475569' }]}>{t('cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {editingCourse ? (language === 'en' ? 'Update' : 'Güncelle') : t('save')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={timePickerTarget !== null}
        theme={theme}
        title={timePickerTarget === 'start' ? 'Başlangıç Saati Seç' : 'Bitiş Saati Seç'}
        initialTime={timePickerTarget === 'start' ? startTime : endTime}
        onConfirm={selectedTime => {
          if (timePickerTarget === 'start') {
            setStartTime(selectedTime);
            const sMin = timeToMinutes(selectedTime);
            const eMin = timeToMinutes(endTime);
            if (eMin <= sMin) {
              setEndTime(minutesToTime(sMin + 110));
            }
          } else {
            setEndTime(selectedTime);
          }
          setTimePickerTarget(null);
        }}
        onCancel={() => setTimePickerTarget(null)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  smartHintCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  smartHintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  smartHintTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  smartHintDesc: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
    marginBottom: 10,
  },
  autoFillBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  autoFillBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryOption: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryOptionActive: {
    backgroundColor: '#1E293B',
    borderColor: '#38BDF8',
  },
  categoryOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  categoryOptionTextActive: {
    color: '#38BDF8',
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  notesInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  chipsScroll: {
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dayPillSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  dayPillTextSelected: {
    color: '#FFFFFF',
  },
  timeButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeSelectButton: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeButtonLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  timeButtonValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#38BDF8',
  },
  timeSeparator: {
    paddingHorizontal: 4,
  },
  timeSeparatorText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '700',
  },
  quickDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  quickDurationLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  durationChip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  durationChipText: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '600',
  },
  reminderChip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  reminderChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  reminderChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  reminderChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paletteCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  saveButton: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
