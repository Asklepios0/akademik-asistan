import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Course, DayOfWeek } from '../types';
import { timeToMinutes } from '../utils/time';

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static isInitialized = false;

  /**
   * Initializes notification channels (especially critical on Android)
   */
  static async init() {
    if (this.isInitialized || Platform.OS === 'web') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('course-reminders', {
        name: 'Ders Hatırlatıcıları',
        description: 'Ders başlamadan önceki hatırlatma bildirimleri',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        enableLights: true,
        enableVibrate: true,
      });
    }

    this.isInitialized = true;
  }

  /**
   * Requests permission to send notifications
   */
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Error requesting notification permissions', e);
      return false;
    }
  }

  /**
   * Checks if permission is granted
   */
  static async hasPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      return false;
    }
  }

  /**
   * Schedules a weekly repeating notification for a course
   */
  static async scheduleCourseNotification(course: Course): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    if (!course.reminderMinutes || course.reminderMinutes <= 0) return null;

    try {
      await this.init();
      const hasPerm = await this.requestPermissions();
      if (!hasPerm) return null;

      const startMinutes = timeToMinutes(course.startTime);
      let targetMinutes = startMinutes - course.reminderMinutes;
      let targetDay: DayOfWeek = course.day;

      // Handle rollover across midnight
      if (targetMinutes < 0) {
        targetMinutes += 24 * 60;
        targetDay = (targetDay === 0 ? 6 : targetDay - 1) as DayOfWeek;
      }

      const hour = Math.floor(targetMinutes / 60);
      const minute = targetMinutes % 60;

      // Convert our DayOfWeek (0=Mon .. 6=Sun) to Expo weekday (1=Sun, 2=Mon .. 7=Sat)
      const expoWeekday = targetDay === 6 ? 1 : targetDay + 2;

      const reminderText = course.reminderMinutes >= 60
        ? `${Math.floor(course.reminderMinutes / 60)} saat sonra`
        : `${course.reminderMinutes} dakika sonra`;

      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: `course_notif_${course.id}`,
        content: {
          title: `🔔 Dersin Var: ${course.name}`,
          body: `${course.name} dersin ${reminderText} ${course.classroom ? `[${course.classroom}] sınıfında ` : ''}başlıyor! (Hoca: ${course.instructor || 'Belirtilmedi'})`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { courseId: course.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: expoWeekday,
          hour,
          minute,
          channelId: 'course-reminders',
        },
      });

      return notificationId;
    } catch (e) {
      console.warn(`Failed to schedule notification for course ${course.name}:`, e);
      return null;
    }
  }

  /**
   * Cancels a scheduled notification for a course
   */
  static async cancelCourseNotification(courseId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync(`course_notif_${courseId}`);
    } catch (e) {
      // Ignore if not found
    }
  }

  /**
   * Reschedules notifications for all given courses, respecting semester start date
   */
  static async syncAllNotifications(courses: Course[]): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Check if semester has started
      const { StorageService } = await import('./storage');
      const settings = await StorageService.getSettings();

      if (settings?.semesterStartDate) {
        const startDay = new Date(settings.semesterStartDate);
        startDay.setHours(0, 0, 0, 0);
        if (Date.now() < startDay.getTime()) {
          console.log(`[Bildirim] Dersler henüz başlamadı (${settings.semesterStartDate}). Haftalık ders alarmları sessizde tutuldu.`);
          // Sınavlar varsa sadece sınav alarmlarını kur
          await this.syncExamNotifications(courses);
          return;
        }
      }

      for (const course of courses) {
        if (course.reminderMinutes > 0) {
          await this.scheduleCourseNotification(course);
        }
      }

      await this.syncExamNotifications(courses);
    } catch (e) {
      console.warn('Failed to sync all notifications', e);
    }
  }

  /**
   * Schedules exam reminder notifications (1 day before at 19:00 + 2 hours before exam)
   */
  static async syncExamNotifications(courses: Course[]): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      const now = Date.now();
      for (const course of courses) {
        if (!course.exams) continue;
        const examEntries = Object.entries(course.exams);
        for (const [examType, exam] of examEntries) {
          if (!exam || !exam.date || !exam.time) continue;

          const [hour, minute] = exam.time.split(':').map(Number);
          const examDateTime = new Date(`${exam.date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
          const examTimeMs = examDateTime.getTime();

          if (isNaN(examTimeMs) || examTimeMs <= now) continue;

          // 1 gün önce akşam 19:00
          const oneDayBefore = new Date(examDateTime);
          oneDayBefore.setDate(oneDayBefore.getDate() - 1);
          oneDayBefore.setHours(19, 0, 0, 0);

          if (oneDayBefore.getTime() > now) {
            await Notifications.scheduleNotificationAsync({
              identifier: `exam_pre_${exam.id || course.id + '_' + examType}`,
              content: {
                title: `📝 Yarın Sınavın Var: ${course.name}`,
                body: `${examType.toUpperCase()} Sınavı yarın saat ${exam.time}'da (${exam.classroom || course.classroom || 'Sınav Salonu'}). Başarılar!`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: oneDayBefore,
              },
            });
          }

          // 2 saat önce
          const twoHoursBefore = new Date(examTimeMs - 2 * 60 * 60 * 1000);
          if (twoHoursBefore.getTime() > now) {
            await Notifications.scheduleNotificationAsync({
              identifier: `exam_urg_${exam.id || course.id + '_' + examType}`,
              content: {
                title: `⚠️ 2 Saat Kaldı: ${course.name} Sınavı`,
                body: `Saat ${exam.time}'da ${exam.classroom || course.classroom || 'Derslik'} salonunda sınavın başlıyor. Giriş belgelerini kontrol et!`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: twoHoursBefore,
              },
            });
          }
        }
      }
    } catch (e) {
      console.warn('Failed to sync exam notifications', e);
    }
  }

  static async openSystemSettings(): Promise<void> {
    const { Linking, Platform } = await import('react-native');
    try {
      await Linking.openSettings();
    } catch (e) {
      if (Platform.OS === 'android') {
        try {
          await Linking.openURL('package:com.bedirhan.akademikasistan');
        } catch (e2) {
          console.warn('Could not open package url', e2);
        }
      }
    }
  }

  /**
   * Prompts user for permissions or opens settings if blocked
   */
  static async promptPermissionsOrSettings(): Promise<boolean> {
    const granted = await this.requestPermissions();
    if (!granted) {
      await this.openSystemSettings();
    }
    return granted;
  }

  /**
   * Sends an immediate test notification in 3 seconds to verify system
   */
  static async sendTestNotification(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      await this.init();
      const hasPerm = await this.requestPermissions();
      if (!hasPerm) return false;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎓 Akademik Asistan Test Bildirimi',
          body: 'Bildirim sistemi başarıyla çalışıyor! Derslerinden önce zamanında uyarılacaksın.',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
        },
      });
      return true;
    } catch (e) {
      console.error('Test notification failed', e);
      return false;
    }
  }
}
