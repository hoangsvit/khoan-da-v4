import React, { useState } from 'react';
import { ConsumerMode } from '../types';
import { SAMPLE_PROMPTS, getRandomSamplePrompt, SamplePrompt } from '../data/samplePrompts';
import { Sparkles, Dices, AlertOctagon, Smartphone, PhoneCall, CheckCircle, ShieldAlert, CreditCard, Flame } from 'lucide-react';
import { motion } from 'motion/react';

interface DemoPresetButtonsProps {
  onSelectPreset: (mode: ConsumerMode, text: string) => void;
}

export const DemoPresetButtons: React.FC<DemoPresetButtonsProps> = ({ onSelectPreset }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');

  const categories = ['Tất cả', 'Đe dọa đòi nợ', 'SMS Giả mạo', 'Cuộc gọi đe dọa', 'Link Độc hại', 'An toàn chính thức', 'Việc làm online'];

  const filteredPrompts = selectedCategory === 'Tất cả'
    ? SAMPLE_PROMPTS.slice(0, 8)
    : SAMPLE_PROMPTS.filter(p => p.category === selectedCategory);

  const handleRandomPick = () => {
    const random = getRandomSamplePrompt();
    onSelectPreset(random.mode, random.text);
  };

  const getRiskBadge = (risk: SamplePrompt['riskExpectation']) => {
    switch (risk) {
      case 'STOP':
        return <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">STOP</span>;
      case 'CAUTION':
        return <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">CAUTION</span>;
      case 'VERIFY':
        return <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">VERIFY</span>;
      case 'NO_CLEAR_RISK':
        return <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">SAFE</span>;
    }
  };

  const getIcon = (mode: ConsumerMode) => {
    switch (mode) {
      case 'link': return <Smartphone className="w-3.5 h-3.5 text-amber-600" />;
      case 'call': return <PhoneCall className="w-3.5 h-3.5 text-red-600" />;
      case 'threat': return <Flame className="w-3.5 h-3.5 text-red-600" />;
      case 'account': return <CreditCard className="w-3.5 h-3.5 text-blue-600" />;
      case 'recovery': return <ShieldAlert className="w-3.5 h-3.5 text-red-600" />;
      default: return <AlertOctagon className="w-3.5 h-3.5 text-slate-700" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-slate-800 space-y-3.5 shadow-2xs">
      {/* Header with Random Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          Kịch bản mẫu Demo thử nghiệm nhanh
        </h3>

        <button
          type="button"
          onClick={handleRandomPick}
          className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <Dices className="w-4 h-4 text-amber-400" />
          <span>🎲 Thử kịch bản ngẫu nhiên</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {filteredPrompts.map(prompt => (
          <button
            key={prompt.id}
            type="button"
            onClick={() => onSelectPreset(prompt.mode, prompt.text)}
            className="flex flex-col justify-between p-3.5 bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/80 hover:border-slate-300 rounded-xl text-left transition-all group shadow-2xs hover:shadow-xs space-y-2 cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 truncate">
                <div className="p-1 bg-white border border-slate-200 rounded-lg shrink-0 group-hover:scale-110 transition-transform">
                  {getIcon(prompt.mode)}
                </div>
                <span className="truncate">{prompt.label}</span>
              </div>
              {getRiskBadge(prompt.riskExpectation)}
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
              {prompt.text}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};


