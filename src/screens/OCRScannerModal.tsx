import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Platform,
  Share,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  X,
  FileText,
  Save,
  Share2,
  Trash2,
  BookOpen,
  Tag,
} from 'lucide-react-native';
import { Course } from '../types';
import { StorageService } from '../services/storage';
import { HapticsService } from '../services/hapticsService';

interface OCRScannerModalProps {
  visible: boolean;
  courses: Course[];
  onClose: () => void;
  onSavedNote: () => void;
  theme?: 'dark' | 'oled' | 'light';
}

const NOTE_CATEGORIES = [
  { id: 'board', label: 'Tahta Notu', icon: '📝' },
  { id: 'slide', label: 'Slayt / Ekran', icon: '💻' },
  { id: 'formula', label: 'Formül Kağıdı', icon: '⚡' },
  { id: 'exam_question', label: 'Sınav Sorusu', icon: '🎯' },
];

export const OCRScannerModal: React.FC<OCRScannerModalProps> = ({
  visible,
  courses,
  onClose,
  onSavedNote,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const isOled = theme === 'oled';

  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('board');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (courses.length > 0) {
      const isValid = courses.some(c => c.id === selectedCourseId);
      if (!isValid) {
        setSelectedCourseId(courses[0].id);
      }
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (visible) {
      setImageUri(null);
      setTitle('');
      setNotes('');
      setSaving(false);
    }
  }, [visible]);

  // Take photo
  const handleTakePhoto = async () => {
    HapticsService.selection();
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin Gerekli', 'Tahta fotoğrafı çekebilmek için kamera izni vermeniz gerekiyor.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        allowsEditing: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        // Optimize image
        const manipResult = await ImageManipulator.manipulateAsync(
          res.assets[0].uri,
          [{ resize: { width: 1400 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        setImageUri(manipResult.uri);
      }
    } catch (e: any) {
      Alert.alert('Hata', 'Fotoğraf çekilemedi: ' + (e?.message || 'Bilinmeyen hata'));
    }
  };

  // Pick from gallery
  const handlePickGallery = async () => {
    HapticsService.selection();
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin Gerekli', 'Görsel seçebilmek için galeri izni vermeniz gerekiyor.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.85,
        allowsEditing: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const manipResult = await ImageManipulator.manipulateAsync(
          res.assets[0].uri,
          [{ resize: { width: 1400 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        setImageUri(manipResult.uri);
      }
    } catch (e: any) {
      Alert.alert('Hata', 'Görsel seçilemedi: ' + (e?.message || 'Bilinmeyen hata'));
    }
  };

  // Save note to archive
  const handleSave = async () => {
    if (!imageUri && !notes.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir fotoğraf çekin veya not yazın.');
      return;
    }

    const targetCourse = courses.find(c => c.id === selectedCourseId);
    const categoryObj = NOTE_CATEGORIES.find(cat => cat.id === selectedCategory);
    const categoryLabel = categoryObj ? categoryObj.label : 'Ders Notu';

    setSaving(true);
    try {
      HapticsService.success();
      const noteTitle = title.trim() || `[${categoryLabel}] - ${new Date().toLocaleDateString('tr-TR')}`;

      await StorageService.saveLectureNote({
        courseId: selectedCourseId,
        courseName: targetCourse ? targetCourse.name : 'Ders Notu',
        date: new Date().toISOString().split('T')[0],
        textNotes: `${noteTitle}\n\n${notes.trim()}`,
        audioDurationSeconds: 0,
        transcript: '',
        imageUris: imageUri ? [imageUri] : undefined,
        summaryPoints: [categoryLabel],
      });

      onSavedNote();
      Alert.alert(
        'Görsel Not Kaydedildi',
        'Notunuz ve görseliniz ders kasanıza başarıyla eklendi! 📚',
        [{ text: 'Tamam', onPress: onClose }]
      );
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Not kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  // Share note
  const handleShare = async () => {
    HapticsService.light();
    const targetCourse = courses.find(c => c.id === selectedCourseId);
    const message = `[Akademik Asistan - ${targetCourse?.name || 'Ders Notu'}]\n` +
      `${title.trim() ? `${title.trim()}\n` : ''}${notes.trim()}`;
    await Share.share({
      message,
      title: title || 'Ders Notu',
      url: imageUri || undefined,
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Camera size={20} color={isLight ? '#0284C7' : '#38BDF8'} />
              <Text style={[styles.title, isLight && { color: '#0F172A' }]}>Görsel Not & Tahta Çekimi</Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, isLight && { backgroundColor: '#F1F5F9' }]} onPress={onClose}>
              <X size={18} color={isLight ? '#475569' : '#94A3B8'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* 1. Course Selector */}
            <View style={styles.section}>
              <Text style={[styles.label, isLight && { color: '#334155' }]}>İlgili Ders</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseScroll}>
                {courses.map(c => {
                  const isSelected = c.id === selectedCourseId;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.courseChip,
                        isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0, 0, 0, 0.06)' },
                        isSelected && { borderColor: c.color, backgroundColor: `${c.color}20` }
                      ]}
                      onPress={() => setSelectedCourseId(c.id)}
                    >
                      <View style={[styles.courseDot, { backgroundColor: c.color }]} />
                      <Text style={[
                        styles.courseChipText,
                        isLight && { color: '#0F172A' },
                        isSelected && { color: c.color, fontWeight: '800' }
                      ]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 2. Category Selector */}
            <View style={styles.section}>
              <Text style={[styles.label, isLight && { color: '#334155' }]}>Not Türü</Text>
              <View style={styles.categoriesRow}>
                {NOTE_CATEGORIES.map(cat => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryBtn,
                        isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0, 0, 0, 0.06)' },
                        isSelected && styles.categoryBtnActive,
                      ]}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <Text style={[
                        styles.categoryText,
                        isLight && { color: '#475569' },
                        isSelected && styles.categoryTextActive,
                      ]}>
                        {cat.icon} {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Image Capture or Preview */}
            <View style={styles.section}>
              <Text style={[styles.label, isLight && { color: '#334155' }]}>Görsel / Fotoğraf</Text>
              {imageUri ? (
                <View style={[styles.imagePreviewBox, isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0,0,0,0.08)' }]}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
                  <View style={styles.imageOverlayControls}>
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setImageUri(null)}
                    >
                      <Trash2 size={14} color="#EF4444" />
                      <Text style={styles.removeImageText}>Fotoğrafı Kaldır</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.captureRow}>
                  <TouchableOpacity
                    style={[styles.captureBtn, isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0, 0, 0, 0.08)' }]}
                    onPress={handleTakePhoto}
                  >
                    <View style={[styles.iconCircle, isLight && { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}>
                      <Camera size={24} color={isLight ? '#0284C7' : '#38BDF8'} />
                    </View>
                    <Text style={[styles.captureBtnTitle, isLight && { color: '#0F172A' }]}>Fotoğraf Çek</Text>
                    <Text style={[styles.captureBtnSub, isLight && { color: '#64748B' }]}>Tahta veya defteri kamerayla çekin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.captureBtn, isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0, 0, 0, 0.08)' }]}
                    onPress={handlePickGallery}
                  >
                    <View style={[styles.iconCircle, isLight && { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}>
                      <ImageIcon size={24} color={isLight ? '#0284C7' : '#38BDF8'} />
                    </View>
                    <Text style={[styles.captureBtnTitle, isLight && { color: '#0F172A' }]}>Galeriden Seç</Text>
                    <Text style={[styles.captureBtnSub, isLight && { color: '#64748B' }]}>Mevcut slayt veya fotoğrafı ekleyin</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 4. Title and Notes Inputs */}
            <View style={styles.section}>
              <Text style={[styles.label, isLight && { color: '#334155' }]}>Not Başlığı (Opsiyonel)</Text>
              <TextInput
                style={[
                  styles.input,
                  isLight && { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: 'rgba(0, 0, 0, 0.08)' }
                ]}
                placeholder="Örn: 4. Hafta Tahtadaki Diferansiyel Formülleri"
                placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, isLight && { color: '#334155' }]}>Ders İçi Notlar & Açıklamalar</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  isLight && { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: 'rgba(0, 0, 0, 0.08)' }
                ]}
                placeholder="Tahtadaki formüllerle veya dersle ilgili kilit açıklamaları buraya yazabilirsiniz..."
                placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer Save & Share */}
          <View style={[styles.footer, isLight && { borderTopColor: 'rgba(0, 0, 0, 0.06)' }]}>
            <TouchableOpacity
              style={[styles.shareBtn, isLight && { backgroundColor: '#F1F5F9' }]}
              onPress={handleShare}
            >
              <Share2 size={16} color={isLight ? '#0284C7' : '#38BDF8'} />
              <Text style={[styles.shareBtnText, isLight && { color: '#0284C7' }]}>Paylaş</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              <Save size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {saving ? 'Kaydediliyor...' : 'Kasa Notlarına Kaydet'}
              </Text>
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
  container: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
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
  title: {
    fontSize: 18,
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
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  courseScroll: {
    flexDirection: 'row',
  },
  courseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  courseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  courseChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  categoryTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  captureRow: {
    flexDirection: 'row',
    gap: 10,
  },
  captureBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  captureBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  captureBtnSub: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  imagePreviewBox: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  imageOverlayControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeImageText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  shareBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
