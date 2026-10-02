import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, Check, X, Trash2 } from 'lucide-react-native';
import { HapticsService } from '../services/hapticsService';

interface CalendarDatePickerModalProps {
  visible: boolean;
  initialDate?: string; // YYYY-MM-DD
  title?: string;
  subtitle?: string;
  isLight?: boolean;
  theme?: 'dark' | 'oled' | 'light';
  onSelectDate: (dateStr: string) => void;
  onClearDate?: () => void;
  onClose: () => void;
}

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const DAY_NAMES_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const CalendarDatePickerModal: React.FC<CalendarDatePickerModalProps> = ({
  visible,
  initialDate,
  title = 'Dönem Başlangıç Tarihi Seç',
  subtitle = 'Ders alarmları bu tarihe kadar sessizde tutulacaktır.',
  isLight = false,
  theme,
  onSelectDate,
  onClearDate,
  onClose,
}) => {
  const effectiveIsLight = isLight || theme === 'light';
  // Parse initial date or default to current date
  const today = useMemo(() => new Date(), []);
  
  const parsedInitial = useMemo(() => {
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
      const [y, m, d] = initialDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [initialDate]);

  const [viewYear, setViewYear] = useState<number>(parsedInitial.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsedInitial.getMonth()); // 0-indexed
  const [selectedDayStr, setSelectedDayStr] = useState<string>(initialDate || '');

  // Generate days in viewed month
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // In JS, getDay() gives 0 for Sunday, 1 for Monday ... 6 for Saturday
    // Convert to Monday=0, Tuesday=1 ... Sunday=6
    let startingWeekday = firstDayOfMonth.getDay() - 1;
    if (startingWeekday === -1) startingWeekday = 6;

    const days: (number | null)[] = [];
    for (let i = 0; i < startingWeekday; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return days;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    HapticsService.light();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    HapticsService.light();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const formatSelected = (year: number, month: number, day: number) => {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${year}-${mStr}-${dStr}`;
  };

  const handleSelectDay = (day: number) => {
    HapticsService.selection();
    const formatted = formatSelected(viewYear, viewMonth, day);
    setSelectedDayStr(formatted);
  };

  // Quick preset shortcuts
  const applyPreset = (offsetDays: number) => {
    HapticsService.medium();
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const formatted = formatSelected(target.getFullYear(), target.getMonth(), target.getDate());
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setSelectedDayStr(formatted);
  };

  const applyNextMonday = () => {
    HapticsService.medium();
    const d = new Date();
    const day = d.getDay(); // 0=Sun, 1=Mon
    const daysUntilNextMon = day === 0 ? 1 : (8 - day);
    d.setDate(d.getDate() + daysUntilNextMon);
    const formatted = formatSelected(d.getFullYear(), d.getMonth(), d.getDate());
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDayStr(formatted);
  };

  const handleConfirm = () => {
    if (!selectedDayStr) return;
    HapticsService.success();
    onSelectDate(selectedDayStr);
    onClose();
  };

  const handleClear = () => {
    HapticsService.warning();
    setSelectedDayStr('');
    onClearDate?.();
    onClose();
  };

  const todayStr = formatSelected(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, effectiveIsLight && styles.modalCardLight]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Calendar size={18} color="#38BDF8" />
                <Text style={[styles.headerTitle, effectiveIsLight && { color: '#0F172A' }]}>{title}</Text>
              </View>
              {subtitle ? (
                <Text style={[styles.headerSubtitle, effectiveIsLight && { color: '#64748B' }]}>{subtitle}</Text>
              ) : null}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Quick Preset Buttons */}
          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={[styles.presetChip, effectiveIsLight && { backgroundColor: 'rgba(2, 132, 199, 0.08)', borderColor: 'rgba(2, 132, 199, 0.2)' }]}
              onPress={() => applyPreset(0)}
            >
              <Text style={[styles.presetChipText, effectiveIsLight && { color: '#0284C7' }]}>Bugün</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetChip, effectiveIsLight && { backgroundColor: 'rgba(2, 132, 199, 0.08)', borderColor: 'rgba(2, 132, 199, 0.2)' }]}
              onPress={applyNextMonday}
            >
              <Text style={[styles.presetChipText, effectiveIsLight && { color: '#0284C7' }]}>Gelecek Pazartesi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetChip, effectiveIsLight && { backgroundColor: 'rgba(2, 132, 199, 0.08)', borderColor: 'rgba(2, 132, 199, 0.2)' }]}
              onPress={() => applyPreset(14)}
            >
              <Text style={[styles.presetChipText, effectiveIsLight && { color: '#0284C7' }]}>2 Hafta Sonra</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetChip, effectiveIsLight && { backgroundColor: 'rgba(2, 132, 199, 0.08)', borderColor: 'rgba(2, 132, 199, 0.2)' }]}
              onPress={() => applyPreset(30)}
            >
              <Text style={[styles.presetChipText, effectiveIsLight && { color: '#0284C7' }]}>1 Ay Sonra</Text>
            </TouchableOpacity>
          </View>

          {/* Month / Year Navigator */}
          <View style={[styles.monthNavRow, effectiveIsLight && { backgroundColor: '#F1F5F9' }]}>
            <TouchableOpacity
              style={[styles.navArrowBtn, effectiveIsLight && { backgroundColor: '#E2E8F0' }]}
              onPress={handlePrevMonth}
            >
              <ChevronLeft size={20} color={effectiveIsLight ? '#0F172A' : '#F8FAFC'} />
            </TouchableOpacity>
            <Text style={[styles.monthYearTitle, effectiveIsLight && { color: '#0F172A' }]}>
              {MONTH_NAMES_TR[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity
              style={[styles.navArrowBtn, effectiveIsLight && { backgroundColor: '#E2E8F0' }]}
              onPress={handleNextMonth}
            >
              <ChevronRight size={20} color={effectiveIsLight ? '#0F172A' : '#F8FAFC'} />
            </TouchableOpacity>
          </View>

          {/* Weekday Labels (Pzt, Sal...) */}
          <View style={styles.weekdayRow}>
            {DAY_NAMES_TR.map((dayName, idx) => (
              <Text
                key={dayName}
                style={[
                  styles.weekdayLabel,
                  idx >= 5 && { color: '#EF4444' }, // Weekend in subtle red/warm
                ]}
              >
                {dayName}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.grid}>
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <View key={`empty_${idx}`} style={styles.dayCell} />;
              }

              const cellDateStr = formatSelected(viewYear, viewMonth, day);
              const isSelected = selectedDayStr === cellDateStr;
              const isToday = todayStr === cellDateStr;

              return (
                <TouchableOpacity
                  key={`day_${day}`}
                  style={[
                    styles.dayCell,
                    isToday && styles.todayCell,
                    isSelected && styles.selectedCell,
                  ]}
                  onPress={() => handleSelectDay(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      effectiveIsLight && { color: '#0F172A' },
                      isToday && styles.todayText,
                      isSelected && styles.selectedDayText,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected Date Summary Banner */}
          {selectedDayStr ? (
            <View style={styles.selectedBanner}>
              <Text style={styles.selectedBannerLabel}>Seçilen Tarih:</Text>
              <Text style={styles.selectedBannerValue}>{selectedDayStr}</Text>
            </View>
          ) : (
            <View style={styles.selectedBannerMuted}>
              <Text style={styles.selectedBannerMutedText}>Lütfen takvimden bir başlangıç günü seçin</Text>
            </View>
          )}

          {/* Footer Action Buttons */}
          <View style={styles.footerRow}>
            {onClearDate && initialDate ? (
              <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                <Trash2 size={16} color="#EF4444" />
                <Text style={styles.clearBtnText}>Kaldır</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.cancelBtn, effectiveIsLight && { backgroundColor: '#F1F5F9' }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, effectiveIsLight && { color: '#475569' }]}>Vazgeç</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, !selectedDayStr && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!selectedDayStr}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Tarihi Onayla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  modalCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  presetChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 12,
  },
  navArrowBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  monthYearTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.3,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekdayLabel: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dayCell: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: 2,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  todayText: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  selectedCell: {
    backgroundColor: '#38BDF8',
  },
  selectedDayText: {
    color: '#0F172A',
    fontWeight: '900',
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  selectedBannerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  selectedBannerValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#38BDF8',
  },
  selectedBannerMuted: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 10,
  },
  selectedBannerMutedText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginRight: 'auto',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#38BDF8',
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
});
