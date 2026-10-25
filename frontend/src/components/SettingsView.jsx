import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Cpu, 
  Sparkles, 
  Clock, 
  Volume2, 
  Save, 
  RefreshCw, 
  Check, 
  AlertCircle 
} from 'lucide-react';

export default function SettingsView({ 
  settings, 
  models, 
  ollamaConnected, 
  onSaveSettings, 
  onRefreshModels, 
  isRefreshingModels 
}) {
  const [formData, setFormData] = useState({
    ollama_model: settings?.ollama_model || 'llama3.1:latest',
    filter_prompt: settings?.filter_prompt || '',
    max_takeaways: settings?.max_takeaways || '5',
    strictness_level: settings?.strictness_level || 'high',
    schedule_time: settings?.schedule_time || '07:00',
    auto_sync_interval: settings?.auto_sync_interval || '60',
    tts_voice: settings?.tts_voice || 'en-US-ChristopherNeural',
    tts_speed: settings?.tts_speed || '+0%',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        ...settings
      }));
    }
  }, [settings]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const promptPresets = [
    {
      name: "Strict Engineering & Systems (Default)",
      prompt: "Drop marketing fluff, self-promotional press releases, listicles, and SEO clickbait. Prioritize engineering breakthroughs, open source systems, architectural postmortems, deep technical insights, and key developer tooling updates."
    },
    {
      name: "AI & Open Weights Focus",
      prompt: "Ruthlessly filter out generic AI hype, wrapper demos, and sales copy. Keep only open-weight model architectures, quantization breakthroughs, local inference optimizations, and novel LLM evaluation benchmarks."
    },
    {
      name: "Security & Infrastructure",
      prompt: "Drop non-technical announcements and vendor sales pitches. Retain zero-day vulnerability disclosures, novel exploitation mechanics, CVE root-cause analyses, kernel hardening, and cloud incident postmortems."
    },
    {
      name: "Minimalist Dev Tools Only",
      prompt: "Ignore all opinions, startup fundraising rounds, and corporate rebrands. Prioritize new command-line tools, language compiler releases, developer environment productivity enhancements, and high-performance libraries."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-emerald-400" />
            <span>Settings & Filter Studio</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure your local Ollama AI models, fine-tune the Sloth Filter criteria, and schedule briefing generation.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-sm disabled:opacity-50"
        >
          {savedSuccess ? <Check className="w-4 h-4 text-slate-950" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Saving...' : savedSuccess ? 'Preferences Saved!' : 'Save Settings'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Ollama Model Engine */}
        <div className="p-5 rounded-xl border border-white/10 bg-sloth-900/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Local Ollama Model Engine</span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                ollamaConnected 
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/20' 
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/20'
              }`}>
                {ollamaConnected ? 'Ollama Online (:11434)' : 'Ollama Offline / Heuristic Fallback'}
              </span>

              <button
                type="button"
                onClick={onRefreshModels}
                disabled={isRefreshingModels}
                className="p-1 rounded hover:bg-sloth-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Refresh detected models"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingModels ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Select Active Model
              </label>
              <select
                value={formData.ollama_model}
                onChange={(e) => handleChange('ollama_model', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-sloth-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {models && models.length > 0 ? (
                  models.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} {m.size ? `(${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB)` : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="llama3.1:latest">llama3.1:latest</option>
                    <option value="llama3.2:1b">llama3.2:1b</option>
                    <option value="qwen2.5:3b">qwen2.5:3b</option>
                    <option value="mistral:latest">mistral:latest</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Filter Strictness Level
              </label>
              <select
                value={formData.strictness_level}
                onChange={(e) => handleChange('strictness_level', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-sloth-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="moderate">Moderate (Keep good reads & essays)</option>
                <option value="high">High (Strict engineering breakthroughs only)</option>
                <option value="ruthless">Ruthless (Discard anything with a promotional tone)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Custom Filter Prompt Studio */}
        <div className="p-5 rounded-xl border border-white/10 bg-sloth-900/60 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>The Sloth Filter Prompt Studio</span>
          </div>
          <p className="text-xs text-slate-400">
            Customize the exact natural language criteria passed to the local Ollama instance during ingestion.
          </p>

          <textarea
            rows={4}
            value={formData.filter_prompt}
            onChange={(e) => handleChange('filter_prompt', e.target.value)}
            className="w-full p-3 rounded-lg bg-sloth-950 border border-white/10 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
            placeholder="Specify what to drop and what to keep..."
          />

          {/* Prompt Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">
              Quick Presets:
            </label>
            <div className="flex flex-wrap gap-2">
              {promptPresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleChange('filter_prompt', preset.prompt)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-sloth-800 hover:bg-sloth-700 text-slate-300 border border-white/5 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Daily Schedule & Audio Briefing */}
        <div className="p-5 rounded-xl border border-white/10 bg-sloth-900/60 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Daily Briefing Schedule & Audio Voice</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Morning Briefing Time
              </label>
              <input
                type="time"
                value={formData.schedule_time}
                onChange={(e) => handleChange('schedule_time', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-sloth-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Max Daily Takeaways
              </label>
              <select
                value={formData.max_takeaways}
                onChange={(e) => handleChange('max_takeaways', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-sloth-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="3">Top 3 (Ultra-distilled)</option>
                <option value="5">Top 5 (Standard balanced)</option>
                <option value="7">Top 7 (Extended)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Audio Briefing Voice (TTS)
              </label>
              <select
                value={formData.tts_voice}
                onChange={(e) => handleChange('tts_voice', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-sloth-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="en-US-ChristopherNeural">Christopher (Natural Editorial Male)</option>
                <option value="en-US-AriaNeural">Aria (Clear Editorial Female)</option>
                <option value="en-US-GuyNeural">Guy (Calm News Anchor)</option>
                <option value="en-GB-RyanNeural">Ryan (British Tech Reviewer)</option>
              </select>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
