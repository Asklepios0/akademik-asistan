import { QuizQuestion, LectureNote } from '../types';

export const SAMPLE_QUIZ_QUESTIONS: Record<string, QuizQuestion[]> = {
  default: [
    {
      id: 'q_1',
      courseId: 'demo_course_0',
      courseName: 'Algoritmalar ve Programlama',
      question: 'Bir dizide ikili arama (Binary Search) algoritması uygulayabilmek için ön koşul nedir?',
      options: [
        'A) Dizinin eleman sayısının çift olması',
        'B) Dizinin önceden sıralanmış (sorted) olması',
        'C) Dizide negatif sayı bulunmaması',
        'D) Dizinin boyutunun 100’den küçük olması',
      ],
      correctOptionIndex: 1,
      explanation: 'İkili arama (Binary Search) her adımda arama uzayını yarıya indirebilmek için dizinin küçükten büyüğe veya büyükten küçüğe sıralı olmasını şart koşar. Zaman karmaşıklığı O(log n)’dir.',
      difficulty: 'easy',
    },
    {
      id: 'q_2',
      courseId: 'demo_course_0',
      courseName: 'Algoritmalar ve Programlama',
      question: 'Dinamik Programlama (Dynamic Programming) yaklaşımı aşağıdaki problemlerden hangisinde en yüksek verimlilik sağlar?',
      options: [
        'A) Bağımsız ve örtüşmeyen alt problemler içeren durumlarda',
        'B) Örtüşen alt problemler (Overlapping Subproblems) ve optimal alt yapı içeren problemlerde',
        'C) Yalnızca rastgele sayı üreteçlerinde',
        'D) Grafik kartı bellek tahsisinde',
      ],
      correctOptionIndex: 1,
      explanation: 'Dinamik programlama, daha önce çözülmüş alt problemlerin sonuçlarını hafızada tutarak (Memoization / Tabulation) tekrar hesaplamayı önler.',
      difficulty: 'medium',
    },
    {
      id: 'q_3',
      courseId: 'demo_course_2',
      courseName: 'Yapay Zeka ve Makine Öğrenmesi',
      question: 'Bir makine öğrenmesi modelinde "Overfitting" (Aşırı Uyum) durumunu engellemek için aşağıdakilerden hangisi UYGULANMAZ?',
      options: [
        'A) Dropout (Seyreltme) katmanı eklemek',
        'B) L1/L2 Regularization (Düzenlileştirme) kullanmak',
        'C) Eğitim verisi miktarını artırmak',
        'D) Modelin katman ve parametre sayısını aşırı derecede artırmak',
      ],
      correctOptionIndex: 3,
      explanation: 'Parametre sayısını aşırı artırmak modeli daha karmaşık hale getirir ve Overfitting riskini artırır. Düzenlileştirme, dropout ve daha fazla veri overfitting’i önler.',
      difficulty: 'medium',
    },
    {
      id: 'q_4',
      courseId: 'demo_course_4',
      courseName: 'İşletim Sistemleri',
      question: 'İşletim sistemlerinde sanal bellek (Virtual Memory) mekanizmasında sayfalama (Paging) kullanılırken bir sayfa RAM’de bulunamazsa ne tetiklenir?',
      options: [
        'A) Segmentation Fault',
        'B) Page Fault (Sayfa Hatası Kesmesi)',
        'C) Stack Overflow',
        'D) CPU Throttling',
      ],
      correctOptionIndex: 1,
      explanation: 'İstenen sayfa fiziki bellekte (RAM) mevcut değilse donanım bir Page Fault kesmesi üretir ve işletim sistemi sayfayı ikincil bellekten (Disk) RAM’e yükler.',
      difficulty: 'hard',
    },
  ],
};

export class AIQuizGenerator {
  /**
   * Generates interactive quiz questions for a course or custom topic
   */
  static generateQuizForCourse(courseName: string, courseId: string, customTopic?: string): QuizQuestion[] {
    const defaultList = SAMPLE_QUIZ_QUESTIONS.default;
    const matched = defaultList.filter(q => q.courseId === courseId);
    if (matched.length > 0) return matched;

    // Generated simulation questions
    return [
      {
        id: 'gen_q_1_' + Date.now(),
        courseId,
        courseName,
        question: `"${customTopic || courseName}" dersinin temel prensiplerine göre sınavda en çok sorulan kavram aşağıdakilerden hangisidir?`,
        options: [
          'A) Teorik Temeller ve Tanımlar',
          'B) Uygulama ve Problem Çözme Yöntemleri',
          'C) Zaman ve Kaynak Verimliliği Analizi',
          'D) Yukarıdakilerin Hepsi',
        ],
        correctOptionIndex: 3,
        explanation: 'Bu konu hem teorik tanımları hem de problem çözme ve optimizasyon aşamalarını kapsayan kapsamlı bir sınav konusudur.',
        difficulty: 'medium',
      },
      {
        id: 'gen_q_2_' + Date.now(),
        courseId,
        courseName,
        question: `Hocanın derste vurguladığı kilit optimizasyon kuralı nedir?`,
        options: [
          'A) Gereksiz döngü ve bellek tüketiminden kaçınmak',
          'B) Sabit değişkenleri dinamik bellekte tutmak',
          'C) Derleyici optimizasyonlarını devre dışı bırakmak',
          'D) Tek çekirdekli işlemciye göre kod yazmak',
        ],
        correctOptionIndex: 0,
        explanation: 'Sınavlarda performans ve kaynak optimizasyonu en kritik puanlama kriteridir.',
        difficulty: 'easy',
      },
    ];
  }

  /**
   * Formats a lecture note into a clean PDF/Markdown printable string for sharing
   */
  static formatNoteForExport(note: LectureNote): string {
    let output = `=================================================\n`;
    output += `🎓 AKADEMİK ASİSTAN - DERS NOTU & ÖZETİ\n`;
    output += `=================================================\n\n`;
    output += `📌 Ders: ${note.courseName}\n`;
    output += `📅 Tarih: ${note.date}\n\n`;

    if (note.textNotes) {
      output += `📝 DERSTE TUTULAN NOTLAR:\n`;
      output += `${note.textNotes}\n\n`;
    }

    if (note.transcript) {
      output += `🎙️ DİKTE / SES TRANSKRİPTİ:\n`;
      output += `${note.transcript}\n\n`;
    }

    if (note.summaryPoints && note.summaryPoints.length > 0) {
      output += `💡 YAPAY ZEKA SINAV TÜYOLARI & ÖNEMLİ NOKTALAR:\n`;
      note.summaryPoints.forEach((p, idx) => {
        output += `  ${idx + 1}. ${p}\n`;
      });
      output += `\n`;
    }

    output += `-------------------------------------------------\n`;
    output += `📱 Akademik Asistan ile derlendi.\n`;
    return output;
  }
}
