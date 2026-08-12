import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Phone, Smartphone, Lock, RefreshCw, Radio, CheckSquare, Square, Shield, ExternalLink } from 'lucide-react';

interface RecoveryStep {
  title: string;
  description: string;
  urgency: 'critical' | 'high' | 'medium';
  actionButtonText?: string;
  contactNumber?: string;
}

export const RecoveryModule: React.FC = () => {
  const [selectedActions, setSelectedActions] = useState<{ [key: string]: boolean }>({
    clickedLink: false,
    enteredOtp: false,
    installedApk: false,
    sharedScreen: false,
    scannedQr: false,
    transferredMoney: false
  });

  const toggleAction = (key: string) => {
    setSelectedActions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getEmergencySteps = (): RecoveryStep[] => {
    const steps: RecoveryStep[] = [];

    // Flight mode / Isolation rule
    if (selectedActions.installedApk || selectedActions.sharedScreen) {
      steps.push({
        title: '1. BẬT CHẾ ĐỘ MÁY BAY NGAY LẬP TỨC (NGẮT INTERNET)',
        description: 'Nếu bạn đã lỡ cài file APK hoặc bật AnyDesk/TeamViewer, đối tượng có thể đang điều khiển máy từ xa. Bật Chế độ máy bay (Flight Mode) và tắt Wi-Fi, 4G/5G ngay lập tức để cắt đứt lệnh điều khiển!',
        urgency: 'critical'
      });
    }

    // Lock Bank accounts / Passwords
    if (selectedActions.enteredOtp || selectedActions.transferredMoney || selectedActions.installedApk) {
      steps.push({
        title: '2. KHÓA TÀI KHOẢN NGÂN HÀNG & BÁO TỔNG ĐÀI KHẨN CẤP',
        description: 'Gọi ngay tới tổng đài hỗ trợ khẩn cấp của ngân hàng để yêu cầu KÍCH HOẠT TÍNH NĂNG KHÓA THẺ & TÀI KHOẢN TỰ ĐỘNG. Hoặc sử dụng tính năng "Khóa thẻ khẩn cấp" trên ứng dụng Mobile Banking nếu còn truy cập được.',
        urgency: 'critical'
      });
    }

    // Reset passwords from CLEAN device
    if (selectedActions.enteredOtp) {
      steps.push({
        title: '3. ĐỔI MẬT KHẨU TÀI KHOẢN TỪ MỘT THIẾT BỊ AN TOÀN KHÁC',
        description: 'Sử dụng một chiếc điện thoại hoặc máy tính an toàn khác (không bị nhiễm mã độc) để đổi mật khẩu Ngân hàng, Email, Zalo, VNeID và đăng xuất tất cả các thiết bị cũ.',
        urgency: 'high'
      });
    }

    // Uninstall APK / Reset Phone
    if (selectedActions.installedApk) {
      steps.push({
        title: '4. KHÔI PHỤC CÀI ĐẶT GỐC ĐIỆN THOẠI (FACTORY RESET)',
        description: 'Ứng dụng APK độc hại có thể đã cắm mã độc sâu vào hệ điều hành Android. Hãy sao lưu ảnh/dữ liệu cá nhân sang thiết bị khác và tiến hành Khôi phục cài đặt gốc (Factory Reset) để sạch triệt để.',
        urgency: 'high'
      });
    }

    // Lock SIM / Call Telecom
    if (selectedActions.enteredOtp || selectedActions.installedApk) {
      steps.push({
        title: '5. TẠM KHÓA SIM ĐIỆN THOẠI (NẾU BỊ CẮT SÓNG HOẶC MẤT SIM)',
        description: 'Liên hệ nhà mạng (Viettel 18008098, Vinaphone 18001091, Mobifone 18001090) để tạm khóa SIM phòng trường hợp bị chiếm quyền SIM (SIM Swap attack) nhận OTP.',
        urgency: 'medium'
      });
    }

    // Report to Police / Authorities
    if (selectedActions.transferredMoney || selectedActions.enteredOtp || selectedActions.installedApk) {
      steps.push({
        title: '6. TRÌNH BÁO CƠ QUAN CÔNG AN & CỤC AN TOÀN THÔNG TIN',
        description: 'Thu thập tất cả bằng chứng (ảnh chụp tin nhắn, số tài khoản nhận tiền, nhật ký cuộc gọi) và đến Cơ quan Công an phường/xã gần nhất hoặc gửi phản ánh tới Cục An toàn thông tin (Bộ Thông tin & Truyền thông).',
        urgency: 'high'
      });
    }

    // Fallback default step
    if (steps.length === 0) {
      steps.push({
        title: 'HƯỚNG DẪN XỬ LÝ AN TOÀN CHUNG',
        description: 'Tích chọn các ô hành động bạn đã lỡ thực hiện ở trên để hệ thống tạo danh sách các bước ứng phó khẩn cấp phù hợp nhất!',
        urgency: 'medium'
      });
    }

    return steps;
  };

  const steps = getEmergencySteps();

  const bankHotlines = [
    { name: 'Vietcombank', phone: '1900545413' },
    { name: 'Techcombank', phone: '1800588822' },
    { name: 'MBBank', phone: '1900545426' },
    { name: 'BIDV', phone: '19009247' },
    { name: 'Agribank', phone: '1900558818' },
    { name: 'VietinBank', phone: '1900558868' },
    { name: 'VPBank', phone: '1900545415' },
    { name: 'TPBank', phone: '1900585885' },
    { name: 'ACB', phone: '1900545486' },
    { name: 'Sacombank', phone: '1900545438' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 text-slate-800 space-y-6 shadow-sm">
      {/* Header Banner */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 shrink-0">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-black text-amber-900 uppercase tracking-tight">
            QUY TRÌNH XỬ LÝ KHẨN CẤP: "TÔI ĐÃ LỠ LÀM THEO"
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Chạy 100% cục bộ trên thiết bị của bạn. Không gửi bất kỳ thông tin cá nhân nhạy cảm nào ra ngoài.
          </p>
        </div>
      </div>

      {/* Checkboxes for user actions */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
          Chọn các hành động bạn đã thực hiện theo yêu cầu đối phương:
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[
            { id: 'clickedLink', label: '🔗 Tôi đã bấm vào đường dẫn (URL) lạ' },
            { id: 'enteredOtp', label: '🔑 Tôi đã nhập Mật khẩu / mã OTP' },
            { id: 'installedApk', label: '📲 Tôi đã tải & cài đặt file APK / App lạ' },
            { id: 'sharedScreen', label: '🖥️ Tôi đã bật AnyDesk / Bật Trợ năng / Chia sẻ màn hình' },
            { id: 'scannedQr', label: '📷 Tôi đã quét mã QR nghi ngờ' },
            { id: 'transferredMoney', label: '💸 Tôi đã chuyển tiền vào số tài khoản được chỉ định' },
          ].map(item => {
            const isChecked = selectedActions[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleAction(item.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border text-xs font-semibold text-left transition-all ${
                  isChecked
                    ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {isChecked ? (
                  <CheckSquare className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generated Action Checklist */}
      <div className="space-y-4 pt-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          Danh sách các bước ứng phó tức thì dành cho bạn:
        </h3>

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border space-y-1.5 ${
                step.urgency === 'critical'
                  ? 'bg-red-50 border-red-200 text-red-950'
                  : step.urgency === 'high'
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <h4 className="font-bold text-sm tracking-tight flex items-center justify-between">
                <span>{step.title}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  step.urgency === 'critical'
                    ? 'bg-red-600 text-white'
                    : step.urgency === 'high'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-blue-600 text-white'
                }`}>
                  {step.urgency === 'critical' ? 'LÀM NGAY' : step.urgency === 'high' ? 'ƯU TIÊN HÀNG ĐẦU' : 'CẦN THIẾT'}
                </span>
              </h4>
              <p className="text-xs leading-relaxed opacity-90">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Bank Hotlines Quick Access */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Phone className="w-4 h-4 text-emerald-600" />
          Hotline Tổng đài Báo khóa khẩn cấp của các Ngân hàng lớn:
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {bankHotlines.map((bank, i) => (
            <a
              key={i}
              href={`tel:${bank.phone}`}
              className="p-2.5 bg-white hover:bg-slate-100/80 border border-slate-200 rounded-lg text-center transition-colors group shadow-xs"
            >
              <div className="text-[11px] text-slate-500 font-semibold truncate">{bank.name}</div>
              <div className="text-xs font-bold text-emerald-700 font-mono mt-0.5 group-hover:underline">
                {bank.phone}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
