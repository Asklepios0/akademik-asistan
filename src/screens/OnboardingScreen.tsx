import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import {
  GraduationCap,
  LayoutGrid,
  Zap,
  Award,
  Calendar,
  CalendarDays,
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  BookOpen,
} from 'lucide-react-native';
import { HapticsService } from '../services/hapticsService';
import { CalendarDatePickerModal } from '../components/CalendarDatePickerModal';

interface OnboardingScreenProps {
  onFinish: (semesterStartDate?: string) => void;
  theme?: 'dark' | 'oled' | 'light';
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onFinish,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const isOled = theme === 'oled';
  const [currentSlide, setCurrentSlide] = useState(0);
  const [semesterDateInput, setSemesterDateInput] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const slides = [
    {
      icon: <GraduationCap size={44} color={isLight ? '#0284C7' : '#38BDF8'} />,
      tag: 'YENİ NESİL ÜNİVERSİTE ASİSTANI',
      title: 'Akademik Asistan’a\nHoş Geldiniz!',
      desc: 'Haftalık ders programınız, amfi ve sınıf bilgileriniz, devamsızlık sayacınız ve sınav takviminiz; %100 çevrimdışı, reklamsız ve güvenli.',
      color: isLight ? '#0284C7' : '#38BDF8',
      highlights: [
        '📅 Günlük & Haftalık Ders Akışı',
        '📍 Amfi, Derslik & Hoca Bilgisi',
        '📱 Kilit Ekranı İçin Ders Çizelgesi Posteri',
      ],
    },
    {
      icon: <LayoutGrid size={44} color={isLight ? '#4F46E5' : '#818CF8'} />,
      tag: 'YENİ ÖZELLİK: HAFTALIK MATRİS',
      title: 'Haftalık Pano ile\nTüm Dönem Tek Bakışta',
      desc: 'Pazartesi’den Pazar’a tüm haftayı yan yana kaydırılabilir matris panoda görüntüleyin. Tek dokunuşla tüm programınızı arkadaşlarınızla paylaşın.',
      color: isLight ? '#4F46E5' : '#818CF8',
      highlights: [
        '📊 7 Günlük Yatay Kaydırılabilir Pano',
        '✨ Tek Tıkla WhatsApp & Metin Paylaşımı',
        '📖 14 Haftalık Müfredat ve Konu Takibi',
      ],
    },
    {
      icon: <Zap size={44} color={isLight ? '#059669' : '#10B981'} />,
      tag: 'ANLIK AKIŞ & AKILLI MOD',
      title: 'Ders Erken mi Bitti?\nTek Tuşla Tamamla!',
      desc: 'O an devam eden dersinize odaklanın. Hoca dersi erken bıraktığında "Ders Bitti" butonuna dokunun; akış hemen sıradaki derse geçsin ve yoklama işlensin.',
      color: isLight ? '#059669' : '#10B981',
      highlights: [
        '⚡ Erken Bitti Butonu (Anında Akışı Güncelle)',
        '🎯 Canlı Ders İçi Odak Modu',
        '⏰ Kalan Süre & Sıradaki Ders Sayacı',
      ],
    },
    {
      icon: <Award size={44} color={isLight ? '#7C3AED' : '#A855F7'} />,
      tag: 'SINAVLAR & DEVAMSIZLIK',
      title: 'Harf Notları, GNO ve\nDevamsızlık Sınır Uyarısı',
      desc: 'Vize (%40), Final (%60) ve Bütünleme notlarınızı girin; 4.00 üzerinden ortalamanızı anında görün. 4 haftalık devamsızlık sınırına yaklaştığınızda akıllı uyarı alın.',
      color: isLight ? '#7C3AED' : '#A855F7',
      highlights: [
        '🎓 Otomatik GNO & Harf Notu (AA, BA, CC..)',
        '⚠️ 4 Hafta Devamsızlık Sınır Alarmı',
        '🎯 Hedef Harf İçin Kaç Almalıyım? Hesabı',
      ],
    },
    {
      icon: <Calendar size={44} color={isLight ? '#D97706' : '#F59E0B'} />,
      tag: 'AKILLI BİLDİRİM & ÇALIŞMA ODASI',
      title: 'Dersleriniz Ne Zaman\nBaşlıyor?',
      desc: 'Dönem başlangıç tarihinizi takvimden seçin; tatil haftalarında gereksiz alarm çalmasını önleyin. Pomodoro sayacı ve ders bilgi kartlarıyla çalışma odanızda hedeflerinize odaklanın.',
      color: isLight ? '#D97706' : '#F59E0B',
      highlights: [
        '⏱️ 25/5 dk Pomodoro Odak Zamanlayıcısı',
        '🃏 Ders Bilgi Kartları (Flashcards)',
        '🔕 Tatilde Otomatik Sessiz Bildirim Koruması',
      ],
      isDatePickerSlide: true,
    },
  ];

  const handleNext = () => {
    HapticsService.light();
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    HapticsService.light();
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    HapticsService.selection();
    onFinish();
  };

  const handleComplete = () => {
    HapticsService.success();
    const cleanDate = semesterDateInput.trim();
    onFinish(cleanDate || undefined);
  };

  const slide = slides[currentSlide];
  const bgStyle = isLight
    ? styles.containerLight
    : isOled
    ? styles.containerOled
    : styles.container;

  return (
    <SafeAreaView style={[styles.container, bgStyle]}>
      <StatusBar
        barStyle={isLight ? 'dark-content' : 'light-content'}
        backgroundColor={isLight ? '#F8FAFC' : isOled ? '#000000' : '#0F172A'}
      />

      {/* Top Bar with Brand, Step Counter & Skip Button */}
      <View style={styles.topBar}>
        <View style={styles.brandBox}>
          <GraduationCap size={20} color={isLight ? '#0284C7' : '#38BDF8'} />
          <Text style={[styles.brandText, isLight && styles.brandTextLight]}>
            AKADEMİK ASİSTAN
          </Text>
        </View>

        <View style={styles.topRightRow}>
          <View style={[styles.stepBadge, isLight && styles.stepBadgeLight]}>
            <Text style={[styles.stepBadgeText, isLight && styles.stepBadgeTextLight]}>
              {currentSlide + 1} / {slides.length}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.skipBtn, isLight && styles.skipBtnLight]}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipBtnText, isLight && styles.skipBtnTextLight]}>
              Tanıtımı Atla
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Slide Card Container */}
      <ScrollView
        contentContainerStyle={styles.slideScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.slideContainer}>
          {/* Glowing Multi-layer Icon Halo */}
          <View
            style={[
              styles.iconHalo,
              {
                backgroundColor: `${slide.color}15`,
                borderColor: `${slide.color}35`,
              },
            ]}
          >
            <View
              style={[
                styles.iconCore,
                {
                  backgroundColor: `${slide.color}25`,
                },
              ]}
            >
              {slide.icon}
            </View>
          </View>

          {/* Tag Badge */}
          <View style={[styles.tagBadge, { backgroundColor: `${slide.color}18` }]}>
            <Sparkles size={12} color={slide.color} style={{ marginRight: 5 }} />
            <Text style={[styles.tagText, { color: slide.color }]}>{slide.tag}</Text>
          </View>

          {/* Title & Description */}
          <Text style={[styles.slideTitle, isLight && styles.slideTitleLight]}>
            {slide.title}
          </Text>
          <Text style={[styles.slideDesc, isLight && styles.slideDescLight]}>
            {slide.desc}
          </Text>

          {/* Feature Highlights Pills */}
          <View style={styles.highlightsContainer}>
            {slide.highlights.map((item, idx) => (
              <View
                key={idx}
                style={[styles.highlightPill, isLight && styles.highlightPillLight]}
              >
                <Text
                  style={[
                    styles.highlightPillText,
                    isLight && styles.highlightPillTextLight,
                  ]}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>

          {/* Date Picker Button on Slide 5 */}
          {slide.isDatePickerSlide && (
            <View style={[styles.datePickerSection, isLight && styles.datePickerSectionLight]}>
              <Text
                style={[
                  styles.datePickerLabel,
                  isLight && styles.datePickerLabelLight,
                ]}
              >
                Dönem Başlangıç Tarihi (İsteğe Bağlı):
              </Text>
              <TouchableOpacity
                style={[styles.datePickerBtn, isLight && styles.datePickerBtnLight]}
                onPress={() => setDatePickerVisible(true)}
                activeOpacity={0.8}
              >
                <CalendarDays size={18} color={isLight ? '#D97706' : '#F59E0B'} />
                <Text
                  style={[
                    styles.datePickerBtnText,
                    isLight && styles.datePickerBtnTextLight,
                  ]}
                >
                  {semesterDateInput
                    ? `📅 Başlangıç: ${semesterDateInput}`
                    : 'Takvimden Tarih Seçin'}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.dateInputHint, isLight && styles.dateInputHintLight]}>
                {semesterDateInput
                  ? '✅ Bu tarihe kadar haftalık ders alarmları otomatik olarak sessizde tutulacaktır.'
                  : 'Belirttiğiniz tarihe kadar haftalık ders bildirimleri sessizde tutulur. İstediğiniz zaman Ayarlar’dan güncelleyebilirsiniz.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer: Pagination Dots & Navigation */}
      <View style={[styles.footer, isLight && styles.footerLight]}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {slides.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                isLight && styles.dotLight,
                currentSlide === idx && (isLight ? styles.dotActiveLight : styles.dotActive),
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          {currentSlide > 0 ? (
            <TouchableOpacity
              style={[styles.prevBtn, isLight && styles.prevBtnLight]}
              onPress={handlePrev}
              activeOpacity={0.7}
            >
              <ChevronLeft size={18} color={isLight ? '#475569' : '#94A3B8'} />
              <Text style={[styles.prevBtnText, isLight && styles.prevBtnTextLight]}>
                Geri
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}

          <TouchableOpacity
            style={[styles.nextBtn, isLight && styles.nextBtnLight]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={[styles.nextBtnText, isLight && styles.nextBtnTextLight]}>
              {currentSlide === slides.length - 1 ? 'Uygulamaya Başla' : 'Devam Et'}
            </Text>
            {currentSlide === slides.length - 1 ? (
              <CheckCircle2 size={18} color={isLight ? '#FFFFFF' : '#0F172A'} />
            ) : (
              <ChevronRight size={18} color={isLight ? '#FFFFFF' : '#0F172A'} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendar Date Picker Modal */}
      <CalendarDatePickerModal
        visible={datePickerVisible}
        initialDate={semesterDateInput}
        title="Dönem Başlangıç Tarihi"
        subtitle="Ders alarmları bu tarihe kadar sessizde tutulur."
        onSelectDate={date => setSemesterDateInput(date)}
        onClearDate={() => setSemesterDateInput('')}
        onClose={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
  },
  containerLight: {
    backgroundColor: '#F8FAFC',
  },
  containerOled: {
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  brandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  brandTextLight: {
    color: '#0284C7',
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  stepBadgeLight: {
    backgroundColor: '#F1F5F9',
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  stepBadgeTextLight: {
    color: '#64748B',
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skipBtnLight: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  skipBtnTextLight: {
    color: '#64748B',
  },
  slideScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  slideContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 20,
  },
  iconCore: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  slideTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
    lineHeight: 31,
    marginBottom: 12,
  },
  slideTitleLight: {
    color: '#0F172A',
  },
  slideDesc: {
    fontSize: 13.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 340,
    marginBottom: 20,
  },
  slideDescLight: {
    color: '#475569',
  },
  highlightsContainer: {
    width: '100%',
    maxWidth: 340,
    gap: 8,
    marginBottom: 12,
  },
  highlightPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  highlightPillLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  highlightPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    textAlign: 'center',
  },
  highlightPillTextLight: {
    color: '#334155',
  },
  datePickerSection: {
    width: '100%',
    maxWidth: 340,
    marginTop: 10,
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  datePickerSectionLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FDE68A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  datePickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  datePickerLabelLight: {
    color: '#0F172A',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  datePickerBtnLight: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  datePickerBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F59E0B',
  },
  datePickerBtnTextLight: {
    color: '#B45309',
  },
  dateInputHint: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 15,
  },
  dateInputHintLight: {
    color: '#64748B',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  footerLight: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotLight: {
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 26,
    backgroundColor: '#38BDF8',
  },
  dotActiveLight: {
    width: 26,
    backgroundColor: '#0284C7',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  prevBtnLight: {
    backgroundColor: '#F1F5F9',
  },
  prevBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  prevBtnTextLight: {
    color: '#475569',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 14,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnLight: {
    backgroundColor: '#0284C7',
    shadowColor: '#0284C7',
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  nextBtnTextLight: {
    color: '#FFFFFF',
  },
});
