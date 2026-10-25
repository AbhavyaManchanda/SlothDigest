import React from 'react';
import { 
  Compass, 
  Rss, 
  ShieldAlert, 
  Sliders, 
  RefreshCw, 
  Sparkles, 
  Cpu, 
  ExternalLink 
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  ollamaConnected, 
  activeModel, 
  isSyncing, 
  onSyncAll, 
  isCurating, 
  onCurateNow 
}) {
  const tabs = [
    { id: 'digest', label: "Today's Digest", icon: Compass },
    { id: 'sources', label: 'Intake Sources', icon: Rss },
    { id: 'rejections', label: 'Filter Logs', icon: ShieldAlert },
    { id: 'settings', label: 'Settings & Prompts', icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-sloth-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
              {/* Custom Sloth / Shield SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 tracking-tight text-base">SlothDigest</span>
                <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                  v1.0 Local
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Zero-Effort Local RSS & Newsletter Curator</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-sloth-900/60 p-1 rounded-lg border border-white/5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-sloth-800 text-emerald-300 shadow-sm border border-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-sloth-800/40'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* System Status & Primary Actions */}
          <div className="flex items-center gap-2.5">
            {/* Ollama status badge */}
            <div 
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                ollamaConnected
                  ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/20 text-amber-300'
              }`}
              title={ollamaConnected ? `Ollama local model active: ${activeModel}` : "Ollama not responding, using heuristic fallback"}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${ollamaConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <Cpu className="w-3 h-3 opacity-70" />
              <span className="truncate max-w-[110px]">{ollamaConnected ? activeModel : 'Local Heuristic'}</span>
            </div>

            {/* Sync Feeds Button */}
            <button
              onClick={onSyncAll}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sloth-900 hover:bg-sloth-800 text-slate-300 border border-white/10 transition-colors disabled:opacity-50"
              title="Fetch new posts from all active RSS feeds and email folders"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Feeds'}</span>
            </button>

            {/* Curate Digest Now Button */}
            <button
              onClick={onCurateNow}
              disabled={isCurating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all duration-150 active:scale-95 disabled:opacity-60 font-semibold shadow-sm shadow-emerald-500/20"
              title="Filter incoming raw articles through local AI to generate today's digest"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isCurating ? 'animate-spin' : ''}`} />
              <span>{isCurating ? 'Filtering...' : 'Curate Digest'}</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center justify-between border-t border-white/5 py-2 overflow-x-auto gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-sloth-800 text-emerald-300 border border-emerald-500/20'
                    : 'text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
