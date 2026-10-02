import { Course, GPACalculationResult } from '../types';

export const LETTER_GRADE_POINTS: Record<string, number> = {
  AA: 4.0,
  BA: 3.5,
  BB: 3.0,
  CB: 2.5,
  CC: 2.0,
  DC: 1.5,
  DD: 1.0,
  FD: 0.5,
  FF: 0.0,
};

export const DEFAULT_COURSE_AKTS = 4;

export class GPACalculator {
  /**
   * Returns GPA point equivalent for a letter grade (0.0 - 4.0)
   */
  static getGradePoint(letterGrade?: string): number | undefined {
    if (!letterGrade) return undefined;
    const normalized = letterGrade.toUpperCase().trim();
    return LETTER_GRADE_POINTS[normalized];
  }

  /**
   * Calculates weighted GPA and AKTS distribution for a list of courses
   */
  static calculate(courses: Course[]): GPACalculationResult {
    let totalWeightedPoints = 0;
    let gradedAkts = 0;
    let totalAkts = 0;

    const courseDetails = courses.map(course => {
      const akts = course.akts && course.akts > 0 ? course.akts : DEFAULT_COURSE_AKTS;
      totalAkts += akts;

      const letterGrade = course.gradeStatus?.letterGrade;
      const gpaPoint = this.getGradePoint(letterGrade);
      const isGraded = gpaPoint !== undefined;

      if (isGraded) {
        totalWeightedPoints += gpaPoint * akts;
        gradedAkts += akts;
      }

      return {
        courseId: course.id,
        courseName: course.name,
        akts,
        letterGrade,
        gpaPoint,
        isGraded,
      };
    });

    const gpa = gradedAkts > 0 ? Number((totalWeightedPoints / gradedAkts).toFixed(2)) : 0.0;

    let honorStatus: 'none' | 'honor' | 'high_honor' = 'none';
    let honorText = 'Notlar Bekleniyor';

    if (gradedAkts > 0) {
      if (gpa >= 3.5) {
        honorStatus = 'high_honor';
        honorText = 'Yüksek Onur Öğrencisi 🏆';
      } else if (gpa >= 3.0) {
        honorStatus = 'honor';
        honorText = 'Onur Öğrencisi 🎖️';
      } else if (gpa >= 2.0) {
        honorStatus = 'none';
        honorText = 'Başarılı Öğrenci ✅';
      } else {
        honorStatus = 'none';
        honorText = 'Akademik Kritik / Uyarı Sınırı ⚠️';
      }
    }

    return {
      gpa,
      totalAkts,
      gradedAkts,
      honorStatus,
      honorText,
      courseDetails,
    };
  }

  /**
   * Simulates what average grade point is needed in remaining ungraded courses to achieve a target GPA
   */
  static simulateTargetGPA(
    courses: Course[],
    targetGPA: number
  ): {
    requiredGradePoint: number;
    recommendedLetter: string;
    isAchievable: boolean;
    message: string;
  } {
    const current = this.calculate(courses);
    const ungradedCourses = current.courseDetails.filter(c => !c.isGraded);
    const ungradedAkts = ungradedCourses.reduce((sum, c) => sum + c.akts, 0);

    if (ungradedAkts === 0) {
      const reached = current.gpa >= targetGPA;
      return {
        requiredGradePoint: current.gpa,
        recommendedLetter: current.gpa >= 3.5 ? 'AA' : current.gpa >= 3.0 ? 'BA' : 'BB',
        isAchievable: reached,
        message: reached
          ? `Tüm notlar girildi ve hedef ortalamaya (${current.gpa.toFixed(2)}) ulaşıldı!`
          : `Tüm notlar girildi. Mevcut ortalamanız: ${current.gpa.toFixed(2)}`,
      };
    }

    // Current weighted points
    const currentPoints = current.gpa * current.gradedAkts;
    // Total points needed = targetGPA * totalAkts
    const totalPointsNeeded = targetGPA * current.totalAkts;
    // Remaining points needed
    const remainingPointsNeeded = totalPointsNeeded - currentPoints;
    const requiredGradePoint = remainingPointsNeeded / ungradedAkts;

    if (requiredGradePoint > 4.0) {
      return {
        requiredGradePoint: Number(requiredGradePoint.toFixed(2)),
        recommendedLetter: 'AA Üstü',
        isAchievable: false,
        message: `Hedef ${targetGPA.toFixed(2)} için kalan derslerden ortalama ${requiredGradePoint.toFixed(2)} katsayı gerekir (4.00 üstü, ulaşılamaz).`,
      };
    }

    if (requiredGradePoint <= 0) {
      return {
        requiredGradePoint: 0.0,
        recommendedLetter: 'FF / Geçer Not',
        isAchievable: true,
        message: `Mevcut notlarınız yeterli! Kalan derslerden geçmeniz (${targetGPA.toFixed(2)} hedefini tutturmanız için) yeterlidir.`,
      };
    }

    // Find recommended letter
    let recLetter = 'FF';
    for (const [letter, point] of Object.entries(LETTER_GRADE_POINTS)) {
      if (point >= requiredGradePoint) {
        recLetter = letter;
      }
    }

    return {
      requiredGradePoint: Number(requiredGradePoint.toFixed(2)),
      recommendedLetter: recLetter,
      isAchievable: true,
      message: `Kalan ${ungradedCourses.length} dersten ortalama ${requiredGradePoint.toFixed(2)} katsayı (${recLetter}) alırsanız hedefinize ulaşırsınız!`,
    };
  }
}
