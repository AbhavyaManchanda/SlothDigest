import React, { useState } from 'react';
import AudioPlayer from './AudioPlayer';
import { 
  CheckCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Clock, 
  Tag, 
  TrendingUp, 
  Sparkles, 
  Compass, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function DigestView({ 
  digest, 
  isLoading, 
  onRegenerateAudio, 
  isRegeneratingAudio, 
  onCurateNow, 
  isCurating 
}) {
  const [copied, setCopied] = useState(false);

  const copyMarkdown = () => {
    if (!digest || !digest.takeaways) return;

    let md = `# ${digest.title}\n`;
    md += `*Generated on ${digest.date} via SlothDigest (Local AI Filtered)*\n\n`;
    md += `### Signal Ratio: ${digest.kept_items_count} Kept / ${digest.rejected_items_count} Filtered\n\n`;

    digest.takeaways.forEach((item, idx) => {
      md += `## ${idx + 1}. [${item.title}](${item.url || '#'})\n`;
      md += `**Source:** ${item.source_name} | **Category:** ${item.category} | **Score:** ${item.signal_score}/10\n\n`;
      md += `> **TL;DR:** ${item.tldr}\n\n`;
      md += `**Key Takeaways:**\n`;
      (item.key_takeaways || []).forEach(k => {
        md += `- ${k}\n`;
      });
      md += `\n**Why it matters:** ${item.why_it_matters}\n\n---\n\n`;
    });

    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl mx-auto py-8">
        <div className="h-28 rounded-xl bg-sloth-900/60 border border-white/5" />
        <div className="h-36 rounded-xl bg-sloth-900/60 border border-white/5" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-xl bg-sloth-900/40 border border-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (!digest || !digest.takeaways || digest.takeaways.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Compass className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100">Your Sanctuary is Quiet</h3>
        <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
          No active digest found for today yet. Trigger the Sloth Filter Engine to evaluate incoming RSS feeds and newsletters.
        </p>
        <button
          onClick={onCurateNow}
          disabled={isCurating}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all duration-150 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isCurating ? 'Filtering Incoming Content...' : 'Curate High-Signal Digest'}</span>
        </button>
      </div>
    );
  }

  const noisePercentage = digest.total_raw_items > 0 
    ? Math.round((digest.rejected_items_count / digest.total_raw_items) * 100)
    : 85;

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      {/* Digest Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono tracking-wider uppercase text-emerald-400 font-semibold">
              Daily Curated Sanctuary
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">{digest.date}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            {digest.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Signal to noise badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sloth-900 border border-white/10 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-slate-300 font-medium">{digest.kept_items_count} High-Value</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-amber-400/90">{noisePercentage}% Noise Dropped</span>
            </div>
          </div>

          <button
            onClick={copyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sloth-900 hover:bg-sloth-800 text-slate-300 text-xs border border-white/10 transition-colors"
            title="Copy digest as Markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Export MD'}</span>
          </button>
        </div>
      </div>

      {/* Audio Briefing Player */}
      <AudioPlayer
        audioUrl={digest.audio_url}
        briefingScript={digest.briefing_script}
        onRegenerateAudio={() => onRegenerateAudio(digest.id)}
        isRegenerating={isRegeneratingAudio}
      />

      {/* High-Signal Takeaways Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-2">
            <span>High-Signal Takeaways</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {digest.takeaways.length} Curated
            </span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Model: {digest.model_used || 'Local AI'}
          </span>
        </div>

        <div className="space-y-4">
          {digest.takeaways.map((item, index) => (
            <article 
              key={item.id || index}
              className="group rounded-xl border border-white/10 bg-sloth-900/60 p-5 sm:p-6 transition-all duration-200 hover:border-emerald-500/30 hover:bg-sloth-900/90 shadow-sm"
            >
              {/* Meta header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-sloth-800 text-slate-300 border border-white/5">
                    {item.source_name}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/20">
                    {item.category}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{item.reading_time || '3 min'}</span>
                  </span>

                  <span className="flex items-center gap-1 font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <TrendingUp className="w-3 h-3" />
                    <span>{item.signal_score.toFixed(1)}/10</span>
                  </span>
                </div>
              </div>

              {/* Title & Link */}
              <h2 className="text-lg sm:text-xl font-semibold text-slate-100 group-hover:text-emerald-300 transition-colors leading-snug">
                {item.title}
              </h2>

              {/* TL;DR Callout */}
              <div className="mt-3 p-3 rounded-lg bg-sloth-950/80 border border-white/5 text-sm text-slate-300 font-medium leading-relaxed">
                <span className="text-emerald-400 font-semibold mr-1.5">TL;DR:</span>
                {item.tldr}
              </div>

              {/* Bullet points */}
              {item.key_takeaways && item.key_takeaways.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Key Mechanics & Data Points:
                  </h4>
                  <ul className="space-y-1.5 text-sm text-slate-300">
                    {item.key_takeaways.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Why it matters callout */}
              {item.why_it_matters && (
                <div className="mt-4 pt-3 border-t border-white/5 flex items-start gap-2 text-xs text-amber-200/90 bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/15">
                  <span className="font-semibold text-amber-400 shrink-0">Impact:</span>
                  <span>{item.why_it_matters}</span>
                </div>
              )}

              {/* Footer action */}
              {item.url && (
                <div className="mt-4 flex justify-end">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-300 transition-colors"
                  >
                    <span>Read original source</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
