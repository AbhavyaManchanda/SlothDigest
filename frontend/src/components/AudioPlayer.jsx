import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, FastForward, Radio } from 'lucide-react';

export default function AudioPlayer({ audioUrl, briefingScript, onRegenerateAudio, isRegenerating }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [useWebSpeech, setUseWebSpeech] = useState(false);
  const [speechSynthesisActive, setSpeechSynthesisActive] = useState(false);

  const audioRef = useRef(null);

  // Format time (mm:ss)
  const formatTime = (secs) => {
    if (isNaN(secs) || secs === 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (!audioUrl) {
      // Audio file not yet generated or missing, offer Web Speech synthesis
      toggleWebSpeech();
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.warn("Audio element play error, falling back to speech synthesis:", err);
          toggleWebSpeech();
        });
      }
    }
  };

  const toggleWebSpeech = () => {
    if (!window.speechSynthesis || !briefingScript) return;

    if (speechSynthesisActive) {
      window.speechSynthesis.cancel();
      setSpeechSynthesisActive(false);
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(briefingScript);
      utterance.rate = playbackRate;
      utterance.onend = () => {
        setSpeechSynthesisActive(false);
        setIsPlaying(false);
      };
      utterance.onerror = () => {
        setSpeechSynthesisActive(false);
        setIsPlaying(false);
      };
      window.speechSynthesis.speak(utterance);
      setSpeechSynthesisActive(true);
      setIsPlaying(true);
      setUseWebSpeech(true);
    }
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    setPlaybackRate(speeds[nextIdx]);
  };

  // Generate bar heights for waveform
  const waveformBars = [
    20, 35, 45, 70, 85, 60, 40, 75, 90, 50, 30, 65, 80, 95, 60, 45, 85, 70, 50, 35, 60, 80, 55, 30, 45, 65, 85, 40
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-sloth-900/80 p-5 backdrop-blur-md transition-all duration-200 hover:border-emerald-500/30 shadow-lg">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
          onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Radio className={`w-5 h-5 ${isPlaying ? 'animate-pulse text-emerald-300' : ''}`} />
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-slate-100 flex items-center gap-2">
              Daily 1-Minute Audio Briefing
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                AI Distilled
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              High-signal summary distilled by local Ollama & synthesized locally
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {onRegenerateAudio && (
            <button
              onClick={onRegenerateAudio}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-sloth-800 hover:bg-sloth-700 text-slate-300 border border-white/5 transition-colors disabled:opacity-50"
              title="Regenerate speech synthesis"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>{isRegenerating ? 'Synthesizing...' : 'Re-generate Voice'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Waveform Visualization Bars */}
      <div className="flex items-center justify-between gap-1 h-9 px-2 my-3 rounded-lg bg-sloth-950/70 border border-white/5">
        {waveformBars.map((baseHeight, i) => {
          const progress = duration > 0 ? currentTime / duration : 0;
          const barProgress = i / waveformBars.length;
          const isPassed = barProgress <= progress;
          
          return (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-150 ${
                isPassed
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                  : 'bg-slate-700/60'
              } ${isPlaying ? 'waveform-active' : ''}`}
              style={{
                height: `${isPlaying ? Math.max(15, (baseHeight * (0.6 + Math.random() * 0.5))) : baseHeight * 0.4}%`,
                animationDelay: `${(i % 5) * 0.15}s`
              }}
            />
          );
        })}
      </div>

      {/* Controls & Progress */}
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-transform active:scale-95 shadow-md shadow-emerald-500/20"
              title={isPlaying ? "Pause" : "Listen to Briefing"}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <span className="font-mono text-slate-300">
              {formatTime(currentTime)} / {formatTime(duration || 65)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={cycleSpeed}
              className="flex items-center gap-1 px-2 py-1 rounded bg-sloth-800/80 hover:bg-sloth-700 text-slate-300 font-mono text-xs border border-white/5 transition-colors"
              title="Playback speed"
            >
              <FastForward className="w-3 h-3 text-slate-400" />
              <span>{playbackRate}x</span>
            </button>

            <button
              onClick={toggleMute}
              className="p-1.5 rounded hover:bg-sloth-800 text-slate-400 hover:text-slate-200 transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
