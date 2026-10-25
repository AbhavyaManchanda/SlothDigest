import React, { useState } from 'react';
import { 
  Rss, 
  Mail, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FolderCheck, 
  FolderPlus,
  ExternalLink 
} from 'lucide-react';

export default function SourcesView({ 
  sources, 
  onAddSource, 
  onDeleteSource, 
  onToggleActive, 
  onSyncSource, 
  isSyncingSource, 
  onSyncAll, 
  isSyncingAll 
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('rss');
  const [urlOrPath, setUrlOrPath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !urlOrPath) return;

    setIsSubmitting(true);
    try {
      await onAddSource({ name, type, url_or_path: urlOrPath });
      setName('');
      setUrlOrPath('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return 'Never';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSecs = Math.floor((now - date) / 1000);
      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return `${Math.floor(diffSecs / 86400)}d ago`;
    } catch (e) {
      return 'Recently';
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      {/* Header & Intake Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Rss className="w-6 h-6 text-emerald-400" />
            <span>Unified Intake Dashboard</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your RSS/Atom feeds and local email newsletter sync directories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Feed or Folder</span>
          </button>
        </div>
      </div>

      {/* Add Source Drawer / Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-xl border border-white/10 bg-sloth-900/90 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">Add Intake Source</h3>
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)} 
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Source Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Simon Willison's Weblog"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-sloth-950 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Source Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-sloth-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="rss">RSS / Atom Web Feed</option>
                <option value="newsletter_email">Local Newsletter Folder (.eml)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {type === 'rss' ? 'Feed URL' : 'Local Directory Path'}
              </label>
              <input
                type="text"
                required
                placeholder={type === 'rss' ? 'https://example.com/feed.xml' : './newsletters'}
                value={urlOrPath}
                onChange={(e) => setUrlOrPath(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-sloth-950 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Validating & Adding...' : 'Add Source'}
            </button>
          </div>
        </form>
      )}

      {/* Sources List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>{sources.length} Configured Sources</span>
          <span>Live Local Status</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {sources.map((source) => {
            const isSyncing = isSyncingSource === source.id;
            return (
              <div
                key={source.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/10 bg-sloth-900/60 hover:border-white/20 transition-all duration-200 gap-4"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-sloth-800 text-slate-300 border border-white/5 shrink-0 mt-0.5 sm:mt-0">
                    {source.type === 'newsletter_email' ? (
                      <Mail className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Rss className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-100">{source.name}</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sloth-800 text-slate-400 border border-white/5 uppercase">
                        {source.type === 'newsletter_email' ? 'Local Email' : 'RSS'}
                      </span>
                      {!source.is_active && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-500/20">
                          Paused
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-sm sm:max-w-md">
                      {source.url_or_path}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="font-mono text-slate-300">
                      {source.article_count || 0} ingested
                    </span>

                    <span className="text-slate-600">•</span>

                    <span className="flex items-center gap-1 font-mono" title={`Last fetched: ${source.last_fetched_at || 'Never'}`}>
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{formatRelativeTime(source.last_fetched_at)}</span>
                    </span>

                    {/* Status Pill */}
                    {source.fetch_status === 'syncing' || isSyncing ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Syncing</span>
                      </span>
                    ) : source.fetch_status === 'error' ? (
                      <span className="flex items-center gap-1 text-[11px] text-rose-400" title={source.error_message || 'Fetch failed'}>
                        <AlertCircle className="w-3 h-3" />
                        <span>Error</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle className="w-3 h-3" />
                        <span>Ready</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSyncSource(source.id)}
                      disabled={isSyncing}
                      className="p-1.5 rounded-md hover:bg-sloth-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Sync this source now"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                    </button>

                    <button
                      onClick={() => onToggleActive(source.id, !source.is_active)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        source.is_active 
                          ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-950/30' 
                          : 'text-emerald-400 hover:bg-emerald-950/30'
                      }`}
                    >
                      {source.is_active ? 'Pause' : 'Resume'}
                    </button>

                    <button
                      onClick={() => onDeleteSource(source.id)}
                      className="p-1.5 rounded-md hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete source"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Local Newsletter Intake Guide */}
      <div className="p-5 rounded-xl border border-white/10 bg-sloth-900/40 space-y-3">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-200">
          <FolderCheck className="w-4 h-4 text-emerald-400" />
          <span>Local-First Newsletter Ingestion</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          SlothDigest respects your privacy with 100% local newsletter ingestion. You can forward or drop any raw newsletter <code className="text-emerald-400 font-mono">.eml</code> files into your local <code className="text-emerald-400 font-mono">./newsletters</code> directory. The engine strips tracking pixels, unsubscribe footers, and marketing boilerplate before passing the core text to your local Ollama instance.
        </p>
      </div>
    </div>
  );
}
