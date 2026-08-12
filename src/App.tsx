import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { AnalysisForm } from './components/AnalysisForm';
import { DemoPresetButtons } from './components/DemoPresetButtons';
import { Header } from './components/Header';
import { RecoveryModule } from './components/RecoveryModule';
import { RegistryInfoModal } from './components/RegistryInfoModal';
import { RiskResultDisplay } from './components/RiskResultDisplay';
import { ConsumerMode, RegistryStats, RiskAnalysisResult } from './types';

export default function App() {
  const [view, setView] = useState<'check' | 'recovery'>('check');
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [registryStats, setRegistryStats] = useState<RegistryStats | undefined>(undefined);
  const [isRegistryModalOpen, setIsRegistryModalOpen] = useState(false);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(response => response.json())
      .then(data => {
        if (data.status === 'ok') {
          setRegistryStats({
            officialDomainEntities: data.officialDomainEntities,
            officialBankEntities: data.officialBankEntities,
            licensedForeignBranches: data.licensedForeignBranches,
            licensedForeignBranchesAsOf: data.licensedForeignBranchesAsOf,
            registryEntries: data.registryEntries
          });
        }
      })
      .catch(() => {
        // Health metadata is optional for the consumer UI.
      });
  }, []);

  const handleAnalyze = async (text: string, imageBase64?: string, mimeType?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          imageBase64,
          mimeType,
          // The public experience is intentionally automatic. The user no
          // longer needs to classify the situation before Gemini sees it.
          mode: 'auto'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Không thể hoàn tất kiểm tra lúc này.');
      }

      const resultData: RiskAnalysisResult = await response.json();
      setAnalysisResult(resultData);
    } catch (error: any) {
      setErrorMsg(error?.message || 'Không thể thực hiện phân tích lúc này. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (_mode: ConsumerMode, text: string) => {
    setIsTestPanelOpen(false);
    setView('check');
    setErrorMsg(null);
    setAnalysisResult(null);
    void handleAnalyze(text);
  };

  const handleBackToCheck = () => {
    setView('check');
    setErrorMsg(null);
  };

  const handleOpenRecovery = () => {
    setView('recovery');
    setAnalysisResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 antialiased selection:bg-emerald-600 selection:text-white">
      <Header
        isRecovery={view === 'recovery'}
        registryStats={registryStats}
        onOpenRegistryModal={() => setIsRegistryModalOpen(true)}
        onOpenTestScenarios={() => setIsTestPanelOpen(true)}
        onOpenRecovery={handleOpenRecovery}
        onBackToCheck={handleBackToCheck}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-7 sm:px-6 sm:py-10">
        {view === 'recovery' ? (
          <RecoveryModule />
        ) : (
          <div className="space-y-6">
            <section className="mx-auto max-w-3xl text-center">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Gemini tự nhận diện loại tình huống
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Dừng một nhịp trước khi làm theo.
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                Không cần chọn đây là link, tin nhắn hay cuộc gọi. Chỉ cần gửi nội dung bạn nhận được; hệ thống sẽ đọc ngữ cảnh trước rồi mới đối chiếu các dấu hiệu kỹ thuật.
              </p>
            </section>

            <AnalysisForm
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              onClear={() => {
                setAnalysisResult(null);
                setErrorMsg(null);
              }}
            />

            {errorMsg && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="font-bold">Chưa thể hoàn tất kiểm tra</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-red-800">{errorMsg}</p>
                </div>
              </div>
            )}

            {analysisResult && <RiskResultDisplay result={analysisResult} />}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center">
        <div className="mx-auto max-w-4xl px-4">
          <p className="text-xs font-semibold text-slate-700">
            Khoan Đã! — Kiểm tra trước khi bạn hành động.
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Kết quả giúp nhận diện dấu hiệu cần chú ý và không phải là bảo đảm tuyệt đối về mức độ an toàn.
          </p>
        </div>
      </footer>

      {isTestPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-t-3xl bg-slate-50 shadow-2xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-md sm:px-6">
              <div>
                <h3 className="text-sm font-extrabold text-slate-950">Kịch bản thử nghiệm</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Chỉ dùng khi bạn muốn kiểm tra prompt và hành vi của Gemini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTestPanelOpen(false)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Đóng kịch bản thử nghiệm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <DemoPresetButtons onSelectPreset={handleSelectPreset} />
            </div>
          </div>
        </div>
      )}

      <RegistryInfoModal
        isOpen={isRegistryModalOpen}
        onClose={() => setIsRegistryModalOpen(false)}
        stats={registryStats}
      />
    </div>
  );
}
