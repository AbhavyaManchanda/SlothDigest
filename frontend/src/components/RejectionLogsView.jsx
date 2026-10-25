import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Trash2, 
  Search, 
  Filter, 
  TrendingDown, 
  Percent, 
  CheckCircle2, 
  HelpCircle,
  ExternalLink 
} from 'lucide-react';

export default function RejectionLogsView({ logs, stats, onClearLogs, isClearing }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.title.toLowerCase().includes(search.toLowerCase()) ||
      log.reason.toLowerCase().includes(search.toLowerCase()) ||
      (log.source_name && log.source_name.toLowerCase().includes(search.toLowerCase()));

    if (selectedCategory === 'All') return matchesSearch;
    return matchesSearch && log.reason.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <span>The Sloth Filter Rejection Log</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete transparency into what your local AI filtered out and why.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              disabled={isClearing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sloth-900 hover:bg-sloth-800 text-slate-400 hover:text-rose-400 border border-white/5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isClearing ? 'Clearing...' : 'Clear Audit Log'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-white/10 bg-sloth-900/60 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Noise Reduction Ratio</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">
              {stats?.noise_reduction_percentage || 85}%
            </h3>
            <p className="text-[11px] text-emerald-400 mt-0.5">High signal filtering efficiency</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-sloth-900/60 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Marketing Fluff Filtered</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">
              {stats?.rejected_count || logs.length}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Discarded from daily digest</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/10 bg-sloth-900/60 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Items Evaluated</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">
              {stats?.total_evaluated || (logs.length + 5)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Scanned across all feeds</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800 text-slate-300 border border-white/5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-sloth-900/40">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search filtered articles or reasons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-sloth-950 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['All', 'Marketing', 'Density', 'Promo'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-slate-200 border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table / List */}
      {filteredLogs.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-white/5 bg-sloth-900/30">
          <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No rejection logs match your filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl border border-white/10 bg-sloth-900/60 hover:bg-sloth-900/90 transition-all duration-150 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-sloth-800 text-slate-400 border border-white/5">
                    {log.source_name || 'Source'}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-500/20">
                    Dropped: {log.reason}
                  </span>
                </div>

                <span className="text-xs font-mono text-slate-400">
                  Signal Score: <span className="text-rose-400 font-bold">{log.score.toFixed(1)}/10</span>
                </span>
              </div>

              <h4 className="text-sm font-semibold text-slate-200">
                {log.title}
              </h4>

              {log.summary && (
                <p className="text-xs text-slate-400 bg-sloth-950/60 p-2.5 rounded-lg border border-white/5">
                  <span className="text-slate-300 font-medium">Filter Audit Analysis: </span>
                  {log.summary}
                </p>
              )}

              {log.url && (
                <div className="flex justify-end pt-1">
                  <a
                    href={log.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <span>View original</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
