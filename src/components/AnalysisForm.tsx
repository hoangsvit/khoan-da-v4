import React, { useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Check, ImagePlus, Loader2, QrCode, RefreshCw, Search, ShieldCheck, Upload, X } from 'lucide-react';
import { motion } from 'motion/react';

interface AnalysisFormProps {
  onAnalyze: (text: string, imageBase64?: string, mimeType?: string) => Promise<void>;
  isLoading: boolean;
  onClear: () => void;
}

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2200;
const MAX_DATA_URL_LENGTH = 7_000_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không thể mở ảnh đã chọn.'));
    image.src = dataUrl;
  });
}

export const AnalysisForm: React.FC<AnalysisFormProps> = ({ onAnalyze, isLoading, onClear }) => {
  const [inputText, setInputText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [qrDecodedText, setQrDecodedText] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [imagePreparing, setImagePreparing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotice = (message: string) => {
    setPasteNotice(message);
    window.setTimeout(() => setPasteNotice(null), 3200);
  };

  const processImageFile = async (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showNotice('Vui lòng chọn ảnh PNG, JPEG hoặc WebP.');
      return;
    }

    if (file.size > MAX_SOURCE_BYTES) {
      showNotice('Ảnh quá lớn. Vui lòng chọn ảnh dưới 15 MB.');
      return;
    }

    setImagePreparing(true);

    try {
      const originalDataUrl = await readFileAsDataUrl(file);
      const image = await loadImage(originalDataUrl);
      const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(longestSide, 1));

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Trình duyệt không thể xử lý ảnh này.');

      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      // Keep screenshot text/QR sharp when possible. Only switch to JPEG if the
      // request would become too large for the backend JSON body.
      let preparedDataUrl = canvas.toDataURL('image/png');
      if (preparedDataUrl.length > MAX_DATA_URL_LENGTH) {
        preparedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      }
      if (preparedDataUrl.length > MAX_DATA_URL_LENGTH) {
        preparedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      }

      if (preparedDataUrl.length > MAX_DATA_URL_LENGTH) {
        throw new Error('Ảnh vẫn quá lớn sau khi tối ưu. Hãy thử ảnh có độ phân giải thấp hơn.');
      }

      const preparedMime = preparedDataUrl.match(/^data:([^;]+);base64,/)?.[1] || 'image/jpeg';

      setImagePreview(preparedDataUrl);
      setImageBase64(preparedDataUrl);
      setImageMimeType(preparedMime);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qr = jsQR(imageData.data, imageData.width, imageData.height);

      if (qr?.data) {
        setQrDecodedText(qr.data);
        setInputText(previous => {
          if (previous.includes(qr.data)) return previous;
          const qrContext = `[Nội dung QR đọc được: ${qr.data}]`;
          return previous.trim() ? `${previous.trim()}\n${qrContext}` : qrContext;
        });
        showNotice('Đã nhận ảnh và đọc được nội dung QR.');
      } else {
        setQrDecodedText(null);
        showNotice('Ảnh đã sẵn sàng để Gemini phân tích.');
      }
    } catch (error: any) {
      showNotice(error?.message || 'Không thể chuẩn bị ảnh. Vui lòng thử ảnh khác.');
    } finally {
      setImagePreparing(false);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(event.clipboardData?.items || []).find(item => item.type.startsWith('image/'));
    const file = imageItem?.getAsFile();

    if (file) {
      event.preventDefault();
      void processImageFile(file);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void processImageFile(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processImageFile(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    setQrDecodedText(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputText.trim() && !imageBase64) return;
    void onAnalyze(inputText.trim(), imageBase64 || undefined, imageMimeType || undefined);
  };

  const handleClearAll = () => {
    setInputText('');
    handleRemoveImage();
    onClear();
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_60px_-38px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-950 sm:text-lg">
              Bạn muốn kiểm tra điều gì?
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-sm">
              Dán nội dung hoặc tải ảnh lên. Gemini sẽ tự nhận diện đây là tin nhắn, đường link, cuộc gọi, QR, yêu cầu chuyển tiền hay tình huống khác.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-7">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={event => setInputText(event.target.value)}
            onPaste={handlePaste}
            placeholder="Dán tin nhắn, URL, mô tả cuộc gọi, thông tin chuyển khoản... hoặc chỉ cần tải ảnh chụp màn hình bên dưới."
            rows={6}
            className="min-h-[150px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100 placeholder:text-slate-400"
          />

          {pasteNotice && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-3 top-3 flex max-w-[85%] items-center gap-1.5 rounded-lg bg-slate-950 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg"
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              {pasteNotice}
            </motion.div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700">Ảnh chụp màn hình hoặc mã QR</span>
            <span className="text-[11px] text-slate-400">PNG, JPEG, WebP · tối đa 15 MB</span>
          </div>

          {!imagePreview ? (
            <div
              onDragOver={event => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => !imagePreparing && fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border border-dashed p-5 transition ${
                dragActive
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
                  {imagePreparing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {imagePreparing ? 'Đang chuẩn bị ảnh…' : 'Chọn ảnh, kéo thả hoặc dán từ clipboard'}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                    Ảnh sẽ được tối ưu ngay trên thiết bị trước khi gửi để Gemini đọc nội dung.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
              <img
                src={imagePreview}
                alt="Ảnh đã chọn"
                className="h-20 w-20 shrink-0 rounded-xl border border-white object-cover shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <Upload className="h-3.5 w-3.5" />
                  Ảnh đã sẵn sàng
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/80">
                  Gemini sẽ đọc chữ, URL, tên tổ chức, yêu cầu hành động và các dấu hiệu có trong ảnh.
                </p>
                {qrDecodedText && (
                  <div className="mt-2 flex items-center gap-1.5 truncate text-[11px] font-semibold text-emerald-800">
                    <QrCode className="h-3.5 w-3.5 shrink-0" />
                    QR: <span className="truncate font-mono">{qrDecodedText}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="rounded-lg border border-emerald-200 bg-white p-2 text-slate-500 transition hover:text-red-600"
                title="Xóa ảnh"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleClearAll}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Xóa nội dung
          </button>

          <button
            type="submit"
            disabled={isLoading || imagePreparing || (!inputText.trim() && !imageBase64)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gemini đang đọc và đối chiếu…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Kiểm tra ngay
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
