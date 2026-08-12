import React from 'react';
import { ConsumerMode, RegistryStats } from '../types';
import { ShieldAlert, Link2, MessageSquare, Image as ImageIcon, PhoneCall, CreditCard, AlertTriangle, Database, Info, Sparkles, Flame } from 'lucide-react';

interface HeaderProps {
  currentMode: ConsumerMode;
  onSelectMode: (mode: ConsumerMode) => void;
  registryStats?: RegistryStats;
  onOpenRegistryModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  registryStats,
  onOpenRegistryModal
}) => {
  const modes: Array<{ id: ConsumerMode; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'link', label: 'Liên kết / URL', icon: <Link2 className="w-4 h-4" /> },
    { id: 'message', label: 'Tin nhắn (SMS/Zalo)', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'screenshot_qr', label: 'Ảnh màn hình / OCR', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'threat', label: 'Đe dọa / Đòi nợ', icon: <Flame className="w-4 h-4 text-red-600 shrink-0" />, badge: 'AI ĐẶC BIỆT' },
    { id: 'call', label: 'Cuộc gọi nghi vấn', icon: <PhoneCall className="w-4 h-4" /> },
    { id: 'account', label: 'Tài khoản nhận tiền', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'recovery', label: 'Tôi đã lỡ làm theo', icon: <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />, badge: 'KHẨN CẤP' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30 backdrop-blur-md bg-white/95">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3.5 pb-2">
        {/* Top Navbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-red-600 via-red-500 to-amber-500 text-white w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black shadow-md shadow-red-500/20 shrink-0">
              !
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold leading-none text-slate-900 tracking-tight">
                  Khoan Đã!
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200/80 rounded-md uppercase tracking-wider">
                  AI Scam Pre-check
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Trợ lý phân tích tín hiệu lừa đảo đa tầng cho người dùng Việt Nam
              </p>
            </div>
          </div>

          {/* Right Section: Registry Badge & Modal Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Nguồn dữ liệu
              </span>
              <div className="flex gap-1.5 mt-0.5">
                <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded border border-slate-200 font-semibold italic">
                  SBV Registry ({registryStats?.officialBankEntities || 49} Ngân hàng)
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded border border-emerald-200 font-semibold italic">
                  Safe Browsing API
                </span>
              </div>
            </div>

            <button
              onClick={onOpenRegistryModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Cơ sở dữ liệu đối soát</span>
              <Info className="w-3 h-3 opacity-70" />
            </button>
          </div>
        </div>

        {/* Warning Alert Banner */}
        <div className="mt-2.5 px-3.5 py-2 bg-amber-50/90 border border-amber-200/90 rounded-lg text-amber-950 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong className="font-extrabold text-amber-900">Khoan thao tác!</strong> Kiểm tra trước khi bấm link, cài app, nhập OTP, quét QR hoặc chuyển tiền cọc.
            </span>
          </div>
        </div>

        {/* Consumer Modes Tabs */}
        <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {modes.map(mode => {
            const isActive = currentMode === mode.id;
            const isEmergency = mode.id === 'recovery';
            return (
              <button
                key={mode.id}
                onClick={() => onSelectMode(mode.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? isEmergency
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-slate-900 text-white shadow-xs'
                    : isEmergency
                    ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {mode.icon}
                <span>{mode.label}</span>
                {mode.badge && (
                  <span className={`px-1.5 py-0.2 font-black text-[9px] rounded uppercase ${
                    isActive ? 'bg-white text-red-700' : 'bg-red-600 text-white'
                  }`}>
                    {mode.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

