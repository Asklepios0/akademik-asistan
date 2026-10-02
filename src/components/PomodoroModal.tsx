import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  BookOpen,
  X,
  Award,
  Sparkles,
  Coffee,
} from 'lucide-react-native';
import { Course } from '../types';
import {
  PomodoroService,
  PomodoroMode,
  DEFAULT_POMODORO_CONFIG,
} from '../services/pomodoroService';
import { HapticsService } from '../services/hapticsService';

interface PomodoroModalProps {
  visible: boolean;
  courses: Course[];
  initialCourse?: Course | null;
  theme?: 'dark' | 'oled' | 'light';
  onClose: () => void;
}

export const PomodoroModal: React.FC<PomodoroModalProps> = ({
  visible,
  courses,
  initialCourse,
  theme = 'dark',
  onClose,
}) => {
  const isLight = theme === 'light';
  const isOled = theme === 'oled';
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(
    initialCourse || courses[0] || null
  );
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [topic, setTopic] = useState('');
  const [quote, setQuote] = useState(PomodoroService.getRandomQuote());
  const [weeklyStats, setWeeklyStats] = useState<{ totalHours: string; sessionCount: number }>({
    totalHours: '0.0',
    sessionCount: 0,
  });

  // Timer State
  const initialSeconds =
    mode === 'focus'
      ? DEFAULT_POMODORO_CONFIG.focusMinutes * 60
      : mode === 'short_break'
      ? DEFAULT_POMODORO_CONFIG.shortBreakMinutes * 60
      : DEFAULT_POMODORO_CONFIG.longBreakMinutes * 60;

  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      loadStats();
      setQuote(PomodoroService.getRandomQuote());
      if (initialCourse) {
        setSelectedCourse(initialCourse);
      } else if (courses.length > 0 && !selectedCourse) {
        setSelectedCourse(courses[0]);
      }
    }
  }, [visible, initialCourse, courses]);

  const loadStats = async () => {
    const report = await PomodoroService.getWeeklyReport();
    setWeeklyStats({
      totalHours: report.totalHours,
      sessionCount: report.sessionCount,
    });
  };

  // Switch modes
  const handleSwitchMode = (newMode: PomodoroMode) => {
    HapticsService.selection();
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setMode(newMode);
    const secs =
      newMode === 'focus'
        ? DEFAULT_POMODORO_CONFIG.focusMinutes * 60
        : newMode === 'short_break'
        ? DEFAULT_POMODORO_CONFIG.shortBreakMinutes * 60
        : DEFAULT_POMODORO_CONFIG.longBreakMinutes * 60;
    setTimeLeft(secs);
  };

  // Timer Tick Effect
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsActive(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, mode]);

  const handleTimerComplete = async () => {
    HapticsService.success();
    if (mode === 'focus') {
      await PomodoroService.completeSession(
        selectedCourse,
        DEFAULT_POMODORO_CONFIG.focusMinutes,
        topic,
        'focus'
      );
      loadStats();
      Alert.alert(
        '🎉 Harika İş Çıkardın!',
        `25 dakikalık odaklanma seansını başarıyla tamamladın. Şimdi 5 dakikalık bir kahve/mola zamanı!`,
        [
          {
            text: 'Molaya Başla (5 dk)',
            onPress: () => handleSwitchMode('short_break'),
          },
          { text: 'Tamam', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert('☕ Mola Bitti!', 'Mola süren doldu. Yeni bir odak seansına hazır mısın?', [
        {
          text: 'Odaklanmaya Başla (25 dk)',
          onPress: () => handleSwitchMode('focus'),
        },
        { text: 'Kapat', style: 'cancel' },
      ]);
    }
  };

  const toggleTimer = () => {
    HapticsService.medium();
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    HapticsService.selection();
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const secs =
      mode === 'focus'
        ? DEFAULT_POMODORO_CONFIG.focusMinutes * 60
        : mode === 'short_break'
        ? DEFAULT_POMODORO_CONFIG.shortBreakMinutes * 60
        : DEFAULT_POMODORO_CONFIG.longBreakMinutes * 60;
    setTimeLeft(secs);
  };

  const formattedTime = PomodoroService.formatTime(timeLeft);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalBox, isLight && styles.modalBoxLight, isOled && styles.modalBoxOled]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Clock size={20} color={isLight ? '#0284C7' : '#38BDF8'} />
              <Text style={[styles.title, isLight && { color: '#0F172A' }]}>Ders & Odak Motoru</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={isLight ? '#64748B' : '#94A3B8'} />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={[styles.modeTabs, isLight && styles.modeTabsLight]}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'focus' && styles.modeTabActive]}
              onPress={() => handleSwitchMode('focus')}
            >
              <Text style={[styles.modeTabText, mode === 'focus' && styles.modeTabTextActive]}>
                🎯 25 dk Odak
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'short_break' && styles.modeTabActive]}
              onPress={() => handleSwitchMode('short_break')}
            >
              <Text style={[styles.modeTabText, mode === 'short_break' && styles.modeTabTextActive]}>
                ☕ 5 dk Mola
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'long_break' && styles.modeTabActive]}
              onPress={() => handleSwitchMode('long_break')}
            >
              <Text style={[styles.modeTabText, mode === 'long_break' && styles.modeTabTextActive]}>
                🛋️ 15 dk Dinlenme
              </Text>
            </TouchableOpacity>
          </View>

          {/* Course Selector (If mode is focus) */}
          {mode === 'focus' && (
            <View style={styles.courseSelectSection}>
              <Text style={[styles.sectionSub, isLight && { color: '#64748B' }]}>Hangi Derse Odaklanıyorsun?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseScroll}>
                {courses.map(c => {
                  const isSelected = selectedCourse?.id === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.coursePill,
                        isLight && styles.coursePillLight,
                        isSelected && { borderColor: c.color, backgroundColor: isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.15)' },
                      ]}
                      onPress={() => {
                        HapticsService.selection();
                        setSelectedCourse(c);
                      }}
                    >
                      <View style={[styles.colorDot, { backgroundColor: c.color }]} />
                      <Text style={[styles.coursePillText, isLight && { color: '#334155' }, isSelected && { color: isLight ? '#0284C7' : '#F8FAFC', fontWeight: '800' }]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TextInput
                style={[styles.topicInput, isLight && styles.topicInputLight]}
                placeholder="Çalışılacak Konu (örn. 5. Hafta İntegral Formülleri)"
                placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                value={topic}
                onChangeText={setTopic}
              />
            </View>
          )}

          {/* Big Circular Styled Timer Display */}
          <View style={[styles.timerCircleBox, isLight && styles.timerCircleBoxLight]}>
            <Text style={[styles.timerText, isLight && { color: '#0284C7' }]}>{formattedTime}</Text>
            <Text style={[styles.timerSubtitle, isLight && { color: '#64748B' }]}>
              {mode === 'focus'
                ? selectedCourse?.name || 'Odaklanma Seansı'
                : 'Zihnini Dinlendir'}
            </Text>
          </View>

          {/* Controls: Play/Pause, Reset */}
          <View style={styles.controlsRow}>
            <TouchableOpacity style={[styles.controlResetBtn, isLight && styles.controlResetBtnLight]} onPress={resetTimer}>
              <RotateCcw size={20} color={isLight ? '#475569' : '#94A3B8'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlPlayBtn, isActive && styles.controlPauseBtn]}
              onPress={toggleTimer}
            >
              {isActive ? (
                <Pause size={28} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Play size={28} color="#0F172A" fill="#0F172A" style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>
          </View>

          {/* Quote */}
          <Text style={[styles.quoteText, isLight && { color: '#64748B' }]}>{quote}</Text>

          {/* Weekly Stat Badge */}
          <View style={styles.statsBadge}>
            <Award size={16} color="#F59E0B" />
            <Text style={styles.statsBadgeText}>
              Bu Hafta Toplam: <Text style={{ color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: '800' }}>{weeklyStats.totalHours} Saat</Text> ({weeklyStats.sessionCount} Seans)
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#0284C7',
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  courseSelectSection: {
    marginBottom: 12,
  },
  sectionSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  courseScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  coursePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  coursePillText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  topicInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  timerCircleBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#38BDF8',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  timerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 12,
  },
  controlPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  controlPauseBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  controlResetBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 8,
    paddingHorizontal: 10,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  statsBadgeText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  modalBoxLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  modalBoxOled: {
    backgroundColor: '#0A0A0A',
    borderColor: '#222222',
  },
  modeTabsLight: {
    backgroundColor: '#F1F5F9',
  },
  coursePillLight: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  topicInputLight: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    color: '#0F172A',
  },
  timerCircleBoxLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  controlResetBtnLight: {
    backgroundColor: '#E2E8F0',
  },
});
