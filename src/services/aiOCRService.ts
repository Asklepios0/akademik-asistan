import { OCRResult } from '../types';
import { MultiAIService } from './multiAIService';

export class AIOCRService {
  /**
   * Delegates OCR extraction to MultiAIService with fallback support
   */
  static async extractNotesFromImage(
    typeOrCustom?: 'whiteboard' | 'notebook' | 'slide' | string,
    customHint?: string
  ): Promise<OCRResult> {
    return MultiAIService.extractNotesFromImage({
      isSampleFallback: true,
      courseName: typeof typeOrCustom === 'string' ? typeOrCustom : undefined,
    });
  }

  /**
   * Analyzes an uploaded or camera-captured image
   */
  static async analyzeCapturedImage(params: {
    base64?: string;
    imageUri?: string;
    courseName?: string;
  }): Promise<OCRResult> {
    return MultiAIService.extractNotesFromImage(params);
  }
}
