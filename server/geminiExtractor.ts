import { GoogleGenAI, Type } from '@google/genai';
import type { ExtractedSignals, RiskLevel } from './riskEngine';
import { extractUrlsFromText } from './urlChecker';

const DEFAULT_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

const RISK_LEVELS: RiskLevel[] = ['STOP', 'CAUTION', 'VERIFY', 'NO_CLEAR_RISK'];
const RISK_RANK: Record<RiskLevel, number> = {
  NO_CLEAR_RISK: 0,
  VERIFY: 1,
  CAUTION: 2,
  STOP: 3
};

class GeminiAnalysisError extends Error {
  status: number;
  code: string;
  publicMessage: string;

  constructor(message: string, status: number, code: string, publicMessage: string) {
    super(message);
    this.name = 'GeminiAnalysisError';
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

function getModelCandidates(): string[] {
  const configured = String(process.env.GEMINI_MODEL || '').trim();
  return Array.from(new Set([configured, ...DEFAULT_MODELS].filter(Boolean)));
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    throw new GeminiAnalysisError(
      'GEMINI_API_KEY is not configured.',
      503,
      'GEMINI_NOT_CONFIGURED',
      'Khoan Đã! chưa thể kết nối Gemini lúc này. Vui lòng thử lại sau khi dịch vụ AI được cấu hình.'
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

function normalizeRiskLevel(value: unknown, fallback: RiskLevel = 'VERIFY'): RiskLevel {
  const normalized = String(value || '').toUpperCase() as RiskLevel;
  return RISK_LEVELS.includes(normalized) ? normalized : fallback;
}

function clampRiskLevel(aiLevel: RiskLevel, minimumLevel: RiskLevel): RiskLevel {
  return RISK_RANK[aiLevel] >= RISK_RANK[minimumLevel] ? aiLevel : minimumLevel;
}

function parseJsonResponse(text: string | undefined): any {
  if (!text) throw new Error('Gemini did not return a response body.');

  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(cleaned);
}

async function generateStructuredJson(
  ai: GoogleGenAI,
  contents: Array<any>,
  config: any,
  purpose: string
): Promise<{ parsed: any; modelName: string }> {
  let lastError: any = null;
  let sawQuotaError = false;

  for (const modelName of getModelCandidates()) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        console.log(`[Gemini AI] ${purpose}: ${modelName} (attempt ${attempt})`);

        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config
        });

        return {
          parsed: parseJsonResponse(response.text),
          modelName
        };
      } catch (error: any) {
        lastError = error;
        const message = String(error?.message || error || '');
        const isQuota =
          message.includes('429') ||
          message.includes('RESOURCE_EXHAUSTED') ||
          message.includes('Quota exceeded');

        sawQuotaError ||= isQuota;
        console.warn(`[Gemini AI] ${purpose} failed on ${modelName}: ${message}`);

        if (isQuota && attempt === 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }

        break;
      }
    }
  }

  const rawMessage = String(lastError?.message || lastError || 'Gemini unavailable');

  if (sawQuotaError) {
    throw new GeminiAnalysisError(
      rawMessage,
      429,
      'GEMINI_RATE_LIMITED',
      'Gemini đang bận do giới hạn lượt phân tích. Vui lòng chờ một chút rồi thử lại.'
    );
  }

  throw new GeminiAnalysisError(
    rawMessage,
    503,
    'GEMINI_UNAVAILABLE',
    'Gemini chưa thể hoàn tất phân tích lúc này. Vui lòng thử lại sau.'
  );
}

const EXTRACTION_SYSTEM_INSTRUCTION = `Bạn là lớp phân tích đầu tiên của Khoan Đã!, một trợ lý an toàn số dành cho người dùng Việt Nam.

Mục tiêu: hiểu CHÍNH XÁC nội dung mà người dùng cung cấp trước khi bất kỳ kiểm tra kỹ thuật nào được thực hiện.

QUY TẮC BẮT BUỘC:
- Nếu có ảnh, phải đọc trực tiếp chữ và thông tin nhìn thấy trong ảnh. Không được bỏ qua ảnh chỉ vì người dùng nhập một câu mô tả ngắn.
- Chỉ kết luận từ bằng chứng có trong nội dung/ảnh. Không tự bịa số điện thoại, URL, tài khoản, tổ chức hoặc chi tiết không nhìn thấy.
- Nhận diện hành động mà người gửi đang muốn người dùng thực hiện: bấm link, cài app/APK, nhập OTP/mật khẩu, chuyển tiền, quét QR, chia sẻ màn hình, gửi CCCD/thông tin cá nhân.
- Phân tích thủ đoạn tâm lý: khẩn cấp, đe dọa, phần thưởng, mạo danh, yêu cầu giữ bí mật, tống tiền.
- Không tuyên bố “an toàn tuyệt đối”, “chắc chắn lừa đảo 100%”, không tạo xác suất hoặc phần trăm rủi ro giả.
- Cách viết phải dành cho người dùng phổ thông, rõ ràng, tự nhiên, không dùng jargon lập trình/debug.
- Trả về JSON đúng schema.`;

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    aiRiskLevel: {
      type: Type.STRING,
      description: 'STOP, CAUTION, VERIFY hoặc NO_CLEAR_RISK'
    },
    aiHeadlineTitle: {
      type: Type.STRING,
      description: 'Tiêu đề ngắn, trực tiếp, theo hành động. Ví dụ: KHOAN CHUYỂN TIỀN hoặc ĐỪNG NHẬP OTP.'
    },
    aiHeadlineSubtitle: {
      type: Type.STRING,
      description: 'Một câu giải thích ngắn tình huống đang xảy ra.'
    },
    aiRiskScoreDescription: {
      type: Type.STRING,
      description: 'Mô tả định tính mức cần chú ý; không dùng phần trăm hoặc xác suất giả.'
    },
    scamCategory: {
      type: Type.STRING,
      description: 'Loại tình huống hoặc thủ đoạn đáng ngờ được nhận diện.'
    },
    aiDetailedReasoning: {
      type: Type.STRING,
      description: 'Giải thích tự nhiên 2-4 câu: nội dung đang yêu cầu gì, thủ đoạn nào đáng chú ý và rủi ro có thể xảy ra.'
    },
    aiReasons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3-6 lý do cụ thể, ngắn, dựa trên nội dung thực tế.'
    },
    aiActionSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '2-5 hành động thực tế người dùng nên làm ngay, ưu tiên hành động an toàn nhất.'
    },
    ocrTextExtracted: {
      type: Type.STRING,
      description: 'Văn bản đọc được từ ảnh. Để trống nếu không có ảnh hoặc không đọc chắc chắn.'
    },
    imageAnalysisSummary: {
      type: Type.STRING,
      description: 'Tóm tắt nội dung ảnh nếu có.'
    },
    claimedInstitution: {
      type: Type.STRING,
      description: 'Tên tổ chức/ngân hàng/cơ quan được nội dung nhắc hoặc tự xưng. Để trống nếu không rõ.'
    },
    extractedUrls: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'URL nhìn thấy hoặc đọc được chính xác. Không đoán URL.'
    },
    bankAccountDetails: {
      type: Type.OBJECT,
      properties: {
        accountNumber: { type: Type.STRING },
        bankName: { type: Type.STRING },
        accountHolder: { type: Type.STRING }
      }
    },
    actionsRequested: {
      type: Type.OBJECT,
      properties: {
        clickLink: { type: Type.BOOLEAN },
        installApk: { type: Type.BOOLEAN },
        provideOtp: { type: Type.BOOLEAN },
        transferMoney: { type: Type.BOOLEAN },
        shareScreen: { type: Type.BOOLEAN },
        providePersonalId: { type: Type.BOOLEAN }
      },
      required: ['clickLink', 'installApk', 'provideOtp', 'transferMoney', 'shareScreen', 'providePersonalId']
    },
    socialEngineeringSignals: {
      type: Type.OBJECT,
      properties: {
        urgency: { type: Type.BOOLEAN },
        rewardOrThreat: { type: Type.BOOLEAN },
        impersonation: { type: Type.BOOLEAN },
        secrecy: { type: Type.BOOLEAN },
        unnaturalPhrasing: { type: Type.BOOLEAN },
        threatOrExtortion: { type: Type.BOOLEAN }
      },
      required: ['urgency', 'rewardOrThreat', 'impersonation', 'secrecy', 'unnaturalPhrasing', 'threatOrExtortion']
    },
    rawSummary: {
      type: Type.STRING,
      description: 'Tóm tắt 1-2 câu về nội dung được cung cấp.'
    }
  },
  required: [
    'aiRiskLevel',
    'aiHeadlineTitle',
    'aiHeadlineSubtitle',
    'aiRiskScoreDescription',
    'scamCategory',
    'aiDetailedReasoning',
    'aiReasons',
    'aiActionSteps',
    'extractedUrls',
    'actionsRequested',
    'socialEngineeringSignals',
    'rawSummary'
  ]
};

export async function extractSignalsFromInput(
  text: string,
  imageBase64?: string,
  mimeType?: string
): Promise<ExtractedSignals> {
  const ai = getGeminiClient();
  const contents: Array<any> = [];

  if (imageBase64) {
    let detectedMime = mimeType || 'image/png';
    const mimeMatch = imageBase64.match(/^data:([^;]+);base64,/);
    if (mimeMatch) detectedMime = mimeMatch[1];

    contents.push({
      inlineData: {
        mimeType: detectedMime,
        data: imageBase64.replace(/^data:[^;]+;base64,/, '')
      }
    });
  }

  contents.push({
    text: `Hãy phân tích nội dung dưới đây cho một người dùng phổ thông tại Việt Nam.\n\nVăn bản/mô tả do người dùng cung cấp:\n${text || '(Không có văn bản nhập tay. Hãy đọc trực tiếp ảnh đính kèm.)'}\n\n${imageBase64 ? 'Ảnh đính kèm là nguồn dữ liệu chính. Hãy đọc kỹ toàn bộ chữ, URL, tên tổ chức, số tài khoản và yêu cầu trong ảnh trước khi kết luận.' : 'Không có ảnh đính kèm.'}`
  });

  const { parsed, modelName } = await generateStructuredJson(
    ai,
    contents,
    {
      systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: EXTRACTION_SCHEMA
    },
    'first-pass analysis'
  );

  const combinedText = `${text || ''}\n${parsed.ocrTextExtracted || ''}`;
  const textUrls = extractUrlsFromText(combinedText);
  const combinedUrls = Array.from(new Set([
    ...(Array.isArray(parsed.extractedUrls) ? parsed.extractedUrls : []),
    ...textUrls
  ].map((value: unknown) => String(value || '').trim()).filter(Boolean)));

  const aiRiskLevel = normalizeRiskLevel(parsed.aiRiskLevel, 'VERIFY');
  const aiReasons = Array.isArray(parsed.aiReasons)
    ? parsed.aiReasons.map((value: unknown) => String(value || '').trim()).filter(Boolean).slice(0, 6)
    : [];
  const aiActionSteps = Array.isArray(parsed.aiActionSteps)
    ? parsed.aiActionSteps.map((value: unknown) => String(value || '').trim()).filter(Boolean).slice(0, 5)
    : [];

  if (!parsed.aiHeadlineTitle || !parsed.aiHeadlineSubtitle || !parsed.aiDetailedReasoning || !aiReasons.length || !aiActionSteps.length) {
    throw new GeminiAnalysisError(
      `Gemini returned incomplete structured output using ${modelName}.`,
      503,
      'GEMINI_INVALID_OUTPUT',
      'Gemini chưa trả về đủ thông tin để đưa ra khuyến nghị an toàn. Vui lòng thử lại.'
    );
  }

  return {
    analysisEngine: 'GEMINI_AI_100',
    scamCategory: String(parsed.scamCategory || '').trim(),
    aiDetailedReasoning: String(parsed.aiDetailedReasoning || '').trim(),
    aiRiskLevel,
    aiHeadlineTitle: String(parsed.aiHeadlineTitle || '').trim(),
    aiHeadlineSubtitle: String(parsed.aiHeadlineSubtitle || '').trim(),
    aiRiskScoreDescription: String(parsed.aiRiskScoreDescription || '').trim(),
    aiReasons,
    aiActionSteps,
    hasImageAttached: Boolean(imageBase64),
    ocrTextExtracted: parsed.ocrTextExtracted ? String(parsed.ocrTextExtracted).trim() : undefined,
    imageAnalysisSummary: parsed.imageAnalysisSummary ? String(parsed.imageAnalysisSummary).trim() : undefined,
    claimedInstitution: parsed.claimedInstitution ? String(parsed.claimedInstitution).trim() : undefined,
    extractedUrls: combinedUrls,
    bankAccountDetails: parsed.bankAccountDetails || undefined,
    actionsRequested: {
      clickLink: Boolean(parsed.actionsRequested?.clickLink),
      installApk: Boolean(parsed.actionsRequested?.installApk),
      provideOtp: Boolean(parsed.actionsRequested?.provideOtp),
      transferMoney: Boolean(parsed.actionsRequested?.transferMoney),
      shareScreen: Boolean(parsed.actionsRequested?.shareScreen),
      providePersonalId: Boolean(parsed.actionsRequested?.providePersonalId)
    },
    socialEngineeringSignals: {
      urgency: Boolean(parsed.socialEngineeringSignals?.urgency),
      rewardOrThreat: Boolean(parsed.socialEngineeringSignals?.rewardOrThreat),
      impersonation: Boolean(parsed.socialEngineeringSignals?.impersonation),
      secrecy: Boolean(parsed.socialEngineeringSignals?.secrecy),
      unnaturalPhrasing: Boolean(parsed.socialEngineeringSignals?.unnaturalPhrasing),
      threatOrExtortion: Boolean(parsed.socialEngineeringSignals?.threatOrExtortion)
    },
    rawSummary: String(parsed.rawSummary || '').trim()
  };
}

export interface FinalConsumerAiResponse {
  riskLevel: RiskLevel;
  headlineTitle: string;
  headlineSubtitle: string;
  riskScoreDescription: string;
  scamCategory: string;
  aiDetailedReasoning: string;
  reasons: string[];
  actionSteps: string[];
  disclaimer: string;
}

const FINAL_RESPONSE_SYSTEM_INSTRUCTION = `Bạn là lớp trả lời cuối cùng của Khoan Đã!, trợ lý an toàn số dành cho người dùng Việt Nam.

Bạn nhận hai nhóm dữ liệu:
1. Phân tích ngữ cảnh do Gemini đã đọc từ văn bản/ảnh.
2. Các tín hiệu kiểm tra kỹ thuật từ hệ thống: tên miền chính thức, dấu hiệu URL và Google Safe Browsing.

NHIỆM VỤ CỦA BẠN:
- Tự tổng hợp các dữ liệu trên và VIẾT TOÀN BỘ câu trả lời cuối cùng bằng tiếng Việt tự nhiên.
- Không sao chép tên biến, mã nội bộ, JSON, STOP/CAUTION/VERIFY, riskFlags hoặc ngôn ngữ debug vào nội dung hiển thị.
- Tiêu đề phải tập trung vào hành động người dùng nên dừng hoặc xác minh, ví dụ “Khoan chuyển tiền”, “Đừng nhập OTP”, “Hãy kiểm tra lại người gửi”.
- headlineSubtitle: 1 câu tóm tắt điều đang xảy ra.
- aiDetailedReasoning: 2-4 câu giải thích vì sao tình huống đáng chú ý, dựa trên bằng chứng cụ thể.
- reasons: 3-6 ý ngắn, không lặp nhau, ưu tiên bằng chứng nhìn thấy/đọc được.
- actionSteps: 2-5 bước rõ ràng theo thứ tự ưu tiên. Không hướng dẫn người dùng tự mở đường link đáng ngờ để kiểm tra.
- Nếu có mạo danh ngân hàng/cơ quan, ưu tiên hướng dẫn xác minh qua app, website hoặc số liên hệ chính thức mà người dùng tự truy cập.
- Nếu có OTP/mật khẩu: yêu cầu không chia sẻ/không nhập vào link lạ.
- Nếu có APK/remote access: yêu cầu không cài/không cấp quyền.
- Nếu có chuyển tiền: yêu cầu khoan chuyển và xác minh người nhận.
- Không nói “an toàn tuyệt đối”, không nói “100% lừa đảo”, không tạo phần trăm/xác suất giả.
- Nếu dữ liệu chưa đủ, nói rõ “chưa đủ thông tin để kết luận” và hướng dẫn cách xác minh an toàn.
- Mức riskLevel cuối cùng KHÔNG ĐƯỢC thấp hơn mức cảnh báo kỹ thuật tối thiểu được cung cấp.
- Trả về JSON đúng schema.`;

const FINAL_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    riskLevel: {
      type: Type.STRING,
      description: 'STOP, CAUTION, VERIFY hoặc NO_CLEAR_RISK'
    },
    headlineTitle: { type: Type.STRING },
    headlineSubtitle: { type: Type.STRING },
    riskScoreDescription: {
      type: Type.STRING,
      description: 'Mô tả định tính mức cần chú ý, không dùng phần trăm.'
    },
    scamCategory: { type: Type.STRING },
    aiDetailedReasoning: { type: Type.STRING },
    reasons: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    actionSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    disclaimer: {
      type: Type.STRING,
      description: 'Một câu ngắn: kết quả hỗ trợ nhận diện rủi ro và không phải bảo đảm tuyệt đối.'
    }
  },
  required: [
    'riskLevel',
    'headlineTitle',
    'headlineSubtitle',
    'riskScoreDescription',
    'scamCategory',
    'aiDetailedReasoning',
    'reasons',
    'actionSteps',
    'disclaimer'
  ]
};

export async function generateFinalConsumerResponse(params: {
  originalText: string;
  extracted: ExtractedSignals;
  technicalAssessment: {
    minimumRiskLevel: RiskLevel;
    detectedBrandMismatch: boolean;
    mismatchDetails?: {
      claimedEntity: string;
      officialDomains: string[];
      providedDomain: string;
    };
    matchedInstitution?: {
      name: string;
      verification: string;
      officialDomains: string[];
    };
    safeBrowsing: {
      checked: boolean;
      hasMatch: boolean;
      matches: string[];
    };
    urlSignals: Array<{
      url: string;
      domain: string;
      riskFlags: string[];
      suspiciousKeywords: string[];
    }>;
  };
}): Promise<FinalConsumerAiResponse> {
  const ai = getGeminiClient();

  const payload = {
    userText: params.originalText.slice(0, 12000),
    geminiFirstPass: {
      summary: params.extracted.rawSummary,
      category: params.extracted.scamCategory,
      reasoning: params.extracted.aiDetailedReasoning,
      initialRiskLevel: params.extracted.aiRiskLevel,
      observations: params.extracted.aiReasons,
      requestedActions: params.extracted.actionsRequested,
      socialEngineeringSignals: params.extracted.socialEngineeringSignals,
      claimedInstitution: params.extracted.claimedInstitution,
      extractedUrls: params.extracted.extractedUrls,
      ocrText: params.extracted.ocrTextExtracted,
      imageSummary: params.extracted.imageAnalysisSummary,
      bankAccountDetails: params.extracted.bankAccountDetails
    },
    technicalChecks: params.technicalAssessment
  };

  const { parsed } = await generateStructuredJson(
    ai,
    [{
      text: `Hãy tạo câu trả lời cuối cùng cho người dùng từ dữ liệu đã được phân tích và kiểm tra dưới đây.\n\n${JSON.stringify(payload, null, 2)}`
    }],
    {
      systemInstruction: FINAL_RESPONSE_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: FINAL_RESPONSE_SCHEMA
    },
    'final consumer response'
  );

  const aiRiskLevel = normalizeRiskLevel(parsed.riskLevel, params.technicalAssessment.minimumRiskLevel);
  const riskLevel = clampRiskLevel(aiRiskLevel, params.technicalAssessment.minimumRiskLevel);
  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.map((value: unknown) => String(value || '').trim()).filter(Boolean).slice(0, 6)
    : [];
  const actionSteps = Array.isArray(parsed.actionSteps)
    ? parsed.actionSteps.map((value: unknown) => String(value || '').trim()).filter(Boolean).slice(0, 5)
    : [];

  if (!parsed.headlineTitle || !parsed.headlineSubtitle || !parsed.aiDetailedReasoning || !reasons.length || !actionSteps.length) {
    throw new GeminiAnalysisError(
      'Gemini final response was incomplete.',
      503,
      'GEMINI_INVALID_FINAL_OUTPUT',
      'Gemini chưa hoàn tất được phần khuyến nghị cuối cùng. Vui lòng thử lại.'
    );
  }

  return {
    riskLevel,
    headlineTitle: String(parsed.headlineTitle).trim(),
    headlineSubtitle: String(parsed.headlineSubtitle).trim(),
    riskScoreDescription: String(parsed.riskScoreDescription || '').trim(),
    scamCategory: String(parsed.scamCategory || '').trim(),
    aiDetailedReasoning: String(parsed.aiDetailedReasoning).trim(),
    reasons,
    actionSteps,
    disclaimer: String(parsed.disclaimer || '').trim()
  };
}
