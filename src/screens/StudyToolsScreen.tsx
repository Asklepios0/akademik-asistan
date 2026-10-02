import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Share,
  Image,
  Vibration,
} from 'react-native';
import {
  Zap,
  RotateCw,
  Plus,
  Share2,
  FileText,
  CheckCircle2,
  Trash2,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Clock,
  Play,
  Pause,
  Shuffle,
  Camera,
  Layers,
  Sparkles,
  X,
} from 'lucide-react-native';
import { Course, Flashcard, LectureNote } from '../types';
import { StorageService } from '../services/storage';
import { HapticsService } from '../services/hapticsService';

interface StudyToolsScreenProps {
  courses: Course[];
  theme?: 'dark' | 'oled' | 'light';
}

type TabType = 'flashcards' | 'pomodoro' | 'notes';
type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

const POMODORO_TIMES: Record<PomodoroMode, number> = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const CATEGORY_TAGS = ['Tümü', 'Formül', 'Tanım', 'Sınav İpucu', 'Kod'];

export const StudyToolsScreen: React.FC<StudyToolsScreenProps> = ({
  courses,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const isOled = theme === 'oled';
  const [activeTab, setActiveTab] = useState<TabType>('flashcards');

  // ==================== FLASHCARDS STATE ====================
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Tümü');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // New Flashcard Modal State
  const [addCardModal, setAddCardModal] = useState(false);
  const [cardCourseId, setCardCourseId] = useState<string>(courses[0]?.id || '');
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [cardCategory, setCardCategory] = useState('Formül');

  // ==================== POMODORO STATE ====================
  const [pomoMode, setPomoMode] = useState<PomodoroMode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(POMODORO_TIMES.work);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [pomoCourseId, setPomoCourseId] = useState<string>('');
  const timerRef = useRef<any>(null);

  // ==================== NOTES STATE ====================
  const [lectureNotes, setLectureNotes] = useState<LectureNote[]>([]);
  const [notesCourseFilter, setNotesCourseFilter] = useState<string>('all');
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  // Initial Load
  useEffect(() => {
    loadFlashcards();
    loadNotes();
  }, []);

  useEffect(() => {
    if (courses.length > 0 && !cardCourseId) {
      setCardCourseId(courses[0].id);
    }
  }, [courses, cardCourseId]);

  const loadFlashcards = async () => {
    const cards = await StorageService.getFlashcards();
    setFlashcards(cards);
  };

  const loadNotes = async () => {
    const notes = await StorageService.getLectureNotes();
    setLectureNotes(notes);
  };

  // Filtered flashcards
  const filteredCards = flashcards.filter(c => {
    const matchCourse = selectedCourseFilter === 'all' || c.courseId === selectedCourseFilter;
    const matchCategory = selectedCategoryFilter === 'Tümü' || (c.categoryTag || 'Tanım') === selectedCategoryFilter;
    return matchCourse && matchCategory;
  });

  const currentCard = filteredCards[currentCardIndex];

  // Adjust current index if out of range
  useEffect(() => {
    if (currentCardIndex >= filteredCards.length && filteredCards.length > 0) {
      setCurrentCardIndex(filteredCards.length - 1);
    }
    setIsFlipped(false);
  }, [filteredCards.length, selectedCourseFilter, selectedCategoryFilter]);

  // ==================== POMODORO TIMER LOGIC ====================
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, pomoMode]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    HapticsService.success();
    Vibration.vibrate([0, 500, 200, 500]);

    if (pomoMode === 'work') {
      const newCount = completedSessions + 1;
      setCompletedSessions(newCount);
      Alert.alert(
        '🎉 Tebrikler! Odaklanma Tamamlandı',
        '25 dakikalık çalışma seansını başarıyla bitirdin. Şimdi 5 dakikalık hak ettiğin molaya geçebilirsin.',
        [
          {
            text: 'Mola Başlat (5 dk)',
            onPress: () => {
              setPomoMode('shortBreak');
              setTimeLeft(POMODORO_TIMES.shortBreak);
              setIsRunning(true);
            },
          },
          { text: 'Kapat', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(
        '☕ Mola Bitti',
        'Mola süren doldu! Yeni bir çalışma oturumuna hazır mısın?',
        [
          {
            text: 'Çalışmaya Başla',
            onPress: () => {
              setPomoMode('work');
              setTimeLeft(POMODORO_TIMES.work);
              setIsRunning(true);
            },
          },
          { text: 'Tamam', style: 'cancel' },
        ]
      );
    }
  };

  const handleSwitchPomoMode = (mode: PomodoroMode) => {
    HapticsService.light();
    setIsRunning(false);
    setPomoMode(mode);
    setTimeLeft(POMODORO_TIMES[mode]);
  };

  const toggleTimer = () => {
    HapticsService.medium();
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    HapticsService.warning();
    setIsRunning(false);
    setTimeLeft(POMODORO_TIMES[pomoMode]);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==================== FLASHCARD HANDLERS ====================
  const handleSaveCard = async () => {
    if (!cardFront.trim() || !cardBack.trim()) {
      Alert.alert('Eksik Alan', 'Lütfen kartın ön ve arka yüzünü doldurun.');
      return;
    }
    const course = courses.find(c => c.id === cardCourseId);
    await StorageService.saveFlashcard({
      courseId: cardCourseId || (courses[0]?.id ?? 'course_gen'),
      courseName: course ? course.name : 'Genel',
      front: cardFront.trim(),
      back: cardBack.trim(),
      categoryTag: cardCategory,
    });
    setCardFront('');
    setCardBack('');
    setAddCardModal(false);
    loadFlashcards();
    HapticsService.success();
  };

  const handleToggleMastered = async (card: Flashcard) => {
    HapticsService.light();
    await StorageService.toggleFlashcardMastered(card.id);
    loadFlashcards();
  };

  const handleDeleteCard = (card: Flashcard) => {
    Alert.alert(
      'Kartı Sil',
      'Bu bilgi kartını silmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            HapticsService.warning();
            await StorageService.deleteFlashcard(card.id);
            if (currentCardIndex > 0) setCurrentCardIndex(prev => prev - 1);
            loadFlashcards();
          },
        },
      ]
    );
  };

  const handleShuffleCards = () => {
    HapticsService.medium();
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  // ==================== NOTES HANDLERS ====================
  const handleShareNote = async (note: LectureNote) => {
    HapticsService.light();
    let text = `📚 ${note.courseName} - Ders Notu (${note.date})\n\n`;
    if (note.textNotes) {
      text += `📝 Notlar:\n${note.textNotes}\n\n`;
    }
    if (note.summaryPoints && note.summaryPoints.length > 0) {
      text += `📌 Önemli Maddeler:\n` + note.summaryPoints.map(p => `• ${p}`).join('\n') + `\n\n`;
    }
    text += `— Akademik Asistan ile kaydedildi`;

    try {
      await Share.share({
        title: `${note.courseName} Notu`,
        message: text,
      });
    } catch (e) {
      Alert.alert('Paylaşım Hatası', 'Not paylaşılırken bir sorun oluştu.');
    }
  };

  const handleDeleteNote = (note: LectureNote) => {
    Alert.alert(
      'Notu Sil',
      'Bu ders notunu silmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            HapticsService.warning();
            await StorageService.deleteLectureNote(note.id);
            loadNotes();
          },
        },
      ]
    );
  };

  const filteredNotes = lectureNotes.filter(n => {
    if (notesCourseFilter === 'all') return true;
    return n.courseId === notesCourseFilter;
  });

  // Dynamic Theme Colors
  const containerBg = isLight ? '#F8FAFC' : isOled ? '#000000' : '#0F172A';
  const cardBg = isLight ? '#FFFFFF' : isOled ? '#111111' : '#1E293B';
  const cardBorder = isLight ? '#E2E8F0' : isOled ? '#222222' : '#334155';
  const textPrimary = isLight ? '#0F172A' : '#F8FAFC';
  const textSecondary = isLight ? '#64748B' : '#94A3B8';
  const subCardBg = isLight ? '#F1F5F9' : isOled ? '#1A1A1A' : '#0F172A';
  const chipBg = isLight ? '#E2E8F0' : isOled ? '#1E1E1E' : '#334155';
  const inputBg = isLight ? '#F1F5F9' : isOled ? '#181818' : '#0F172A';
  const activeTabColor = isLight ? '#0284C7' : '#38BDF8';

  return (
    <ScrollView style={[styles.container, { backgroundColor: containerBg }]} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Top 3 Navigation Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'flashcards' && [
                styles.tabBtnActive,
                { backgroundColor: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.15)' },
              ],
            ]}
            onPress={() => {
              HapticsService.light();
              setActiveTab('flashcards');
            }}
          >
            <Zap size={15} color={activeTab === 'flashcards' ? activeTabColor : textSecondary} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'flashcards' ? activeTabColor : textSecondary },
              ]}
            >
              Bilgi Kartları
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'pomodoro' && [
                styles.tabBtnActive,
                { backgroundColor: isLight ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.18)' },
              ],
            ]}
            onPress={() => {
              HapticsService.light();
              setActiveTab('pomodoro');
            }}
          >
            <Clock size={15} color={activeTab === 'pomodoro' ? '#EF4444' : textSecondary} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'pomodoro' ? '#EF4444' : textSecondary },
              ]}
            >
              Pomodoro
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'notes' && [
                styles.tabBtnActive,
                { backgroundColor: isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.18)' },
              ],
            ]}
            onPress={() => {
              HapticsService.light();
              setActiveTab('notes');
            }}
          >
            <FileText size={15} color={activeTab === 'notes' ? '#10B981' : textSecondary} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'notes' ? '#10B981' : textSecondary },
              ]}
            >
              Ders Notları ({lectureNotes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================== */}
        {/* TAB 1: FLASHCARDS (BİLGİ KARTLARI)                            */}
        {/* ============================================================== */}
        {activeTab === 'flashcards' && (
          <View>
            {/* Top Bar with Add and Shuffle */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                  Ezber & Bilgi Kartları
                </Text>
                <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
                  {filteredCards.length} kart • {filteredCards.filter(c => c.isMastered).length} öğrenildi
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {flashcards.length > 1 && (
                  <TouchableOpacity
                    style={[styles.smallIconBtn, { backgroundColor: subCardBg, borderColor: cardBorder }]}
                    onPress={handleShuffleCards}
                    accessibilityLabel="Kartları Karıştır"
                  >
                    <Shuffle size={16} color={activeTabColor} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: activeTabColor }]}
                  onPress={() => {
                    HapticsService.light();
                    setAddCardModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>Yeni Kart</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Course Filter Horizontal Scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  { backgroundColor: selectedCourseFilter === 'all' ? activeTabColor : subCardBg, borderColor: cardBorder },
                ]}
                onPress={() => {
                  HapticsService.light();
                  setSelectedCourseFilter('all');
                  setCurrentCardIndex(0);
                }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: selectedCourseFilter === 'all' ? '#FFFFFF' : textSecondary },
                  ]}
                >
                  Tüm Dersler
                </Text>
              </TouchableOpacity>

              {courses.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.filterPill,
                    { backgroundColor: selectedCourseFilter === c.id ? activeTabColor : subCardBg, borderColor: cardBorder },
                  ]}
                  onPress={() => {
                    HapticsService.light();
                    setSelectedCourseFilter(c.id);
                    setCurrentCardIndex(0);
                  }}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: selectedCourseFilter === c.id ? '#FFFFFF' : textSecondary },
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Category Filter Horizontal Scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScroll, { marginTop: 6 }]}>
              {CATEGORY_TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagPill,
                    {
                      backgroundColor: selectedCategoryFilter === tag ? (isLight ? '#0F172A' : '#F8FAFC') : 'transparent',
                      borderColor: cardBorder,
                    },
                  ]}
                  onPress={() => {
                    HapticsService.light();
                    setSelectedCategoryFilter(tag);
                    setCurrentCardIndex(0);
                  }}
                >
                  <Text
                    style={[
                      styles.tagPillText,
                      {
                        color: selectedCategoryFilter === tag ? (isLight ? '#FFFFFF' : '#0F172A') : textSecondary,
                        fontWeight: selectedCategoryFilter === tag ? '700' : '500',
                      },
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Active Card Viewer */}
            {currentCard ? (
              <View style={{ marginTop: 14 }}>
                <TouchableOpacity
                  style={[
                    styles.flashcardBox,
                    {
                      backgroundColor: cardBg,
                      borderColor: isFlipped ? '#10B981' : cardBorder,
                    },
                  ]}
                  onPress={() => {
                    HapticsService.light();
                    setIsFlipped(!isFlipped);
                  }}
                  activeOpacity={0.92}
                >
                  {/* Card Header */}
                  <View style={styles.flashcardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.flashcardCourseName, { color: activeTabColor }]}>
                        {currentCard.courseName}
                      </Text>
                      <View style={[styles.categoryBadge, { backgroundColor: subCardBg }]}>
                        <Text style={[styles.categoryBadgeText, { color: textSecondary }]}>
                          {currentCard.categoryTag || 'Tanım'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDeleteCard(currentCard)}
                      style={{ padding: 4 }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Card Center Content */}
                  <View style={styles.flashcardBody}>
                    <Text style={[styles.sideLabel, { color: isFlipped ? '#10B981' : activeTabColor }]}>
                      {isFlipped ? '💡 CEVAP / AÇIKLAMA' : '❓ SORU / KAVRAM'}
                    </Text>

                    <Text style={[styles.flashcardText, { color: textPrimary }]}>
                      {isFlipped ? currentCard.back : currentCard.front}
                    </Text>

                    <View style={styles.tapHintRow}>
                      <RotateCw size={13} color={textSecondary} />
                      <Text style={[styles.tapHintText, { color: textSecondary }]}>
                        Çevirmek için karta dokunun
                      </Text>
                    </View>
                  </View>

                  {/* Card Footer Status */}
                  <View style={styles.flashcardFooter}>
                    <Text style={[styles.cardCounterText, { color: textSecondary }]}>
                      {currentCardIndex + 1} / {filteredCards.length}
                    </Text>

                    {currentCard.isMastered && (
                      <View style={styles.masteredBadge}>
                        <CheckCircle2 size={13} color="#10B981" />
                        <Text style={styles.masteredBadgeText}>Öğrenildi</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Navigation & Master Controls */}
                <View style={styles.cardControlsRow}>
                  <TouchableOpacity
                    style={[
                      styles.navCardBtn,
                      { backgroundColor: subCardBg, borderColor: cardBorder },
                      currentCardIndex === 0 && { opacity: 0.4 },
                    ]}
                    disabled={currentCardIndex === 0}
                    onPress={() => {
                      HapticsService.light();
                      setIsFlipped(false);
                      setCurrentCardIndex(prev => prev - 1);
                    }}
                  >
                    <ChevronLeft size={18} color={textPrimary} />
                    <Text style={[styles.navCardBtnText, { color: textPrimary }]}>Önceki</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.masterActionBtn,
                      {
                        backgroundColor: currentCard.isMastered
                          ? 'rgba(16, 185, 129, 0.15)'
                          : subCardBg,
                        borderColor: currentCard.isMastered ? '#10B981' : cardBorder,
                      },
                    ]}
                    onPress={() => handleToggleMastered(currentCard)}
                  >
                    <CheckCircle2
                      size={18}
                      color={currentCard.isMastered ? '#10B981' : textSecondary}
                    />
                    <Text
                      style={[
                        styles.masterActionBtnText,
                        { color: currentCard.isMastered ? '#10B981' : textSecondary },
                      ]}
                    >
                      {currentCard.isMastered ? 'Öğrenildi ✅' : 'Öğrendim'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.navCardBtn,
                      { backgroundColor: subCardBg, borderColor: cardBorder },
                      currentCardIndex === filteredCards.length - 1 && { opacity: 0.4 },
                    ]}
                    disabled={currentCardIndex === filteredCards.length - 1}
                    onPress={() => {
                      HapticsService.light();
                      setIsFlipped(false);
                      setCurrentCardIndex(prev => prev + 1);
                    }}
                  >
                    <Text style={[styles.navCardBtnText, { color: textPrimary }]}>Sonraki</Text>
                    <ChevronRight size={18} color={textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.emptyCardBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <BookOpen size={40} color={activeTabColor} />
                <Text style={[styles.emptyCardTitle, { color: textPrimary }]}>
                  {flashcards.length === 0 ? 'Henüz Bilgi Kartı Yok' : 'Filtreye Uygun Kart Bulunamadı'}
                </Text>
                <Text style={[styles.emptyCardDesc, { color: textSecondary }]}>
                  {flashcards.length === 0
                    ? 'Derslerdeki formül, terim veya sınav sorularını ezberlemek için "Yeni Kart" butonuna basarak ilk kartınızı oluşturun.'
                    : 'Farklı bir ders veya kategori seçin veya yeni bir kart ekleyin.'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 2: POMODORO (ODAK SAYACI)                                 */}
        {/* ============================================================== */}
        {activeTab === 'pomodoro' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                  Pomodoro Odak Sayacı
                </Text>
                <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
                  25 dk çalışma ve aralıklı molalar ile zihnini taze tut
                </Text>
              </View>
            </View>

            {/* Mode Switcher Tabs */}
            <View style={[styles.pomoModeRow, { backgroundColor: subCardBg, borderColor: cardBorder }]}>
              <TouchableOpacity
                style={[
                  styles.pomoModeBtn,
                  pomoMode === 'work' && [styles.pomoModeBtnActive, { backgroundColor: '#EF4444' }],
                ]}
                onPress={() => handleSwitchPomoMode('work')}
              >
                <Text
                  style={[
                    styles.pomoModeText,
                    { color: pomoMode === 'work' ? '#FFFFFF' : textSecondary },
                  ]}
                >
                  🍅 Odak (25 dk)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.pomoModeBtn,
                  pomoMode === 'shortBreak' && [styles.pomoModeBtnActive, { backgroundColor: '#10B981' }],
                ]}
                onPress={() => handleSwitchPomoMode('shortBreak')}
              >
                <Text
                  style={[
                    styles.pomoModeText,
                    { color: pomoMode === 'shortBreak' ? '#FFFFFF' : textSecondary },
                  ]}
                >
                  ☕ Kısa Mola (5 dk)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.pomoModeBtn,
                  pomoMode === 'longBreak' && [styles.pomoModeBtnActive, { backgroundColor: '#3B82F6' }],
                ]}
                onPress={() => handleSwitchPomoMode('longBreak')}
              >
                <Text
                  style={[
                    styles.pomoModeText,
                    { color: pomoMode === 'longBreak' ? '#FFFFFF' : textSecondary },
                  ]}
                >
                  🌴 Uzun Mola (15 dk)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Course Selector for Pomodoro */}
            <View style={{ marginTop: 12, marginBottom: 8 }}>
              <Text style={[styles.pomoCourseLabel, { color: textSecondary }]}>
                Çalışılan Ders (İsteğe Bağlı)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <TouchableOpacity
                  style={[
                    styles.pomoCourseChip,
                    {
                      backgroundColor: pomoCourseId === '' ? (isLight ? '#0F172A' : '#F8FAFC') : subCardBg,
                      borderColor: cardBorder,
                    },
                  ]}
                  onPress={() => {
                    HapticsService.light();
                    setPomoCourseId('');
                  }}
                >
                  <Text
                    style={[
                      styles.pomoCourseChipText,
                      { color: pomoCourseId === '' ? (isLight ? '#FFFFFF' : '#0F172A') : textSecondary },
                    ]}
                  >
                    Genel Çalışma
                  </Text>
                </TouchableOpacity>

                {courses.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.pomoCourseChip,
                      {
                        backgroundColor: pomoCourseId === c.id ? activeTabColor : subCardBg,
                        borderColor: cardBorder,
                      },
                    ]}
                    onPress={() => {
                      HapticsService.light();
                      setPomoCourseId(c.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.pomoCourseChipText,
                        { color: pomoCourseId === c.id ? '#FFFFFF' : textSecondary },
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Main Timer Display Box */}
            <View
              style={[
                styles.pomoClockBox,
                {
                  backgroundColor: cardBg,
                  borderColor: isRunning
                    ? pomoMode === 'work'
                      ? '#EF4444'
                      : '#10B981'
                    : cardBorder,
                },
              ]}
            >
              <Text style={[styles.pomoStateHeader, { color: pomoMode === 'work' ? '#EF4444' : '#10B981' }]}>
                {pomoMode === 'work'
                  ? isRunning
                    ? '🔥 Odaklanma Zamanı'
                    : '⏸️ Odaklanmaya Hazır'
                  : '☕ Zihnini Dinlendir'}
              </Text>

              <Text style={[styles.pomoTimerNumber, { color: textPrimary }]}>
                {formatTimer(timeLeft)}
              </Text>

              {/* Progress Indicator */}
              <View style={[styles.progressTrack, { backgroundColor: subCardBg }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${((POMODORO_TIMES[pomoMode] - timeLeft) / POMODORO_TIMES[pomoMode]) * 100}%`,
                      backgroundColor: pomoMode === 'work' ? '#EF4444' : '#10B981',
                    },
                  ]}
                />
              </View>

              {/* Timer Controls */}
              <View style={styles.pomoControlsRow}>
                <TouchableOpacity
                  style={[
                    styles.pomoMainBtn,
                    { backgroundColor: isRunning ? '#F59E0B' : pomoMode === 'work' ? '#EF4444' : '#10B981' },
                  ]}
                  onPress={toggleTimer}
                  activeOpacity={0.8}
                >
                  {isRunning ? <Pause size={20} color="#FFFFFF" /> : <Play size={20} color="#FFFFFF" />}
                  <Text style={styles.pomoMainBtnText}>
                    {isRunning ? 'Duraklat' : 'Başlat'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pomoResetBtn, { backgroundColor: subCardBg, borderColor: cardBorder }]}
                  onPress={resetTimer}
                  activeOpacity={0.7}
                >
                  <RotateCw size={18} color={textSecondary} />
                  <Text style={[styles.pomoResetBtnText, { color: textSecondary }]}>Sıfırla</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats Card */}
            <View style={[styles.pomoStatsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.pomoStatCol}>
                <Text style={[styles.pomoStatNum, { color: '#EF4444' }]}>{completedSessions}</Text>
                <Text style={[styles.pomoStatLbl, { color: textSecondary }]}>Tamamlanan Seans</Text>
              </View>

              <View style={[styles.pomoStatDivider, { backgroundColor: cardBorder }]} />

              <View style={styles.pomoStatCol}>
                <Text style={[styles.pomoStatNum, { color: activeTabColor }]}>
                  {completedSessions * 25} dk
                </Text>
                <Text style={[styles.pomoStatLbl, { color: textSecondary }]}>Toplam Odaklanma</Text>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 3: NOTES & VISUAL ARCHIVE                                 */}
        {/* ============================================================== */}
        {activeTab === 'notes' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                  Ders Notları & Görsel Arşiv
                </Text>
                <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
                  Ders esnasında aldığın notlar ve tahta fotoğrafları
                </Text>
              </View>
            </View>

            {/* Course Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  { backgroundColor: notesCourseFilter === 'all' ? activeTabColor : subCardBg, borderColor: cardBorder },
                ]}
                onPress={() => {
                  HapticsService.light();
                  setNotesCourseFilter('all');
                }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: notesCourseFilter === 'all' ? '#FFFFFF' : textSecondary },
                  ]}
                >
                  Tümü ({lectureNotes.length})
                </Text>
              </TouchableOpacity>

              {courses.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.filterPill,
                    { backgroundColor: notesCourseFilter === c.id ? activeTabColor : subCardBg, borderColor: cardBorder },
                  ]}
                  onPress={() => {
                    HapticsService.light();
                    setNotesCourseFilter(c.id);
                  }}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: notesCourseFilter === c.id ? '#FFFFFF' : textSecondary },
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* List of Notes */}
            {filteredNotes.map(note => {
              const hasPhotos = note.imageUris && note.imageUris.length > 0;

              return (
                <View
                  key={note.id}
                  style={[
                    styles.noteCard,
                    { backgroundColor: cardBg, borderColor: cardBorder },
                  ]}
                >
                  {/* Note Header */}
                  <View style={styles.noteHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.noteCourseTitle, { color: textPrimary }]}>
                        {note.courseName}
                      </Text>
                      <Text style={[styles.noteDateText, { color: textSecondary }]}>
                        📅 {note.date}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.noteActionIconBtn, { backgroundColor: subCardBg }]}
                        onPress={() => handleShareNote(note)}
                        accessibilityLabel="Notu Paylaş"
                      >
                        <Share2 size={15} color={activeTabColor} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.noteActionIconBtn, { backgroundColor: subCardBg }]}
                        onPress={() => handleDeleteNote(note)}
                        accessibilityLabel="Notu Sil"
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Summary / Bullet points */}
                  {note.summaryPoints && note.summaryPoints.length > 0 && (
                    <View style={[styles.summaryBox, { backgroundColor: subCardBg }]}>
                      {note.summaryPoints.map((point, idx) => (
                        <View key={idx} style={styles.bulletRow}>
                          <Text style={{ color: activeTabColor, marginRight: 6 }}>•</Text>
                          <Text style={[styles.bulletText, { color: textPrimary }]}>{point}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Text Notes */}
                  {note.textNotes ? (
                    <Text style={[styles.noteBodyText, { color: textPrimary }]} numberOfLines={5}>
                      {note.textNotes}
                    </Text>
                  ) : null}

                  {/* Photo Thumbnails */}
                  {hasPhotos && (
                    <View style={{ marginTop: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                        <Camera size={13} color={activeTabColor} />
                        <Text style={[styles.photoLabel, { color: textSecondary }]}>
                          Ekli Fotoğraflar ({note.imageUris?.length})
                        </Text>
                      </View>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                        {note.imageUris?.map((uri, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.thumbnailWrapper}
                            onPress={() => setPreviewImageUri(uri)}
                            activeOpacity={0.8}
                          >
                            <Image source={{ uri }} style={styles.thumbnailImg} resizeMode="cover" />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              );
            })}

            {filteredNotes.length === 0 && (
              <View style={[styles.emptyCardBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <FileText size={40} color={activeTabColor} />
                <Text style={[styles.emptyCardTitle, { color: textPrimary }]}>
                  {lectureNotes.length === 0 ? 'Henüz Ders Notu Kaydedilmedi' : 'Filtreye Uygun Not Yok'}
                </Text>
                <Text style={[styles.emptyCardDesc, { color: textSecondary }]}>
                  Günün Akışı ekranından "✅ Derse Girdim" butonuna basarak derste aldığınız notları veya sağ üstteki kamera butonu ile tahta fotoğraflarını kaydedebilirsiniz.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </View>

      {/* ============================================================== */}
      {/* MODAL: YENİ FLAŞ KART EKLE                                     */}
      {/* ============================================================== */}
      <Modal visible={addCardModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Yeni Bilgi Kartı</Text>
              <TouchableOpacity onPress={() => setAddCardModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Course Picker */}
            <Text style={[styles.modalLabel, { color: textSecondary }]}>İlgili Ders</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {courses.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.modalCoursePill,
                    {
                      backgroundColor: cardCourseId === c.id ? activeTabColor : inputBg,
                      borderColor: cardBorder,
                    },
                  ]}
                  onPress={() => {
                    HapticsService.light();
                    setCardCourseId(c.id);
                  }}
                >
                  <Text
                    style={[
                      styles.modalCoursePillText,
                      { color: cardCourseId === c.id ? '#FFFFFF' : textPrimary },
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Category Tag Selector */}
            <Text style={[styles.modalLabel, { color: textSecondary }]}>Kategori</Text>
            <View style={styles.categoryPillsRow}>
              {['Formül', 'Tanım', 'Sınav İpucu', 'Kod'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.modalCatPill,
                    {
                      backgroundColor: cardCategory === cat ? activeTabColor : inputBg,
                      borderColor: cardBorder,
                    },
                  ]}
                  onPress={() => {
                    HapticsService.light();
                    setCardCategory(cat);
                  }}
                >
                  <Text
                    style={[
                      styles.modalCatPillText,
                      { color: cardCategory === cat ? '#FFFFFF' : textPrimary },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Front Input */}
            <Text style={[styles.modalLabel, { color: textSecondary }]}>
              Ön Yüz (Soru / Formül / Terim)
            </Text>
            <TextInput
              style={[
                styles.modalTextInput,
                styles.modalTextArea,
                { backgroundColor: inputBg, borderColor: cardBorder, color: textPrimary },
              ]}
              value={cardFront}
              onChangeText={setCardFront}
              placeholder="Örn: Newton'un İkinci Hareket Yasası formülü nedir?"
              placeholderTextColor={textSecondary}
              multiline
            />

            {/* Back Input */}
            <Text style={[styles.modalLabel, { color: textSecondary }]}>
              Arka Yüz (Cevap / Tanım / Açıklama)
            </Text>
            <TextInput
              style={[
                styles.modalTextInput,
                styles.modalTextArea,
                { backgroundColor: inputBg, borderColor: cardBorder, color: textPrimary },
              ]}
              value={cardBack}
              onChangeText={setCardBack}
              placeholder="Örn: F = m * a (Kuvvet = Kütle x İvme)"
              placeholderTextColor={textSecondary}
              multiline
            />

            {/* Submit */}
            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: activeTabColor }]}
              onPress={handleSaveCard}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSubmitBtnText}>Kartı Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: IMAGE FULLSCREEN PREVIEW                                */}
      {/* ============================================================== */}
      <Modal visible={!!previewImageUri} transparent animationType="fade">
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity
            style={styles.closePreviewBtn}
            onPress={() => setPreviewImageUri(null)}
          >
            <X size={26} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImageUri && (
            <Image
              source={{ uri: previewImageUri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabBtnActive: {
    borderRadius: 10,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  smallIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
  },
  tagPillText: {
    fontSize: 11,
  },
  flashcardBox: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    minHeight: 230,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  flashcardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flashcardCourseName: {
    fontSize: 13,
    fontWeight: '800',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  flashcardBody: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  sideLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  flashcardText: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 25,
    paddingHorizontal: 10,
  },
  tapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
  },
  tapHintText: {
    fontSize: 11,
  },
  flashcardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardCounterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  masteredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  masteredBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  cardControlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  navCardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  navCardBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  masterActionBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  masterActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCardBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyCardDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  pomoModeRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    marginBottom: 8,
  },
  pomoModeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  pomoModeBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  pomoModeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pomoCourseLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  pomoCourseChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  pomoCourseChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pomoClockBox: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  pomoStateHeader: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  pomoTimerNumber: {
    fontSize: 56,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  pomoControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  pomoMainBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  pomoMainBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  pomoResetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pomoResetBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pomoStatsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  pomoStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  pomoStatNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  pomoStatLbl: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  pomoStatDivider: {
    width: 1,
    height: 32,
  },
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteCourseTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  noteDateText: {
    fontSize: 11,
    marginTop: 2,
  },
  noteActionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBox: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  noteBodyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  photoLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  thumbnailWrapper: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 6,
  },
  modalCoursePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  modalCoursePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  modalCatPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCatPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalTextInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 8,
  },
  modalTextArea: {
    height: 64,
    textAlignVertical: 'top',
  },
  modalSubmitBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePreviewBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 6,
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
});
