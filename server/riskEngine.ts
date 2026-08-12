import { Institution, isDomainVerifiedForEntity, matchInstitutionInText } from './registry';
import { analyzeUrl, URLCheckSignal } from './urlChecker';
import { SafeBrowsingResult } from './safeBrowsing';

export type RiskLevel = 'STOP' | 'CAUTION' | 'VERIFY' | 'NO_CLEAR_RISK';

export interface ExtractedSignals {
  claimedInstitution?: string;
  extractedUrls: string[];
  hasImageAttached?: boolean;
  ocrTextExtracted?: string;
  imageAnalysisSummary?: string;
  bankAccountDetails?: {
    accountNumber?: string;
    bankName?: string;
    accountHolder?: string;
  };
  actionsRequested: {
    clickLink: boolean;
    installApk: boolean;
    provideOtp: boolean;
    transferMoney: boolean;
    shareScreen: boolean;
    providePersonalId: boolean;
  };
  socialEngineeringSignals: {
    urgency: boolean;
    rewardOrThreat: boolean;
    impersonation: boolean;
    secrecy: boolean;
    unnaturalPhrasing: boolean;
    threatOrExtortion?: boolean;
  };
  rawSummary: string;
  // 100% AI Analysis Fields
  scamCategory?: string;
  aiDetailedReasoning?: string;
  aiRiskLevel?: RiskLevel;
  aiHeadlineTitle?: string;
  aiHeadlineSubtitle?: string;
  aiRiskScoreDescription?: string;
  aiReasons?: string[];
  aiActionSteps?: string[];
  analysisEngine?: 'GEMINI_AI_100' | 'LOCAL_FALLBACK';
}

export interface RiskAnalysisResult {
  riskLevel: RiskLevel;
  headlineTitle: string;
  headlineSubtitle: string;
  riskScoreDescription: string;
  detectedBrandMismatch: boolean;
  mismatchDetails?: {
    claimedEntity: string;
    officialDomains: string[];
    providedDomain: string;
  };
  matchedInstitution?: {
    id: string;
    name: string;
    verification: string;
    officialDomains: string[];
    officialHotline?: string;
  };
  reasons: string[];
  actionSteps: string[];
  safeBrowsingStatus: SafeBrowsingResult;
  urlCheckSignals: URLCheckSignal[];
  extractedSignals: ExtractedSignals;
  disclaimer: string;
  // 100% AI Indicators
  scamCategory?: string;
  aiDetailedReasoning?: string;
  analysisEngine: 'GEMINI_AI_100' | 'LOCAL_FALLBACK';
}

export function computeRiskAnalysis(
  extracted: ExtractedSignals,
  urls: string[],
  safeBrowsing: SafeBrowsingResult,
  userText: string
): RiskAnalysisResult {
  let reasons: string[] = extracted.aiReasons && extracted.aiReasons.length > 0
    ? [...extracted.aiReasons]
    : [];

  let actionSteps: string[] = extracted.aiActionSteps && extracted.aiActionSteps.length > 0
    ? [...extracted.aiActionSteps]
    : [];

  let detectedBrandMismatch = false;
  let mismatchDetails: RiskAnalysisResult['mismatchDetails'];

  // Analyze all extracted URLs
  const urlCheckSignals = urls.map(url => analyzeUrl(url));

  // Secondary Check: Match institution in claimedInstitution or full user text against SBV Bank Registry
  const matchResult = matchInstitutionInText(extracted.claimedInstitution || userText);
  let matchedInst: Institution | undefined = matchResult?.entity;

  // Secondary Check: Brand / Domain Mismatch
  if (matchedInst && matchedInst.verification === 'first_party_verified' && urlCheckSignals.length > 0) {
    for (const urlSig of urlCheckSignals) {
      if (urlSig.domain) {
        const isVerified = isDomainVerifiedForEntity(urlSig.domain, matchedInst);
        if (!isVerified) {
          detectedBrandMismatch = true;
          mismatchDetails = {
            claimedEntity: matchedInst.name,
            officialDomains: matchedInst.domains,
            providedDomain: urlSig.domain
          };
          const mismatchReason = `CẢNH BÁO GIẢ MẠO THƯƠNG HIỆU: Tin nhắn/nội dung xưng danh "${matchedInst.name}" nhưng đường dẫn "${urlSig.domain}" KHÔNG thuộc danh sách tên miền chính thức công khai của Ngân hàng Nhà nước (${matchedInst.domains.join(', ')}).`;
          if (!reasons.some(r => r.includes(urlSig.domain))) {
            reasons.unshift(mismatchReason);
          }
          break;
        }
      }
    }
  }

  // Secondary Check: Safe Browsing threat
  if (safeBrowsing.hasMatch) {
    const sbReason = `CẢNH BÁO MÃ ĐỘC (Google Safe Browsing): Phát hiện liên kết độc hại trong danh sách đen an toàn: ${safeBrowsing.matches.join(', ')}.`;
    if (!reasons.some(r => r.includes('Safe Browsing'))) {
      reasons.unshift(sbReason);
    }
  }

  // Primary AI Risk Level
  let riskLevel: RiskLevel = extracted.aiRiskLevel || 'STOP';
  if ((detectedBrandMismatch || safeBrowsing.hasMatch) && riskLevel !== 'STOP') {
    riskLevel = 'STOP';
  }

  const headlineTitle = extracted.aiHeadlineTitle || (riskLevel === 'STOP' ? 'CẢNH BÁO BỞI GEMINI AI: NGUY HIỂM LỢI DỤNG!' : 'CẢNH BÁO BỞI GEMINI AI');
  const headlineSubtitle = extracted.aiHeadlineSubtitle || 'Phân tích 100% bằng Trí tuệ Nhân tạo Multimodal Gemini AI.';
  const riskScoreDescription = extracted.aiRiskScoreDescription || `Phân tích 100% bởi Gemini AI (${riskLevel})`;

  // Ensure minimum default action steps if none provided
  if (actionSteps.length === 0) {
    if (riskLevel === 'STOP') {
      actionSteps.push('NGƯNG GIAO DỊCH VÀ KHÔNG BẤM VÀO BẤT KỲ LIÊN KẾT NÀO.');
      actionSteps.push('Tuyệt đối KHÔNG nhập OTP, Mật khẩu hoặc Số thẻ ngân hàng.');
      actionSteps.push('Nếu bị đe dọa hoặc tống tiền, hãy báo ngay cho Cơ quan Công an gần nhất.');
    } else if (riskLevel === 'CAUTION') {
      actionSteps.push('Xác minh lại danh tính người gửi qua kênh liên lạc chính thức khác.');
      actionSteps.push('Không chuyển tiền cho tài khoản cá nhân lạ.');
    } else {
      actionSteps.push('Vẫn luôn cẩn trọng trước khi giao dịch hoặc cung cấp thông tin cá nhân.');
    }
  }

  if (matchedInst && !actionSteps.some(s => s.includes(matchedInst.name))) {
    actionSteps.push(`Liên hệ tổng đài hoặc trang web chính thức của ${matchedInst.name} để kiểm tra đối soát.`);
  }

  const disclaimer =
    'Kết quả được phân tích 100% bằng Trí Tuệ Nhân Tạo Multimodal Gemini AI, kết hợp kiểm định đối soát phụ từ Cơ sở dữ liệu Ngân hàng Nhà nước VN & Google Safe Browsing API.';

  return {
    riskLevel,
    headlineTitle,
    headlineSubtitle,
    riskScoreDescription,
    scamCategory: extracted.scamCategory,
    aiDetailedReasoning: extracted.aiDetailedReasoning,
    analysisEngine: 'GEMINI_AI_100',
    detectedBrandMismatch,
    mismatchDetails,
    matchedInstitution: matchedInst ? {
      id: matchedInst.id,
      name: matchedInst.name,
      verification: matchedInst.verification,
      officialDomains: matchedInst.domains
    } : undefined,
    reasons,
    actionSteps,
    safeBrowsingStatus: safeBrowsing,
    urlCheckSignals,
    extractedSignals: extracted,
    disclaimer
  };
}
