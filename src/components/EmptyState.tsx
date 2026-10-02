import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { HapticsService } from '../services/hapticsService';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionIcon?: React.ReactNode;
  onActionPress?: () => void;
  secondaryActionText?: string;
  onSecondaryActionPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  actionIcon,
  onActionPress,
  secondaryActionText,
  onSecondaryActionPress,
}) => {
  const handlePrimaryPress = () => {
    HapticsService.medium();
    onActionPress?.();
  };

  const handleSecondaryPress = () => {
    HapticsService.light();
    onSecondaryActionPress?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>{icon}</View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {actionText && onActionPress && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handlePrimaryPress}
          activeOpacity={0.8}
        >
          {actionIcon || <Sparkles size={16} color="#FFFFFF" />}
          <Text style={styles.actionBtnText}>{actionText}</Text>
        </TouchableOpacity>
      )}

      {secondaryActionText && onSecondaryActionPress && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleSecondaryPress}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>{secondaryActionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38BDF8',
  },
});
