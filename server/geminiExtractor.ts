import { GoogleGenAI, Type } from '@google/genai';
import { ExtractedSignals, RiskLevel } from './riskEngine';
import { extractUrlsFromText } from './urlChecker';
import { matchInstitutionInText } from './registry';

const CANDIDATE_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

export function fallbackLocalExtraction(text: string, imageBase64?: string): ExtractedSignals {
  const extractedUrls = extractUrlsFromText(text || '');
  const matchedInst = matchInstitutionInText(text || '');
  const claimedInstitution = matchedInst?.entity.name;

  // Social engineering detection
  const urgency = /gấp|khẩn cấp|ngay lập tức|trong 24h|khóa tài khoản|tạm dừng|ngưng dịch vụ|quá hạn/i.test(text || '');
  const rewardOrThreat = /trúng thưởng|quà tặng|bắt giam|lệnh bắt|khởi tố|phạt|vi phạm|nợ xấu/i.test(text || '');
  const impersonation = Boolean(claimedInstitution) || /công an|viện kiểm sát|ngân hàng|bộ công an|cục thuế|điện lực|bảo hiểm/i.test(text || '');
  const secrecy = /giữ bí mật|không nói|tuyệt đối không|bảo mật cuộc gọi/i.test(text || '');
  const unnaturalPhrasing = /quý khách vui lòng|vui lòng truy cập|xác minh ngay|cung cấp otp/i.test(text || '');
  const threatOrExtortion = /tống tiền|bôi nhọ|đòi nợ|khủng bố|tung ảnh|uy hiếp|đe dọa/i.test(text || '');

  // Actions requested
  const clickLink = extractedUrls.length > 0 || /link|đường dẫn|truy cập|bấm vào|vào web/i.test(text || '');
  const installApk = /\.apk|cài đặt app|tải ứng dụng|cài ứng dụng ngoài|file apk/i.test(text || '');
  const provideOtp = /otp|mã xác thực|mật khẩu|pass/i.test(text || '');
  const transferMoney = /chuyển tiền|nạp tiền|thanh toán|mượn tiền|chuyển khoản/i.test(text || '');
  const shareScreen = /màn hình|anydesk|teamviewer|trợ năng/i.test(text || '');
  const providePersonalId = /cccd|cmnd|ảnh mặt|chân dung|sổ hộ khẩu/i.test(text || '');

  let aiRiskLevel: RiskLevel = 'NO_CLEAR_RISK';
  const aiReasons: string[] = [];
  const aiActionSteps: string[] = [];

  if (installApk || provideOtp || shareScreen || (clickLink && (impersonation || urgency))) {
    aiRiskLevel = 'STOP';
  } else if (urgency || rewardOrThreat || transferMoney || extractedUrls.length > 0) {
    aiRiskLevel = 'CAUTION';
  } else if (impersonation) {
    aiRiskLevel = 'VERIFY';
  }

  if (installApk) {
    aiReasons.push('Cảnh báo cài đặt tập tin/ứng dụng APK lạ nguy cơ chiếm quyền điều khiển thiết bị.');
  }
  if (provideOtp) {
    aiReasons.push('Yêu cầu cung cấp mã xác thực OTP hoặc mật khẩu cá nhân.');
  }
  if (urgency) {
    aiReasons.push('Sử dụng chiêu trò hối thúc khẩn cấp, đe dọa để thao túng tâm lý.');
  }
  if (extractedUrls.length > 0) {
    aiReasons.push(`Phát hiện ${extractedUrls.length} liên kết web trong nội dung.`);
  }
  if (claimedInstitution) {
    aiReasons.push(`Mạo danh/nhắc tới tên tổ chức/ngân hàng: ${claimedInstitution}.`);
  }

  if (aiReasons.length === 0) {
    aiReasons.push('Phân tích quy tắc an toàn: Kiểm tra cơ bản chưa thấy dấu hiệu nguy hiểm rõ ràng.');
  }

  if (aiRiskLevel === 'STOP') {
    aiActionSteps.push('NGƯNG GIAO DỊCH VÀ KHÔNG BẤM VÀO BẤT KỲ LIÊN KẾT NÀO.');
    aiActionSteps.push('Tuyệt đối KHÔNG nhập OTP, Mật khẩu hoặc Số thẻ ngân hàng.');
  } else {
    aiActionSteps.push('Xác minh lại thông tin qua tổng đài hoặc kênh chính thức.');
  }

  return {
    analysisEngine: 'LOCAL_FALLBACK',
    scamCategory: claimedInstitution ? `Nghi vấn mạo danh ${claimedInstitution}` : 'Phát hiện nguy cơ lừa đảo (Cục bộ)',
    aiRiskLevel,
    aiHeadlineTitle: aiRiskLevel === 'STOP' ? 'CẢNH BÁO NGUY HIỂM CAO' : aiRiskLevel === 'CAUTION' ? 'CẢNH BÁO THẬN TRỌNG' : 'CẦN XÁC MINH KĨ',
    aiHeadlineSubtitle: 'Được đối soát tự động theo quy tắc an ninh mạng.',
    aiRiskScoreDescription: `Phân tích An Ninh Cục Bộ (Hệ thống AI tạm bận): Mức rủi ro ${aiRiskLevel}`,
    aiReasons,
    aiActionSteps,
    hasImageAttached: Boolean(imageBase64),
    extractedUrls,
    actionsRequested: {
      clickLink,
      installApk,
      provideOtp,
      transferMoney,
      shareScreen,
      providePersonalId
    },
    socialEngineeringSignals: {
      urgency,
      rewardOrThreat,
      impersonation,
      secrecy,
      unnaturalPhrasing,
      threatOrExtortion
    },
    rawSummary: 'Phân tích quy tắc an toàn thông tin khẩn cấp.'
  };
}

export async function extractSignalsFromInput(
  text: string,
  imageBase64?: string,
  mimeType?: string
): Promise<ExtractedSignals> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    console.warn('[Gemini AI Engine] GEMINI_API_KEY not configured, using local fallback...');
    return fallbackLocalExtraction(text, imageBase64);
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  const systemInstruction = `Bạn là Trợ lý Trí tuệ Nhân tạo Hàng đầu (100% Multimodal AI) chuyên phân tích, phát hiện và đánh giá lừa đảo trực tuyến tại Việt Nam (SMS, Zalo, Messenger, Chuyển khoản ngân hàng, Giấy tờ/Thông báo giả mạo, Đe dọa đòi nợ/bôi nhọ, Bẫy APK độc hại, Dụ dỗ OTP, Mã QR nghi vấn).

Nhiệm vụ chính của bạn là thực hiện đánh giá TRÍ TUỆ NHÂN TẠO 100% để:
1. Đọc TOÀN BỘ chữ (OCR) trên ảnh màn hình được đính kèm (nếu có), nhận diện tên người nhắn, số điện thoại, số tài khoản, thông tin đe dọa, tên tổ chức.
2. Xác định Phân loại Hành vi Lừa đảo (scamCategory), ví dụ: "Mạo danh Cơ quan / Ngân hàng", "Đe dọa đòi nợ / Bôi nhọ danh dự", "Bẫy APK độc hại / Dịch vụ công giả mạo", "Dụ dỗ OTP / Chiếm đoạt tài khoản", "Lừa đảo Chuyển tiền / Đặt cọc", "Liên kết Lừa đảo Phishing".
3. Lập luận phân tích chiều sâu do AI tự đánh giá (aiDetailedReasoning), giải thích các thủ đoạn thao túng tâm lý, rủi ro tiềm ẩn và bẫy lừa đảo.
4. Đánh giá Mức độ Rủi ro (aiRiskLevel): 'STOP' (Cực kỳ nguy hiểm, ngưng ngay), 'CAUTION' (Thận trọng, có dấu hiệu bất thường), 'VERIFY' (Cần xác minh kỹ), hoặc 'NO_CLEAR_RISK' (Chưa thấy dấu hiệu nguy hiểm rõ ràng).
5. Đưa ra Tiêu đề cảnh báo AI (aiHeadlineTitle), Phụ đề AI (aiHeadlineSubtitle), Điểm số rủi ro AI (aiRiskScoreDescription), Danh sách lý do cảnh báo do AI chỉ ra (aiReasons) và Danh sách hành động ứng phó khẩn cấp do AI đề xuất (aiActionSteps).`;

  const contents: Array<any> = [];

  let cleanBase64 = '';
  let detectedMime = mimeType || 'image/png';

  if (imageBase64) {
    const mimeMatch = imageBase64.match(/^data:([^;]+);base64,/);
    if (mimeMatch) {
      detectedMime = mimeMatch[1];
    }
    cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    contents.push({
      inlineData: {
        mimeType: detectedMime,
        data: cleanBase64
      }
    });
  }

  const promptText = `Nội dung văn bản kèm theo:
${text || '(Không có văn bản nhập tay, đang đính kèm ảnh màn hình)'}

HÃY PHÂN TÍCH VÀ ĐỌC HÌNH ẢNH MÀN HÌNH ĐƯỢC ĐÍNH KÈM (NẾU CÓ):
- Đọc tất cả chữ trên ảnh màn hình (OCR) bao gồm tên người nhắn, số điện thoại, số tài khoản, tên ngân hàng, tên người thụ hưởng và toàn bộ tin nhắn chat/SMS.
- Đánh giá toàn bộ kịch bản bằng trí tuệ nhân tạo (Gemini AI Vision & Intelligence) để trích xuất đầy đủ phân tích 100% AI.`;

  contents.push({ text: promptText });

  const requestConfig = {
    systemInstruction,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        aiRiskLevel: {
          type: Type.STRING,
          description: 'Đánh giá mức độ rủi ro bởi AI: STOP, CAUTION, VERIFY, hoặc NO_CLEAR_RISK'
        },
        aiHeadlineTitle: { type: Type.STRING, description: 'Tiêu đề cảnh báo nổi bật do AI tạo ra (ví dụ: KHOAN CHUYỂN TIỀN!, CẢNH BÁO: MẠO DANH CÔNG AN!)' },
        aiHeadlineSubtitle: { type: Type.STRING, description: 'Phụ đề tóm tắt tình huống nguy hiểm do AI tạo ra' },
        aiRiskScoreDescription: { type: Type.STRING, description: 'Mô tả điểm số rủi ro AI, ví dụ: Phân tích 100% Gemini AI: Rủi ro Cực cao (95/100)' },
        scamCategory: { type: Type.STRING, description: 'Phân loại chiêu trò lừa đảo (ví dụ: Mạo danh Cơ quan/Ngân hàng, Bẫy APK độc hại, Tống tiền/Đòi nợ, Lừa đảo OTP...)' },
        aiDetailedReasoning: { type: Type.STRING, description: 'Phân tích chiều sâu từ AI về tâm lý thao túng, phương thức lừa đảo và dấu hiệu nhận biết trong tình huống này' },
        aiReasons: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Danh sách các tín hiệu và lý do nguy cơ cụ thể được AI phát hiện'
        },
        aiActionSteps: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Danh sách hành động ứng phó khẩn cấp do AI khuyến nghị cho người dùng'
        },
        ocrTextExtracted: { type: Type.STRING, description: 'Toàn bộ văn bản trích xuất được từ hình ảnh đính kèm (OCR)' },
        imageAnalysisSummary: { type: Type.STRING, description: 'Mô tả tóm tắt nội dung thu thập được từ hình ảnh' },
        claimedInstitution: { type: Type.STRING, description: 'Tên ngân hàng hoặc tổ chức/cơ quan nhà nước được nhắc tới (ví dụ: Vietcombank, MBBank, VNeID, Bộ Công an)' },
        extractedUrls: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Danh sách các liên kết URL hoặc địa chỉ trang web xuất hiện'
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
            clickLink: { type: Type.BOOLEAN, description: 'Yêu cầu bấm vào liên kết' },
            installApk: { type: Type.BOOLEAN, description: 'Yêu cầu tải/cài ứng dụng APK lạ hoặc ứng dụng ngoài Store' },
            provideOtp: { type: Type.BOOLEAN, description: 'Yêu cầu đọc/nhập mã OTP hoặc mật khẩu' },
            transferMoney: { type: Type.BOOLEAN, description: 'Yêu cầu chuyển tiền/mượn tiền vào tài khoản' },
            shareScreen: { type: Type.BOOLEAN, description: 'Yêu cầu bật chia sẻ màn hình, AnyDesk, TeamViewer hoặc trợ năng' },
            providePersonalId: { type: Type.BOOLEAN, description: 'Yêu cầu gửi ảnh CCCD, thông tin cá nhân nhạy cảm' }
          },
          required: ['clickLink', 'installApk', 'provideOtp', 'transferMoney', 'shareScreen', 'providePersonalId']
        },
        socialEngineeringSignals: {
          type: Type.OBJECT,
          properties: {
            urgency: { type: Type.BOOLEAN, description: 'Sử dụng yếu tố khẩn cấp, đe dọa khóa tài khoản/hối thúc gấp' },
            rewardOrThreat: { type: Type.BOOLEAN, description: 'Hứa hẹn trúng thưởng/quà tặng hoặc đe doạ danh dự/người thân/lệnh bắt' },
            impersonation: { type: Type.BOOLEAN, description: 'Mạo danh công an, ngân hàng, cơ quan thuế, điện lực hoặc người thân' },
            secrecy: { type: Type.BOOLEAN, description: 'Yêu cầu giữ bí mật không cho gia đình/người thân biết' },
            unnaturalPhrasing: { type: Type.BOOLEAN, description: 'Cách văn phong nói chuyện bất thường, lỗi font hoặc dịch máy' },
            threatOrExtortion: { type: Type.BOOLEAN, description: 'Có hành vi đe dọa, khủng bố tinh thần, bôi nhọ danh dự, uy hiếp gia đình/công việc hoặc tống tiền/đòi nợ' }
          },
          required: ['urgency', 'rewardOrThreat', 'impersonation', 'secrecy', 'unnaturalPhrasing', 'threatOrExtortion']
        },
        rawSummary: { type: Type.STRING, description: 'Tóm tắt ngắn gọn 1-2 câu về nội dung tin nhắn/cuộc gọi/hình ảnh' }
      },
      required: ['aiRiskLevel', 'aiHeadlineTitle', 'aiHeadlineSubtitle', 'scamCategory', 'aiDetailedReasoning', 'aiReasons', 'aiActionSteps', 'extractedUrls', 'actionsRequested', 'socialEngineeringSignals', 'rawSummary']
    }
  };

  let lastError: any = null;

  // Try candidate models in sequence, with 1 retry per model if rate-limited
  for (const modelName of CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini AI Engine] Attempting AI analysis with model: ${modelName} (Attempt ${attempt})...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: requestConfig
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());

          // Combine text + ocr extracted urls
          const combinedText = `${text}\n${parsed.ocrTextExtracted || ''}`;
          const textUrls = extractUrlsFromText(combinedText);
          const combinedUrls = Array.from(new Set([...(parsed.extractedUrls || []), ...textUrls]));

          const rawRiskLevel = String(parsed.aiRiskLevel || '').toUpperCase();
          const validRiskLevels = ['STOP', 'CAUTION', 'VERIFY', 'NO_CLEAR_RISK'];
          const aiRiskLevel = validRiskLevels.includes(rawRiskLevel) ? (rawRiskLevel as any) : 'STOP';

          return {
            analysisEngine: 'GEMINI_AI_100',
            scamCategory: parsed.scamCategory || 'Phát hiện nguy cơ lừa đảo qua AI',
            aiDetailedReasoning: parsed.aiDetailedReasoning || undefined,
            aiRiskLevel,
            aiHeadlineTitle: parsed.aiHeadlineTitle || 'CẢNH BÁO BỞI GEMINI AI',
            aiHeadlineSubtitle: parsed.aiHeadlineSubtitle || 'Trí tuệ nhân tạo phát hiện các dấu hiệu bất thường.',
            aiRiskScoreDescription: parsed.aiRiskScoreDescription || `Phân tích 100% bởi Trí Tuệ Nhân Tạo Gemini AI (${modelName})`,
            aiReasons: Array.isArray(parsed.aiReasons) && parsed.aiReasons.length > 0 ? parsed.aiReasons : undefined,
            aiActionSteps: Array.isArray(parsed.aiActionSteps) && parsed.aiActionSteps.length > 0 ? parsed.aiActionSteps : undefined,
            hasImageAttached: Boolean(imageBase64),
            ocrTextExtracted: parsed.ocrTextExtracted || undefined,
            imageAnalysisSummary: parsed.imageAnalysisSummary || undefined,
            claimedInstitution: parsed.claimedInstitution || undefined,
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
            rawSummary: parsed.rawSummary || 'Phân tích 100% bằng Gemini AI Vision & Reasoning.'
          };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || '');
        const isQuota = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota exceeded');

        console.log(`[Gemini AI Engine] Model ${modelName} attempt ${attempt} rate-limited or busy, switching model...`);

        if (isQuota && attempt === 1) {
          // Wait 1500ms before attempt 2
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } else {
          // Break to try next candidate model
          break;
        }
      }
    }
  }

  // If rate-limited or busy across all candidate models, seamlessly use local fallback rule engine
  console.warn('[Gemini AI Engine] Gemini API rate limit reached across all models, using local security analysis fallback.');
  return fallbackLocalExtraction(text, imageBase64);
}




