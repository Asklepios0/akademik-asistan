import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  Keyboard,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  X,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  ImageIcon,
  Trash2,
  Save,
  Zap,
  Bookmark,
  Calendar,
  ChevronDown,
} from 'lucide-react-native';
import { Course, LectureNote } from '../types';
import { StorageService } from '../services/storage';
import { HapticsService } from '../services/hapticsService';
import { useLanguage } from '../context/LanguageContext';

interface ClassSessionModalProps {
  visible: boolean;
  course: Course | null;
  onClose: () => void;
  onSavedNote?: (note: LectureNote) => void;
  theme?: 'dark' | 'oled' | 'light';
}

export const ClassSessionModal: React.FC<ClassSessionModalProps> = ({
  visible,
  course,
  onClose,
  onSavedNote,
  theme = 'dark',
}) => {
  if (!course) return null;

  const { t, language } = useLanguage();
  const scrollRef = useRef<ScrollView>(null);
  const isLight = theme === 'light';
  const isOled = theme === 'oled';

  const [textNotes, setTextNotes] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState<'attended' | 'missed' | 'cancelled'>('attended');
  const [delayMinutes, setDelayMinutes] = useState(course.delayMinutes || 0);
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Monitor keyboard height to dynamically resize and elevate the bottom sheet
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

  useEffect(() => {
    if (visible) {
      setTextNotes('');
      setAttendanceStatus('attended');
      setDelayMinutes(course.delayMinutes || 0);
      setAttachedImageUri(null);
      setKeyboardHeight(0);
    }
  }, [visible, course]);

  const quickTags = [
    { label: t('tagExamTip'), icon: '📌' },
    { label: t('tagHomework'), icon: '📝' },
    { label: t('tagFormula'), icon: '⚡' },
    { label: t('tagReminder'), icon: '💡' },
    { label: t('tagTeacherWarning'), icon: '⚠️' },
    { label: t('tagExamQuestion'), icon: '🎯' },
  ];

  // Add timestamp tag
  const handleAddTag = (tagLabel: string, icon: string) => {
    HapticsService.light();
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
    const prefix = textNotes.trim().length > 0 ? '\n' : '';
    setTextNotes(prev => `${prev}${prefix}[${timeStr} - ${icon} ${tagLabel}]: `);
  };

  // Instructor delay toggle
  const handleApplyDelay = async (mins: number) => {
    HapticsService.medium();
    const newDelay = delayMinutes === mins ? 0 : mins;
    setDelayMinutes(newDelay);
    await StorageService.updateCourseDelay(course.id, newDelay);
  };

  // Camera capture
  const handleTakePhoto = async () => {
    HapticsService.selection();
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('warning'), t('cameraPermRequired'));
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setAttachedImageUri(res.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert(t('error'), 'Fotoğraf çekilemedi: ' + (e?.message || 'Bilinmeyen hata'));
    }
  };

  // Pick from gallery
  const handlePickGallery = async () => {
    HapticsService.selection();
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('warning'), t('galleryPermRequired'));
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsEditing: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setAttachedImageUri(res.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert(t('error'), 'Görsel seçilemedi: ' + (e?.message || 'Bilinmeyen hata'));
    }
  };

  // Save session & notes
  const handleSave = async () => {
    try {
      HapticsService.success();

      // Record attendance
      if (attendanceStatus === 'attended') {
        await StorageService.recordAttendance(course.id, 'attended');
      } else if (attendanceStatus === 'missed') {
        await StorageService.recordAttendance(course.id, 'missed');
      } else if (attendanceStatus === 'cancelled') {
        await StorageService.toggleCourseCancellation(course.id, true);
      }

      // If user typed notes or attached an image, save lecture note
      let savedNote: LectureNote | null = null;
      if (textNotes.trim() || attachedImageUri) {
        savedNote = await StorageService.saveLectureNote({
          courseId: course.id,
          courseName: course.name,
          date: new Date().toISOString().split('T')[0],
          textNotes: textNotes.trim(),
          audioDurationSeconds: 0,
          transcript: '',
          summaryPoints: [],
          imageUris: attachedImageUri ? [attachedImageUri] : undefined,
        });
      }

      if (savedNote && onSavedNote) {
        onSavedNote(savedNote);
      }

      Alert.alert(
        t('classSavedTitle'),
        attendanceStatus === 'attended'
          ? t('attendedSavedDesc')
          : attendanceStatus === 'missed'
          ? t('missedSavedDesc')
          : t('cancelledSavedDesc'),
        [{ text: t('done'), onPress: onClose }]
      );
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || 'Kaydedilirken bir hata oluştu.');
    }
  };

  // Finish early and save
  const handleFinishEarlyAndSave = async () => {
    try {
      HapticsService.success();
      await StorageService.finishCourseEarlyToday(course.id);
      await StorageService.recordAttendance(course.id, 'attended');

      let savedNote: LectureNote | null = null;
      if (textNotes.trim() || attachedImageUri) {
        savedNote = await StorageService.saveLectureNote({
          courseId: course.id,
          courseName: course.name,
          date: new Date().toISOString().split('T')[0],
          textNotes: textNotes.trim(),
          audioDurationSeconds: 0,
          transcript: '',
          summaryPoints: [],
          imageUris: attachedImageUri ? [attachedImageUri] : undefined,
        });
      }

      if (savedNote && onSavedNote) {
        onSavedNote(savedNote);
      }

      Alert.alert(
        t('classEndedEarlyTitle'),
        t('classEndedEarlyDesc'),
        [{ text: t('done'), onPress: onClose }]
      );
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || 'Kaydedilirken bir hata oluştu.');
    }
  };

  const screenHeight = Dimensions.get('window').height;
  const sheetMaxHeight = keyboardHeight > 0
    ? Math.max(280, screenHeight - keyboardHeight - (Platform.OS === 'android' ? 24 : 44))
    : '92%';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
          <View style={[styles.header, isLight && { borderBottomColor: 'rgba(0, 0, 0, 0.06)' }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.courseMetaRow}>
                <View style={[styles.courseColorIndicator, { backgroundColor: course.color || '#3B82F6' }]} />
                <Text style={[styles.categoryTag, isLight && { color: '#64748B' }]}>
                  {course.category.toUpperCase()} • {course.startTime} - {course.endTime}
                </Text>
              </View>
              <Text style={[styles.courseName, isLight && { color: '#0F172A' }]} numberOfLines={1}>
                {course.name}
              </Text>
              <Text style={[styles.instructorClassroom, isLight && { color: '#475569' }]}>
                📍 {course.classroom || (language === 'en' ? 'Classroom' : 'Derslik')} {course.instructor ? `• 👨‍🏫 ${course.instructor}` : ''}
              </Text>
            </View>

            {keyboardHeight > 0 && (
              <TouchableOpacity
                style={[styles.dismissKeyboardBtn, isLight && { backgroundColor: '#F1F5F9' }]}
                onPress={() => Keyboard.dismiss()}
                activeOpacity={0.7}
              >
                <ChevronDown size={14} color={isLight ? '#0284C7' : '#38BDF8'} />
                <Text style={[styles.dismissKeyboardText, isLight && { color: '#0284C7' }]}>
                  {t('dismissKeyboard')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.closeBtn, isLight && { backgroundColor: '#F1F5F9' }]}
              onPress={onClose}
            >
              <X size={18} color={isLight ? '#475569' : '#94A3B8'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* 1. Attendance Quick Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isLight && { color: '#334155' }]}>{t('todayAttendanceStatus')}</Text>
              <View style={styles.attendanceRow}>
                <TouchableOpacity
                  style={[
                    styles.attendanceOption,
                    isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0,0,0,0.06)' },
                    attendanceStatus === 'attended' && styles.attendanceOptionAttended,
                  ]}
                  onPress={() => setAttendanceStatus('attended')}
                >
                  <CheckCircle2 size={16} color={attendanceStatus === 'attended' ? '#10B981' : isLight ? '#94A3B8' : '#64748B'} />
                  <Text style={[
                    styles.attendanceOptionText,
                    isLight && { color: '#475569' },
                    attendanceStatus === 'attended' && { color: '#10B981', fontWeight: '800' }
                  ]}>
                    {t('attendedOption')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.attendanceOption,
                    isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0,0,0,0.06)' },
                    attendanceStatus === 'missed' && styles.attendanceOptionMissed,
                  ]}
                  onPress={() => setAttendanceStatus('missed')}
                >
                  <XCircle size={16} color={attendanceStatus === 'missed' ? '#EF4444' : isLight ? '#94A3B8' : '#64748B'} />
                  <Text style={[
                    styles.attendanceOptionText,
                    isLight && { color: '#475569' },
                    attendanceStatus === 'missed' && { color: '#EF4444', fontWeight: '800' }
                  ]}>
                    {t('missedOption')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.attendanceOption,
                    isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0,0,0,0.06)' },
                    attendanceStatus === 'cancelled' && styles.attendanceOptionCancelled,
                  ]}
                  onPress={() => setAttendanceStatus('cancelled')}
                >
                  <AlertTriangle size={16} color={attendanceStatus === 'cancelled' ? '#F59E0B' : isLight ? '#94A3B8' : '#64748B'} />
                  <Text style={[
                    styles.attendanceOptionText,
                    isLight && { color: '#475569' },
                    attendanceStatus === 'cancelled' && { color: '#F59E0B', fontWeight: '800' }
                  ]}>
                    {t('cancelledOption')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Instructor Delay Section */}
            <View style={styles.section}>
              <View style={styles.delayHeaderRow}>
                <Clock size={14} color={isLight ? '#D97706' : '#F59E0B'} />
                <Text style={[styles.sectionTitle, isLight && { color: '#334155' }]}>{t('teacherDelay')}</Text>
              </View>
              <View style={styles.delayRow}>
                {[0, 10, 15, 20].map(mins => {
                  const isActive = delayMinutes === mins;
                  return (
                    <TouchableOpacity
                      key={mins}
                      style={[
                        styles.delayChip,
                        isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0,0,0,0.06)' },
                        isActive && styles.delayChipActive,
                      ]}
                      onPress={() => handleApplyDelay(mins)}
                    >
                      <Text style={[
                        styles.delayChipText,
                        isLight && { color: '#475569' },
                        isActive && styles.delayChipTextActive,
                      ]}>
                        {mins === 0 ? t('onTime') : t('delayMins', { mins })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. In-Class Rapid Note Taker */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, isLight && { color: '#334155' }]}>{t('inClassRapidNotes')}</Text>
                <Text style={[styles.sectionSub, isLight && { color: '#64748B' }]}>{t('tapTagsToAdd')}</Text>
              </View>

              {/* Quick Timestamp Tags */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
                {quickTags.map(tItem => (
                  <TouchableOpacity
                    key={tItem.label}
                    style={[
                      styles.tagChip,
                      isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' }
                    ]}
                    onPress={() => handleAddTag(tItem.label, tItem.icon)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tagChipText, isLight && { color: '#0F172A' }]}>
                      {tItem.icon} {tItem.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Note Text Input */}
              <TextInput
                style={[
                  styles.noteInput,
                  isLight && { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: 'rgba(0, 0, 0, 0.08)' }
                ]}
                placeholder={t('noteInputPlaceholder')}
                placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                value={textNotes}
                onChangeText={setTextNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollTo({ y: 150, animated: true });
                  }, 120);
                }}
              />
            </View>

            {/* 4. Board Photo Attachment */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isLight && { color: '#334155' }]}>{t('boardPhoto')}</Text>

              {attachedImageUri ? (
                <View style={[styles.imagePreviewCard, isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0,0,0,0.08)' }]}>
                  <Image source={{ uri: attachedImageUri }} style={styles.attachedImage} resizeMode="cover" />
                  <View style={styles.imageActionRow}>
                    <Text style={[styles.imageAttachedLabel, isLight && { color: '#059669' }]}>{t('imageAttached')}</Text>
                    <TouchableOpacity
                      style={styles.deleteImageBtn}
                      onPress={() => setAttachedImageUri(null)}
                    >
                      <Trash2 size={14} color="#EF4444" />
                      <Text style={styles.deleteImageText}>{t('removePhoto')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.photoButtonsRow}>
                  <TouchableOpacity
                    style={[styles.photoActionBtn, isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0,0,0,0.06)' }]}
                    onPress={handleTakePhoto}
                  >
                    <Camera size={18} color={isLight ? '#0284C7' : '#38BDF8'} />
                    <Text style={[styles.photoActionText, isLight && { color: '#0F172A' }]}>{t('takePhoto')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.photoActionBtn, isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0,0,0,0.06)' }]}
                    onPress={handlePickGallery}
                  >
                    <ImageIcon size={18} color={isLight ? '#0284C7' : '#38BDF8'} />
                    <Text style={[styles.photoActionText, isLight && { color: '#0F172A' }]}>{t('pickGallery')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer Save & Early Finish & Cancel */}
          <View style={[styles.footer, isLight && { borderTopColor: 'rgba(0, 0, 0, 0.06)' }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, isLight && { backgroundColor: '#F1F5F9' }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, isLight && { color: '#475569' }]}>{t('cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.finishEarlyBtn} onPress={handleFinishEarlyAndSave}>
              <Zap size={15} color="#FFFFFF" />
              <Text style={styles.finishEarlyBtnText}>{t('finishEarly')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <CheckCircle2 size={16} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>{t('saveNotes')}</Text>
            </TouchableOpacity>
          </View>
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
  sheetContainer: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  courseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  courseColorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  courseName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  instructorClassroom: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  dismissKeyboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dismissKeyboardText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  sectionSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  attendanceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  attendanceOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  attendanceOptionAttended: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  attendanceOptionMissed: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#EF4444',
  },
  attendanceOptionCancelled: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#F59E0B',
  },
  attendanceOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  delayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  delayRow: {
    flexDirection: 'row',
    gap: 8,
  },
  delayChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  delayChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  delayChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  delayChipTextActive: {
    color: '#F59E0B',
    fontWeight: '800',
  },
  tagsScroll: {
    marginBottom: 10,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  noteInput: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 13,
    lineHeight: 20,
    minHeight: 110,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  imagePreviewCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  attachedImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  imageActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  imageAttachedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  deleteImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteImageText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  cancelBtn: {
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  finishEarlyBtn: {
    flex: 1.1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  finishEarlyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
