import { Course } from '../types';

export class QRCodeService {
  /**
   * Serializes a list of courses into a compact, sharable JSON string
   */
  static serializeCourses(courses: Course[]): string {
    const compactList = courses.map(c => ({
      n: c.name,
      i: c.instructor || '',
      r: c.classroom || '',
      d: c.day,
      s: c.startTime,
      e: c.endTime,
      c: c.color || '#3B82F6',
      a: c.akts || 4,
      m: c.maxAbsenceCount || 4,
      cat: c.category || 'zorunlu',
      mod: c.mode || 'in_person',
    }));

    const jsonStr = JSON.stringify(compactList);
    return `AKDMK:v1:${jsonStr}`;
  }

  /**
   * Deserializes and validates a payload string into full Course objects
   */
  static deserializeCourses(payload: string): {
    success: boolean;
    courses?: Course[];
    message: string;
  } {
    try {
      let rawJson = payload.trim();
      if (rawJson.startsWith('AKDMK:v1:')) {
        rawJson = rawJson.substring('AKDMK:v1:'.length);
      }

      const list = JSON.parse(rawJson);
      if (!Array.isArray(list) || list.length === 0) {
        return {
          success: false,
          message: 'Geçersiz karekod verisi. Ders listesi bulunamadı.',
        };
      }

      const courses: Course[] = list.map((item: any, idx: number) => ({
        id: 'course_qr_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 6),
        name: String(item.n || 'Ders ' + (idx + 1)),
        instructor: String(item.i || ''),
        classroom: String(item.r || ''),
        day: typeof item.d === 'number' ? item.d : 0,
        startTime: String(item.s || '09:00'),
        endTime: String(item.e || '10:30'),
        color: String(item.c || '#3B82F6'),
        reminderMinutes: 15,
        category: item.cat || 'zorunlu',
        mode: item.mod || 'in_person',
        akts: typeof item.a === 'number' ? item.a : 4,
        maxAbsenceCount: typeof item.m === 'number' ? item.m : 4,
        createdAt: Date.now() + idx,
      }));

      return {
        success: true,
        courses,
        message: `${courses.length} adet ders başarıyla içeri aktarıldı!`,
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Karekod çözümlenirken hata oluştu: ${e?.message || 'Geçersiz veri'}`,
      };
    }
  }

  /**
   * Generates a 2D boolean grid matrix representing a visual QR code pattern with 3 finder patterns
   */
  static generateMatrix(input: string, size = 25): boolean[][] {
    const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Helper to draw a 7x7 finder pattern with 1px border at (row, col)
    const drawFinderPattern = (r: number, c: number) => {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (
            i === 0 ||
            i === 6 ||
            j === 0 ||
            j === 6 ||
            (i >= 2 && i <= 4 && j >= 2 && j <= 4)
          ) {
            if (r + i < size && c + j < size) {
              matrix[r + i][c + j] = true;
            }
          }
        }
      }
    };

    // Draw top-left, top-right, bottom-left finder patterns
    drawFinderPattern(0, 0);
    drawFinderPattern(0, size - 7);
    drawFinderPattern(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    // Pseudo-random pseudo-deterministic data fill based on string hash
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }

    // Fill non-reserved area with hash bits
    let bitIndex = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip finder pattern zones
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= size - 8;
        const inBottomLeft = r >= size - 8 && c < 8;
        const inTiming = r === 6 || c === 6;

        if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming) {
          const charCode = input.charCodeAt(bitIndex % input.length) || 42;
          const bit = ((hash ^ (charCode * (r * size + c))) & 1) === 1;
          matrix[r][c] = bit;
          bitIndex++;
        }
      }
    }

    return matrix;
  }
}
