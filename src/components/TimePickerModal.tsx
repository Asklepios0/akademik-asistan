import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Clock, Check, X } from 'lucide-react-native';

interface TimePickerModalProps {
  visible: boolean;
  title: string;
  initialTime: string; // "09:00"
  onConfirm: (time: string) => void;
  onCancel: () => void;
  theme?: 'dark' | 'oled' | 'light';
}

const HOURS = Array.from({ length: 16 }, (_, i) => (i + 7).toString().padStart(2, '0')); // 07 to 22
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  title,
  initialTime,
  onConfirm,
  onCancel,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const isOled = theme === 'oled';

  const [selectedHour, setSelectedHour] = useState(() => {
    const parts = (initialTime || '09:00').split(':');
    return parts[0] || '09';
  });

  const [selectedMinute, setSelectedMinute] = useState(() => {
    const parts = (initialTime || '09:00').split(':');
    return parts[1] || '00';
  });

  const handleConfirm = () => {
    onConfirm(`${selectedHour}:${selectedMinute}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, isLight && { backgroundColor: 'rgba(15, 23, 42, 0.5)' }]}>
        <View style={[
          styles.modalContent,
          isLight && { backgroundColor: '#FFFFFF', borderColor: 'rgba(0, 0, 0, 0.08)' },
          isOled && { backgroundColor: '#0A0A0A', borderColor: 'rgba(255, 255, 255, 0.15)' }
        ]}>
          {/* Header */}
          <View style={[styles.header, isLight && { borderBottomColor: 'rgba(0, 0, 0, 0.06)' }]}>
            <View style={styles.titleRow}>
              <Clock size={18} color={isLight ? '#0284C7' : '#3B82F6'} />
              <Text style={[styles.title, isLight && { color: '#0F172A' }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onCancel} style={[styles.closeBtn, isLight && { backgroundColor: '#F1F5F9' }]}>
              <X size={18} color={isLight ? '#475569' : '#94A3B8'} />
            </TouchableOpacity>
          </View>

          {/* Large Time Display */}
          <View style={[styles.timePreviewContainer, isLight && { backgroundColor: '#F1F5F9' }]}>
            <Text style={[styles.timePreviewText, isLight && { color: '#0284C7' }]}>
              {selectedHour}:{selectedMinute}
            </Text>
          </View>

          {/* Selection Columns */}
          <View style={styles.columnsRow}>
            {/* Hours Column */}
            <View style={styles.columnWrapper}>
              <Text style={[styles.columnHeader, isLight && { color: '#475569' }]}>Saat</Text>
              <ScrollView style={[styles.columnScroll, isLight && { backgroundColor: '#F8FAFC' }]} showsVerticalScrollIndicator={false}>
                <View style={styles.grid}>
                  {HOURS.map(h => {
                    const isSelected = selectedHour === h;
                    return (
                      <TouchableOpacity
                        key={h}
                        style={[
                          styles.timeChip,
                          isLight && { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
                          isSelected && styles.timeChipSelected,
                        ]}
                        onPress={() => setSelectedHour(h)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            isLight && { color: '#334155' },
                            isSelected && styles.timeChipTextSelected,
                          ]}
                        >
                          {h}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Minutes Column */}
            <View style={styles.columnWrapper}>
              <Text style={[styles.columnHeader, isLight && { color: '#475569' }]}>Dakika</Text>
              <ScrollView style={[styles.columnScroll, isLight && { backgroundColor: '#F8FAFC' }]} showsVerticalScrollIndicator={false}>
                <View style={styles.grid}>
                  {MINUTES.map(m => {
                    const isSelected = selectedMinute === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.timeChip,
                          isLight && { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
                          isSelected && styles.timeChipSelected,
                        ]}
                        onPress={() => setSelectedMinute(m)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            isLight && { color: '#334155' },
                            isSelected && styles.timeChipTextSelected,
                          ]}
                        >
                          {m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.cancelBtn, isLight && { backgroundColor: '#F1F5F9' }]} onPress={onCancel}>
              <Text style={[styles.cancelBtnText, isLight && { color: '#475569' }]}>Vazgeç</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Seç</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 4,
  },
  timePreviewContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  timePreviewText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 2,
  },
  columnsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  columnWrapper: {
    flex: 1,
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    textAlign: 'center',
  },
  columnScroll: {
    maxHeight: 200,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  timeChip: {
    width: 42,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipSelected: {
    backgroundColor: '#3B82F6',
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  timeChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
