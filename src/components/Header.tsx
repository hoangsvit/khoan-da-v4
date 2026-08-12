import React from 'react';
import { RegistryStats } from '../types';
import { AlertTriangle, Database, FlaskConical, Info, RotateCcw, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  isRecovery: boolean;
  registryStats?: RegistryStats;
  onOpenRegistryModal: () => void;
  onOpenTestScenarios: () => void;
  onOpenRecovery: () => void;
  onBackToCheck: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRecovery,
  registryStats,
  onOpenRegistryModal,
  onOpenTestScenarios,
  onOpenRecovery,
  onBackToCheck
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={onBackToCheck}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-label="Về trang kiểm tra"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">
                Khoan Đã!
              </h1>
              <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 sm:inline-flex">
                AI Scam Pre-check
              </span>
            </div>
            <p className="hidden text-xs font-medium text-slate-500 sm:block">
              Kiểm tra trước khi bạn bấm link, nhập thông tin hoặc chuyển tiền.
            </p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenTestScenarios}
            className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:flex"
            title="Mở kịch bản thử nghiệm"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Kịch bản thử nghiệm
          </button>

          <button
            type="button"
            onClick={onOpenRegistryModal}
            className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 lg:flex"
            title={`${registryStats?.registryEntries || 0} dữ liệu đối soát`}
          >
            <Database className="h-3.5 w-3.5" />
            Nguồn đối soát
            <Info className="h-3 w-3 text-slate-400" />
          </button>

          {isRecovery ? (
            <button
              type="button"
              onClick={onBackToCheck}
              className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Quay lại kiểm tra
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenRecovery}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tôi đã lỡ làm theo</span>
              <span className="sm:hidden">Khẩn cấp</span>
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2 sm:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <button
            type="button"
            onClick={onOpenTestScenarios}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Kịch bản thử nghiệm
          </button>
          <button
            type="button"
            onClick={onOpenRegistryModal}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"
          >
            <Database className="h-3.5 w-3.5" />
            Nguồn đối soát
          </button>
        </div>
      </div>
    </header>
  );
};
