import { NativeModules, Platform } from 'react-native';
import { Course } from '../types';

const { AkademikWidgetModule } = NativeModules;

export class WidgetService {
  /**
   * Syncs the course list to Android SharedPreferences and triggers
   * the TodayScheduleWidgetProvider to update RemoteViews.
   */
  static async updateWidget(courses: Course[]): Promise<boolean> {
    if (Platform.OS !== 'android' || !AkademikWidgetModule) {
      return false;
    }

    try {
      const coursesJson = JSON.stringify(courses);
      await AkademikWidgetModule.updateWidgetData(coursesJson);
      return true;
    } catch (e) {
      console.warn('Widget update failed:', e);
      return false;
    }
  }

  /**
   * Prompts the Android OS to pin the Akademik Asistan widget to the home screen
   * (Available on Android 8.0+ / 14 / 15 / 16).
   */
  static async requestPinWidget(): Promise<boolean> {
    if (Platform.OS !== 'android' || !AkademikWidgetModule) {
      return false;
    }

    try {
      return await AkademikWidgetModule.requestPinWidget();
    } catch (e) {
      console.warn('Widget pin request failed:', e);
      return false;
    }
  }
}
