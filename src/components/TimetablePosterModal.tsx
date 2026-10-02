import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Share2,
  Sparkles,
  Smartphone,
  Calendar,
  Image as ImageIcon,
  Lock,
  Home,
  Download,
  Info,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { Course, DAYS_OF_WEEK } from '../types';
import { HapticsService } from '../services/hapticsService';
import { CalendarExportService } from '../services/calendarExportService';
import { WallpaperService, WallpaperMode } from '../services/wallpaperService';

interface TimetablePosterModalProps {
  visible: boolean;
  courses: Course[];
  onClose: () => void;
  theme?: 'dark' | 'oled' | 'light';
}

export const TimetablePosterModal: React.FC<TimetablePosterModalProps> = ({
  visible,
  courses,
  onClose,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const isOled = theme === 'oled';
  const [mode, setMode] = useState<WallpaperMode>('lockscreen');
  const [wallpaperFileUri, setWallpaperFileUri] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyingTarget, setApplyingTarget] = useState<'lock' | 'home' | 'gallery' | null>(null);

  const handleModeChange = (newMode: WallpaperMode) => {
    if (newMode === mode) return;
    HapticsService.selection();
    setWallpaperFileUri(null); // Force regenerate
    setMode(newMode);
  };

  const ensureWallpaperReady = async (): Promise<string | null> => {
    let targetUri = wallpaperFileUri;
    if (!targetUri) {
      // Wait briefly for WebView canvas rendering
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 200));
        if (wallpaperFileUri) {
          targetUri = wallpaperFileUri;
          break;
        }
      }
    }
    return targetUri;
  };

  const handleSetWallpaper = async (target: 'lock' | 'home' | 'both') => {
    HapticsService.medium();
    setIsApplying(true);
    setApplyingTarget(target === 'both' ? 'lock' : target);

    try {
      const uri = await ensureWallpaperReady();
      if (!uri) {
        Alert.alert(
          'Görsel Hazırlanıyor',
          'Duvar kağıdı çizelgesi hazırlanıyor, lütfen 1 saniye sonra tekrar dokunun.'
        );
        return;
      }

      const res = await WallpaperService.setWallpaperDirectly(uri, target);
      if (res.success) {
        HapticsService.success();
        Alert.alert(
          '✅ Başarıyla Ayarlandı!',
          target === 'lock'
            ? 'Ders programınız kilit ekranı olarak ayarlandı. Güç tuşuna basarak kilit ekranınızı görebilirsiniz.'
            : res.message
        );
      } else {
        HapticsService.error();
        Alert.alert('Bilgi', res.message);
      }
    } catch (e: any) {
      HapticsService.error();
      Alert.alert('Hata', e?.message || 'Duvar kağıdı ayarlanamadı.');
    } finally {
      setIsApplying(false);
      setApplyingTarget(null);
    }
  };

  const handleSaveToGallery = async () => {
    HapticsService.medium();
    setIsApplying(true);
    setApplyingTarget('gallery');

    try {
      const uri = await ensureWallpaperReady();
      if (!uri) {
        Alert.alert(
          'Görsel Hazırlanıyor',
          'Görsel oluşturuluyor, lütfen 1 saniye sonra tekrar dokunun.'
        );
        return;
      }

      const res = await WallpaperService.saveToGallery(uri);
      if (res.success) {
        HapticsService.success();
        Alert.alert('✅ Galeriye Kaydedildi', res.message);
      } else {
        HapticsService.error();
        Alert.alert('Bilgi', res.message);
      }
    } catch (e: any) {
      HapticsService.error();
      Alert.alert('Hata', e?.message || 'Galeriye kaydedilemedi.');
    } finally {
      setIsApplying(false);
      setApplyingTarget(null);
    }
  };

  const handleShareImage = async () => {
    HapticsService.light();
    const uri = await ensureWallpaperReady();
    if (!uri) {
      Alert.alert('Hazırlanıyor', 'Görsel hazırlanıyor, lütfen 1 saniye bekleyin.');
      return;
    }
    await WallpaperService.shareImage(uri);
  };

  const handleShareText = async () => {
    HapticsService.light();
    await CalendarExportService.shareSchedule(courses, false);
  };

  const handleShareICS = async () => {
    HapticsService.light();
    await CalendarExportService.shareSchedule(courses, true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Hidden WebView off-screen to generate device-aspect-ratio poster PNG */}
        {visible && (
          <View
            style={{ width: 10, height: 10, opacity: 0.01, position: 'absolute', top: -200 }}
            pointerEvents="none"
          >
            <WebView
              key={mode}
              source={{ html: WallpaperService.generateWallpaperHtml(courses, mode) }}
              javaScriptEnabled
              originWhitelist={['*']}
              onMessage={async event => {
                try {
                  const data = event.nativeEvent.data;
                  if (data && data.startsWith('data:image/')) {
                    const savedUri = await WallpaperService.saveBase64Image(data);
                    setWallpaperFileUri(savedUri);
                  }
                } catch (e) {
                  console.warn('Failed to save wallpaper base64', e);
                }
              }}
            />
          </View>
        )}

        <View
          style={[
            styles.modalBox,
            isLight && { backgroundColor: '#FFFFFF', borderColor: 'rgba(0, 0, 0, 0.08)' },
            isOled && { backgroundColor: '#080808', borderColor: 'rgba(255, 255, 255, 0.15)' },
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, isLight && { borderBottomColor: 'rgba(0, 0, 0, 0.06)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Smartphone size={20} color={isLight ? '#0284C7' : '#38BDF8'} />
              <Text style={[styles.title, isLight && { color: '#0F172A' }]}>
                Ders Programı Duvar Kağıdı
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, isLight && { backgroundColor: '#F1F5F9' }]}
              onPress={onClose}
            >
              <X size={18} color={isLight ? '#475569' : '#94A3B8'} />
            </TouchableOpacity>
          </View>

          {/* Mode Selector (Lock Screen Safe-zone vs Fullscreen) */}
          <View style={styles.modeSelectorContainer}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                mode === 'lockscreen' && styles.modeTabActive,
                isLight && mode !== 'lockscreen' && { backgroundColor: '#F1F5F9' },
              ]}
              onPress={() => handleModeChange('lockscreen')}
              activeOpacity={0.8}
            >
              <Lock
                size={14}
                color={mode === 'lockscreen' ? '#0F172A' : isLight ? '#64748B' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.modeTabText,
                  mode === 'lockscreen' && styles.modeTabTextActive,
                  isLight && mode !== 'lockscreen' && { color: '#64748B' },
                ]}
              >
                Kilit Ekranı (Saat Uyumlu)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                mode === 'fullscreen' && styles.modeTabActive,
                isLight && mode !== 'fullscreen' && { backgroundColor: '#F1F5F9' },
              ]}
              onPress={() => handleModeChange('fullscreen')}
              activeOpacity={0.8}
            >
              <Smartphone
                size={14}
                color={mode === 'fullscreen' ? '#0F172A' : isLight ? '#64748B' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.modeTabText,
                  mode === 'fullscreen' && styles.modeTabTextActive,
                  isLight && mode !== 'fullscreen' && { color: '#64748B' },
                ]}
              >
                Tam Ekran
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode Description Tip */}
          <View
            style={[
              styles.wallpaperTipBox,
              isLight && {
                backgroundColor: 'rgba(2, 132, 199, 0.08)',
                borderColor: 'rgba(2, 132, 199, 0.2)',
              },
            ]}
          >
            <Sparkles size={14} color={isLight ? '#0284C7' : '#38BDF8'} />
            <Text style={[styles.wallpaperTipText, isLight && { color: '#334155' }]}>
              {mode === 'lockscreen' ? (
                <>
                  <Text style={{ fontWeight: '800', color: isLight ? '#0F172A' : '#F8FAFC' }}>
                    Saat ve Bildirim Korumalı:
                  </Text>{' '}
                  Üst %36'lık alan telefonunuzun büyük saati ve hava durumu widget'ı için boş
                  bırakılır, yazılar asla saatin arkasında kalmaz.
                </>
              ) : (
                <>
                  <Text style={{ fontWeight: '800', color: isLight ? '#0F172A' : '#F8FAFC' }}>
                    Geniş Düzen:
                  </Text>{' '}
                  Tüm ekranı yukardan aşağıya ders kartlarıyla doldurur. Ana ekran veya poster olarak
                  mükemmeldir.
                </>
              )}
            </Text>
          </View>

          {/* Live Preview Card */}
          <ScrollView
            style={[
              styles.posterCard,
              isLight && { backgroundColor: '#F8FAFC', borderColor: 'rgba(0, 0, 0, 0.08)' },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {mode === 'lockscreen' && (
              <View style={styles.clockPlaceholderArea}>
                <Text style={styles.clockPlaceholderText}>
                  🕒 Kilit Ekranı Saati ve Bildirim Alanı
                </Text>
                <Text style={styles.clockPlaceholderSub}>
                  (Yazılar bu alanın altına yerleştirilir)
                </Text>
              </View>
            )}

            <View style={styles.posterHeader}>
              <Text style={[styles.posterAppTitle, isLight && { color: '#0284C7' }]}>
                AKADEMİK ASİSTAN
              </Text>
              <Text style={[styles.posterTermTitle, isLight && { color: '#0F172A' }]}>
                HAFTALIK DERS ÇİZELGESİ
              </Text>
              <View
                style={[
                  styles.posterDivider,
                  isLight && { backgroundColor: 'rgba(0, 0, 0, 0.08)' },
                ]}
              />
            </View>

            {courses.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
                  Henüz kayıtlı ders bulunmuyor. Program sekmesinden derslerinizi ekleyin.
                </Text>
              </View>
            ) : (
              DAYS_OF_WEEK.map(day => {
                const dayCourses = courses.filter(c => c.day === day.id);
                if (dayCourses.length === 0) return null;

                return (
                  <View key={day.id} style={styles.daySection}>
                    <View style={styles.dayHeaderRow}>
                      <Text style={[styles.dayTitle, isLight && { color: '#0284C7' }]}>
                        {day.name.toUpperCase()}
                      </Text>
                      <Text style={styles.dayBadge}>{dayCourses.length} Ders</Text>
                    </View>

                    {dayCourses.map(c => (
                      <View
                        key={c.id}
                        style={[
                          styles.courseItem,
                          isLight && {
                            backgroundColor: '#FFFFFF',
                            borderColor: 'rgba(0, 0, 0, 0.06)',
                          },
                        ]}
                      >
                        <View style={[styles.courseColorBar, { backgroundColor: c.color }]} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[styles.courseName, isLight && { color: '#0F172A' }]}>
                              {c.name}
                            </Text>
                            <Text style={[styles.courseTime, isLight && { color: '#0284C7' }]}>
                              {c.startTime} - {c.endTime}
                            </Text>
                          </View>
                          <Text style={[styles.courseDetails, isLight && { color: '#64748B' }]}>
                            📍 {c.classroom || 'Derslik'} • 👨‍🏫 {c.instructor || 'Öğretim Üyesi'} •{' '}
                            {c.akts ? `${c.akts} AKTS` : c.category}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })
            )}

            <View style={styles.posterFooter}>
              <Text style={[styles.footerNote, isLight && { color: '#64748B' }]}>
                ⚡ Ekran Oranına Özel (1080p Yüksek Çözünürlük)
              </Text>
            </View>
          </ScrollView>

          {/* Primary Action: Direct Set Lock Screen Wallpaper */}
          <TouchableOpacity
            style={styles.primaryWallpaperBtn}
            onPress={() => handleSetWallpaper('lock')}
            disabled={isApplying}
            activeOpacity={0.85}
          >
            {isApplying && applyingTarget === 'lock' ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Lock size={18} color="#0F172A" />
            )}
            <Text style={styles.primaryWallpaperBtnText}>
              {isApplying && applyingTarget === 'lock'
                ? 'Kilit Ekranı Ayarlanıyor...'
                : '🔒 Kilit Ekranı Olarak Ayarla (Tek Tıkla)'}
            </Text>
          </TouchableOpacity>

          {/* Action Grid */}
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[
                styles.gridActionBtn,
                isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.08)' },
              ]}
              onPress={() => handleSetWallpaper('home')}
              disabled={isApplying}
            >
              {isApplying && applyingTarget === 'home' ? (
                <ActivityIndicator size="small" color={isLight ? '#0284C7' : '#38BDF8'} />
              ) : (
                <Home size={15} color={isLight ? '#0284C7' : '#38BDF8'} />
              )}
              <Text style={[styles.gridActionText, isLight && { color: '#334155' }]}>
                Ana Ekran Yap
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.gridActionBtn,
                isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.08)' },
              ]}
              onPress={handleSaveToGallery}
              disabled={isApplying}
            >
              {isApplying && applyingTarget === 'gallery' ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Download size={15} color="#10B981" />
              )}
              <Text style={[styles.gridActionText, isLight && { color: '#334155' }]}>
                Galeriye Kaydet
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.gridActionBtn,
                isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.08)' },
              ]}
              onPress={handleShareImage}
            >
              <ImageIcon size={15} color={isLight ? '#0284C7' : '#38BDF8'} />
              <Text style={[styles.gridActionText, isLight && { color: '#334155' }]}>
                Paylaş
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.gridActionBtn,
                isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.08)' },
              ]}
              onPress={handleShareICS}
            >
              <Calendar size={15} color={isLight ? '#0284C7' : '#38BDF8'} />
              <Text style={[styles.gridActionText, isLight && { color: '#334155' }]}>
                Takvime (.ics)
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 18,
    maxHeight: '95%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: 'transparent',
  },
  modeTabActive: {
    backgroundColor: '#38BDF8',
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  modeTabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  wallpaperTipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  wallpaperTipText: {
    fontSize: 11,
    color: '#CBD5E1',
    flex: 1,
    lineHeight: 15,
  },
  posterCard: {
    backgroundColor: '#040711',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    maxHeight: 290,
  },
  clockPlaceholderArea: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  clockPlaceholderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
  },
  clockPlaceholderSub: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },
  posterHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  posterAppTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 2,
  },
  posterTermTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  posterDivider: {
    width: 36,
    height: 2,
    backgroundColor: '#38BDF8',
    marginTop: 6,
    borderRadius: 1,
  },
  daySection: {
    marginBottom: 10,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 3,
  },
  dayTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  dayBadge: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 9,
    padding: 7,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  courseColorBar: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 9,
  },
  courseName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  courseTime: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
  },
  courseDetails: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },
  posterFooter: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  footerNote: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  primaryWallpaperBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryWallpaperBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  gridActionBtn: {
    flex: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  gridActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
  },
});
