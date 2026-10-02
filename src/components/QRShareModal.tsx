import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { QrCode, Copy, Upload, X, CheckCircle2, Sparkles, Share2 } from 'lucide-react-native';
import { Course } from '../types';
import { QRCodeService } from '../services/qrCodeService';
import { HapticsService } from '../services/hapticsService';

interface QRShareModalProps {
  visible: boolean;
  courses: Course[];
  theme?: 'dark' | 'oled' | 'light';
  onClose: () => void;
  onImportCourses: (importedCourses: Course[]) => void;
}

export const QRShareModal: React.FC<QRShareModalProps> = ({
  visible,
  courses,
  theme = 'dark',
  onClose,
  onImportCourses,
}) => {
  const isLight = theme === 'light';
  const isOled = theme === 'oled';
  const [activeTab, setActiveTab] = useState<'share' | 'import'>('share');
  const [importCode, setImportCode] = useState('');

  const qrPayload = useMemo(() => {
    return QRCodeService.serializeCourses(courses);
  }, [courses]);

  const qrMatrix = useMemo(() => {
    return QRCodeService.generateMatrix(qrPayload, 25);
  }, [qrPayload]);

  const handleCopyCode = async () => {
    HapticsService.light();
    try {
      await Share.share({
        title: 'Akademik Asistan - Ders Programı Paylaşım Kodu',
        message: qrPayload,
      });
    } catch (e) {
      // Ignored
    }
  };

  const handleExecuteImport = () => {
    if (!importCode.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen arkadaşınızdan aldığınız program kodunu yapıştırın.');
      return;
    }

    const res = QRCodeService.deserializeCourses(importCode.trim());
    if (res.success && res.courses) {
      HapticsService.success();
      onImportCourses(res.courses);
      setImportCode('');
      onClose();
      Alert.alert('Tebrikler 🎉', res.message);
    } else {
      HapticsService.error();
      Alert.alert('Hata', res.message);
    }
  };

  const svgSize = 220;
  const moduleSize = svgSize / qrMatrix.length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, isLight && styles.containerLight, isOled && styles.containerOled]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <QrCode size={20} color={isLight ? '#0284C7' : '#38BDF8'} />
              <Text style={[styles.title, isLight && styles.titleLight]}>Hızlı Program Paylaşımı</Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, isLight && styles.closeBtnLight]} onPress={onClose}>
              <X size={18} color={isLight ? '#64748B' : '#94A3B8'} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, isLight && styles.tabBtnLight, activeTab === 'share' && styles.tabBtnActive]}
              onPress={() => setActiveTab('share')}
            >
              <Share2 size={14} color={activeTab === 'share' ? '#FFFFFF' : (isLight ? '#64748B' : '#94A3B8')} />
              <Text style={[styles.tabBtnText, isLight && styles.tabBtnTextLight, activeTab === 'share' && styles.tabBtnTextActive]}>
                Karekod Göster
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, isLight && styles.tabBtnLight, activeTab === 'import' && styles.tabBtnActive]}
              onPress={() => setActiveTab('import')}
            >
              <Upload size={14} color={activeTab === 'import' ? '#FFFFFF' : (isLight ? '#64748B' : '#94A3B8')} />
              <Text style={[styles.tabBtnText, isLight && styles.tabBtnTextLight, activeTab === 'import' && styles.tabBtnTextActive]}>
                Kod İle İçe Aktar
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {activeTab === 'share' ? (
              <View style={styles.shareCenter}>
                <Text style={[styles.instructionText, isLight && styles.instructionTextLight]}>
                  Arkadaşınız veya sınıf temsilciniz bu karekodu taratarak ya da aşağıdaki kodu kopyalayarak programınızı tek dokunuşla alabilir:
                </Text>

                {/* QR Code Canvas */}
                <View style={styles.qrCard}>
                  <Svg width={svgSize} height={svgSize}>
                    <Rect x={0} y={0} width={svgSize} height={svgSize} fill="#FFFFFF" />
                    {qrMatrix.map((row, rIdx) =>
                      row.map((isDark, cIdx) =>
                        isDark ? (
                          <Rect
                            key={`${rIdx}-${cIdx}`}
                            x={cIdx * moduleSize}
                            y={rIdx * moduleSize}
                            width={moduleSize}
                            height={moduleSize}
                            fill="#0F172A"
                          />
                        ) : null
                      )
                    )}
                  </Svg>
                </View>

                <View style={styles.badgeRow}>
                  <Sparkles size={14} color="#10B981" />
                  <Text style={styles.badgeText}>
                    {courses.length} Ders Dahil Edildi • %100 Çevrimdışı
                  </Text>
                </View>

                <TouchableOpacity style={styles.actionBtn} onPress={handleCopyCode}>
                  <Copy size={16} color="#0F172A" />
                  <Text style={styles.actionBtnText}>Kodu Paylaş / Kopyala</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.importContainer}>
                <Text style={[styles.instructionText, isLight && styles.instructionTextLight]}>
                  Arkadaşınızdan WhatsApp veya mesajla aldığınız program kodunu yapıştırarak tüm dersleri anında kendi programınıza aktarın:
                </Text>

                <TextInput
                  style={[styles.codeInput, isLight && styles.codeInputLight]}
                  placeholder='AKDMK:v1:[{"n":"Fizik","s":"09:00"...}]'
                  placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                  value={importCode}
                  onChangeText={setImportCode}
                  multiline
                  numberOfLines={6}
                />

                <TouchableOpacity style={styles.actionBtn} onPress={handleExecuteImport}>
                  <CheckCircle2 size={16} color="#0F172A" />
                  <Text style={styles.actionBtnText}>Dersleri Programa Yükle</Text>
                </TouchableOpacity>
              </View>
            )}
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
    maxHeight: '90%',
    paddingTop: 18,
    paddingBottom: 24,
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  instructionText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  shareCenter: {
    alignItems: 'center',
  },
  qrCard: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  actionBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  importContainer: {
    alignItems: 'center',
  },
  codeInput: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 11,
    height: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  containerLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  containerOled: {
    backgroundColor: '#0A0A0A',
    borderColor: '#222222',
  },
  titleLight: {
    color: '#0F172A',
  },
  closeBtnLight: {
    backgroundColor: '#F1F5F9',
  },
  tabBtnLight: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  tabBtnTextLight: {
    color: '#64748B',
  },
  instructionTextLight: {
    color: '#475569',
  },
  codeInputLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    color: '#0F172A',
  },
});
