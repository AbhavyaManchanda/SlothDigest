import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DigestView from './components/DigestView';
import SourcesView from './components/SourcesView';
import RejectionLogsView from './components/RejectionLogsView';
import SettingsView from './components/SettingsView';
import Toast from './components/Toast';
import { api } from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('digest');
  const [digest, setDigest] = useState(null);
  const [sources, setSources] = useState([]);
  const [rejectionLogs, setRejectionLogs] = useState([]);
  const [rejectionStats, setRejectionStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [models, setModels] = useState([]);
  const [ollamaConnected, setOllamaConnected] = useState(false);

  // Loading states
  const [isLoadingDigest, setIsLoadingDigest] = useState(true);
  const [isCurating, setIsCurating] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isSyncingSource, setIsSyncingSource] = useState(null);
  const [isRegeneratingAudio, setIsRegeneratingAudio] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoadingDigest(true);
    try {
      const [digestData, sourcesData, rejectionsData, statsData, settingsData] = await Promise.allSettled([
        api.getTodayDigest(),
        api.getSources(),
        api.getRejections(),
        api.getRejectionStats(),
        api.getSettings(),
      ]);

      if (digestData.status === 'fulfilled') setDigest(digestData.value);
      if (sourcesData.status === 'fulfilled') setSources(sourcesData.value);
      if (rejectionsData.status === 'fulfilled') setRejectionLogs(rejectionsData.value);
      if (statsData.status === 'fulfilled') setRejectionStats(statsData.value);

      if (settingsData.status === 'fulfilled') {
        const s = settingsData.value;
        setSettings(s.settings);
        setModels(s.available_models || []);
        setOllamaConnected(s.ollama_connected);
      }
    } catch (err) {
      console.error("Initial load error:", err);
    } finally {
      setIsLoadingDigest(false);
    }
  };

  // Actions
  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      await api.syncAllSources();
      const updatedSources = await api.getSources();
      setSources(updatedSources);
      showToast('All active RSS feeds and folders synced locally.');
    } catch (err) {
      showToast(err.message || 'Sync failed', 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleSyncSource = async (id) => {
    setIsSyncingSource(id);
    try {
      const res = await api.syncSource(id);
      const updatedSources = await api.getSources();
      setSources(updatedSources);
      showToast(`Source synced (${res.new_articles || 0} new articles ingested).`);
    } catch (err) {
      showToast(err.message || 'Failed to sync source', 'error');
    } finally {
      setIsSyncingSource(null);
    }
  };

  const handleCurateNow = async () => {
    setIsCurating(true);
    try {
      const newDigest = await api.generateDigest({
        model: settings?.ollama_model,
        custom_prompt: settings?.filter_prompt,
        max_items: parseInt(settings?.max_takeaways || '5')
      });
      setDigest(newDigest);
      setActiveTab('digest');

      // Refresh rejection logs & stats
      const [updatedLogs, updatedStats] = await Promise.all([
        api.getRejections(),
        api.getRejectionStats(),
      ]);
      setRejectionLogs(updatedLogs);
      setRejectionStats(updatedStats);

      showToast(`Digest curated: ${newDigest.kept_items_count} takeaways kept, ${newDigest.rejected_items_count} marketing pieces filtered out.`);
    } catch (err) {
      showToast(err.message || 'Failed to curate digest', 'error');
    } finally {
      setIsCurating(false);
    }
  };

  const handleRegenerateAudio = async (digestId) => {
    setIsRegeneratingAudio(true);
    try {
      const res = await api.generateAudio(digestId);
      if (res.audio_url) {
        setDigest(prev => prev ? ({ ...prev, audio_url: res.audio_url, audio_filename: res.audio_filename }) : prev);
        showToast('Daily audio briefing successfully regenerated.');
      }
    } catch (err) {
      showToast(err.message || 'Audio synthesis failed', 'error');
    } finally {
      setIsRegeneratingAudio(false);
    }
  };

  const handleAddSource = async (payload) => {
    const newSource = await api.createSource(payload);
    const updated = await api.getSources();
    setSources(updated);
    showToast(`Added source: ${newSource.name}`);
  };

  const handleDeleteSource = async (id) => {
    await api.deleteSource(id);
    setSources(prev => prev.filter(s => s.id !== id));
    showToast('Source deleted.');
  };

  const handleToggleActive = async (id, isActive) => {
    const updated = await api.updateSource(id, { is_active: isActive });
    setSources(prev => prev.map(s => s.id === id ? updated : s));
    showToast(`Source ${isActive ? 'resumed' : 'paused'}.`);
  };

  const handleClearLogs = async () => {
    setIsClearingLogs(true);
    try {
      await api.clearRejections();
      setRejectionLogs([]);
      const updatedStats = await api.getRejectionStats();
      setRejectionStats(updatedStats);
      showToast('Rejection logs cleared.');
    } catch (err) {
      showToast(err.message || 'Failed to clear logs', 'error');
    } finally {
      setIsClearingLogs(false);
    }
  };

  const handleRefreshModels = async () => {
    setIsRefreshingModels(true);
    try {
      const list = await api.getModels();
      setModels(list);
      setOllamaConnected(list.length > 0);
      showToast(list.length > 0 ? `Found ${list.length} local Ollama models.` : 'No models detected at :11434', list.length > 0 ? 'success' : 'info');
    } catch (err) {
      showToast('Could not reach Ollama at http://localhost:11434', 'error');
    } finally {
      setIsRefreshingModels(false);
    }
  };

  const handleSaveSettings = async (formData) => {
    const res = await api.updateSettings(formData);
    setSettings(res.settings);
    showToast('Settings & prompt preferences saved.');
  };

  return (
    <div className="min-h-screen bg-sloth-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ollamaConnected={ollamaConnected}
        activeModel={settings?.ollama_model || 'llama3.1:latest'}
        isSyncing={isSyncingAll}
        onSyncAll={handleSyncAll}
        isCurating={isCurating}
        onCurateNow={handleCurateNow}
      />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4">
        {activeTab === 'digest' && (
          <DigestView
            digest={digest}
            isLoading={isLoadingDigest}
            onRegenerateAudio={handleRegenerateAudio}
            isRegeneratingAudio={isRegeneratingAudio}
            onCurateNow={handleCurateNow}
            isCurating={isCurating}
          />
        )}

        {activeTab === 'sources' && (
          <SourcesView
            sources={sources}
            onAddSource={handleAddSource}
            onDeleteSource={handleDeleteSource}
            onToggleActive={handleToggleActive}
            onSyncSource={handleSyncSource}
            isSyncingSource={isSyncingSource}
            onSyncAll={handleSyncAll}
            isSyncingAll={isSyncingAll}
          />
        )}

        {activeTab === 'rejections' && (
          <RejectionLogsView
            logs={rejectionLogs}
            stats={rejectionStats}
            onClearLogs={handleClearLogs}
            isClearing={isClearingLogs}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            models={models}
            ollamaConnected={ollamaConnected}
            onSaveSettings={handleSaveSettings}
            onRefreshModels={handleRefreshModels}
            isRefreshingModels={isRefreshingModels}
          />
        )}
      </main>

      <footer className="border-t border-white/5 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SlothDigest — Zero-Effort Local RSS & Newsletter Curator</span>
          <span className="font-mono text-slate-400">100% Local-First • Ollama • Hacktoberfest 2026</span>
        </div>
      </footer>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
