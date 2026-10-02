import { Course, Exam, ExamType, CourseGradeStatus, PassingStatus, GradingScaleConfig, DEFAULT_GRADING_SCALE } from '../types';

export class ExamEngine {
  /**
   * Calculates course grade status from vize, final and but scores
   */
  static calculateGradeStatus(
    vizeScore?: number,
    finalScore?: number,
    butScore?: number,
    vizeWeight = 0.4,
    finalWeight = 0.6,
    scale: GradingScaleConfig = DEFAULT_GRADING_SCALE
  ): CourseGradeStatus {
    if (vizeScore === undefined && finalScore === undefined) {
      return {
        status: 'in_progress',
        hasButEligibility: false,
        butEligibilityReason: 'Notlar Henüz Girilmedi',
      };
    }

    const effectiveFinal = butScore !== undefined ? butScore : finalScore;

    if (vizeScore !== undefined && effectiveFinal !== undefined) {
      const avg = Math.round(vizeScore * vizeWeight + effectiveFinal * finalWeight);
      const isUnderThreshold = effectiveFinal < scale.passingThreshold;
      const letter = isUnderThreshold ? 'FF' : this.getLetterGrade(avg, scale);
      const passing = isUnderThreshold ? 'failed' : this.getPassingStatus(letter);

      let hasBut = false;
      let butReason = 'Geçti (Büt Hakkı Yok)';

      if (isUnderThreshold) {
        hasBut = true;
        butReason = `Final Barajı Altında (En az ${scale.passingThreshold} gerekli)`;
      } else if (passing === 'failed') {
        hasBut = true;
        butReason = 'Kaldı (Büt Zorunlu)';
      } else if (passing === 'conditional_passed') {
        hasBut = true;
        butReason = 'Koşullu Geçti (İsteğe Bağlı Büt)';
      }

      return {
        vizeScore,
        finalScore,
        butScore,
        calculatedAverage: avg,
        letterGrade: letter,
        status: passing,
        hasButEligibility: hasBut,
        butEligibilityReason: butReason,
      };
    }

    return {
      vizeScore,
      finalScore,
      butScore,
      status: 'in_progress',
      hasButEligibility: false,
      butEligibilityReason: 'Final Bekleniyor',
    };
  }

  /**
   * Returns letter grade from numeric average
   */
  static getLetterGrade(avg: number, scale: GradingScaleConfig = DEFAULT_GRADING_SCALE): string {
    if (avg >= scale.aa) return 'AA';
    if (avg >= scale.ba) return 'BA';
    if (avg >= scale.bb) return 'BB';
    if (avg >= scale.cb) return 'CB';
    if (avg >= scale.cc) return 'CC';
    if (avg >= scale.dc) return 'DC';
    if (avg >= scale.dd) return 'DD';
    if (avg >= scale.fd) return 'FD';
    return 'FF';
  }

  /**
   * Returns passing status from letter grade
   */
  static getPassingStatus(letter: string): PassingStatus {
    if (['AA', 'BA', 'BB', 'CB', 'CC'].includes(letter)) return 'passed';
    if (['DC', 'DD'].includes(letter)) return 'conditional_passed';
    return 'failed';
  }

  /**
   * Determines active exam lifecycle phase:
   * 1. 'vize' -> Initially active until all midterms are completed
   * 2. 'final' -> Once midterms end, switches to finals
   * 3. 'but' -> Once finals end, if student has failed/conditional courses with büt eligibility, switches to büt
   */
  static determineActivePhase(courses: Course[]): ExamType {
    const todayStr = new Date().toISOString().split('T')[0];

    // Check if any vize is still upcoming
    const hasUpcomingVize = courses.some(c => {
      const vDate = c.exams?.vize?.date;
      return vDate && vDate >= todayStr;
    });

    if (hasUpcomingVize) {
      return 'vize';
    }

    // Check if all vizes are graded but finals are pending
    const hasUpcomingFinal = courses.some(c => {
      const fDate = c.exams?.final?.date;
      return (fDate && fDate >= todayStr) || (c.exams?.final && !c.gradeStatus?.finalScore);
    });

    if (hasUpcomingFinal) {
      return 'final';
    }

    // Check if any course has büt eligibility
    const hasEligibleBut = courses.some(c => {
      return c.gradeStatus?.hasButEligibility && c.gradeStatus.butScore === undefined;
    });

    if (hasEligibleBut) {
      return 'but';
    }

    return 'vize';
  }
}
