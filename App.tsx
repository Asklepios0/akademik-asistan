import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  BackHandler,
  Platform,
  useColorScheme,
  Appearance,
  AppState,
  NativeModules,
} from 'react-native';
import { Camera } from 'lucide-react-native';
import { Course, AppSettings, DayOfWeek, Assignment } from './src/types';
import { StorageService } from './src/services/storage';
import { NotificationService } from './src/services/notifications';
import { WidgetService } from './src/services/widgetService';
import { Header } from './src/components/Header';
import { BottomNav, TabKey } from './src/components/BottomNav';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { AssignmentsScreen } from './src/screens/AssignmentsScreen';
import { StudyToolsScreen } from './src/screens/StudyToolsScreen';
import { NotesExamsScreen } from './src/screens/NotesExamsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AddCourseModal } from './src/components/AddCourseModal';
import { ClassSessionModal } from './src/components/ClassSessionModal';
import { OCRScannerModal } from './src/screens/OCRScannerModal';
import { UndoSnackbar } from './src/components/UndoSnackbar';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AppSplashScreen } from './src/components/AppSplashScreen';
import { HapticsService } from './src/services/hapticsService';
import { getTodayDayOfWeek } from './src/utils/time';
import { LanguageProvider } from './src/context/LanguageContext';
import { translate } from './src/utils/i18n';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    defaultReminderMinutes: 15,
    notificationsEnabled: true,
    theme: 'dark',
  });

  // Modal States
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [modalInitialDay, setModalInitialDay] = useState<DayOfWeek>(0);
  const [ocrModalVisible, setOcrModalVisible] = useState(false);

  // Active Class Session Modal (Derse Girdim)
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [activeSessionCourse, setActiveSessionCourse] = useState<Course | null>(null);

  // Undo Snackbar State
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    onUndo: () => void;
  }>({
    visible: false,
    message: '',
    onUndo: () => {},
  });

  // Load Initial Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Reset day-specific flags (isCancelledToday, delayMinutes) on fresh app launch
      await StorageService.resetDailyCourseFlags();

      const [savedCourses, savedSettings, savedAssignments] = await Promise.all([
        StorageService.getCourses(),
        StorageService.getSettings(),
        StorageService.getAssignments(),
      ]);
      setCourses(savedCourses);
      setSettings(savedSettings);
      setAssignments(savedAssignments);

      // Initialize and sync notifications & widget
      await NotificationService.init();
      await NotificationService.syncAllNotifications(savedCourses);
      await WidgetService.updateWidget(savedCourses);
    } catch (e) {
      console.error('Error loading data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync courses with Android Home Screen Widget whenever course list changes
  useEffect(() => {
    if (courses && courses.length >= 0) {
      WidgetService.updateWidget(courses);
    }
  }, [courses]);

  // Handle Android Hardware Back Button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (sessionModalVisible) {
        setSessionModalVisible(false);
        setActiveSessionCourse(null);
        return true;
      }
      if (ocrModalVisible) {
        setOcrModalVisible(false);
        return true;
      }
      if (addModalVisible) {
        setAddModalVisible(false);
        return true;
      }
      if (activeTab !== 'today') {
        setActiveTab('today');
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [sessionModalVisible, ocrModalVisible, addModalVisible, activeTab]);

  // Handler: Open Add Modal for a specific day
  const handleOpenAddModal = (day?: DayOfWeek) => {
    setEditingCourse(null);
    setModalInitialDay(day !== undefined ? day : getTodayDayOfWeek());
    setAddModalVisible(true);
  };

  // Handler: Open modal for editing
  const handleOpenEditModal = (course: Course) => {
    setEditingCourse(course);
    setModalInitialDay(course.day);
    setAddModalVisible(true);
  };

  // Handler: Save / Update Course
  const handleSaveCourse = async (
    courseData: Omit<Course, 'id' | 'createdAt'>,
    editingId?: string
  ) => {
    try {
      if (editingId) {
        const existing = courses.find(c => c.id === editingId);
        if (existing) {
          const updated = await StorageService.updateCourse({
            ...existing,
            ...courseData,
          });
          const newCourses = courses.map(c => (c.id === editingId ? updated : c));
          setCourses(newCourses);
          await NotificationService.scheduleCourseNotification(updated);
        }
      } else {
        const created = await StorageService.saveCourse(courseData);
        const newCourses = [...courses, created];
        setCourses(newCourses);
        await NotificationService.scheduleCourseNotification(created);
      }
      setAddModalVisible(false);
    } catch (e) {
      Alert.alert('Hata', 'Ders kaydedilirken bir sorun oluştu.');
    }
  };

  // Handler: Delete Course with Undo Snackbar
  const handleDeleteCourse = (course: Course) => {
    Alert.alert(
      'Dersi Sil',
      `"${course.name}" dersini silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            HapticsService.warning();
            const deletedCourseCopy = { ...course };
            await StorageService.deleteCourse(course.id);
            await NotificationService.cancelCourseNotification(course.id);
            setCourses(prev => prev.filter(c => c.id !== course.id));
            setSnackbar({
              visible: true,
              message: `"${course.name}" dersi silindi.`,
              onUndo: async () => {
                HapticsService.success();
                await StorageService.restoreCourse(deletedCourseCopy);
                await NotificationService.scheduleCourseNotification(deletedCourseCopy);
                loadData();
              },
            });
          },
        },
      ]
    );
  };

  // Handler: Derse Girdim (Opens Live Session Modal)
  const handleAttendCourse = (course: Course) => {
    setActiveSessionCourse(course);
    setSessionModalVisible(true);
  };

  // Handler: Derse Girmedim (Logs Absence)
  const handleMissCourse = async (course: Course) => {
    Alert.alert(
      'Devamsızlık Kaydı',
      `"${course.name}" dersine girmediniz olarak kaydedilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Girmedim',
          style: 'destructive',
          onPress: async () => {
            await StorageService.recordAttendance(course.id, 'missed');
            Alert.alert('Kaydedildi', 'Devamsızlık durumunuz güncellendi.');
          },
        },
      ]
    );
  };

  // Handler: Ders Erken Bitti (Marks course finished for today & logs attendance)
  const handleFinishCourseEarly = async (course: Course) => {
    HapticsService.success();
    await StorageService.finishCourseEarlyToday(course.id);
    await StorageService.recordAttendance(course.id, 'attended');
    await loadData();
    Alert.alert('Ders Bitti 🎓', `"${course.name}" dersi bugün için tamamlandı olarak işaretlendi.`);
  };

  // Handler: Update Settings
  const handleUpdateSettings = async (partial: Partial<AppSettings>) => {
    const updated = await StorageService.saveSettings(partial);
    setSettings(updated);
  };

  const todayDay = getTodayDayOfWeek();
  const todayCoursesCount = courses.filter(c => c.day === todayDay && !c.isCancelledToday).length;
  const pendingAssignmentsCount = assignments.filter(a => a.status !== 'completed').length;

  const systemColorScheme = useColorScheme();
  const [nativeIsDark, setNativeIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const queryNativeDark = async () => {
      if (Platform.OS === 'android' && NativeModules.AkademikWallpaperModule?.getSystemDarkMode) {
        try {
          const isDark = await NativeModules.AkademikWallpaperModule.getSystemDarkMode();
          if (isMounted) setNativeIsDark(isDark);
        } catch {
          // ignore
        }
      }
    };

    queryNativeDark();

    const sub = Appearance.addChangeListener(() => {
      queryNativeDark();
    });

    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        queryNativeDark();
      }
    });

    return () => {
      isMounted = false;
      sub.remove();
      appStateSub.remove();
    };
  }, []);

  const isSystemDark =
    nativeIsDark !== null
      ? nativeIsDark
      : systemColorScheme === 'dark' || (systemColorScheme === null && Appearance.getColorScheme() === 'dark');

  const effectiveTheme: 'dark' | 'oled' | 'light' =
    settings.theme === 'system'
      ? (isSystemDark ? 'dark' : 'light')
      : settings.theme === 'light'
      ? 'light'
      : settings.theme === 'oled'
      ? 'oled'
      : 'dark';
  const isOled = effectiveTheme === 'oled';
  const isLight = effectiveTheme === 'light';

  if (loading) {
    return <AppSplashScreen theme={effectiveTheme} />;
  }

  // First launch onboarding flow with skip option
  if (settings.onboardingCompleted === false) {
    return (
      <OnboardingScreen
        theme={effectiveTheme}
        onFinish={async (semesterDate) => {
          const updated = await StorageService.saveSettings({
            onboardingCompleted: true,
            ...(semesterDate ? { semesterStartDate: semesterDate } : {}),
          });
          setSettings(updated);
          if (semesterDate) {
            await NotificationService.syncAllNotifications(courses);
          }
        }}
      />
    );
  }

  const appBgColor = isLight ? '#F8FAFC' : isOled ? '#000000' : '#0F172A';
  const currentLang = settings.language || 'tr';

  const headerTitle =
    activeTab === 'today'
      ? translate(currentLang, 'todaySchedule')
      : activeTab === 'schedule'
      ? translate(currentLang, 'courseSchedule')
      : activeTab === 'assignments'
      ? translate(currentLang, 'assignmentsAndProjects')
      : activeTab === 'study'
      ? translate(currentLang, 'studyRoom')
      : activeTab === 'exams'
      ? translate(currentLang, 'examsAndNotes')
      : translate(currentLang, 'settingsTitle');

  return (
    <LanguageProvider
      language={currentLang}
      onLanguageChange={(newLang) => handleUpdateSettings({ language: newLang })}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appBgColor }]}>
        <StatusBar
          barStyle={isLight ? 'dark-content' : 'light-content'}
          backgroundColor={appBgColor}
        />

        {/* Top Header */}
        <Header
          title={headerTitle}
          theme={effectiveTheme}
          onRightActionPress={() => {
            HapticsService.medium();
            setOcrModalVisible(true);
          }}
          rightActionIcon={<Camera size={19} color={isLight ? '#0284C7' : '#38BDF8'} />}
        />

      {/* Screen Views */}
      <View style={styles.screenContainer}>
        {activeTab === 'today' && (
          <TodayScreen
            courses={courses}
            theme={effectiveTheme}
            onAddCoursePress={() => handleOpenAddModal(todayDay)}
            onEditCoursePress={handleOpenEditModal}
            onDeleteCoursePress={handleDeleteCourse}
            onAttendCourse={handleAttendCourse}
            onMissCourse={handleMissCourse}
            onFinishCourseEarly={handleFinishCourseEarly}
            onOpenOCRScan={() => setOcrModalVisible(true)}
            onNavigateTab={tab => setActiveTab(tab as TabKey)}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleScreen
            courses={courses}
            theme={effectiveTheme}
            onAddCoursePress={handleOpenAddModal}
            onEditCoursePress={handleOpenEditModal}
            onDeleteCoursePress={handleDeleteCourse}
            onRefreshCourses={loadData}
          />
        )}

        {activeTab === 'assignments' && (
          <AssignmentsScreen
            courses={courses}
            theme={effectiveTheme}
            onRefreshAssignments={loadData}
          />
        )}

        {activeTab === 'study' && (
          <StudyToolsScreen
            courses={courses}
            theme={effectiveTheme}
          />
        )}

        {activeTab === 'exams' && (
          <NotesExamsScreen
            courses={courses}
            theme={effectiveTheme}
            onRefreshCourses={loadData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            courses={courses}
            onUpdateSettings={handleUpdateSettings}
            onRefreshCourses={loadData}
            theme={effectiveTheme}
          />
        )}
      </View>

      {/* Undo Snackbar */}
      <UndoSnackbar
        visible={snackbar.visible}
        message={snackbar.message}
        onUndo={snackbar.onUndo}
        onDismiss={() => setSnackbar(prev => ({ ...prev, visible: false }))}
      />

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        theme={effectiveTheme}
        todayCount={todayCoursesCount}
        assignmentsCount={pendingAssignmentsCount}
      />

      {/* Add / Edit Course Modal */}
      <AddCourseModal
        visible={addModalVisible}
        editingCourse={editingCourse}
        allCourses={courses}
        initialDay={modalInitialDay}
        theme={effectiveTheme}
        onSave={handleSaveCourse}
        onClose={() => setAddModalVisible(false)}
      />

      {/* Live Class Session Modal (Derse Girdim) */}
      <ClassSessionModal
        visible={sessionModalVisible}
        course={activeSessionCourse}
        theme={effectiveTheme}
        onClose={() => {
          setSessionModalVisible(false);
          setActiveSessionCourse(null);
        }}
        onSavedNote={() => loadData()}
      />

      {/* OCR Scanner Modal (Tahta/Defter Fotoğrafı Çek & Not Çıkar) */}
      <OCRScannerModal
        visible={ocrModalVisible}
        courses={courses}
        theme={effectiveTheme}
        onClose={() => setOcrModalVisible(false)}
        onSavedNote={loadData}
      />
      </SafeAreaView>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenContainer: {
    flex: 1,
  },
});
