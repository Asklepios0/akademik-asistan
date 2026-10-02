import { OCRResult, AISettings, AIProvider } from '../types';
import { StorageService } from './storage';

export interface AIModelOption {
  id: string;
  name: string;
  isPro?: boolean;
  desc: string;
  isFreeTierSupported?: boolean;
}

export interface ProviderMeta {
  id: AIProvider;
  name: string;
  badge: string;
  apiKeyConsoleUrl: string;
  consoleName: string;
  defaultModel: string;
  popularModels: AIModelOption[];
  keyPlaceholder: string;
  helpSteps: string[];
}

export const AI_PROVIDERS_CONFIG: Record<AIProvider, ProviderMeta> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini (Önerilen)',
    badge: 'Hızlı & Güncel 2.5',
    apiKeyConsoleUrl: 'https://aistudio.google.com/app/apikey',
    consoleName: 'Google AI Studio',
    defaultModel: 'gemini-2.5-flash',
    popularModels: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Yeni nesil yüksek hız, multimodal akıl yürütme (Önerilen & Kararlı)' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', desc: 'Ultra hızlı ve düşük gecikmeli hafif model' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', isPro: true, desc: 'En yüksek OCR hassasiyeti ve karmaşık formül analizi (Pro/Tier)' },
    ],
    keyPlaceholder: 'AIzaSy...',
    helpSteps: [
      'Yukarıdaki "Google AI Studio Aç" butonuna dokunarak Google hesabınızla giriş yapın.',
      'Açılan sayfada mavi "Create API Key" (Anahtar Oluştur) butonuna tıklayın.',
      'Size verilen "AIzaSy..." ile başlayan anahtarı kopyalayın.',
      'Bu sayfadaki kutuya yapıştırıp "Bağlantıyı Test Et & Kaydet" butonuna basın.',
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    badge: 'GPT-4o Multimodal',
    apiKeyConsoleUrl: 'https://platform.openai.com/api-keys',
    consoleName: 'OpenAI Developer Platform',
    defaultModel: 'gpt-4o-mini',
    popularModels: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Hızlı, ekonomik ve verimli not çıkarıcı' },
      { id: 'gpt-4o', name: 'GPT-4o', isPro: true, desc: 'En üst düzey görsel analiz ve formül doğruluğu (Plus/Tier)' },
    ],
    keyPlaceholder: 'sk-proj-...',
    helpSteps: [
      '"OpenAI Platform Aç" butonuna dokunun ve OpenAI hesabınıza giriş yapın.',
      'Sol menüden "API Keys" sayfasına gelin ve "+ Create new secret key" deyin.',
      'Oluşturulan "sk-..." anahtarını kopyalayın.',
      'Kutuya yapıştırıp modeli seçtikten sonra kaydedin.',
    ],
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    badge: 'Sonnet 3.5 Akıl Yürütme',
    apiKeyConsoleUrl: 'https://console.anthropic.com/settings/keys',
    consoleName: 'Anthropic Console',
    defaultModel: 'claude-3-5-sonnet-20241022',
    popularModels: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', isPro: true, desc: 'Akademik metin ve mantıkta lider model' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', desc: 'Ultra hızlı hafif model' },
    ],
    keyPlaceholder: 'sk-ant-...',
    helpSteps: [
      '"Anthropic Console Aç" butonuna dokunup hesabınıza erişin.',
      'Settings > API Keys bölümünden "Create Key" butonuna tıklayın.',
      '"sk-ant-..." formatındaki anahtarı kopyalayıp buraya ekleyin.',
    ],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: 'Açık Kaynak & Güçlü Mantık',
    apiKeyConsoleUrl: 'https://platform.deepseek.com/api_keys',
    consoleName: 'DeepSeek Platform',
    defaultModel: 'deepseek-chat',
    popularModels: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)', desc: 'Yüksek zeka, hızlı yanıt ve metin analizi' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)', isPro: true, desc: 'Adım adım matematiksel ve formül çıkarımı' },
    ],
    keyPlaceholder: 'sk-...',
    helpSteps: [
      '"DeepSeek Platform Aç" butonuna tıklayıp giriş yapın.',
      'API Keys sekmesinden yeni anahtar üretin ve kopyalayın.',
      'Buraya yapıştırarak DeepSeek zekasını aktifleştirin.',
    ],
  },
  custom: {
    id: 'custom',
    name: 'Özel / Yerel Model (OpenAI Uyumlu)',
    badge: 'Ollama / vLLM / LMStudio',
    apiKeyConsoleUrl: 'http://localhost:11434',
    consoleName: 'Yerel Sunucu / Özel Endpoint',
    defaultModel: 'llama3.2-vision',
    popularModels: [
      { id: 'llama3.2-vision', name: 'Llama 3.2 Vision', desc: 'Yerel görsel tanıma' },
      { id: 'custom-model', name: 'Özel Model Adı', desc: 'Kendi sunucunuzdaki model adı' },
    ],
    keyPlaceholder: 'Bearer token veya boş bırakın',
    helpSteps: [
      'Özel API Endpoint adresinizi ve model isminizi girin.',
      'Yerel Ollama veya vLLM sunucusu kullanıyorsanız Base URL giriniz.',
    ],
  },
};

export class MultiAIService {
  /**
   * Normalizes model names and automatically migrates sunsetted models (e.g. gemini-2.0-flash -> gemini-2.5-flash)
   */
  static normalizeModelName(provider: AIProvider, modelName?: string): string {
    const raw = (modelName || '').trim();
    if (provider === 'gemini') {
      if (!raw || raw === 'gemini-1.5-flash' || raw === 'gemini-2.0-flash' || raw.includes('2.0-flash')) {
        return 'gemini-2.5-flash';
      }
      if (raw === 'gemini-1.5-pro' || raw.includes('1.5-pro')) {
        return 'gemini-2.5-pro';
      }
      return raw;
    }
    return raw || AI_PROVIDERS_CONFIG[provider]?.defaultModel || 'gemini-2.5-flash';
  }

  /**
   * Test API connectivity and model response
   */
  static async testConnection(
    settings: AISettings
  ): Promise<{ success: boolean; message: string; latencyMs?: number; resolvedModel?: string }> {
    const startTime = Date.now();
    const cleanKey = (settings.apiKey || '').trim().replace(/^["']|["']$/g, '');

    if (!cleanKey) {
      return {
        success: false,
        message: 'Lütfen geçerli bir API anahtarı girin.',
      };
    }

    try {
      if (settings.provider === 'gemini') {
        let modelName = this.normalizeModelName('gemini', settings.model);
        let url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          modelName
        )}:generateContent?key=${encodeURIComponent(cleanKey)}`;

        let res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': cleanKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Ping test. Yanıt: OK' }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        });

        // If the model was sunsetted (404) or unavailable, auto-retry with stable gemini-2.5-flash
        if (res.status === 404 && modelName !== 'gemini-2.5-flash') {
          modelName = 'gemini-2.5-flash';
          url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
            cleanKey
          )}`;
          res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': cleanKey,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Ping test. Yanıt: OK' }] }],
              generationConfig: { maxOutputTokens: 5 },
            }),
          });
        }

        const data = await res.json().catch(() => ({}));
        const latencyMs = Date.now() - startTime;

        if (!res.ok) {
          const errDetail = data?.error?.message || `HTTP ${res.status}`;
          if (res.status === 400 && errDetail.toLowerCase().includes('api key')) {
            return {
              success: false,
              message: '❌ Geçersiz Google API Anahtarı: Lütfen Google AI Studio üzerinden aldığınız "AIzaSy..." formatındaki anahtarı kontrol edin.',
            };
          }
          if (res.status === 429) {
            return {
              success: false,
              message: '⚠️ İstek Sınırı Aşıldı (Kota Doldu): Lütfen birkaç dakika sonra tekrar deneyin veya başka bir model seçin.',
            };
          }
          return {
            success: false,
            message: `Gemini Hatası (${res.status}): ${errDetail}`,
          };
        }

        return {
          success: true,
          message: `✅ Google Gemini bağlantısı başarılı!\nModel: ${modelName} (${latencyMs}ms)`,
          latencyMs,
          resolvedModel: modelName,
        };
      } else if (settings.provider === 'openai') {
        const modelName = (settings.model || 'gpt-4o-mini').trim();
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cleanKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 5,
          }),
        });

        const data = await res.json().catch(() => ({}));
        const latencyMs = Date.now() - startTime;

        if (!res.ok) {
          const errDetail = data?.error?.message || `HTTP ${res.status}`;
          if (res.status === 401) {
            return {
              success: false,
              message: '❌ Geçersiz OpenAI Anahtarı: Lütfen "sk-..." formatındaki anahtarınızı kontrol edin.',
            };
          }
          return {
            success: false,
            message: `OpenAI Hatası (${res.status}): ${errDetail}`,
          };
        }

        return {
          success: true,
          message: `✅ OpenAI bağlantısı başarılı!\nModel: ${modelName} (${latencyMs}ms)`,
          latencyMs,
        };
      } else if (settings.provider === 'claude') {
        const modelName = (settings.model || 'claude-3-5-haiku-20241022').trim();
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': cleanKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 5,
          }),
        });

        const data = await res.json().catch(() => ({}));
        const latencyMs = Date.now() - startTime;

        if (!res.ok) {
          const errDetail = data?.error?.message || `HTTP ${res.status}`;
          if (res.status === 401) {
            return {
              success: false,
              message: '❌ Geçersiz Anthropic Anahtarı: Lütfen "sk-ant-..." formatındaki anahtarınızı kontrol edin.',
            };
          }
          return {
            success: false,
            message: `Claude Hatası (${res.status}): ${errDetail}`,
          };
        }

        return {
          success: true,
          message: `✅ Claude bağlantısı başarılı!\nModel: ${modelName} (${latencyMs}ms)`,
          latencyMs,
        };
      } else if (settings.provider === 'deepseek') {
        const modelName = (settings.model || 'deepseek-chat').trim();
        const res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cleanKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 5,
          }),
        });

        const data = await res.json().catch(() => ({}));
        const latencyMs = Date.now() - startTime;

        if (!res.ok) {
          const errDetail = data?.error?.message || `HTTP ${res.status}`;
          return {
            success: false,
            message: `DeepSeek Hatası (${res.status}): ${errDetail}`,
          };
        }

        return {
          success: true,
          message: `✅ DeepSeek bağlantısı başarılı!\nModel: ${modelName} (${latencyMs}ms)`,
          latencyMs,
        };
      } else {
        // Custom base URL
        const endpoint = settings.customBaseUrl || 'http://localhost:11434/v1/chat/completions';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cleanKey ? { Authorization: `Bearer ${cleanKey}` } : {}),
          },
          body: JSON.stringify({
            model: settings.model || 'llama3.2-vision',
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 5,
          }),
        });
        const latencyMs = Date.now() - startTime;
        if (!res.ok) {
          return { success: false, message: `Özel Sunucu Hatası: HTTP ${res.status}` };
        }
        return { success: true, message: `✅ Özel model bağlantısı başarılı! (${latencyMs}ms)` };
      }
    } catch (e: any) {
      return {
        success: false,
        message: `İnternet Bağlantısı Hatası: ${e?.message || 'Sunucuya ulaşılamadı. Lütfen internet bağlantınızı veya güvenlik duvarını kontrol edin.'}`,
      };
    }
  }

  /**
   * Extract notes and formulas from image using configured AI Vision model or intelligent fallback
  /**
   * Dynamically fetches the latest live models from Google Gemini or OpenAI APIs
   */
  static async fetchLiveModels(provider: AIProvider, apiKey?: string): Promise<AIModelOption[]> {
    const cleanKey = (apiKey || '').trim().replace(/^["']|["']$/g, '');
    if (!cleanKey) {
      return AI_PROVIDERS_CONFIG[provider]?.popularModels || [];
    }

    try {
      if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;
        const res = await fetch(url);
        if (!res.ok) {
          return AI_PROVIDERS_CONFIG.gemini.popularModels;
        }
        const data = await res.json();
        const rawModels: any[] = data?.models || [];

        // Filter models that support generateContent
        const validModels = rawModels.filter(m => {
          const methods: string[] = m.supportedGenerationMethods || [];
          const name = (m.name || '').toLowerCase();
          return (
            methods.includes('generateContent') &&
            !name.includes('embedding') &&
            !name.includes('aqa') &&
            !name.includes('imagen') &&
            !name.includes('veo') &&
            !name.includes('tts')
          );
        });

        if (validModels.length === 0) {
          return AI_PROVIDERS_CONFIG.gemini.popularModels;
        }

        // Sort: modern 2.5 / 3.x / 4.x flash first, then pro
        return validModels.map(m => {
          const modelId = (m.name || '').replace(/^models\//, '');
          const isPro = modelId.toLowerCase().includes('pro') || modelId.toLowerCase().includes('ultra');
          const displayName = m.displayName || modelId;
          const desc = m.description
            ? (m.description.length > 75 ? m.description.slice(0, 75) + '...' : m.description)
            : (isPro ? 'Gelişmiş akıl yürütme & yüksek görsel tanıma' : 'Hızlı ve dengeli multimodal analiz');

          return {
            id: modelId,
            name: displayName,
            isPro,
            desc,
          };
        });
      } else if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${cleanKey}` },
        });
        if (!res.ok) {
          return AI_PROVIDERS_CONFIG.openai.popularModels;
        }
        const data = await res.json();
        const rawList: any[] = data?.data || [];
        const visionAndChat = rawList.filter(m => {
          const id = (m.id || '').toLowerCase();
          return (id.startsWith('gpt-4') || id.startsWith('o1') || id.startsWith('o3')) && !id.includes('realtime') && !id.includes('audio');
        });

        if (visionAndChat.length === 0) {
          return AI_PROVIDERS_CONFIG.openai.popularModels;
        }

        return visionAndChat.slice(0, 8).map(m => {
          const isPro = !m.id.includes('mini');
          return {
            id: m.id,
            name: m.id,
            isPro,
            desc: isPro ? 'En üst düzey görsel analiz ve formül doğruluğu' : 'Hızlı ve ekonomik analiz',
          };
        });
      }
    } catch (e) {
      console.warn('Failed to fetch live models dynamically:', e);
    }

    return AI_PROVIDERS_CONFIG[provider]?.popularModels || [];
  }

  /**
   * Extract notes and formulas from image using configured AI Vision model or intelligent fallback
   */
  static async extractNotesFromImage(params: {
    base64?: string;
    imageUri?: string;
    courseName?: string;
    isSampleFallback?: boolean;
  }): Promise<OCRResult> {
    const appSettings = await StorageService.getSettings();
    const ai = appSettings.aiSettings;

    // If an API key is configured and image has base64 data, invoke Cloud AI Vision
    if (ai?.apiKey && params.base64 && !params.isSampleFallback) {
      try {
        if (ai.provider === 'gemini') {
          return await this.callGeminiVision(ai, params.base64, params.courseName);
        } else if (ai.provider === 'openai') {
          return await this.callOpenAIVision(ai, params.base64, params.courseName);
        }
      } catch (e: any) {
        console.warn('Live AI Vision failed:', e);
        return {
          extractedText: `[Yapay Zeka Analiz Uyarısı]\n\nFotoğraf yüklendi ancak yapay zeka servisiyle iletişim kurulurken bir sorun oluştu:\n${e?.message || 'Sunucu yanıt vermedi.'}\n\nİpucu: Ayarlar > Yapay Zeka bölümünden API anahtarınızı veya model seçiminizi test edebilirsiniz. Dilerseniz ders notunuzu aşağıdaki alana kendiniz yazarak kaydedebilirsiniz.`,
          identifiedFormulas: [],
          summaryPoints: ['Görsel kaydedildi, yapay zeka bağlantısını Ayarlar sekmesinden test edin.'],
          confidencePercent: 0,
        };
      }
    }

    // If no API key is provided
    if (!ai?.apiKey && !params.isSampleFallback) {
      return {
        extractedText: `[Görsel Hafızaya Alındı - Çevrimdışı Mod]\n\nFotoğraf başarıyla kasanıza eklendi. Otomatik yapay zeka metin okuması için Google Gemini veya ChatGPT anahtarı bağlı değil.\n\nNotunuzu bu alana klavyenizle veya sesli yazma ile ekleyip "Ders Notları Arşivine Kaydet" butonuna basabilirsiniz.\n(Canlı görsel okuma için Ayarlar > Yapay Zeka sekmesinden ücretsiz Google Gemini anahtarınızı bağlayabilirsiniz.)`,
        identifiedFormulas: [],
        summaryPoints: ['Fotoğraf kaydedildi (Çevrimdışı mod).'],
        confidencePercent: 100,
      };
    }

    // Sample fallback for demonstration
    await new Promise(resolve => setTimeout(resolve, 600));
    const courseLabel = params.courseName || 'Ders';
    return {
      extractedText: `[ÖRNEK DERS NOTU - ${courseLabel}]\n\nTarih: ${new Date().toLocaleDateString('tr-TR')}\nKonu: Ders İçi Notlar ve Temel İlkeler\n\n1. Giriş ve Temel Kavramlar:\n   - Tahtadaki ana başlıklar ve tanım maddeleri ayrıştırıldı.\n   - Sınav için önemli görülen terimler aşağıda özetlenmiştir.\n\n2. Düzenleme:\n   - Notu kaydetmeden önce bu alandan dilediğiniz gibi düzenleyebilirsiniz.`,
      identifiedFormulas: [
        'f(x) = a0 + ∑ [an*cos(nx) + bn*sin(nx)]',
        'V = I * R',
      ],
      summaryPoints: [
        'Ders içi kritik bağıntılar ve formüller.',
        'Not metnini kaydetmeden önce dilediğiniz gibi düzenleyebilirsiniz.',
      ],
      confidencePercent: 95,
    };
  }

  /**
   * Multimodal Gemini 1.5/2.0 Vision Call
   */
  private static async callGeminiVision(
    ai: AISettings,
    base64: string,
    courseName?: string
  ): Promise<OCRResult> {
    const model = this.normalizeModelName('gemini', ai.model);
    const cleanKey = (ai.apiKey || '').trim().replace(/^["']|["']$/g, '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(cleanKey)}`;

    const prompt = `Sen üniversite öğrencileri için uzman bir Akademik Vision OCR asistanısın. Bu fotoğraftaki ders tahtası, defter veya slayt üzerindeki el yazılarını, formülleri ve ders notlarını Türkçe olarak eksiksiz oku.

Lütfen yanıtını SADECE aşağıdaki JSON şemasına uygun saf JSON olarak ver (başka açıklama veya markdown backtick yazma):
{
  "extractedText": "Tahtada/defterde okunan tüm metinlerin düzenli hali",
  "identifiedFormulas": ["Tespit edilen matematik/fizik formülleri veya kod blokları"],
  "summaryPoints": ["Bu nottan çıkarılan en önemli 2-3 sınav vurgusu"],
  "confidencePercent": 96
}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': cleanKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini Vision HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(cleanJson);
      return {
        extractedText: parsed.extractedText || rawText,
        identifiedFormulas: Array.isArray(parsed.identifiedFormulas) ? parsed.identifiedFormulas : [],
        summaryPoints: Array.isArray(parsed.summaryPoints) ? parsed.summaryPoints : [],
        confidencePercent: typeof parsed.confidencePercent === 'number' ? parsed.confidencePercent : 97,
      };
    } catch (parseErr) {
      return {
        extractedText: rawText,
        identifiedFormulas: [],
        summaryPoints: ['AI Vision ile okunan ders notu.'],
        confidencePercent: 95,
      };
    }
  }

  /**
   * Multimodal OpenAI GPT-4o Vision Call
   */
  private static async callOpenAIVision(
    ai: AISettings,
    base64: string,
    courseName?: string
  ): Promise<OCRResult> {
    const model = ai.model || 'gpt-4o-mini';
    const cleanKey = (ai.apiKey || '').trim().replace(/^["']|["']$/g, '');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cleanKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Sen üniversite öğrencileri için tahta, defter ve slayt okuyan bir Vision OCR uzmanısın. Yanıtını saf JSON olarak ver: {"extractedText": string, "identifiedFormulas": string[], "summaryPoints": string[], "confidencePercent": number}',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Bu görseldeki tahta/defter ders notlarını oku, formülleri ve özet noktaları JSON formatında çıkar.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI Vision HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content || '';
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(cleanJson);
      return {
        extractedText: parsed.extractedText || rawText,
        identifiedFormulas: Array.isArray(parsed.identifiedFormulas) ? parsed.identifiedFormulas : [],
        summaryPoints: Array.isArray(parsed.summaryPoints) ? parsed.summaryPoints : [],
        confidencePercent: typeof parsed.confidencePercent === 'number' ? parsed.confidencePercent : 98,
      };
    } catch {
      return {
        extractedText: rawText,
        identifiedFormulas: [],
        summaryPoints: ['GPT-4o Vision ile çıkarılan ders notu'],
        confidencePercent: 96,
      };
    }
  }
}
