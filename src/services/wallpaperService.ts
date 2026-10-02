import { Dimensions, NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { Course, DAYS_OF_WEEK } from '../types';

const { AkademikWallpaperModule } = NativeModules;

export type WallpaperMode = 'lockscreen' | 'fullscreen';

export class WallpaperService {
  /**
   * Generates self-contained HTML that renders a timetable poster onto an HTML5 canvas
   * dynamically sized to the user's exact screen aspect ratio (e.g. 1080x2400 for 20:9 screens).
   */
  static generateWallpaperHtml(courses: Course[], mode: WallpaperMode = 'lockscreen'): string {
    const { width: scrW, height: scrH } = Dimensions.get('screen');
    const ratio = scrH > 0 && scrW > 0 ? scrH / scrW : 2400 / 1080;
    const canvasWidth = 1080;
    const canvasHeight = Math.max(1920, Math.round(canvasWidth * ratio));

    const coursesJson = JSON.stringify(courses);
    const daysJson = JSON.stringify(DAYS_OF_WEEK);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=${canvasWidth}, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #070B14; display: flex; justify-content: center; align-items: center; overflow: hidden; }
    canvas { width: ${canvasWidth}px; height: ${canvasHeight}px; }
  </style>
</head>
<body>
  <canvas id="posterCanvas" width="${canvasWidth}" height="${canvasHeight}"></canvas>
  <script>
    (function() {
      try {
        const canvas = document.getElementById('posterCanvas');
        const ctx = canvas.getContext('2d');
        const courses = ${coursesJson};
        const days = ${daysJson};
        const isLockscreen = ${mode === 'lockscreen'};
        const canvasWidth = ${canvasWidth};
        const canvasHeight = ${canvasHeight};

        // 1. Deep Midnight Background Gradient
        const bgGrad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        bgGrad.addColorStop(0, '#060A14');
        bgGrad.addColorStop(0.25, '#0B1120');
        bgGrad.addColorStop(0.65, '#070C18');
        bgGrad.addColorStop(1, '#020409');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 2. Ambient subtle glowing orbs
        const orb1 = ctx.createRadialGradient(250, isLockscreen ? 300 : 200, 0, 250, isLockscreen ? 300 : 200, 500);
        orb1.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
        orb1.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = orb1;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const orb2 = ctx.createRadialGradient(canvasWidth - 200, canvasHeight - 400, 0, canvasWidth - 200, canvasHeight - 400, 550);
        orb2.addColorStop(0, 'rgba(139, 92, 246, 0.12)');
        orb2.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.fillStyle = orb2;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 3. Safe Zone Layout
        // For lockscreen mode: Top ~37% is kept clean for Android 16 / HyperOS large clock & weather widget
        let currentY = isLockscreen ? Math.round(canvasHeight * 0.36) : 130;

        // Header Title
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#38BDF8';
        ctx.letterSpacing = '3px';
        ctx.fillText('AKADEMİK ASİSTAN', canvasWidth / 2, currentY);

        currentY += 42;
        ctx.font = '900 36px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.letterSpacing = '1px';
        ctx.fillText('HAFTALIK DERS PROGRAMI', canvasWidth / 2, currentY);

        currentY += 20;
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect((canvasWidth / 2) - 45, currentY, 90, 4);

        currentY += 34;

        // Filter active days
        const filteredDays = days.filter(d => courses.some(c => c.day === d.id));

        if (filteredDays.length === 0) {
          ctx.font = '500 26px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#94A3B8';
          ctx.fillText('Henüz kayıtlı ders bulunmuyor.', canvasWidth / 2, currentY + 120);
        } else {
          const totalCoursesCount = courses.length;
          const availableHeight = (canvasHeight - 120) - currentY;
          // Dynamically adapt card sizing if schedule is dense
          const cardHeight = totalCoursesCount > 10 ? 70 : 80;
          const cardMargin = totalCoursesCount > 10 ? 8 : 12;

          filteredDays.forEach(day => {
            const dayCourses = courses.filter(c => c.day === day.id);
            if (dayCourses.length === 0) return;

            // Day Header
            ctx.textAlign = 'left';
            ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#38BDF8';
            ctx.fillText(day.name.toUpperCase(), 70, currentY);

            ctx.textAlign = 'right';
            ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#94A3B8';
            ctx.fillText(dayCourses.length + ' Ders', canvasWidth - 70, currentY);

            currentY += 12;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(70, currentY);
            ctx.lineTo(canvasWidth - 70, currentY);
            ctx.stroke();

            currentY += 16;

            // Day Courses
            dayCourses.forEach(c => {
              if (currentY + cardHeight > canvasHeight - 90) return; // Prevent overflow

              // Card Container
              ctx.fillStyle = 'rgba(23, 33, 52, 0.88)';
              roundRect(ctx, 70, currentY, canvasWidth - 140, cardHeight, 14);
              ctx.fill();

              ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
              ctx.lineWidth = 1;
              ctx.stroke();

              // Color Bar
              ctx.fillStyle = c.color || '#38BDF8';
              roundRect(ctx, 70, currentY, 10, cardHeight, { tl: 14, bl: 14, tr: 0, br: 0 });
              ctx.fill();

              // Course Name
              ctx.textAlign = 'left';
              ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
              ctx.fillStyle = '#F8FAFC';
              const nameLimit = canvasWidth > 1200 ? 38 : 30;
              const truncatedName = c.name.length > nameLimit ? c.name.substring(0, nameLimit - 2) + '...' : c.name;
              ctx.fillText(truncatedName, 98, currentY + (cardHeight === 70 ? 30 : 34));

              // Time
              ctx.textAlign = 'right';
              ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
              ctx.fillStyle = '#38BDF8';
              ctx.fillText((c.startTime || '09:00') + ' - ' + (c.endTime || '10:30'), canvasWidth - 90, currentY + (cardHeight === 70 ? 30 : 34));

              // Details
              ctx.textAlign = 'left';
              ctx.font = '500 18px system-ui, -apple-system, sans-serif';
              ctx.fillStyle = '#94A3B8';
              const details = '📍 ' + (c.classroom || 'Derslik') + '   👨‍🏫 ' + (c.instructor || 'Öğretim Üyesi') + (c.akts ? '   ⭐ ' + c.akts + ' AKTS' : '');
              const detailsLimit = canvasWidth > 1200 ? 58 : 48;
              ctx.fillText(details.length > detailsLimit ? details.substring(0, detailsLimit - 2) + '...' : details, 98, currentY + (cardHeight === 70 ? 56 : 64));

              currentY += cardHeight + cardMargin;
            });

            currentY += 12;
          });
        }

        // Footer at bottom
        ctx.textAlign = 'center';
        ctx.font = '500 18px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('⚡ Akademik Asistan • Çevrimdışı Kilit Ekranı Çizelgesi', canvasWidth / 2, canvasHeight - 40);

        // Export to Base64
        setTimeout(function() {
          const dataUrl = canvas.toDataURL('image/png');
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(dataUrl);
          }
        }, 150);

      } catch (err) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ error: err.message }));
        }
      }

      function roundRect(ctx, x, y, width, height, radius) {
        if (typeof radius === 'number') {
          radius = { tl: radius, tr: radius, br: radius, bl: radius };
        } else {
          radius = { tl: radius.tl || 0, tr: radius.tr || 0, br: radius.br || 0, bl: radius.bl || 0 };
        }
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();
      }
    })();
  </script>
</body>
</html>`;
  }

  /**
   * Saves base64 PNG data to the app's cache directory and returns the file URI.
   */
  static async saveBase64Image(base64DataUrl: string): Promise<string> {
    const base64Code = base64DataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    const filename = `ders_programi_duvar_kagidi_${Date.now()}.png`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, base64Code, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  }

  /**
   * Directly sets the image as the phone's wallpaper via native Android WallpaperManager.
   * target: 'lock' (Lock screen), 'home' (Home screen), or 'both'.
   */
  static async setWallpaperDirectly(
    fileUri: string,
    target: 'lock' | 'home' | 'both' = 'lock'
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (Platform.OS === 'android' && AkademikWallpaperModule) {
        await AkademikWallpaperModule.setWallpaper(fileUri, target);
        const targetDesc =
          target === 'lock'
            ? 'Kilit Ekranı'
            : target === 'home'
            ? 'Ana Ekran'
            : 'Kilit ve Ana Ekran';
        return {
          success: true,
          message: `Duvar kağıdı ${targetDesc} olarak başarıyla uygulandı! ✨`,
        };
      }

      // Fallback if native module not found
      return await this.setAsWallpaperSystemIntent(fileUri);
    } catch (e: any) {
      console.warn('Direct wallpaper error:', e);
      // Fallback to system intent
      return await this.setAsWallpaperSystemIntent(fileUri);
    }
  }

  /**
   * Saves the generated high-resolution wallpaper to the phone's MediaStore Gallery
   * in the "Pictures/AkademikAsistan" album so it can be viewed or used anytime.
   */
  static async saveToGallery(fileUri: string): Promise<{ success: boolean; message: string }> {
    try {
      if (Platform.OS === 'android' && AkademikWallpaperModule) {
        await AkademikWallpaperModule.saveToGallery(fileUri);
        return {
          success: true,
          message:
            'Görsel telefonunuzun Galerisine (Fotoğraflar/AkademikAsistan) tam ekran çözünürlüğünde kaydedildi! 🖼️',
        };
      }

      // Fallback
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          dialogTitle: 'Ders Programı Görselini Kaydet',
          mimeType: 'image/png',
          UTI: 'public.png',
        });
        return {
          success: true,
          message: 'Paylaşım ekranından "Fotoğraflara Kaydet" seçeneğini kullanabilirsiniz.',
        };
      }

      return {
        success: false,
        message: 'Galeriye kayıt desteklenmiyor.',
      };
    } catch (e: any) {
      console.warn('Save to gallery error:', e);
      return {
        success: false,
        message: e?.message || 'Galeriye kaydedilemedi.',
      };
    }
  }

  /**
   * Fallback: Triggers Android wallpaper setup screen or share sheet.
   */
  static async setAsWallpaperSystemIntent(
    fileUri: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(fileUri);

        try {
          await IntentLauncher.startActivityAsync('android.intent.action.ATTACH_DATA', {
            data: contentUri,
            type: 'image/png',
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            extra: {
              mimeType: 'image/png',
            },
          });
          return {
            success: true,
            message: 'Sistem duvar kağıdı ayarları açıldı. Kilit veya ana ekran olarak onaylayabilirsiniz.',
          };
        } catch {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              dialogTitle: 'Ders Programını Duvar Kağıdı Olarak Ayarla',
              mimeType: 'image/png',
              UTI: 'public.png',
            });
            return {
              success: true,
              message: 'Paylaşım menüsü açıldı. "Duvar Kağıdı Yap" seçeneğini seçebilirsiniz.',
            };
          }
        }
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            dialogTitle: 'Ders Programını Duvar Kağıdı Olarak Ayarla',
            mimeType: 'image/png',
            UTI: 'public.png',
          });
          return {
            success: true,
            message: 'Paylaşım menüsü açıldı.',
          };
        }
      }

      return {
        success: false,
        message: 'Duvar kağıdı ayarlanamadı.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Duvar kağıdı ayarlanamadı.',
      };
    }
  }

  /**
   * Shares the generated wallpaper PNG file directly.
   */
  static async shareImage(fileUri: string): Promise<boolean> {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          dialogTitle: 'Haftalık Ders Programı Posteri',
          mimeType: 'image/png',
          UTI: 'public.png',
        });
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Share image error:', e);
      return false;
    }
  }
}
