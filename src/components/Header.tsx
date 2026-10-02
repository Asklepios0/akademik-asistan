import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, Bell } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  theme?: 'dark' | 'oled' | 'light';
  onRightActionPress?: () => void;
  rightActionIcon?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  theme = 'dark',
  onRightActionPress,
  rightActionIcon,
}) => {
  const { language } = useLanguage();
  const isLight = theme === 'light';
  const isOled = theme === 'oled';

  const todayFormatted = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date());

  return (
    <View style={[styles.container, isLight && styles.containerLight, isOled && styles.containerOled]}>
      <View style={styles.textContainer}>
        <View style={styles.badgeRow}>
          <Sparkles size={14} color="#3B82F6" />
          <Text style={[styles.dateBadge, isLight && { color: '#64748B' }]}>
            {subtitle || todayFormatted}
          </Text>
        </View>
        <Text style={[styles.title, isLight && styles.titleLight]}>{title}</Text>
      </View>

      {onRightActionPress && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            isLight && styles.actionButtonLight,
            isOled && styles.actionButtonOled,
          ]}
          onPress={onRightActionPress}
          activeOpacity={0.7}
        >
          {rightActionIcon || <Bell size={20} color={isLight ? '#0F172A' : '#F8FAFC'} />}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  containerLight: {
    backgroundColor: '#F8FAFC',
  },
  containerOled: {
    backgroundColor: '#000000',
  },
  textContainer: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dateBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  titleLight: {
    color: '#0F172A',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonLight: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowOpacity: 0.05,
  },
  actionButtonOled: {
    backgroundColor: '#080808',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
});
