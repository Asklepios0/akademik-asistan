import { TargetGradeRequirement, GradingScaleConfig, DEFAULT_GRADING_SCALE } from '../types';

export class GradeGoalCalculator {
  /**
   * Calculates required final score for each target letter grade based on vize score, weights, and grading scale
   */
  static calculateRequirements(
    vizeScore: number,
    vizeWeight = 0.4,
    finalWeight = 0.6,
    scale: GradingScaleConfig = DEFAULT_GRADING_SCALE
  ): TargetGradeRequirement[] {
    const finalPassingThreshold = scale.passingThreshold;
    const targets = [
      { letterGrade: 'AA', label: 'Pekiyi (4.0)', minAvg: scale.aa, gpaPoint: 4.0 },
      { letterGrade: 'BA', label: 'İyi-Pekiyi (3.5)', minAvg: scale.ba, gpaPoint: 3.5 },
      { letterGrade: 'BB', label: 'İyi (3.0)', minAvg: scale.bb, gpaPoint: 3.0 },
      { letterGrade: 'CB', label: 'Orta-İyi (2.5)', minAvg: scale.cb, gpaPoint: 2.5 },
      { letterGrade: 'CC', label: 'Geçer (2.0)', minAvg: scale.cc, gpaPoint: 2.0 },
      { letterGrade: 'DC', label: 'Koşullu Geçer (1.5)', minAvg: scale.dc, gpaPoint: 1.5 },
      { letterGrade: 'DD', label: 'Koşullu Geçer (1.0)', minAvg: scale.dd, gpaPoint: 1.0 },
    ];

    const vizeContribution = vizeScore * vizeWeight;

    return targets.map(t => {
      // (minAvg - vizeContribution) / finalWeight
      const neededRaw = (t.minAvg - vizeContribution) / finalWeight;
      const needed = Math.ceil(neededRaw);

      let achievable = true;
      let note = `Finalden en az ${Math.max(needed, finalPassingThreshold)} almalısın`;

      if (needed > 100) {
        achievable = false;
        note = `Ulaşılamaz (Finalden ${needed} gerekir)`;
      } else if (needed <= 0) {
        note = `Vize notun yeterli! Final barajını (${finalPassingThreshold}) geçmen yeterli`;
      } else if (needed < finalPassingThreshold) {
        note = `Ortalama yeterli fakat final barajı (${finalPassingThreshold}) geçerlidir`;
      }

      return {
        letterGrade: t.letterGrade,
        label: t.label,
        gpaPoint: t.gpaPoint,
        requiredFinalScore: achievable ? Math.max(needed, finalPassingThreshold) : needed,
        isAchievable: achievable,
        statusNote: note,
      };
    });
  }
}
