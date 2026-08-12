import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { ConsumerMode } from '../types';
import { SAMPLE_PROMPTS, getRandomSamplePrompt } from '../data/samplePrompts';
import { Search, Upload, X, QrCode, AlertCircle, Loader2, Sparkles, RefreshCw, Dices } from 'lucide-react';

interface AnalysisFormProps {
  currentMode: ConsumerMode;
  onAnalyze: (text: string, imageBase64?: string, mimeType?: string) => Promise<void>;
  isLoading: boolean;
  onClear: () => void;
}

export const AnalysisForm: React.FC<AnalysisFormProps> = ({
  currentMode,
  onAnalyze,
  isLoading,
  onClear
}) => {
  const [inputText, setInputText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [qrDecodedText, setQrDecodedText] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suggestions filtered by mode
  const modeSuggestions = SAMPLE_PROMPTS.filter(p => p.mode === currentMode);
  const displayedSuggestions = modeSuggestions.length > 0 ? modeSuggestions.slice(0, 3) : SAMPLE_PROMPTS.slice(0, 3);

  const handleRandomInsert = () => {
    const random = getRandomSamplePrompt(inputText);
    setInputText(random.text);
  };

  // Update prompt placeholder depending on consumer mode

  const getModePlaceholder = () => {
    switch (currentMode) {
      case 'link':
        return 'Dán đường dẫn trang web (URL) hoặc địa chỉ lạ bạn nhận được vào đây...\nVí dụ: http://vietcombank-dinhdanh-online.com/xacthuc';
      case 'message':
        return 'Dán toàn bộ nội dung tin nhắn SMS, Zalo, Messenger hoặc email nghi vấn vào đây...\nVí dụ: "Vietcombank thong bao: TK ban bi khoa trong 2h. Vui long truy cap http://vcb-auth.com de xac thuc ngay."';
      case 'screenshot_qr':
        return 'Tải lên hoặc dán ảnh chụp màn hình tin nhắn, mã QR, hóa đơn chuyển khoản hoặc thông báo nghi ngờ...';
      case 'call':
        return 'Mô tả nội dung cuộc gọi xưng danh công an, ngân hàng, viện kiểm sát, tổng cục thuế hoặc người lạ yêu cầu thao tác...';
      case 'account':
        return 'Nhập thông tin tài khoản nhận tiền (Tên ngân hàng, Số tài khoản, Tên chủ tài khoản) hoặc lý do bị yêu cầu chuyển tiền...';
      case 'threat':
        return 'Dán tin nhắn đe dọa, đòi nợ bôi nhọ, uy hiếp công việc/người thân hoặc tải ảnh màn hình tin nhắn SMS/Zalo/FB...\nVí dụ: "NGƯỜI THÂN GIA ĐÌNH CỦA A LÔI ĐẦU NÓ RA ĐÂY GIẢI QUYẾT GẤP ĐỪNG ĐỂ ĐẾN CÔNG VIỆC..."';
      default:
        return 'Dán tin nhắn, đường dẫn URL hoặc mô tả tình huống để kiểm tra ngay...';
    }
  };

  // Decode QR code using canvas and jsQR
  const decodeQrFromImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl);
      setImageMimeType(file.type);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          setQrDecodedText(code.data);
          setInputText(prev => {
            if (prev.includes(code.data)) return prev;
            return prev ? `${prev}\n[Mã QR giải mã được: ${code.data}]` : `[Mã QR giải mã được: ${code.data}]`;
          });
        } else {
          setQrDecodedText(null);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      decodeQrFromImage(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      decodeQrFromImage(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    setQrDecodedText(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !imageBase64) return;
    onAnalyze(inputText, imageBase64 || undefined, imageMimeType || undefined);
  };

  const handleClearAll = () => {
    setInputText('');
    handleRemoveImage();
    onClear();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-5 sm:p-6 text-slate-800">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input Text Area */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
            <span>Dán nội dung tin nhắn, URL hoặc mô tả tình huống</span>
            {inputText && (
              <span className="text-[11px] text-slate-400 font-normal">
                {inputText.length} ký tự
              </span>
            )}
          </label>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={getModePlaceholder()}
            rows={4}
            className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 focus:bg-white rounded-lg p-4 text-sm text-slate-800 placeholder-slate-400 transition-all resize-y min-h-[110px]"
          />

          {/* Quick Suggestion Chips & Random Button */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Gợi ý nhanh:
              </span>
              {displayedSuggestions.map(sugg => (
                <button
                  key={sugg.id}
                  type="button"
                  onClick={() => setInputText(sugg.text)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200 text-left truncate max-w-[220px]"
                  title={sugg.text}
                >
                  {sugg.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleRandomInsert}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-xs font-bold transition-colors shrink-0"
            >
              <Dices className="w-3.5 h-3.5 text-amber-600" />
              🎲 Tải câu ngẫu nhiên
            </button>
          </div>
        </div>

        {/* QR & Image Upload Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              Đính kèm Ảnh màn hình / Mã QR (PNG, JPEG, WebP)
            </span>
            {qrDecodedText && (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-md">
                <QrCode className="w-3.5 h-3.5" /> Quét được QR!
              </span>
            )}
          </div>

          {!imagePreview ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-red-400 bg-red-50/50'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-xs text-slate-600">
                  <Upload className="w-5 h-5 text-slate-700" />
                </div>
                <p className="text-xs text-slate-700 font-semibold">
                  Nhấp để chọn ảnh hoặc kéo thả vào đây
                </p>
                <p className="text-[11px] text-slate-400">
                  Tự động giải mã QR Code & Gemini Multimodal phân tích chi tiết ảnh
                </p>
              </div>
            </div>
          ) : (
            <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-4">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">Ảnh đính kèm đã sẵn sàng</p>
                {qrDecodedText ? (
                  <p className="text-xs text-emerald-700 truncate mt-0.5">
                    Mã QR giải mã: <span className="font-mono bg-white px-1.5 py-0.5 border border-slate-200 rounded text-[11px] font-bold">{qrDecodedText}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-0.5">Gemini sẽ đọc hình ảnh để phân tích các dấu hiệu bất thường</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1.5 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                title="Xóa ảnh"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Buttons Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleClearAll}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới / Xóa nội dung
          </button>

          <button
            type="submit"
            disabled={isLoading || (!inputText.trim() && !imageBase64)}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-700 hover:via-red-700 hover:to-amber-700 active:scale-[0.98] disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Đang đối soát dữ liệu & phân tích...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 text-white" />
                KIỂM TRA DẤU HIỆU LỪA ĐẢO
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
