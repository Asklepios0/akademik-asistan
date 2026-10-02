import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Calendar, Zap, ClipboardList, BookOpen, GraduationCap, Settings } from 'lucide-react-native';
import { HapticsService } from '../services/hapticsService';
import { useLanguage } from '../context/LanguageContext';

export type TabKey = 'today' | 'schedule' | 'assignments' | 'study' | 'exams' | 'settings';

interface BottomNavProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  todayCount?: number;
  assignmentsCount?: number;
  theme?: 'dark' | 'oled' | 'light';
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  todayCount = 0,
  assignmentsCount = 0,
  theme = 'dark',
}) => {
  const { t } = useLanguage();
  const isLight = theme === 'light';
  const activeColor = isLight ? '#0284C7' : '#38BDF8';
  const inactiveColor = isLight ? '#64748B' : '#64748B';

  const handleTabPress = (tabKey: TabKey) => {
    HapticsService.selection();
    onSelectTab(tabKey);
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      key: 'today',
      label: t('tabToday'),
      icon: <Zap size={19} color={activeTab === 'today' ? activeColor : inactiveColor} />,
      badge: todayCount > 0 ? todayCount : undefined,
    },
    {
      key: 'schedule',
      label: t('tabSchedule'),
      icon: <Calendar size={19} color={activeTab === 'schedule' ? activeColor : inactiveColor} />,
    },
    {
      key: 'assignments',
      label: t('tabAssignments'),
      icon: <ClipboardList size={19} color={activeTab === 'assignments' ? activeColor : inactiveColor} />,
      badge: assignmentsCount > 0 ? assignmentsCount : undefined,
    },
    {
      key: 'study',
      label: t('tabStudy'),
      icon: <BookOpen size={19} color={activeTab === 'study' ? activeColor : inactiveColor} />,
    },
    {
      key: 'exams',
      label: t('tabExams'),
      icon: <GraduationCap size={19} color={activeTab === 'exams' ? activeColor : inactiveColor} />,
    },
    {
      key: 'settings',
      label: t('tabSettings'),
      icon: <Settings size={19} color={activeTab === 'settings' ? activeColor : inactiveColor} />,
    },
  ];

  return (
    <View style={[styles.container, isLight && styles.containerLight]}>
      {tabs.map(t => {
        const isActive = activeTab === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={styles.tabButton}
            onPress={() => handleTabPress(t.key)}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${t.label}${t.badge ? `, ${t.badge} bekleyen görev` : ''}`}
          >
            <View
              style={[
                styles.iconContainer,
                isActive && (isLight ? styles.iconContainerActiveLight : styles.iconContainerActive),
              ]}
            >
              {t.icon}
              {t.badge !== undefined && (
                <View style={[styles.badge, isLight && styles.badgeLight]}>
                  <Text style={styles.badgeText}>{t.badge}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                isLight && styles.tabLabelLight,
                isActive && (isLight ? styles.tabLabelActiveLight : styles.tabLabelActive),
              ]}
              numberOfLines={1}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#090D16',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  containerLight: {
    backgroundColor: '#FFFFFF',
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    position: 'relative',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  iconContainerActiveLight: {
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: '#090D16',
  },
  badgeLight: {
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  tabLabelLight: {
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  tabLabelActiveLight: {
    color: '#0284C7',
    fontWeight: '800',
  },
});

