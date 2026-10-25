import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-sky-400 shrink-0" />
  };

  const borders = {
    success: 'border-emerald-500/20 bg-emerald-950/40 text-emerald-200',
    error: 'border-rose-500/20 bg-rose-950/40 text-rose-200',
    info: 'border-sky-500/20 bg-sky-950/40 text-sky-200'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 max-w-md ${borders[toast.type] || borders.info}">
      {icons[toast.type] || icons.info}
      <span className="text-sm font-medium">{toast.message}</span>
      <button 
        onClick={onClose}
        className="ml-auto text-slate-400 hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
