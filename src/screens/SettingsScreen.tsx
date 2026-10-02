import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  Modal,
  TextInput,
  Clipboard,
  Appearance,
  useColorScheme,
  AppState,
  NativeModules,
} from 'react-native';
import {
  Bell,
  Trash2,
  Calendar,
  Share2,
  Download,
  Moon,
  Sun,
  Sliders,
  Lock,
  ShieldCheck,
  RotateCcw,
  Smartphone,
  CalendarDays,
  Zap,
  FolderOpen,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Sparkles,
  Info,
  X,
  Globe,
} from 'lucide-react-native';
import {
  AppSettings,
  Course,
  REMINDER_OPTIONS,
  GradingScaleConfig,
  DEFAULT_GRADING_SCALE,
} from '../types';
import { NotificationService } from '../services/notifications';
import { StorageService, BackupSnapshot } from '../services/storage';
import { HapticsService } from '../services/hapticsService';
import { CalendarExportService } from '../services/calendarExportService';
import { WidgetService } from '../services/widgetService';
import { PinLockModal } from '../components/PinLockModal';
import { TimetablePosterModal } from '../components/TimetablePosterModal';
import { CalendarDatePickerModal } from '../components/CalendarDatePickerModal';
import { useLanguage } from '../context/LanguageContext';

interface SettingsScreenProps {
  settings: AppSettings;
  courses: Course[];
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onRefreshCourses: () => void;
  theme?: 'dark' | 'oled' | 'light';
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  courses,
  onUpdateSettings,
  onRefreshCourses,
  theme,
}) => {
  const { t, language, setLanguage } = useLanguage();
  const systemColorScheme = useColorScheme();
  const [nativeIsDark, setNativeIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const queryNative = async () => {
      if (Platform.OS === 'android' && NativeModules.AkademikWallpaperModule?.getSystemDarkMode) {
        try {
          const dark = await NativeModules.AkademikWallpaperModule.getSystemDarkMode();
          if (isMounted) setNativeIsDark(dark);
        } catch {}
      }
    };
    queryNative();
    const sub = Appearance.addChangeListener(() => queryNative());
    const appSub = AppState.addEventListener('change', s => {
      if (s === 'active') queryNative();
    });
    return () => {
      isMounted = false;
      sub.remove();
      appSub.remove();
    };
  }, []);

  const isSysDark =
    nativeIsDark !== null
      ? nativeIsDark
      : systemColorScheme === 'dark' || (systemColorScheme === null && Appearance.getColorScheme() === 'dark');

  const effectiveTheme: 'dark' | 'oled' | 'light' =
    theme ||
    (settings.theme === 'system'
      ? (isSysDark ? 'dark' : 'light')
      : settings.theme === 'light'
      ? 'light'
      : settings.theme === 'oled'
      ? 'oled'
      : 'dark');
  const isLight = effectiveTheme === 'light';
  const isOled = effectiveTheme === 'oled';

  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [testingNotification, setTestingNotification] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [posterModalVisible, setPosterModalVisible] = useState(false);

  // Accordion Expand/Collapse State (Theme expanded by default)
  const [expandedSection, setExpandedSection] = useState<string | null>('theme');

  // Semester Start Date State
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // Snapshot & Restore States
  const [localSnapshots, setLocalSnapshots] = useState<BackupSnapshot[]>([]);
  const [restoreTab, setRestoreTab] = useState<'device' | 'text'>('device');

  // Grading Scale Modal & State
  const [scaleModalVisible, setScaleModalVisible] = useState(false);
  const currentScale = settings.gradingScale || DEFAULT_GRADING_SCALE;
  const [customPassing, setCustomPassing] = useState(String(currentScale.passingThreshold));
  const [customAA, setCustomAA] = useState(String(currentScale.aa));
  const [customBA, setCustomBA] = useState(String(currentScale.ba));
  const [customBB, setCustomBB] = useState(String(currentScale.bb));
  const [customCB, setCustomCB] = useState(String(currentScale.cb));
  const [customCC, setCustomCC] = useState(String(currentScale.cc));
  const [customDC, setCustomDC] = useState(String(currentScale.dc));
  const [customDD, setCustomDD] = useState(String(currentScale.dd));
  const [customFD, setCustomFD] = useState(String(currentScale.fd));

  useEffect(() => {
    checkPermissionStatus();
    loadSnapshots();
  }, []);

  const checkPermissionStatus = async () => {
    const granted = await NotificationService.hasPermission();
    setHasPermission(granted);
  };

  const loadSnapshots = async () => {
    const snaps = await StorageService.getLocalSnapshots();
    setLocalSnapshots(snaps);
  };

  const handleOpenSystemSettings = async () => {
    HapticsService.light();
    await NotificationService.openSystemSettings();
    setTimeout(() => {
      checkPermissionStatus();
    }, 1500);
  };

  const handleTestNotification = async () => {
    HapticsService.light();
    setTestingNotification(true);
    await NotificationService.sendTestNotification();
    setTimeout(() => {
      setTestingNotification(false);
      Alert.alert('🔔 Bildirim Gönderildi', 'Bildirim çubuğunuzu kontrol edin.');
    }, 1200);
  };

  const handleSaveSemesterStartDate = async (dateStr: string) => {
    HapticsService.success();
    await onUpdateSettings({ semesterStartDate: dateStr });
    setDatePickerVisible(false);
    await NotificationService.syncAllNotifications(courses);
    Alert.alert(
      '📅 Dönem Başlangıcı Güncellendi',
      `${dateStr} tarihine kadar olan ders bildirimleri sessize alındı. Bu tarihten sonra haftalık bildirimler otomatik başlayacaktır.`
    );
  };

  const handleClearSemesterStartDate = async () => {
    HapticsService.warning();
    await onUpdateSettings({ semesterStartDate: undefined });
    await NotificationService.syncAllNotifications(courses);
    Alert.alert('Tarih Temizlendi', 'Dönem başlangıç tarihi kaldırıldı. Haftalık ders bildirimleri normal olarak devam edecek.');
  };

  const handleCreateSnapshot = async () => {
    HapticsService.medium();
    const res = await StorageService.createLocalSnapshot();
    if (res.success) {
      HapticsService.success();
      loadSnapshots();
      Alert.alert('⚡ Yedek Alındı', res.message);
    } else {
      Alert.alert('Hata', res.message);
    }
  };

  const handleExportBackupFile = async () => {
    HapticsService.light();
    const res = await StorageService.exportBackupToFile();
    if (!res.success) {
      Alert.alert('Hata', res.message || 'Yedek dosyası dışa aktarılamadı.');
    }
  };

  const handleImportBackupFile = async () => {
    HapticsService.medium();
    const res = await StorageService.importBackupFromFile();
    if (res.success) {
      HapticsService.success();
      onRefreshCourses();
      loadSnapshots();
      Alert.alert('✅ Yedek Yüklendi', res.message);
    } else {
      Alert.alert('Bilgi', res.message);
    }
  };

  const openRestoreModal = async () => {
    HapticsService.light();
    await loadSnapshots();
    setRestoreModalVisible(true);
  };

  const handleAddWidget = async () => {
    HapticsService.medium();
    if (Platform.OS === 'android') {
      const supported = await WidgetService.requestPinWidget();
      if (supported) {
        Alert.alert(
          '📲 Widget Ekleme Talebi',
          'Ana ekranınıza Akademik Asistan ders widget\'ı ekleme isteği gönderildi. Çıkan pencereden "Ekle" seçeneğine dokunun.'
        );
      } else {
        Alert.alert(
          '📲 Widget Nasıl Eklenir?',
          'Android 16 ve modern cihazlarda:\n\n1. Ana ekranda boş bir alana 2 saniye basılı tutun.\n2. "Widget\'lar" (veya Eklentiler) seçeneğine dokunun.\n3. "Akademik Asistan"ı seçip ekranınıza sürükleyin.'
        );
      }
    } else {
      Alert.alert('Bilgi', 'Widget özelliği Android cihazlarda kullanılabilir.');
    }
  };

  const handleRestoreSnapshot = async (id: string, dateStr: string) => {
    Alert.alert(
      'Geri Yükle',
      `"${dateStr}" tarihli yedeğe geri dönülsün mü? Mevcut program güncellenecektir.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Geri Yükle',
          onPress: async () => {
            HapticsService.medium();
            const res = await StorageService.restoreLocalSnapshot(id);
            if (res.success) {
              HapticsService.success();
              setRestoreModalVisible(false);
              onRefreshCourses();
              Alert.alert('✅ Başarılı', res.message);
            } else {
              Alert.alert('Hata', res.message);
            }
          },
        },
      ]
    );
  };

  const handleDeleteSnapshot = async (id: string) => {
    HapticsService.warning();
    await StorageService.deleteLocalSnapshot(id);
    loadSnapshots();
  };

  const handlePasteFromClipboard = async () => {
    try {
      const content = await Clipboard.getString();
      if (content && content.trim()) {
        setRestoreJsonInput(content);
        HapticsService.success();
        Alert.alert('📋 Panodan Yapıştırıldı', `${content.length} karakter kutuya aktarıldı.`);
      } else {
        Alert.alert('Pano Boş', 'Panonuzda kopyalanmış herhangi bir metin bulunamadı.');
      }
    } catch {
      Alert.alert('Hata', 'Panodan okuma yapılamadı.');
    }
  };

  const handleResetScaleToDefault = () => {
    HapticsService.medium();
    setCustomPassing(String(DEFAULT_GRADING_SCALE.passingThreshold));
    setCustomAA(String(DEFAULT_GRADING_SCALE.aa));
    setCustomBA(String(DEFAULT_GRADING_SCALE.ba));
    setCustomBB(String(DEFAULT_GRADING_SCALE.bb));
    setCustomCB(String(DEFAULT_GRADING_SCALE.cb));
    setCustomCC(String(DEFAULT_GRADING_SCALE.cc));
    setCustomDC(String(DEFAULT_GRADING_SCALE.dc));
    setCustomDD(String(DEFAULT_GRADING_SCALE.dd));
    setCustomFD(String(DEFAULT_GRADING_SCALE.fd));
  };

  const handleClearAll = () => {
    Alert.alert(
      'Tüm Verileri Sıfırla',
      'Tüm dersleriniz, sınavlarınız ve notlarınız kalıcı olarak silinecektir. Bu işlem geri alınamaz!',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Her Şeyi Sil',
          style: 'destructive',
          onPress: async () => {
            HapticsService.error();
            await StorageService.clearAllCourses();
            await NotificationService.syncAllNotifications([]);
            onRefreshCourses();
            Alert.alert('Sıfırlandı', 'Tüm ders verileriniz temizlendi.');
          },
        },
      ]
    );
  };

  const handleExportCalendar = async () => {
    HapticsService.light();
    await CalendarExportService.shareSchedule(courses, true);
  };

  const handleShareTextSchedule = async () => {
    HapticsService.light();
    await CalendarExportService.shareSchedule(courses, false);
  };

  // Dynamic Theme Colors
  const containerBg = isLight ? '#F8FAFC' : isOled ? '#000000' : '#0F172A';
  const cardBg = isLight ? '#FFFFFF' : isOled ? '#0F0F0F' : '#1E293B';
  const cardBorder = isLight ? '#E2E8F0' : isOled ? '#222222' : '#334155';
  const textPrimary = isLight ? '#0F172A' : '#F8FAFC';
  const textSecondary = isLight ? '#64748B' : '#94A3B8';
  const subCardBg = isLight ? '#F1F5F9' : isOled ? '#181818' : '#0F172A';
  const activeColor = isLight ? '#0284C7' : '#38BDF8';
  const dividerColor = isLight ? '#E2E8F0' : isOled ? '#222222' : 'rgba(255,255,255,0.08)';

  // Render Accordion Container Card
  const renderAccordionSection = (
    id: string,
    title: string,
    badgeText: string,
    icon: React.ReactNode,
    iconBg: string,
    content: React.ReactNode
  ) => {
    const isExpanded = expandedSection === id;

    return (
      <View
        style={[
          styles.accordionCard,
          { backgroundColor: cardBg, borderColor: isExpanded ? activeColor : cardBorder },
        ]}
      >
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => {
            HapticsService.selection();
            setExpandedSection(prev => (prev === id ? null : id));
          }}
          activeOpacity={0.75}
        >
          <View style={[styles.accordionIconBox, { backgroundColor: iconBg }]}>
            {icon}
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.accordionTitle, { color: textPrimary }]}>
              {title}
            </Text>
            <Text style={[styles.accordionBadgeText, { color: textSecondary }]} numberOfLines={1}>
              {badgeText}
            </Text>
          </View>
          <View
            style={[
              styles.chevronBox,
              { backgroundColor: isExpanded ? (isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.15)') : subCardBg },
            ]}
          >
            {isExpanded ? (
              <ChevronUp size={18} color={activeColor} />
            ) : (
              <ChevronDown size={18} color={textSecondary} />
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.accordionBody, { borderTopColor: dividerColor }]}>
            {content}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: containerBg }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        {/* Top Info Banner */}
        <View
          style={[
            styles.welcomeBanner,
            {
              backgroundColor: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.08)',
              borderColor: isLight ? 'rgba(2, 132, 199, 0.2)' : 'rgba(56, 189, 248, 0.2)',
            },
          ]}
        >
          <Text style={[styles.welcomeTitle, { color: textPrimary }]}>
            {t('welcomeSettings')}
          </Text>
          <Text style={[styles.welcomeSub, { color: textSecondary }]}>
            {t('settingsDesc')}
          </Text>
        </View>

        {/* 1. Theme & Appearance Accordion */}
        {renderAccordionSection(
          'theme',
          t('appearanceSection'),
          settings.theme === 'system'
            ? (!isSysDark ? t('systemThemeActiveLight') : t('systemThemeActiveDark'))
            : settings.theme === 'oled'
            ? t('oledBlack')
            : settings.theme === 'light'
            ? t('lightTheme')
            : t('slateDark'),
          <Moon size={18} color={activeColor} />,
          isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.15)',
          <View>
            <View style={styles.themeGrid}>
              {/* Option 1: Sistem Teması */}
              <TouchableOpacity
                style={[
                  styles.themeGridBtn,
                  { backgroundColor: subCardBg, borderColor: cardBorder },
                  settings.theme === 'system' && [
                    styles.themeBtnActive,
                    { borderColor: activeColor, backgroundColor: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.15)' },
                  ],
                ]}
                onPress={() => {
                  HapticsService.selection();
                  onUpdateSettings({ theme: 'system' });
                }}
              >
                <Smartphone size={16} color={settings.theme === 'system' ? activeColor : textSecondary} />
                <Text
                  style={[
                    styles.themeBtnText,
                    { color: settings.theme === 'system' ? activeColor : textSecondary },
                  ]}
                >
                  {t('systemTheme')}
                </Text>
              </TouchableOpacity>

              {/* Option 2: Slate Koyu */}
              <TouchableOpacity
                style={[
                  styles.themeGridBtn,
                  { backgroundColor: subCardBg, borderColor: cardBorder },
                  settings.theme === 'dark' && [
                    styles.themeBtnActive,
                    { borderColor: activeColor, backgroundColor: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.15)' },
                  ],
                ]}
                onPress={() => {
                  HapticsService.selection();
                  onUpdateSettings({ theme: 'dark' });
                }}
              >
                <Moon size={16} color={settings.theme === 'dark' ? activeColor : textSecondary} />
                <Text
                  style={[
                    styles.themeBtnText,
                    { color: settings.theme === 'dark' ? activeColor : textSecondary },
                  ]}
                >
                  {t('slateDark')}
                </Text>
              </TouchableOpacity>

              {/* Option 3: OLED Siyah */}
              <TouchableOpacity
                style={[
                  styles.themeGridBtn,
                  { backgroundColor: subCardBg, borderColor: cardBorder },
                  settings.theme === 'oled' && [
                    styles.themeBtnActive,
                    { borderColor: activeColor, backgroundColor: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.15)' },
                  ],
                ]}
                onPress={() => {
                  HapticsService.selection();
                  onUpdateSettings({ theme: 'oled' });
                }}
              >
                <View style={[styles.oledDot, { borderColor: activeColor }]} />
                <Text
                  style={[
                    styles.themeBtnText,
                    { color: settings.theme === 'oled' ? activeColor : textSecondary },
                  ]}
                >
                  {t('oledBlack')}
                </Text>
              </TouchableOpacity>

              {/* Option 4: Açık Tema */}
              <TouchableOpacity
                style={[
                  styles.themeGridBtn,
                  { backgroundColor: subCardBg, borderColor: cardBorder },
                  settings.theme === 'light' && [
                    styles.themeBtnActive,
                    { borderColor: activeColor, backgroundColor: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.15)' },
                  ],
                ]}
                onPress={() => {
                  HapticsService.selection();
                  onUpdateSettings({ theme: 'light' });
                }}
              >
                <Sun size={16} color={settings.theme === 'light' ? activeColor : textSecondary} />
                <Text
                  style={[
                    styles.themeBtnText,
                    { color: settings.theme === 'light' ? activeColor : textSecondary },
                  ]}
                >
                  {t('lightTheme')}
                </Text>
              </TouchableOpacity>
            </View>

            {settings.theme === 'system' && (
              <View style={[styles.systemThemeInfoCard, { backgroundColor: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.12)' }]}>
                <Smartphone size={15} color={activeColor} />
                <Text style={[styles.systemThemeInfoText, { color: isLight ? '#0369A1' : '#38BDF8' }]}>
                  {t('systemThemeDesc')} ({isSysDark ? 'Telefon şu an Koyu Modda' : 'Telefon şu an Açık Modda'})
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 2. Language Selection Accordion */}
        {renderAccordionSection(
          'language',
          t('languageSection'),
          (settings.language === 'en' ? 'English (İngilizce)' : 'Türkçe (Turkish)'),
          <Globe size={18} color="#8B5CF6" />,
          'rgba(139, 92, 246, 0.15)',
          <View style={styles.languageRow}>
            <TouchableOpacity
              style={[
                styles.languageBtn,
                { backgroundColor: subCardBg, borderColor: cardBorder },
                (settings.language === 'tr' || !settings.language) && [
                  styles.themeBtnActive,
                  { borderColor: '#8B5CF6', backgroundColor: isLight ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.15)' },
                ],
              ]}
              onPress={() => {
                HapticsService.selection();
                setLanguage('tr');
                onUpdateSettings({ language: 'tr' });
              }}
            >
              <Text style={styles.flagIcon}>🇹🇷</Text>
              <View style={{ marginLeft: 8 }}>
                <Text
                  style={[
                    styles.languageBtnText,
                    { color: (settings.language === 'tr' || !settings.language) ? (isLight ? '#7C3AED' : '#A78BFA') : textPrimary },
                  ]}
                >
                  Türkçe
                </Text>
                <Text style={{ fontSize: 11, color: textSecondary }}>Varsayılan Dil</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageBtn,
                { backgroundColor: subCardBg, borderColor: cardBorder },
                settings.language === 'en' && [
                  styles.themeBtnActive,
                  { borderColor: '#8B5CF6', backgroundColor: isLight ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.15)' },
                ],
              ]}
              onPress={() => {
                HapticsService.selection();
                setLanguage('en');
                onUpdateSettings({ language: 'en' });
              }}
            >
              <Text style={styles.flagIcon}>🇬🇧</Text>
              <View style={{ marginLeft: 8 }}>
                <Text
                  style={[
                    styles.languageBtnText,
                    { color: settings.language === 'en' ? (isLight ? '#7C3AED' : '#A78BFA') : textPrimary },
                  ]}
                >
                  English
                </Text>
                <Text style={{ fontSize: 11, color: textSecondary }}>English Language</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. Semester Start Date Accordion */}
        {renderAccordionSection(
          'semester',
          'Dönem Başlangıcı & Bildirimler',
          settings.semesterStartDate ? `Aktif (${settings.semesterStartDate})` : 'Tarih Belirlenmedi',
          <CalendarDays size={18} color="#10B981" />,
          'rgba(16, 185, 129, 0.15)',
          <View>
            <Text style={[styles.cardSubtitle, { color: textSecondary, marginBottom: 10 }]}>
              Okulunuz henüz başlamadıysa dönem başlangıç tarihini seçin. Bu tarihe kadar ders alarmları ve bildirimleri sizi rahatsız etmez.
            </Text>

            <TouchableOpacity
              style={[styles.openCalendarBtn, { backgroundColor: isLight ? '#0284C7' : '#10B981' }]}
              onPress={() => setDatePickerVisible(true)}
              activeOpacity={0.8}
            >
              <CalendarDays size={18} color="#FFFFFF" />
              <Text style={styles.openCalendarBtnText}>
                {settings.semesterStartDate
                  ? `📅 Seçili Tarih: ${settings.semesterStartDate}`
                  : 'Takvimden Başlangıç Tarihi Seçin'}
              </Text>
            </TouchableOpacity>

            {settings.semesterStartDate ? (
              <View style={styles.semesterStatusRow}>
                <Text style={styles.semesterActiveStatus}>
                  🟢 Aktif: {settings.semesterStartDate} tarihine kadar ders bildirimleri sessizde.
                </Text>
                <TouchableOpacity onPress={handleClearSemesterStartDate} style={styles.clearDateSmallBtn}>
                  <Text style={styles.clearDateSmallText}>Kaldır</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.semesterInactiveStatus, { color: textSecondary }]}>
                ℹ️ Henüz tarih belirlenmedi. Haftalık ders bildirimleri normal olarak çalmaktadır.
              </Text>
            )}
          </View>
        )}

        {/* 3. University Grading Scale Accordion */}
        {renderAccordionSection(
          'scale',
          'Not Skalası & Geçme Barajı',
          `Baraj: ${currentScale.passingThreshold} | AA: ${currentScale.aa} | CC: ${currentScale.cc}`,
          <Sliders size={18} color="#F59E0B" />,
          'rgba(245, 158, 11, 0.15)',
          <View>
            <Text style={[styles.cardSubtitle, { color: textSecondary, marginBottom: 12 }]}>
              Kendi üniversitenizin harf notu barajlarını ve geçme notunu özelleştirebilirsiniz.
            </Text>

            <View style={styles.scaleButtonsRow}>
              <TouchableOpacity
                style={[styles.customScaleBtn, { backgroundColor: subCardBg, borderColor: cardBorder }]}
                onPress={() => setScaleModalVisible(true)}
                activeOpacity={0.8}
              >
                <Sliders size={15} color="#F59E0B" />
                <Text style={[styles.customScaleBtnText, { color: textPrimary }]}>Harfleri Özelleştir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resetScaleBtn, { backgroundColor: subCardBg, borderColor: cardBorder }]}
                onPress={handleResetScaleToDefault}
                activeOpacity={0.8}
              >
                <RotateCcw size={15} color={activeColor} />
                <Text style={[styles.resetScaleBtnText, { color: activeColor }]}>Varsayılana Dön</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 4. Notifications & Battery Health Accordion */}
        {renderAccordionSection(
          'notifications',
          'Bildirim & Pil İzinleri',
          hasPermission ? '🟢 İzin Aktif' : '🔴 İzin Kısıtlı / Kapalı',
          <Bell size={18} color={activeColor} />,
          isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.15)',
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={[
                    styles.permStatusDot,
                    { backgroundColor: hasPermission ? '#10B981' : '#EF4444' },
                  ]}
                />
                <Text
                  style={[
                    styles.permStatusText,
                    { color: hasPermission ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {hasPermission ? 'Bildirimler İzinli & Aktif' : 'İzin Kısıtlı veya Kapalı'}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.systemSettingActionBtn,
                  { backgroundColor: hasPermission ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' },
                ]}
                onPress={handleOpenSystemSettings}
              >
                <Text
                  style={[
                    styles.systemSettingActionBtnText,
                    { color: hasPermission ? '#10B981' : '#EF4444' },
                  ]}
                >
                  Cihaz Ayarlarını Aç
                </Text>
              </TouchableOpacity>
            </View>

            {/* Test Notification Button */}
            <TouchableOpacity
              style={[styles.testNotificationBtn, { backgroundColor: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.12)' }]}
              onPress={handleTestNotification}
              disabled={testingNotification}
              activeOpacity={0.8}
            >
              <Sparkles size={16} color={activeColor} />
              <Text style={[styles.testNotificationBtnText, { color: activeColor }]}>
                {testingNotification ? 'Gönderiliyor...' : '🔔 Test Bildirimi Gönder'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            {/* Default Reminder Selector */}
            <Text style={[styles.subLabel, { color: textSecondary }]}>
              Varsayılan Hatırlatma Süresi
            </Text>
            <View style={styles.remindersGrid}>
              {REMINDER_OPTIONS.map(opt => {
                const isSelected = settings.defaultReminderMinutes === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.reminderPill,
                      { backgroundColor: isSelected ? activeColor : subCardBg, borderColor: cardBorder },
                    ]}
                    onPress={() => {
                      HapticsService.selection();
                      onUpdateSettings({ defaultReminderMinutes: opt.value });
                    }}
                  >
                    <Text
                      style={[
                        styles.reminderPillText,
                        { color: isSelected ? '#FFFFFF' : textSecondary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Battery Background Optimization Tips */}
            <View style={[styles.guideBox, { backgroundColor: subCardBg, borderColor: cardBorder }]}>
              <Text style={[styles.guideStep, { color: textPrimary }]}>
                <Text style={styles.guideStepBold}>1. Pil Tasarrufu:</Text> Telefon Ayarları &gt; Uygulamalar &gt; Akademik Asistan &gt; Pil menüsünden "Kısıtlama Yok" seçin.
              </Text>
              <Text style={[styles.guideStep, { color: textPrimary }]}>
                <Text style={styles.guideStepBold}>2. Otomatik Başlatma:</Text> Xiaomi / Huawei cihazlarda "Otomatik Başlatma" iznini açın.
              </Text>
            </View>
          </View>
        )}

        {/* 5. Lockscreen Poster & Timetable Sharing Accordion */}
        {renderAccordionSection(
          'poster',
          'Kilit Ekranı Posteri & Takvim',
          '📱 9:16 Duvar Kağıdı & .ics Dışa Aktar',
          <Smartphone size={18} color={activeColor} />,
          isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.15)',
          <View>
            <TouchableOpacity style={styles.actionRow} onPress={handleAddWidget}>
              <Sparkles size={18} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionRowText, { color: textPrimary }]}>
                  📲 Ana Ekrana Ders Widget\'ı Ekle
                </Text>
                <Text style={[styles.actionRowSub, { color: textSecondary }]}>
                  Günün derslerini ve sıradaki dersliğinizi telefon ana ekranınızda canlı takip edin (Android 16 uyumlu)
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            <TouchableOpacity style={styles.actionRow} onPress={() => setPosterModalVisible(true)}>
              <Smartphone size={18} color={activeColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionRowText, { color: textPrimary }]}>
                  🔒 Kilit Ekranı Duvar Kağıdı (Saat Korumalı)
                </Text>
                <Text style={[styles.actionRowSub, { color: textSecondary }]}>
                  Telefon saati ve bildirimleriyle çakışmayan safe-zone düzeniyle tek tıkla kilit ekranı yapın veya galeriye kaydedin
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            <TouchableOpacity style={styles.actionRow} onPress={handleExportCalendar}>
              <Calendar size={18} color={activeColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionRowText, { color: textPrimary }]}>
                  Dersleri Takvime Aktar (.ics)
                </Text>
                <Text style={[styles.actionRowSub, { color: textSecondary }]}>
                  Google Calendar, Apple Takvim veya Outlook için takvim dosyası
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            <TouchableOpacity style={styles.actionRow} onPress={handleShareTextSchedule}>
              <Share2 size={18} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionRowText, { color: textPrimary }]}>
                  Programı Metin Olarak Paylaş
                </Text>
                <Text style={[styles.actionRowSub, { color: textSecondary }]}>
                  WhatsApp, Telegram veya Notlar için formatlı haftalık program
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* 6. Privacy & PIN Vault Accordion */}
        {renderAccordionSection(
          'vault',
          'Gizlilik & Not Kasası',
          settings.isVaultProtected && settings.vaultPin
            ? '🔒 Korumalı (PIN Aktif)'
            : '🔓 Şifresiz Doğrudan Erişim',
          <Lock size={18} color={activeColor} />,
          isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.15)',
          <View>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: textPrimary }]}>
                  Not Kasası PIN Koruması
                </Text>
                <Text style={[styles.cardSubtitle, { color: textSecondary }]}>
                  {settings.isVaultProtected && settings.vaultPin
                    ? 'Korumalı (4 Haneli PIN Aktif)'
                    : 'Devre dışı (Kasaya doğrudan erişilebilir)'}
                </Text>
              </View>
              <Switch
                value={settings.isVaultProtected ?? false}
                onValueChange={val => {
                  HapticsService.selection();
                  if (val && !settings.vaultPin) {
                    setPinModalVisible(true);
                  } else {
                    onUpdateSettings({ isVaultProtected: val });
                  }
                }}
                thumbColor={settings.isVaultProtected ? activeColor : '#64748B'}
                trackColor={{ false: '#334155', true: isLight ? 'rgba(2, 132, 199, 0.4)' : 'rgba(56, 189, 248, 0.4)' }}
              />
            </View>

            {settings.isVaultProtected && settings.vaultPin && (
              <TouchableOpacity
                style={[styles.changePinBtn, { backgroundColor: subCardBg, borderColor: cardBorder }]}
                onPress={() => setPinModalVisible(true)}
              >
                <ShieldCheck size={14} color={activeColor} />
                <Text style={[styles.changePinBtnText, { color: activeColor }]}>PIN Kodunu Değiştir</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 7. Data Management & Backup Accordion */}
        {renderAccordionSection(
          'backup',
          'Veri Yedekleme & Geri Yükle',
          `${courses.length} Ders • ${localSnapshots.length} Hızlı Yedek`,
          <FolderOpen size={18} color="#10B981" />,
          'rgba(16, 185, 129, 0.15)',
          <View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: textSecondary }]}>Toplam Kayıtlı Ders</Text>
              <Text style={[styles.statValue, { color: activeColor }]}>{courses.length}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            <TouchableOpacity style={styles.actionRow} onPress={handleCreateSnapshot}>
              <Zap size={18} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionRowText, { color: textPrimary }]}>
                  ⚡ Cihaz İçi Hızlı Yedek Al (Anlık Görüntü)
                </Text>
                <Text style={[styles.actionRowSub, { color: textSecondary }]}>
                  Cihaz hafızasına anında kurtarma noktası kaydeder
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            <TouchableOpacity style={styles.actionRow} onPress={handleExportBackupFile}>
              <Download size={18} color={activeColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionRowText, { color: textPrimary }]}>
                  📁 Dosya Olarak Yedekle (.json Paylaş)
                </Text>
                <Text style={[styles.actionRowSub, { color: textSecondary }]}>
                  Drive, WhatsApp veya Dosyalar için .json formatında tam yedek
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            <TouchableOpacity style={styles.actionRow} onPress={handleImportBackupFile}>
              <FolderOpen size={18} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionRowText, { color: textPrimary }]}>
                  📂 Dosyadan Geri Yükle (.json Seç)
                </Text>
                <Text style={[styles.actionRowSub, { color: textSecondary }]}>
                  Telefonunuzdaki .json yedek dosyasını seçerek tek dokunuşla yükleyin
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            <TouchableOpacity style={styles.actionRow} onPress={openRestoreModal}>
              <Clock size={18} color="#A855F7" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionRowText, { color: textPrimary }]}>
                  🕒 Kayıtlı Yedekler & Metinle Kurtar
                </Text>
                <Text style={[styles.actionRowSub, { color: textSecondary }]}>
                  Cihaz içi geçmiş yedeklerden geri dönün veya panodan yapıştırın
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* 8. Danger Zone Accordion */}
        {renderAccordionSection(
          'danger',
          'Fabrika Ayarlarına Sıfırla',
          '⚠️ Tüm Dersleri ve Notları Temizle',
          <Trash2 size={18} color="#EF4444" />,
          'rgba(239, 68, 68, 0.15)',
          <View>
            <Text style={[styles.cardSubtitle, { marginBottom: 12, color: '#EF4444' }]}>
              Bu işlem tüm ders programınızı, sınavlarınızı, kayıtlı notlarınızı ve fotoğraflarınızı kalıcı olarak silecektir.
            </Text>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleClearAll}>
              <Trash2 size={16} color="#FFFFFF" />
              <Text style={styles.dangerBtnText}>Tüm Dersleri ve Verileri Sıfırla</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Replay Onboarding / Intro */}
        <TouchableOpacity
          style={[styles.replayIntroBtn, isLight && styles.replayIntroBtnLight]}
          onPress={() => {
            HapticsService.light();
            onUpdateSettings({ onboardingCompleted: false });
          }}
          activeOpacity={0.8}
        >
          <Sparkles size={16} color={activeColor} />
          <Text style={[styles.replayIntroBtnText, { color: activeColor }]}>
            Uygulama Tanıtımını Yeniden İzle
          </Text>
        </TouchableOpacity>

        {/* App Version Footer */}
        <View style={styles.versionFooter}>
          <Text style={[styles.versionText, { color: textSecondary }]}>
            Akademik Asistan Pro • v1.0.0 (İlk Sürüm)
          </Text>
          <Text style={[styles.versionSubText, { color: activeColor }]}>
            ⚡ %100 Çevrimdışı Güvenli Mimari
          </Text>
        </View>

        <View style={{ height: 60 }} />
      </View>

      {/* Lockscreen Timetable Poster Modal */}
      <TimetablePosterModal
        visible={posterModalVisible}
        courses={courses}
        theme={effectiveTheme}
        onClose={() => setPosterModalVisible(false)}
      />

      {/* Calendar Date Picker Modal for Semester Start */}
      <CalendarDatePickerModal
        visible={datePickerVisible}
        initialDate={settings.semesterStartDate}
        theme={effectiveTheme}
        onSelectDate={handleSaveSemesterStartDate}
        onClose={() => setDatePickerVisible(false)}
      />

      {/* PIN Lock Setup Modal */}
      <PinLockModal
        visible={pinModalVisible}
        title="Güvenlik PIN Kodu Belirleyin"
        subtitle="Not Kasası için 4 haneli yeni şifre oluşturun:"
        theme={effectiveTheme}
        onSuccess={pin => {
          onUpdateSettings({ vaultPin: pin, isVaultProtected: true });
          setPinModalVisible(false);
          Alert.alert('✅ Başarılı', 'Not kasası şifreniz başarıyla kaydedildi.');
        }}
        onClose={() => setPinModalVisible(false)}
      />

      {/* Restore & Snapshots Modal */}
      <Modal
        visible={restoreModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRestoreModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Yedekten Geri Yükle</Text>
              <TouchableOpacity onPress={() => setRestoreModalVisible(false)}>
                <X size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Tabs */}
            <View style={[styles.restoreTabs, { backgroundColor: subCardBg }]}>
              <TouchableOpacity
                style={[
                  styles.restoreTabBtn,
                  restoreTab === 'device' && [styles.restoreTabBtnActive, { backgroundColor: cardBg }],
                ]}
                onPress={() => setRestoreTab('device')}
              >
                <Text
                  style={[
                    styles.restoreTabText,
                    { color: restoreTab === 'device' ? activeColor : textSecondary },
                  ]}
                >
                  🕒 Cihaz İçi ({localSnapshots.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.restoreTabBtn,
                  restoreTab === 'text' && [styles.restoreTabBtnActive, { backgroundColor: cardBg }],
                ]}
                onPress={() => setRestoreTab('text')}
              >
                <Text
                  style={[
                    styles.restoreTabText,
                    { color: restoreTab === 'text' ? activeColor : textSecondary },
                  ]}
                >
                  📋 Panodan / Metin
                </Text>
              </TouchableOpacity>
            </View>

            {restoreTab === 'device' ? (
              <View>
                {localSnapshots.length === 0 ? (
                  <View style={styles.emptySnapshotBox}>
                    <Clock size={32} color={textSecondary} style={{ marginBottom: 8 }} />
                    <Text style={[styles.emptySnapshotText, { color: textSecondary }]}>
                      Henüz cihaz içi hızlı yedek alınmamış.{'\n\n'}
                      Ayarlar ekranındaki "⚡ Cihaz İçi Hızlı Yedek Al" butonuna dokunarak kurtarma noktası oluşturabilirsiniz.
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={styles.snapshotList}>
                    {localSnapshots.map(snap => (
                      <View
                        key={snap.id}
                        style={[styles.snapshotCard, { backgroundColor: subCardBg, borderColor: cardBorder }]}
                      >
                        <View style={styles.snapshotInfo}>
                          <Text style={[styles.snapshotDate, { color: textPrimary }]}>
                            📅 {snap.dateFormatted}
                          </Text>
                          <Text style={[styles.snapshotSub, { color: textSecondary }]}>
                            • {snap.courseCount} Kayıtlı Ders • Tam Veri Paketi
                          </Text>
                        </View>
                        <View style={styles.snapshotActions}>
                          <TouchableOpacity
                            style={[styles.snapshotRestoreBtn, { backgroundColor: activeColor }]}
                            onPress={() => handleRestoreSnapshot(snap.id, snap.dateFormatted)}
                          >
                            <Text style={styles.snapshotRestoreText}>Yükle</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.snapshotDeleteBtn}
                            onPress={() => handleDeleteSnapshot(snap.id)}
                          >
                            <Trash2 size={13} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : (
              <View>
                <TouchableOpacity
                  style={[styles.pasteClipboardBtn, { backgroundColor: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.12)' }]}
                  onPress={handlePasteFromClipboard}
                >
                  <Copy size={14} color={activeColor} />
                  <Text style={[styles.pasteClipboardText, { color: activeColor }]}>Panodaki Metni Yapıştır</Text>
                </TouchableOpacity>

                <TextInput
                  style={[
                    styles.restoreTextInput,
                    { backgroundColor: subCardBg, borderColor: cardBorder, color: textPrimary },
                  ]}
                  placeholder="Yedek JSON metnini buraya yapıştırın..."
                  placeholderTextColor={textSecondary}
                  multiline
                  numberOfLines={5}
                  value={restoreJsonInput}
                  onChangeText={setRestoreJsonInput}
                />

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: activeColor, marginTop: 10 }]}
                  onPress={async () => {
                    if (!restoreJsonInput.trim()) {
                      Alert.alert('Eksik Bilgi', 'Lütfen yedek JSON metnini kutuya yapıştırın.');
                      return;
                    }
                    HapticsService.medium();
                    const res = await StorageService.importFullBackup(restoreJsonInput.trim());
                    if (res.success) {
                      HapticsService.success();
                      setRestoreModalVisible(false);
                      setRestoreJsonInput('');
                      onRefreshCourses();
                      Alert.alert('✅ Başarılı', res.message);
                    } else {
                      HapticsService.error();
                      Alert.alert('Hata', res.message);
                    }
                  }}
                >
                  <Text style={styles.modalConfirmText}>Metinden Geri Yükle</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalCancelBtn, { borderColor: cardBorder, marginTop: 12 }]}
              onPress={() => setRestoreModalVisible(false)}
            >
              <Text style={[styles.modalCancelText, { color: textSecondary }]}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Grading Scale Customization Modal */}
      <Modal
        visible={scaleModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setScaleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Harf Notu Skalası</Text>
              <TouchableOpacity onPress={() => setScaleModalVisible(false)}>
                <X size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: textSecondary, marginBottom: 12 }]}>
              Üniversitenizin her harf için istediği minimum puanı belirleyin:
            </Text>

            <ScrollView style={{ maxHeight: 320 }}>
              <View style={styles.scaleGrid}>
                <View style={styles.scaleItem}>
                  <Text style={[styles.scaleItemLabel, { color: textSecondary }]}>Geçme Barajı</Text>
                  <TextInput
                    style={[styles.scaleInput, { backgroundColor: subCardBg, borderColor: cardBorder, color: textPrimary }]}
                    keyboardType="numeric"
                    value={customPassing}
                    onChangeText={setCustomPassing}
                  />
                </View>
                <View style={styles.scaleItem}>
                  <Text style={[styles.scaleItemLabel, { color: textSecondary }]}>AA (Mükemmel)</Text>
                  <TextInput
                    style={[styles.scaleInput, { backgroundColor: subCardBg, borderColor: cardBorder, color: textPrimary }]}
                    keyboardType="numeric"
                    value={customAA}
                    onChangeText={setCustomAA}
                  />
                </View>
                <View style={styles.scaleItem}>
                  <Text style={[styles.scaleItemLabel, { color: textSecondary }]}>BA</Text>
                  <TextInput
                    style={[styles.scaleInput, { backgroundColor: subCardBg, borderColor: cardBorder, color: textPrimary }]}
                    keyboardType="numeric"
                    value={customBA}
                    onChangeText={setCustomBA}
                  />
                </View>
                <View style={styles.scaleItem}>
                  <Text style={[styles.scaleItemLabel, { color: textSecondary }]}>BB</Text>
                  <TextInput
                    style={[styles.scaleInput, { backgroundColor: subCardBg, borderColor: cardBorder, color: textPrimary }]}
                    keyboardType="numeric"
                    value={customBB}
                    onChangeText={setCustomBB}
                  />
                </View>
                <View style={styles.scaleItem}>
                  <Text style={[styles.scaleItemLabel, { color: textSecondary }]}>CB</Text>
                  <TextInput
                    style={[styles.scaleInput, { backgroundColor: subCardBg, borderColor: cardBorder, color: textPrimary }]}
                    keyboardType="numeric"
                    value={customCB}
                    onChangeText={setCustomCB}
                  />
                </View>
                <View style={styles.scaleItem}>
                  <Text style={[styles.scaleItemLabel, { color: textSecondary }]}>CC (Geçer)</Text>
                  <TextInput
                    style={[styles.scaleInput, { backgroundColor: subCardBg, borderColor: cardBorder, color: textPrimary }]}
                    keyboardType="numeric"
                    value={customCC}
                    onChangeText={setCustomCC}
                  />
                </View>
                <View style={styles.scaleItem}>
                  <Text style={[styles.scaleItemLabel, { color: textSecondary }]}>DC (Koşullu)</Text>
                  <TextInput
                    style={[styles.scaleInput, { backgroundColor: subCardBg, borderColor: cardBorder, color: textPrimary }]}
                    keyboardType="numeric"
                    value={customDC}
                    onChangeText={setCustomDC}
                  />
                </View>
                <View style={styles.scaleItem}>
                  <Text style={[styles.scaleItemLabel, { color: textSecondary }]}>DD (Koşullu)</Text>
                  <TextInput
                    style={[styles.scaleInput, { backgroundColor: subCardBg, borderColor: cardBorder, color: textPrimary }]}
                    keyboardType="numeric"
                    value={customDD}
                    onChangeText={setCustomDD}
                  />
                </View>
                <View style={styles.scaleItem}>
                  <Text style={[styles.scaleItemLabel, { color: textSecondary }]}>FD (Kaldı)</Text>
                  <TextInput
                    style={[styles.scaleInput, { backgroundColor: subCardBg, borderColor: cardBorder, color: textPrimary }]}
                    keyboardType="numeric"
                    value={customFD}
                    onChangeText={setCustomFD}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.scaleModalBtnRow}>
              <TouchableOpacity
                style={[styles.scaleResetModalBtn, { backgroundColor: subCardBg, borderColor: cardBorder }]}
                onPress={handleResetScaleToDefault}
              >
                <RotateCcw size={14} color={activeColor} />
                <Text style={[styles.scaleResetModalBtnText, { color: activeColor }]}>Varsayılana Dön</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: activeColor }]}
                onPress={() => {
                  onUpdateSettings({
                    gradingScale: {
                      passingThreshold: parseInt(customPassing, 10) || 50,
                      aa: parseInt(customAA, 10) || 90,
                      ba: parseInt(customBA, 10) || 85,
                      bb: parseInt(customBB, 10) || 80,
                      cb: parseInt(customCB, 10) || 75,
                      cc: parseInt(customCC, 10) || 70,
                      dc: parseInt(customDC, 10) || 60,
                      dd: parseInt(customDD, 10) || 50,
                      fd: parseInt(customFD, 10) || 40,
                    },
                  });
                  setScaleModalVisible(false);
                  Alert.alert('✅ Kaydedildi', 'Özel not skalası başarıyla uygulandı.');
                }}
              >
                <Text style={styles.modalConfirmText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  welcomeBanner: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  accordionCard: {
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  accordionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  accordionBadgeText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  chevronBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  themeGridBtn: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  systemThemeInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  systemThemeInfoText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  languageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  flagIcon: {
    fontSize: 22,
  },
  languageBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  themeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  themeBtnActive: {
    borderWidth: 1.5,
  },
  themeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  oledDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
    borderWidth: 1,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  openCalendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  openCalendarBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  semesterStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  semesterActiveStatus: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
    flex: 1,
  },
  clearDateSmallBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearDateSmallText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '800',
  },
  semesterInactiveStatus: {
    fontSize: 11,
    marginTop: 8,
  },
  scaleButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customScaleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  customScaleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resetScaleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetScaleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  permStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  permStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  systemSettingActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  systemSettingActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  testNotificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  testNotificationBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  remindersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  reminderPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  reminderPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  guideBox: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    gap: 6,
  },
  guideStep: {
    fontSize: 11,
    lineHeight: 16,
  },
  guideStepBold: {
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  actionRowText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionRowSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  changePinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  changePinBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  dangerBtn: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  dangerBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  versionFooter: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  versionSubText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  restoreTabs: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  restoreTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  restoreTabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  restoreTabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptySnapshotBox: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  emptySnapshotText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  snapshotList: {
    maxHeight: 260,
  },
  snapshotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  snapshotInfo: {
    flex: 1,
  },
  snapshotDate: {
    fontSize: 12,
    fontWeight: '800',
  },
  snapshotSub: {
    fontSize: 10,
    marginTop: 2,
  },
  snapshotActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  snapshotRestoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  snapshotRestoreText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  snapshotDeleteBtn: {
    padding: 6,
  },
  pasteClipboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  pasteClipboardText: {
    fontSize: 11,
    fontWeight: '700',
  },
  restoreTextInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
    height: 100,
    textAlignVertical: 'top',
  },
  modalConfirmBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalCancelBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scaleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  scaleItem: {
    width: '48%',
  },
  scaleItemLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  scaleInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  scaleModalBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  scaleResetModalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  scaleResetModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  replayIntroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  replayIntroBtnLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  replayIntroBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
