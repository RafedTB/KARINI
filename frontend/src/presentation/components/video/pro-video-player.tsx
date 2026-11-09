"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  RotateCwIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMuteIcon,
  MaximizeIcon,
  MinimizeIcon,
  PipIcon,
  GaugeIcon,
  SettingsIcon,
  ShieldLockIcon,
} from "@/presentation/components/ui/icons";

export type ProVideoPlayerProps = {
  src: string;
  title: string;
  instructorName?: string | null;
  subjectName?: string | null;
  watermarkText?: string | null;
  initialTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  className?: string;
  poster?: string;
  autoPlay?: boolean;
};

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ProVideoPlayer({
  src,
  title,
  instructorName,
  subjectName,
  watermarkText,
  initialTime = 0,
  onTimeUpdate,
  onEnded,
  className = "",
  poster,
  autoPlay = false,
}: ProVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [showCenterFeedback, setShowCenterFeedback] = useState<"play" | "pause" | "rewind" | "forward" | null>(null);

  // Scrubber hover state
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  // Watermark drifting coordinates to discourage screen recording
  const [watermarkPos, setWatermarkPos] = useState({ top: 15, left: 20 });

  // Drift watermark every 15s to prevent screen capture tampering
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPos({
        top: Math.floor(10 + Math.random() * 70),
        left: Math.floor(10 + Math.random() * 65),
      });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Controls auto-hide timer
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying && !showSpeedMenu) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2600);
    }
  }, [isPlaying, showSpeedMenu]);

  // Sync initial time
  useEffect(() => {
    if (videoRef.current && initialTime > 0) {
      videoRef.current.currentTime = initialTime;
    }
  }, [initialTime, src]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hasEnded) {
      video.currentTime = 0;
      setHasEnded(false);
    }

    if (video.paused || video.ended) {
      video.play().then(() => {
        setIsPlaying(true);
        triggerCenterFeedback("play");
      }).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      triggerCenterFeedback("pause");
    }
    resetControlsTimer();
  }, [hasEnded, resetControlsTimer]);

  const triggerCenterFeedback = (type: "play" | "pause" | "rewind" | "forward") => {
    setShowCenterFeedback(type);
    setTimeout(() => {
      setShowCenterFeedback((prev) => (prev === type ? null : prev));
    }, 600);
  };

  // Skip time (+/- 10s)
  const skipTime = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), video.duration || 0);
    triggerCenterFeedback(seconds < 0 ? "rewind" : "forward");
    resetControlsTimer();
  }, [resetControlsTimer]);

  // Volume
  const handleVolumeChange = (newVol: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    video.volume = clamped;
    setVolume(clamped);
    if (clamped === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
    resetControlsTimer();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted || volume === 0) {
      video.muted = false;
      setIsMuted(false);
      const restoreVol = volume === 0 ? 0.75 : volume;
      video.volume = restoreVol;
      setVolume(restoreVol);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
    resetControlsTimer();
  };

  // Speed
  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    resetControlsTimer();
  };

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
    resetControlsTimer();
  }, [resetControlsTimer]);

  // PiP
  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch {
      // Ignored if browser blocks PiP
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      if (e.key === " " || e.key === "k" || e.key === "K") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        skipTime(-5);
      } else if (e.key === "ArrowRight" || e.key === "l" || e.key === "L") {
        e.preventDefault();
        skipTime(5);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        handleVolumeChange(volume + 0.1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleVolumeChange(volume - 0.1);
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, skipTime, volume, isMuted, toggleFullscreen]);

  // Scrubber click / drag
  const handleTimelineSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const timeline = timelineRef.current;
    const video = videoRef.current;
    if (!timeline || !video || !duration) return;

    const rect = timeline.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    video.currentTime = pct * duration;
    setCurrentTime(video.currentTime);
    resetControlsTimer();
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const timeline = timelineRef.current;
    if (!timeline || !duration) return;
    const rect = timeline.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, mouseX / rect.width));
    setHoverPosition(pct * 100);
    setHoverTime(pct * duration);
  };

  const handleTimelineMouseLeave = () => {
    setHoverTime(null);
  };

  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => {
        // Anti-download security: disable right-click context menu
        e.preventDefault();
      }}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
      className={`relative group overflow-hidden bg-slate-950 select-none rounded-2xl sm:rounded-3xl shadow-2xl transition-all ${className}`}
      style={{
        aspectRatio: "16 / 9",
        WebkitTouchCallout: "none",
      }}
    >
      {/* HTML5 Video Element - 100% controls disabled, no native browser controls */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        playsInline
        controls={false}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture={false}
        draggable={false}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setCurrentTime(v.currentTime);
          if (v.duration && onTimeUpdate) {
            onTimeUpdate(v.currentTime, v.duration);
          }
          // Buffer update
          if (v.buffered.length > 0) {
            setBufferedEnd(v.buffered.end(v.buffered.length - 1));
          }
        }}
        onDurationChange={(e) => {
          setDuration(e.currentTarget.duration);
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setHasEnded(true);
          setShowControls(true);
          if (onEnded) onEnded();
        }}
        onClick={togglePlay}
        onDoubleClick={(e) => {
          // Double-click left half -> rewind 10s, right half -> forward 10s
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          if (clickX < rect.width * 0.4) {
            skipTime(-10);
          } else if (clickX > rect.width * 0.6) {
            skipTime(10);
          } else {
            toggleFullscreen();
          }
        }}
        className="h-full w-full object-contain cursor-pointer"
        style={{ pointerEvents: "auto" }}
      />

      {/* Floating Dynamic Anti-Screen-Record Watermark */}
      {watermarkText && (
        <div
          className="absolute pointer-events-none transition-all duration-1000 ease-out z-10"
          style={{
            top: `${watermarkPos.top}%`,
            left: `${watermarkPos.left}%`,
            opacity: 0.18,
          }}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-white font-mono text-[10px] tracking-wider uppercase font-semibold">
            <ShieldLockIcon size={11} />
            <span>{watermarkText}</span>
          </div>
        </div>
      )}

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-20">
          <div className="h-14 w-14 rounded-full border-4 border-indigo-400/20 border-t-indigo-500 animate-spin" />
        </div>
      )}

      {/* Central Action Feedback Popups (Play, Pause, Skip -10s, +10s) */}
      {showCenterFeedback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-fade-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-2xl transition-transform transform scale-110">
            {showCenterFeedback === "play" && <PlayIcon size={34} />}
            {showCenterFeedback === "pause" && <PauseIcon size={34} />}
            {showCenterFeedback === "rewind" && (
              <div className="flex flex-col items-center">
                <RotateCcwIcon size={26} />
                <span className="text-[10px] font-bold mt-0.5">-10s</span>
              </div>
            )}
            {showCenterFeedback === "forward" && (
              <div className="flex flex-col items-center">
                <RotateCwIcon size={26} />
                <span className="text-[10px] font-bold mt-0.5">+10s</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Finished Replay Screen */}
      {hasEnded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md text-white p-6 z-30 animate-fade-in text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 mb-4 shadow-lg">
            <RotateCcwIcon size={28} />
          </div>
          <span className="rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Leçon Terminée • Bravo !
          </span>
          <h3 className="mt-3 font-serif text-2xl font-bold max-w-md line-clamp-2">
            {title}
          </h3>
          <p className="mt-2 text-xs text-slate-300 max-w-sm">
            Votre progression a été enregistrée avec succès. Vous pouvez revoir la vidéo ou passer aux exercices interactifs.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold bg-white text-slate-950 hover:bg-slate-200 transition-all shadow-md cursor-pointer"
            >
              <RotateCcwIcon size={14} />
              Revoir la vidéo
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TOP OVERLAY HEADER BAR (YouTube Style: Clean & Subtle)             */}
      {/* =================================================================== */}
      <div
        className={`absolute top-0 inset-x-0 px-4 pt-3 pb-8 bg-gradient-to-b from-black/80 via-black/30 to-transparent transition-opacity duration-200 flex items-center justify-between gap-3 z-20 pointer-events-none ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-medium text-white line-clamp-1 drop-shadow">
            {title}
          </h2>
          {subjectName && (
            <span className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-white/20 text-white/90">
              {subjectName}
            </span>
          )}
          {instructorName && (
            <span className="hidden md:inline-block text-xs text-white/70">
              • {instructorName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-black/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <ShieldLockIcon size={11} />
            <span>Sécurisé</span>
          </span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* BOTTOM CONTROLS BAR (YouTube Style: Sleek, Inline, Red Progress)   */}
      {/* =================================================================== */}
      <div
        className={`absolute bottom-0 inset-x-0 px-3 sm:px-4 pb-2 sm:pb-2.5 pt-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-200 z-20 select-none ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar (YouTube Scrubber) */}
        <div
          ref={timelineRef}
          onClick={handleTimelineSeek}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          className="relative w-full py-1.5 cursor-pointer group/timeline flex items-center select-none"
        >
          {/* Base Track */}
          <div className="relative h-[3px] group-hover/timeline:h-[5px] w-full bg-white/25 transition-all duration-150 rounded-full">
            {/* Buffered Progress */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-white/40 transition-all duration-150 rounded-full"
              style={{ width: `${bufferedPercent}%` }}
            />

            {/* Played Progress (YouTube Red) */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-[#ff0000] rounded-full"
              style={{ width: `${playedPercent}%` }}
            >
              {/* Scrubber Knob (Red circle, expands on hover) */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-3.5 w-3.5 rounded-full bg-[#ff0000] scale-0 group-hover/timeline:scale-100 transition-transform duration-150 shadow-md" />
            </div>
          </div>

          {/* Hover Tooltip with Timestamp */}
          {hoverTime !== null && (
            <div
              className="absolute bottom-5 -translate-x-1/2 px-2 py-0.5 rounded bg-black/95 border border-white/10 text-white font-sans text-xs font-medium shadow pointer-events-none"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between text-white pt-0.5 select-none">
          {/* Left Controls: Play, -10s, +10s, Volume, Time */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Play / Pause Toggle */}
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 text-white transition-colors cursor-pointer"
              title={isPlaying ? "Pause (k)" : "Lire (k)"}
            >
              {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
            </button>

            {/* -10s Rewind */}
            <button
              type="button"
              onClick={() => skipTime(-10)}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer relative"
              title="Reculer de 10 secondes (j)"
            >
              <RotateCcwIcon size={16} />
              <span className="absolute text-[8px] font-bold bottom-1">10</span>
            </button>

            {/* +10s Forward */}
            <button
              type="button"
              onClick={() => skipTime(10)}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer relative"
              title="Avancer de 10 secondes (l)"
            >
              <RotateCwIcon size={16} />
              <span className="absolute text-[8px] font-bold bottom-1">10</span>
            </button>

            {/* Volume Slider with Hover Reveal (YouTube style) */}
            <div className="flex items-center group/vol ml-0.5">
              <button
                type="button"
                onClick={toggleMute}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? "Activer le son (m)" : "Couper le son (m)"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeMuteIcon size={18} />
                ) : volume > 0.5 ? (
                  <VolumeHighIcon size={18} />
                ) : (
                  <VolumeLowIcon size={18} />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-14 sm:w-16 h-1 rounded-full bg-white/30 accent-white cursor-pointer ml-1"
                title="Volume"
              />
            </div>

            {/* Time Display (YouTube Format: 0:00 / 3:36) */}
            <div className="ml-2 font-sans text-xs text-white/90 font-medium select-none flex items-center gap-1">
              <span>{formatTime(currentTime)}</span>
              <span className="text-white/50">/</span>
              <span className="text-white/70">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Speed / Settings, PiP, Fullscreen */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Playback Speed / Settings Menu (YouTube Style) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex h-9 px-2 items-center justify-center gap-1 rounded-full hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
                title="Paramètres de lecture"
              >
                <SettingsIcon size={17} className={showSpeedMenu ? "rotate-45 transition-transform" : "transition-transform"} />
                {playbackSpeed !== 1 && (
                  <span className="text-[11px] font-bold text-[#ff4e4e]">{playbackSpeed}x</span>
                )}
              </button>

              {showSpeedMenu && (
                <div
                  className="absolute bottom-full right-0 mb-3 w-44 rounded-xl bg-[#212121]/95 backdrop-blur-md border border-white/10 shadow-2xl p-1.5 text-xs text-white z-40 select-none animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-1.5 font-semibold text-white/60 text-[11px] uppercase tracking-wider border-b border-white/10 flex items-center justify-between">
                    <span>Vitesse</span>
                    <span className="text-[#ff4e4e] font-bold">{playbackSpeed === 1 ? "Normale" : `${playbackSpeed}x`}</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {SPEED_OPTIONS.map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => handleSpeedChange(spd)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                          playbackSpeed === spd
                            ? "bg-white/20 text-white font-bold"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span>{spd === 1 ? "Normale (1.0x)" : `${spd}x`}</span>
                        {playbackSpeed === spd && <span className="text-xs text-emerald-400">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* PiP Button */}
            <button
              type="button"
              onClick={togglePip}
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
              title="Mini-lecteur (i)"
            >
              <PipIcon size={17} />
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? "Quitter le plein écran (f)" : "Plein écran (f)"}
            >
              {isFullscreen ? <MinimizeIcon size={17} /> : <MaximizeIcon size={17} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

