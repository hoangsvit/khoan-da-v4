import React, { useState, useEffect } from 'react';
import { ConsumerMode, RiskAnalysisResult, RegistryStats } from './types';
import { Header } from './components/Header';
import { AnalysisForm } from './components/AnalysisForm';
import { RiskResultDisplay } from './components/RiskResultDisplay';
import { RecoveryModule } from './components/RecoveryModule';
import { DemoPresetButtons } from './components/DemoPresetButtons';
import { RegistryInfoModal } from './components/RegistryInfoModal';
import { ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [currentMode, setCurrentMode] = useState<ConsumerMode>('link');
  const [analysisResult, setAnalysisResult] = useState<RiskAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [registryStats, setRegistryStats] = useState<RegistryStats | undefined>(undefined);
  const [isRegistryModalOpen, setIsRegistryModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch health stats from backend
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
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
      .catch(err => console.warn('Could not fetch health endpoint:', err));
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
          mode: currentMode
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Có lỗi xảy ra trong quá trình kết nối.');
      }

      const resultData: RiskAnalysisResult = await response.json();
      setAnalysisResult(resultData);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setErrorMsg(err.message || 'Không thể thực hiện phân tích lúc này. Vui lòng kiểm tra lại đường truyền.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (mode: ConsumerMode, text: string) => {
    setCurrentMode(mode);
    setAnalysisResult(null);
    setErrorMsg(null);
    handleAnalyze(text);
  };

  const handleClear = () => {
    setAnalysisResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-red-600 selection:text-white flex flex-col antialiased">
      {/* Header */}
      <Header
        currentMode={currentMode}
        onSelectMode={(mode) => {
          setCurrentMode(mode);
          setAnalysisResult(null);
          setErrorMsg(null);
        }}
        registryStats={registryStats}
        onOpenRegistryModal={() => setIsRegistryModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Demo Preset Scenarios Bar */}
        <DemoPresetButtons onSelectPreset={handleSelectPreset} />

        {/* Dynamic Mode Render */}
        {currentMode === 'recovery' ? (
          <RecoveryModule />
        ) : (
          <div className="space-y-6">
            <AnalysisForm
              currentMode={currentMode}
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              onClear={handleClear}
            />

            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs sm:text-sm flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            {analysisResult && (
              <RiskResultDisplay result={analysisResult} />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 text-slate-500 py-6 text-xs text-center shadow-xs mt-8">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-bold text-slate-800">
            Khoan Đã! — Trợ lý AI Kiểm Tra Dấu Hiệu Lừa Đảo Cho Người Dùng Việt Nam
          </p>
          <p className="text-[11px] text-slate-500">
            Kết hợp Gemini Multimodal Structured Output, Rule Engine Đối soát Ngân hàng SBV & Google Safe Browsing API.
          </p>
          <p className="text-[10px] text-slate-400 italic">
            Lưu ý: Công cụ hỗ trợ trích xuất tín hiệu nguy cơ để bạn chủ động phòng tránh. Không cố đưa ra kết luận an toàn tuyệt đối.
          </p>
        </div>
      </footer>

      {/* Registry Transparency Modal */}
      <RegistryInfoModal
        isOpen={isRegistryModalOpen}
        onClose={() => setIsRegistryModalOpen(false)}
        stats={registryStats}
      />
    </div>
  );
}
