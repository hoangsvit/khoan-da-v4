import React, { useState } from 'react';
import { RiskAnalysisResult } from '../types';
import { OctagonX, AlertTriangle, ShieldCheck, CheckCircle2, ShieldAlert, Copy, Check, ExternalLink, Globe, AlertCircle, Phone, Lock, Eye, CreditCard, FileText, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';

interface RiskResultDisplayProps {
  result: RiskAnalysisResult;
}

export const RiskResultDisplay: React.FC<RiskResultDisplayProps> = ({ result }) => {
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [showAiReasoning, setShowAiReasoning] = useState(true);

  const getBadgeStyle = () => {
    switch (result.riskLevel) {
      case 'STOP':
        return {
          bg: 'bg-red-50/90 border-red-300 text-red-950',
          titleColor: 'text-red-900',
          subtitleColor: 'text-red-800',
          icon: <OctagonX className="w-10 h-10 text-red-600 shrink-0" />,
          tagBg: 'bg-red-600 text-white'
        };
      case 'CAUTION':
        return {
          bg: 'bg-amber-50/90 border-amber-300 text-amber-950',
          titleColor: 'text-amber-900',
          subtitleColor: 'text-amber-800',
          icon: <AlertTriangle className="w-10 h-10 text-amber-600 shrink-0" />,
          tagBg: 'bg-amber-500 text-slate-950'
        };
      case 'VERIFY':
        return {
          bg: 'bg-yellow-50/90 border-yellow-300 text-yellow-950',
          titleColor: 'text-yellow-900',
          subtitleColor: 'text-yellow-800',
          icon: <ShieldAlert className="w-10 h-10 text-yellow-600 shrink-0" />,
          tagBg: 'bg-yellow-500 text-slate-950'
        };
      case 'NO_CLEAR_RISK':
      default:
        return {
          bg: 'bg-emerald-50/90 border-emerald-300 text-emerald-950',
          titleColor: 'text-emerald-900',
          subtitleColor: 'text-emerald-800',
          icon: <CheckCircle2 className="w-10 h-10 text-emerald-600 shrink-0" />,
          tagBg: 'bg-emerald-600 text-white'
        };
    }
  };

  const badgeStyle = getBadgeStyle();

  const handleCopyReport = () => {
    const reportText = `[CẢNH BÁO BỞI KHOAN ĐÃ!]
Mức độ: ${result.headlineTitle}
Tóm tắt: ${result.headlineSubtitle}
Lý do cảnh báo:
${result.reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Hành động khuyến nghị:
${result.actionSteps.map((a, i) => `- ${a}`).join('\n')}

---
Kiểm tra tại Khoan Đã! - Trợ lý phòng chống lừa đảo AI`;

    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleCopyAccount = (accountNum: string) => {
    navigator.clipboard.writeText(accountNum);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 text-slate-800"
    >
      {/* AI Engine Status Banner */}
      <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-bold">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Hệ Thống Phân Tích:</span>
          <span className="px-2.5 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 font-extrabold uppercase tracking-wide flex items-center gap-1">
            ✨ Gemini Multimodal AI Engine
          </span>
        </div>
        {result.scamCategory && (
          <div className="px-3 py-1 bg-white/10 border border-white/15 rounded-lg text-slate-200 font-semibold text-[11px]">
            Phân loại kịch bản: <strong className="text-white">{result.scamCategory}</strong>
          </div>
        )}
      </div>

      {/* Main High-Visibility Headline Banner */}
      <div className={`p-6 rounded-2xl border shadow-sm ${badgeStyle.bg} transition-all`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            {badgeStyle.icon}
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-md font-black text-xs uppercase tracking-wide ${badgeStyle.tagBg}`}>
                  {result.riskLevel}
                </span>
                <span className="text-xs text-slate-700 font-bold">
                  {result.riskScoreDescription}
                </span>
              </div>
              <h2 className={`text-2xl sm:text-3xl font-black mt-1.5 tracking-tight ${badgeStyle.titleColor}`}>
                {result.headlineTitle}
              </h2>
              <p className={`text-sm font-medium mt-1 leading-relaxed ${badgeStyle.subtitleColor}`}>
                {result.headlineSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyReport}
            className="self-stretch sm:self-auto px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 transition-all flex items-center justify-center gap-2 shrink-0 shadow-2xs active:scale-95 cursor-pointer"
          >
            {copiedReport ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            {copiedReport ? 'Đã sao chép Báo cáo!' : 'Sao chép Cảnh báo này'}
          </button>
        </div>
      </div>

      {/* Deep AI Reasoning Box */}
      {result.aiDetailedReasoning && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <button
            onClick={() => setShowAiReasoning(!showAiReasoning)}
            className="w-full p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between text-left cursor-pointer border-b border-slate-100"
          >
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-800">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Đánh giá chuyên sâu từ AI Gemini</span>
            </div>
            {showAiReasoning ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
          {showAiReasoning && (
            <div className="p-5 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-normal">
              {result.aiDetailedReasoning}
            </div>
          )}
        </div>
      )}

      {/* Brand / Domain Mismatch Alert Box */}
      {result.detectedBrandMismatch && result.mismatchDetails && (
        <div className="p-5 bg-red-50/90 border-2 border-red-300 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-red-900 font-extrabold text-sm uppercase tracking-wide">
            <OctagonX className="w-5 h-5 text-red-600 shrink-0" />
            CẢNH BÁO MẠO DANH THƯƠNG HIỆU NGÂN HÀNG / TỔ CHỨC
          </div>

          <p className="text-xs sm:text-sm text-red-950 leading-relaxed">
            Nội dung tự xưng là thuộc về <strong>"{result.mismatchDetails.claimedEntity}"</strong>, nhưng liên kết yêu cầu truy cập <strong>"{result.mismatchDetails.providedDomain}"</strong> KHÔNG thuộc danh sách tên miền chính thức đã đăng ký!
          </p>

          <div className="p-3.5 bg-white border border-red-200 rounded-xl space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Tổ chức được xưng danh:</span>
              <span className="font-bold text-red-800">{result.mismatchDetails.claimedEntity}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Tên miền giả mạo/nghi vấn:</span>
              <span className="font-mono text-red-600 font-bold bg-red-50 px-2 py-0.5 border border-red-200 rounded">{result.mismatchDetails.providedDomain}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium">Tên miền chính thức hợp pháp:</span>
              <span className="font-mono text-emerald-700 font-bold flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {result.mismatchDetails.officialDomains.join(', ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Multimodal AI Vision Image Analysis Result */}
      {(result.extractedSignals?.hasImageAttached || result.extractedSignals?.imageAnalysisSummary || result.extractedSignals?.ocrTextExtracted) && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600 shrink-0" />
              Kết quả Phân tích Hình ảnh AI Multimodal (OCR & Thị giác)
            </h3>
            <span className="px-2 py-0.5 bg-slate-900 text-white font-bold text-[10px] rounded uppercase">
              Gemini Vision
            </span>
          </div>

          {result.extractedSignals.imageAnalysisSummary && (
            <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200">
              {result.extractedSignals.imageAnalysisSummary}
            </p>
          )}

          {result.extractedSignals.ocrTextExtracted && (
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                Văn bản trích xuất được từ ảnh (OCR):
              </div>
              <p className="text-slate-800 leading-relaxed font-sans">{result.extractedSignals.ocrTextExtracted}</p>
            </div>
          )}
        </div>
      )}

      {/* Extracted Bank Account Information Card */}
      {result.extractedSignals?.bankAccountDetails && (result.extractedSignals.bankAccountDetails.accountNumber || result.extractedSignals.bankAccountDetails.bankName) && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2.5 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-amber-900 uppercase tracking-wider">
              <CreditCard className="w-4 h-4 text-amber-700 shrink-0" />
              Thông tin tài khoản ngân hàng trích xuất
            </div>
            {result.extractedSignals.bankAccountDetails.accountNumber && (
              <button
                type="button"
                onClick={() => handleCopyAccount(result.extractedSignals.bankAccountDetails.accountNumber!)}
                className="flex items-center gap-1 text-[11px] font-bold bg-white px-2.5 py-1 border border-amber-300 rounded-lg text-amber-900 hover:bg-amber-100 transition-colors"
              >
                {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAccount ? 'Đã chép STK' : 'Chép STK'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-white border border-amber-200 rounded-xl">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Ngân hàng:</span>
              <span className="font-bold text-slate-800">{result.extractedSignals.bankAccountDetails.bankName || 'Chưa rõ'}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Số tài khoản:</span>
              <span className="font-mono font-bold text-red-700">{result.extractedSignals.bankAccountDetails.accountNumber || 'Chưa rõ'}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Chủ tài khoản:</span>
              <span className="font-bold text-slate-800">{result.extractedSignals.bankAccountDetails.accountHolder || 'Chưa rõ'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Reasons List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          Các tín hiệu rủi ro trích xuất được ({result.reasons.length})
        </h3>

        {result.reasons.length > 0 ? (
          <ul className="space-y-2">
            {result.reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <span className="w-5 h-5 rounded-md bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed font-medium">{reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400 italic">Không phát hiện tín hiệu nguy cơ nổi bật.</p>
        )}
      </div>

      {/* Action Steps */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Hành động bạn nên thực hiện ngay
        </h3>

        <div className="grid grid-cols-1 gap-2.5">
          {result.actionSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-xl text-xs sm:text-sm text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Safe Browsing Status Callout */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-700 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-blue-600" />
            Trạng thái tra cứu Google Safe Browsing v5
          </span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
            result.safeBrowsingStatus.hasMatch
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}>
            {result.safeBrowsingStatus.checked
              ? result.safeBrowsingStatus.hasMatch ? 'PHÁT HIỆN MÃ ĐỘC/LỪA ĐẢO' : 'KHÔNG CÓ TRONG BLACKLIST'
              : 'TỰ ĐỘNG ĐỐI SOÁT'}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed italic">
          {result.safeBrowsingStatus.disclaimer}
        </p>
      </div>

      {/* Disclaimer Notice */}
      <div className="p-4 bg-slate-900 rounded-xl text-[11px] text-slate-200 leading-relaxed flex items-center gap-3">
        <div className="text-slate-400 shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <strong className="font-bold text-white block">Quy tắc an toàn của Khoan Đã!:</strong>
          {result.disclaimer}
        </div>
      </div>
    </motion.div>
  );
};

