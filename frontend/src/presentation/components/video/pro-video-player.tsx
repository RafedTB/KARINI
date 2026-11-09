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
  savedWatchedSeconds?: number;
  savedCompleted?: boolean;
  totalDurationSeconds?: number;
  lessonId?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onProgressUpdate?: (data: {
    watchedSeconds: number;
    watchPercent: number;
    lastPositionSeconds: number;
    completed: boolean;
  }) => void;
  onEnded?: (completed: boolean) => void;
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
  savedWatchedSeconds = 0,
  savedCompleted = false,
  totalDurationSeconds = 0,
  lessonId,
  onTimeUpdate,
  onProgressUpdate,
  onEnded,
  className = "",
  poster,
  autoPlay = false,
}: ProVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Storage key for per-video/per-lesson persistent caching
  const storageKey = lessonId ? `lesson_${lessonId}` : `src_${encodeURIComponent(src.split("?")[0] || "vid")}`;

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

  // Effective duration (known immediately from props or HTML5 video)
  const effectiveDuration = duration > 0 ? duration : (totalDurationSeconds && totalDurationSeconds > 0 ? totalDurationSeconds : 0);

  // Helper to compute realistic watch percentage
  const computeWatchPercent = useCallback((watchedCount: number, dur: number, completed: boolean) => {
    if (completed) return 100;
    if (dur <= 0 || watchedCount <= 0) return 0;
    return Math.min(100, Math.round((watchedCount / dur) * 100));
  }, []);

  // Anti-Cheat Watch Progress & Resume State (Initialized with stored/props progress, NEVER 0% if watched!)
  const watchedSecondsSetRef = useRef<Set<number>>(new Set());
  const lastPlayheadRef = useRef<number>(0);
  const lastReportedSecRef = useRef<number>(-1);

  const [watchPercent, setWatchPercent] = useState<number>(() => {
    if (savedCompleted) return 100;
    if (typeof window !== "undefined") {
      try {
        if (localStorage.getItem(`karini_completed_${storageKey}`) === "true") return 100;
        const localWatched = Number(localStorage.getItem(`karini_watched_${storageKey}`)) || 0;
        const effectiveWatched = Math.max(savedWatchedSeconds || 0, localWatched);
        const dur = effectiveDuration > 0 ? effectiveDuration : (totalDurationSeconds || 0);
        if (dur > 0 && effectiveWatched > 0) {
          return Math.min(100, Math.round((effectiveWatched / dur) * 100));
        }
      } catch {}
    }
    const dur = effectiveDuration > 0 ? effectiveDuration : (totalDurationSeconds || 0);
    return computeWatchPercent(savedWatchedSeconds || 0, dur, Boolean(savedCompleted));
  });

  const [isCompletedState, setIsCompletedState] = useState<boolean>(() => {
    if (savedCompleted) return true;
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(`karini_completed_${storageKey}`) === "true";
      } catch {}
    }
    return false;
  });

  const [isCheatAttempt, setIsCheatAttempt] = useState<boolean>(false);
  const [showResumeToast, setShowResumeToast] = useState<boolean>(false);
  const [resumeTimeDisplay, setResumeTimeDisplay] = useState<number>(0);

  // Anti-Screen-Capture & Anti-Recording Blackout Shield
  const [isCaptureShieldActive, setIsCaptureShieldActive] = useState(false);
  const captureShieldTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger instantaneous black screen shield
  const triggerBlackout = useCallback((persistent = false) => {
    setIsCaptureShieldActive(true);
    const video = videoRef.current;
    if (video && !video.paused) {
      video.pause();
      setIsPlaying(false);
    }
    // Neutralize clipboard so screen capture / paste gets blanked
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("Contenu protégé Karini • Capture interdite").catch(() => {});
      }
    } catch {}

    if (captureShieldTimerRef.current) {
      clearTimeout(captureShieldTimerRef.current);
    }

    if (!persistent) {
      captureShieldTimerRef.current = setTimeout(() => {
        if (document.hasFocus() && document.visibilityState === "visible") {
          setIsCaptureShieldActive(false);
        }
      }, 3500);
    }
  }, []);

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

  // Load and sync initial resume position & previously saved watch time
  useEffect(() => {
    // 1. Get initial watched count (props or localStorage)
    let initialWatched = savedWatchedSeconds || 0;
    let initialCompleted = Boolean(savedCompleted);
    let targetResume = initialTime || 0;

    if (typeof window !== "undefined") {
      try {
        const localWatched = Number(localStorage.getItem(`karini_watched_${storageKey}`)) || 0;
        if (localWatched > initialWatched) initialWatched = localWatched;

        const localCompleted = localStorage.getItem(`karini_completed_${storageKey}`) === "true";
        if (localCompleted) initialCompleted = true;

        const localPos = Number(localStorage.getItem(`karini_pos_${storageKey}`)) || 0;
        if (targetResume <= 3 && localPos > 3) targetResume = localPos;
      } catch {}
    }

    // Populate watchedSecondsSet
    if (initialWatched > 0) {
      for (let i = 0; i < initialWatched; i++) {
        watchedSecondsSetRef.current.add(i);
      }
    }

    if (initialCompleted) {
      setIsCompletedState(true);
      setWatchPercent(100);
    } else if (effectiveDuration > 0 && initialWatched > 0) {
      const calculated = computeWatchPercent(initialWatched, effectiveDuration, false);
      setWatchPercent(calculated);
      if (calculated >= 80) setIsCompletedState(true);
    }

    // 2. Prepare and trigger resume position
    if (targetResume > 3) {
      setResumeTimeDisplay(targetResume);
      setShowResumeToast(true);
      if (videoRef.current && videoRef.current.readyState >= 1) {
        videoRef.current.currentTime = targetResume;
      }
      const t = setTimeout(() => setShowResumeToast(false), 5500);
      return () => clearTimeout(t);
    }
  }, [initialTime, lessonId, src, savedWatchedSeconds, savedCompleted, storageKey, effectiveDuration, computeWatchPercent]);

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

  // Anti-Screen-Capture Listeners (Window blur, visibilitychange, PrintScreen, Snipping Tool)
  useEffect(() => {
    const handleBlur = () => {
      // Snipping Tool (Win+Shift+S), OBS, or Game Bar shifts system focus:
      // Instantly blank out video to solid black!
      triggerBlackout(true);
    };

    const handleFocus = () => {
      // User is back on the lesson
      if (captureShieldTimerRef.current) clearTimeout(captureShieldTimerRef.current);
      captureShieldTimerRef.current = setTimeout(() => {
        setIsCaptureShieldActive(false);
      }, 500);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        triggerBlackout(true);
      } else {
        handleFocus();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        triggerBlackout(false);
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [triggerBlackout]);

  // Keyboard navigation & anti-capture shortcut interceptor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global anti-screenshot interception
      if (e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        triggerBlackout(false);
        return;
      }

      // Windows Snipping Tool (Win+Shift+S) or macOS capture (Cmd+Shift+3/4)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ["s", "S", "3", "4"].includes(e.key)) {
        e.preventDefault();
        triggerBlackout(true);
        return;
      }

      // Windows Game Bar / Screen recording (Win+G)
      if ((e.metaKey || e.ctrlKey) && (e.key === "g" || e.key === "G")) {
        e.preventDefault();
        triggerBlackout(true);
        return;
      }

      // Developer Tools shortcuts (Ctrl+Shift+I / J / C or F12)
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "I", "j", "J", "c", "C"].includes(e.key)) ||
        e.key === "F12"
      ) {
        e.preventDefault();
        triggerBlackout(false);
        return;
      }

      // Don't intercept normal playback keys if user is typing in an input
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
  }, [togglePlay, skipTime, volume, isMuted, toggleFullscreen, triggerBlackout]);

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
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration);

          // Restore resume position once video metadata is loaded by the browser
          let targetResume = initialTime || 0;
          if (typeof window !== "undefined") {
            try {
              const stored = Number(localStorage.getItem(`karini_pos_${storageKey}`)) || 0;
              if (targetResume <= 3 && stored > 3) targetResume = stored;
            } catch {}
          }
          if (targetResume > 3 && v.duration > targetResume && v.currentTime < 2) {
            v.currentTime = targetResume;
          }

          // Compute accurate percentage now that duration is definitively known
          const watchedCount = watchedSecondsSetRef.current.size;
          if (watchedCount > 0 && !isCompletedState) {
            const calculated = computeWatchPercent(watchedCount, v.duration, isCompletedState);
            setWatchPercent(calculated);
            if (calculated >= 80) setIsCompletedState(true);
          }
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setCurrentTime(v.currentTime);

          // Anti-Cheat: accumulate ONLY real, continuous played seconds (no seek skips)
          const currentSec = Math.floor(v.currentTime);
          const diff = Math.abs(v.currentTime - lastPlayheadRef.current);
          if (diff < 2 && !v.paused && !v.seeking) {
            watchedSecondsSetRef.current.add(currentSec);
          }
          lastPlayheadRef.current = v.currentTime;

          const currentWatchedCount = watchedSecondsSetRef.current.size;
          const dur = v.duration > 0 ? v.duration : effectiveDuration;
          const currentPercent = computeWatchPercent(currentWatchedCount, dur, isCompletedState);
          setWatchPercent(currentPercent);

          const isEligible = currentPercent >= 80 || isCompletedState;
          if (isEligible && !isCompletedState) {
            setIsCompletedState(true);
          }

          // Save resume position and watch progress to localStorage every 2 seconds
          if (currentSec % 2 === 0 && currentSec > 3) {
            try {
              localStorage.setItem(`karini_pos_${storageKey}`, String(currentSec));
              localStorage.setItem(`karini_watched_${storageKey}`, String(currentWatchedCount));
              if (isEligible) localStorage.setItem(`karini_completed_${storageKey}`, "true");
            } catch {}
          }

          // Periodic progress callback every 4s
          if (onProgressUpdate && currentSec % 4 === 0 && currentSec !== lastReportedSecRef.current) {
            lastReportedSecRef.current = currentSec;
            onProgressUpdate({
              watchedSeconds: currentWatchedCount,
              watchPercent: currentPercent,
              lastPositionSeconds: currentSec,
              completed: isEligible,
            });
          }

          if (v.duration && onTimeUpdate) {
            onTimeUpdate(v.currentTime, v.duration);
          }
          // Buffer update
          if (v.buffered.length > 0) {
            setBufferedEnd(v.buffered.end(v.buffered.length - 1));
          }
        }}
        onDurationChange={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration);
          const watchedCount = watchedSecondsSetRef.current.size;
          if (watchedCount > 0 && !isCompletedState) {
            const calculated = computeWatchPercent(watchedCount, v.duration, isCompletedState);
            setWatchPercent(calculated);
            if (calculated >= 80) setIsCompletedState(true);
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => {
          setIsPlaying(false);
          // Save on pause immediately to ensure no loss
          const currentSec = Math.floor(videoRef.current?.currentTime || 0);
          const watchedCount = watchedSecondsSetRef.current.size;
          if (currentSec > 3) {
            try {
              localStorage.setItem(`karini_pos_${storageKey}`, String(currentSec));
              localStorage.setItem(`karini_watched_${storageKey}`, String(watchedCount));
            } catch {}
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setHasEnded(true);
          setShowControls(true);

          const watchedCount = watchedSecondsSetRef.current.size;
          const dur = duration > 0 ? duration : effectiveDuration;
          const currentPercent = computeWatchPercent(watchedCount, dur, isCompletedState);

          // Anti-Cheat Verification:
          // Student must have genuinely watched >= 80% of video to validate!
          // If student jumped to the end, currentPercent will be small -> blocked!
          const meetsRequirement = currentPercent >= 80 || (dur > 0 && dur < 30) || isCompletedState;

          if (!meetsRequirement) {
            setIsCheatAttempt(true);
            if (onProgressUpdate) {
              onProgressUpdate({
                watchedSeconds: watchedCount,
                watchPercent: currentPercent,
                lastPositionSeconds: Math.floor(currentTime),
                completed: false,
              });
            }
            if (onEnded) onEnded(false);
          } else {
            setIsCheatAttempt(false);
            setIsCompletedState(true);
            setWatchPercent(100);
            try {
              localStorage.setItem(`karini_completed_${storageKey}`, "true");
              localStorage.setItem(`karini_watched_${storageKey}`, String(Math.max(watchedCount, Math.floor(dur))));
            } catch {}
            if (onProgressUpdate) {
              onProgressUpdate({
                watchedSeconds: Math.max(watchedCount, Math.floor(dur)),
                watchPercent: 100,
                lastPositionSeconds: Math.floor(currentTime),
                completed: true,
              });
            }
            if (onEnded) onEnded(true);
          }
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
        className="h-full w-full object-contain cursor-pointer transition-all duration-150"
        style={{
          pointerEvents: "auto",
          filter: isCaptureShieldActive ? "brightness(0) contrast(0)" : "none",
          opacity: isCaptureShieldActive ? 0 : 1,
        }}
      />

      {/* Anti-Screen-Capture & Anti-Recording Blackout Shield */}
      {isCaptureShieldActive && (
        <div
          className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 mb-3 animate-pulse">
            <ShieldLockIcon size={32} />
          </div>
          <h4 className="font-sans text-base sm:text-lg font-bold text-white tracking-wide">
            Contenu Vidéo Protégé • Capture Interdite
          </h4>
          <p className="mt-1 text-xs text-white/60 max-w-sm">
            L&apos;écran s&apos;obscurcit automatiquement lors des tentatives de capture d&apos;écran ou d&apos;enregistrement pour protéger les droits pédagogiques Karini.
          </p>
          <button
            type="button"
            onClick={() => setIsCaptureShieldActive(false)}
            className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/20"
          >
            Reprendre le visionnage
          </button>
        </div>
      )}

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

      {/* Floating Resume Playback Toast */}
      {showResumeToast && resumeTimeDisplay > 5 && (
        <div className="absolute top-14 left-4 z-30 animate-fade-in bg-slate-950/90 backdrop-blur-md border border-white/20 text-white px-3 py-2 rounded-xl shadow-2xl flex items-center gap-3 text-xs select-none">
          <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
            <RotateCcwIcon size={14} />
            <span>Reprise de la lecture à {formatTime(resumeTimeDisplay)}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = 0;
                setCurrentTime(0);
              }
              setShowResumeToast(false);
            }}
            className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
          >
            Recommencer (0:00)
          </button>
          <button
            type="button"
            onClick={() => setShowResumeToast(false)}
            className="text-slate-400 hover:text-white ml-0.5 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Finished Replay Screen */}
      {hasEnded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md text-white p-6 z-30 animate-fade-in text-center select-none">
          {isCheatAttempt ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mb-3 shadow-lg">
                <ShieldLockIcon size={30} />
              </div>
              <span className="rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Visionnage Incomplet • {watchPercent}% visionné
              </span>
              <h3 className="mt-3 font-serif text-xl sm:text-2xl font-bold max-w-md line-clamp-2">
                {title}
              </h3>
              <p className="mt-2 text-xs text-slate-300 max-w-sm leading-relaxed">
                Vous avez avancé directement vers la fin de la leçon sans la visionner. Pour valider ce cours dans votre espace élève, vous devez regarder au moins <strong>80%</strong> du contenu.
              </p>
              <div className="mt-4 w-48 h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${watchPercent}%` }}
                />
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      videoRef.current.play();
                      setIsPlaying(true);
                    }
                    setHasEnded(false);
                    setIsCheatAttempt(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold bg-white text-slate-950 hover:bg-slate-200 transition-all shadow-md cursor-pointer"
                >
                  <RotateCcwIcon size={14} />
                  Visionner la leçon en entier
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 mb-3 shadow-lg">
                <RotateCcwIcon size={28} />
              </div>
              <span className="rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Leçon Validée • {Math.max(watchPercent, 100)}%
              </span>
              <h3 className="mt-3 font-serif text-xl sm:text-2xl font-bold max-w-md line-clamp-2">
                {title}
              </h3>
              <p className="mt-2 text-xs text-slate-300 max-w-sm">
                Félicitations ! Votre progression a été enregistrée avec succès. Vous pouvez revoir la vidéo ou passer aux exercices.
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
            </>
          )}
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
          {/* Watch Percentage Badge & Mini Bar */}
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-white text-[11px] font-medium shadow-xs">
            {isCompletedState ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span>✓</span> 100% Validé
              </span>
            ) : (
              <>
                <span className="text-white/60">Vu :</span>
                <span className="font-bold text-white font-mono">{watchPercent}%</span>
                <div className="w-12 h-1.5 rounded-full bg-white/20 overflow-hidden ml-0.5">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${watchPercent}%` }}
                  />
                </div>
              </>
            )}
          </div>

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

