import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export class HapticsService {
  /**
   * Subtle light tap for standard button clicks & tab switches
   */
  static light(): void {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {
        // Safe ignore
      }
    }
  }

  /**
   * Medium tap for opening modals, toggles, and card expansions
   */
  static medium(): void {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Safe ignore
      }
    }
  }

  /**
   * Heavy tap for important triggers (e.g. "Derse Girdim", "ÖBS'den Aktar")
   */
  static heavy(): void {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (e) {
        // Safe ignore
      }
    }
  }

  /**
   * Success notification pulse (e.g. course saved, assignment completed, grade imported)
   */
  static success(): void {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        // Safe ignore
      }
    }
  }

  /**
   * Warning notification pulse (e.g. item deleted, absent warning, delay triggered)
   */
  static warning(): void {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (e) {
        // Safe ignore
      }
    }
  }

  /**
   * Error notification pulse (e.g. failed action, validation error)
   */
  static error(): void {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (e) {
        // Safe ignore
      }
    }
  }

  /**
   * Selection tick for dropdowns / day pickers / reminder selector
   */
  static selection(): void {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch (e) {
        // Safe ignore
      }
    }
  }
}
