import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Lock,
  Unlock,
  Delete,
  X,
  ShieldCheck,
} from 'lucide-react-native';
import { HapticsService } from '../services/hapticsService';

interface PinLockModalProps {
  visible: boolean;
  expectedPin?: string;
  title?: string;
  subtitle?: string;
  theme?: 'dark' | 'oled' | 'light';
  onSuccess: (enteredPin: string) => void;
  onClose: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  visible,
  expectedPin,
  title = 'Not Kasası Güvenliği',
  subtitle = 'Devam etmek için 4 haneli PIN kodunuzu girin:',
  theme = 'dark',
  onSuccess,
  onClose,
}) => {
  const isLight = theme === 'light';
  const isOled = theme === 'oled';
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) {
      setPin('');
      setErrorMsg('');
    }
  }, [visible]);

  const handleDigitPress = (digit: string) => {
    if (pin.length >= 4) return;
    HapticsService.light();
    setErrorMsg('');
    const nextPin = pin + digit;
    setPin(nextPin);

    if (nextPin.length === 4) {
      if (expectedPin) {
        if (nextPin === expectedPin) {
          HapticsService.success();
          onSuccess(nextPin);
        } else {
          HapticsService.error();
          setErrorMsg('Hatalı PIN! Lütfen tekrar deneyin.');
          setPin('');
        }
      } else {
        // Mode: Setting new pin
        HapticsService.success();
        onSuccess(nextPin);
      }
    }
  };

  const handleDelete = () => {
    HapticsService.selection();
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, isLight && { backgroundColor: 'rgba(15, 23, 42, 0.5)' }]}>
        <View style={[
          styles.modalBox,
          isLight && { backgroundColor: '#FFFFFF', borderColor: 'rgba(0, 0, 0, 0.08)' },
          isOled && { backgroundColor: '#080808', borderColor: 'rgba(255, 255, 255, 0.15)' }
        ]}>
          {/* Close button */}
          <TouchableOpacity
            style={[styles.closeBtn, isLight && { backgroundColor: '#F1F5F9' }]}
            onPress={onClose}
          >
            <X size={18} color={isLight ? '#475569' : '#94A3B8'} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={[styles.iconBox, isLight && { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
            <Lock size={26} color={isLight ? '#0284C7' : '#38BDF8'} />
          </View>

          <Text style={[styles.title, isLight && { color: '#0F172A' }]}>{title}</Text>
          <Text style={[styles.subtitle, isLight && { color: '#64748B' }]}>{subtitle}</Text>

          {/* 4 Dots indicator */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map(idx => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  isLight && { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
                  pin.length > idx && [styles.dotFilled, isLight && { backgroundColor: '#0284C7', borderColor: '#0284C7' }],
                  errorMsg !== '' && styles.dotError,
                ]}
              />
            ))}
          </View>

          {errorMsg !== '' && <Text style={styles.errorText}>{errorMsg}</Text>}

          {/* Number Pad (1-9, 0, Backspace) */}
          <View style={styles.keypad}>
            {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map(num => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.keyBtn,
                      isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' }
                    ]}
                    onPress={() => handleDigitPress(num)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.keyBtnText, isLight && { color: '#0F172A' }]}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            <View style={styles.keypadRow}>
              <View style={[styles.keyBtn, { backgroundColor: 'transparent', borderColor: 'transparent' }]} />

              <TouchableOpacity
                style={[
                  styles.keyBtn,
                  isLight && { backgroundColor: '#F1F5F9', borderColor: 'rgba(0, 0, 0, 0.06)' }
                ]}
                onPress={() => handleDigitPress('0')}
                activeOpacity={0.7}
              >
                <Text style={[styles.keyBtnText, isLight && { color: '#0F172A' }]}>0</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.keyBtn, { backgroundColor: 'transparent', borderColor: 'transparent' }]}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Delete size={22} color={isLight ? '#475569' : '#94A3B8'} />
              </TouchableOpacity>
            </View>
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
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1E293B',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    lineHeight: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#64748B',
  },
  dotFilled: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  dotError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
    marginBottom: 12,
  },
  keypad: {
    width: '100%',
    marginTop: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  keyBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  keyBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
});
