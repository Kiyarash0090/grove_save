import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  PictureInPicture2,
  Subtitles as SubtitlesIcon,
} from 'lucide-react';

const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  title: string;
  durationSeconds?: number | null;
  initialStartSeconds?: number;
  isVertical?: boolean;
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
  selectedSubtitle?: { lang: string; isAuto: boolean; label: string } | null;
  apiBase: string;
  mediaUrl: string;
  onLoadedData?: () => void;
  onCanPlay?: () => void;
  onError?: () => void;
  onResumeInit?: (video: HTMLVideoElement) => void;
  onTimePositionChange?: (seconds: number) => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function buildStreamSrcWithStart(baseSrc: string, startSec: number): string {
  if (!baseSrc.includes('/api/media/stream')) return baseSrc;
  try {
    const isAbsolute = /^https?:\/\//i.test(baseSrc);
    const urlObj = new URL(baseSrc, window.location.origin);
    if (startSec > 0) {
      urlObj.searchParams.set('start', String(Math.floor(startSec)));
    } else {
      urlObj.searchParams.delete('start');
    }
    return isAbsolute ? urlObj.toString() : `${urlObj.pathname}${urlObj.search}`;
  } catch {
    return baseSrc;
  }
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  poster,
  durationSeconds,
  initialStartSeconds = 0,
  isVertical = false,
  crossOrigin,
  selectedSubtitle,
  apiBase,
  mediaUrl,
  onLoadedData,
  onCanPlay,
  onError,
  onResumeInit,
  onTimePositionChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const normalizedInitialOffset =
    initialStartSeconds > 0 && src.includes('/api/media/stream') ? Math.floor(initialStartSeconds) : 0;

  const [streamStartOffset, setStreamStartOffset] = useState<number>(normalizedInitialOffset);
  const [activeSrc, setActiveSrc] = useState<string>(() =>
    normalizedInitialOffset > 0 ? buildStreamSrcWithStart(src, normalizedInitialOffset) : src
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [videoDuration, setVideoDuration] = useState(durationSeconds || 0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const controlsTimeoutRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const pendingSeekRef = useRef<{ targetAbsolute: number; prevLocal: number; ts: number } | null>(null);

  useEffect(() => {
    const nextOffset =
      initialStartSeconds > 0 && src.includes('/api/media/stream') ? Math.floor(initialStartSeconds) : 0;
    setStreamStartOffset(nextOffset);
    setActiveSrc(nextOffset > 0 ? buildStreamSrcWithStart(src, nextOffset) : src);
    setCurrentTime(0);
    setBufferedEnd(0);
    setScrubTime(null);
    pendingSeekRef.current = null;
  }, [src, initialStartSeconds]);

  useEffect(() => {
    if (durationSeconds && durationSeconds > 0) {
      setVideoDuration((prev) => Math.max(prev, durationSeconds));
    }
  }, [durationSeconds]);

  // Set webkitPlaysInline on the video element for iOS
  useEffect(() => {
    const vid = videoRef.current;
    if (vid) {
      // On iOS, use webkit-playsinline attribute
      if (isIOS) {
        (vid as HTMLVideoElement & { webkitPlaysInline?: boolean }).webkitPlaysInline = !isMobile && !isFullscreen;
      }
    }
  }, [isMobile, isFullscreen]);

  const rawVidDuration =
    videoRef.current && Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0;
  const actualCurrentTime = scrubTime !== null ? scrubTime : streamStartOffset + currentTime;
  const actualBufferedEnd = streamStartOffset + bufferedEnd;
  const effectiveDuration = Math.max(
    videoDuration || 0,
    durationSeconds || 0,
    rawVidDuration > 0 ? streamStartOffset + rawVidDuration : 0,
    actualCurrentTime || 0
  );

  const triggerServerSeek = useCallback(
    (targetAbsolute: number) => {
      if (!src.includes('/api/media/stream')) return;
      const seekSec = Math.max(0, Math.floor(targetAbsolute));
      pendingSeekRef.current = null;
      setStreamStartOffset(seekSec);
      setCurrentTime(0);
      setBufferedEnd(0);
      setIsBuffering(true);
      setActiveSrc(buildStreamSrcWithStart(src, seekSec));
      if (onTimePositionChange) onTimePositionChange(seekSec);
    },
    [src, onTimePositionChange]
  );

  const seekToTime = useCallback(
    (rawTarget: number) => {
      const vid = videoRef.current;
      if (!vid) return;
      const maxDur = effectiveDuration > 0 ? effectiveDuration : Math.max(rawTarget, 0);
      const target = Math.max(0, Math.min(maxDur, rawTarget));
      const localTarget = target - streamStartOffset;

      let canNativeSeek = false;
      if (!activeSrc.includes('/api/media/stream')) {
        canNativeSeek = true;
      } else if (localTarget >= 0 && vid.seekable && vid.seekable.length > 0) {
        for (let i = 0; i < vid.seekable.length; i++) {
          const start = vid.seekable.start(i);
          const end = vid.seekable.end(i);
          if (localTarget >= start && localTarget <= end + 0.5) {
            canNativeSeek = true;
            break;
          }
        }
      }

      if (canNativeSeek) {
        pendingSeekRef.current = {
          targetAbsolute: target,
          prevLocal: vid.currentTime,
          ts: Date.now(),
        };
        try {
          vid.currentTime = Math.max(0, localTarget);
          setCurrentTime(Math.max(0, localTarget));
          if (onTimePositionChange) onTimePositionChange(target);
        } catch {
          pendingSeekRef.current = null;
          triggerServerSeek(target);
        }
        return;
      }

      triggerServerSeek(target);
    },
    [effectiveDuration, streamStartOffset, activeSrc, onTimePositionChange, triggerServerSeek]
  );

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && !isDraggingRef.current) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 3000);
    }
  };

  // Touch events for mobile - show controls on tap
  const handleTouchStart = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && !isDraggingRef.current) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 3000);
    }
  };

  // On mobile fullscreen, keep controls visible longer or permanently
  useEffect(() => {
    if (isFullscreen && isMobile && isPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
      // Longer timeout for mobile fullscreen
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 8000);
    }
  }, [isFullscreen, isMobile, isPlaying]);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      void vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;

    const pending = pendingSeekRef.current;
    if (pending) {
      const elapsed = Date.now() - pending.ts;
      const targetLocal = pending.targetAbsolute - streamStartOffset;
      if (Math.abs(vid.currentTime - targetLocal) <= 2.5) {
        pendingSeekRef.current = null;
      } else if (
        elapsed > 500 ||
        (vid.readyState >= 2 && vid.currentTime < 1 && targetLocal > 3 && vid.currentTime <= pending.prevLocal + 0.5)
      ) {
        const fallbackTarget = pending.targetAbsolute;
        pendingSeekRef.current = null;
        if (src.includes('/api/media/stream')) {
          triggerServerSeek(fallbackTarget);
          return;
        }
      }
    }

    if (!isDraggingRef.current) {
      setCurrentTime(vid.currentTime);
      if (onTimePositionChange) {
        onTimePositionChange(streamStartOffset + vid.currentTime);
      }
    }

    if (vid.duration && Number.isFinite(vid.duration)) {
      const totalFromVid = streamStartOffset + vid.duration;
      setVideoDuration((prev) => Math.max(prev, durationSeconds || 0, totalFromVid));
    }

    if (vid.buffered.length > 0) {
      setBufferedEnd(vid.buffered.end(vid.buffered.length - 1));
    }
  };

  const computeTimeFromClientX = useCallback(
    (clientX: number): number => {
      const bar = progressRef.current;
      if (!bar) return 0;
      const rect = bar.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return pos * (effectiveDuration || 1);
    },
    [effectiveDuration]
  );

  const handleProgressPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    setShowControls(true);
    const initialTarget = computeTimeFromClientX(e.clientX);
    setScrubTime(initialTarget);

    let latestTarget = initialTarget;
    const onPointerMove = (moveEvent: PointerEvent) => {
      latestTarget = computeTimeFromClientX(moveEvent.clientX);
      setScrubTime(latestTarget);
    };

    const finishDrag = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
      isDraggingRef.current = false;
      setScrubTime(null);
      seekToTime(latestTarget);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
  };

  const handleVolumeChange = (newVol: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    setVolume(newVol);
    setIsMuted(newVol === 0);
    vid.volume = newVol;
    vid.muted = newVol === 0;
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isMuted) {
      vid.muted = false;
      setIsMuted(false);
      vid.volume = volume || 1;
    } else {
      vid.muted = true;
      setIsMuted(true);
    }
  };

  const changePlaybackRate = (rate: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    const vid = videoRef.current;
    const container = containerRef.current;
    if (!vid && !container) return;

    if (!document.fullscreenElement) {
      // On iOS, use webkitEnterFullscreen on the video element
      if (isIOS && vid && 'webkitEnterFullscreen' in vid) {
        (vid as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.();
        return;
      }
      // On other platforms, prefer requesting fullscreen on the video element for native controls
      // but fall back to container if needed
      if (vid && typeof vid.requestFullscreen === 'function') {
        void vid.requestFullscreen().catch(() => {
          // Fallback to container if video fullscreen fails
          if (container) {
            void container.requestFullscreen().catch(() => {});
          }
        });
      } else if (container) {
        void container.requestFullscreen().catch(() => {});
      }
    } else {
      // On iOS, use webkitExitFullscreen
      if (isIOS && 'webkitExitFullscreen' in document) {
        (document as Document & { webkitExitFullscreen?: () => void }).webkitExitFullscreen?.();
        return;
      }
      void document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      // On iOS, also check webkitDisplayingFullscreen
      const vid = videoRef.current;
      const isWebkitFs = Boolean(isIOS && vid && (vid as HTMLVideoElement & { webkitDisplayingFullscreen?: boolean }).webkitDisplayingFullscreen);
      setIsFullscreen(isFs || isWebkitFs);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    // iOS fullscreen events
    if (isIOS && videoRef.current) {
      const vid = videoRef.current;
      vid.addEventListener('webkitbeginfullscreen', onFsChange);
      vid.addEventListener('webkitendfullscreen', onFsChange);
      return () => {
        document.removeEventListener('fullscreenchange', onFsChange);
        vid.removeEventListener('webkitbeginfullscreen', onFsChange);
        vid.removeEventListener('webkitendfullscreen', onFsChange);
      };
    }
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const togglePiP = async () => {
    const vid = videoRef.current;
    if (!vid) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await vid.requestPictureInPicture();
      }
    } catch {}
  };

  const skipTime = (delta: number) => {
    seekToTime(actualCurrentTime + delta);
  };

  const progressPercent =
    effectiveDuration > 0 ? Math.min(100, Math.max(0, (actualCurrentTime / effectiveDuration) * 100)) : 0;
  const bufferedPercent =
    effectiveDuration > 0 ? Math.min(100, Math.max(0, (actualBufferedEnd / effectiveDuration) * 100)) : 0;

  return (
    <div
      ref={containerRef}
      dir="ltr"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying && !isDraggingRef.current) {
          setShowControls(false);
          setShowSpeedMenu(false);
        }
      }}
      onTouchStart={handleTouchStart}
      className={`relative group overflow-hidden bg-black select-none ${
        isVertical ? 'w-full max-h-[72vh] flex items-center justify-center' : 'w-full aspect-video'
      } ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}
      style={{
        // Safe area handling for notches and home indicators
        ...(isFullscreen && {
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }),
      }}
    >
      <video
        ref={videoRef}
        src={activeSrc}
        poster={poster}
        // Disable playsInline on mobile to allow native fullscreen
        playsInline={!isMobile && !isFullscreen}
        // iOS needs webkit-playsinline for inline mode (set via ref)
        autoPlay
        crossOrigin={crossOrigin}
        onLoadedData={() => {
          setIsBuffering(false);
          if (onLoadedData) onLoadedData();
        }}
        onCanPlay={() => {
          setIsBuffering(false);
          if (onCanPlay) onCanPlay();
        }}
        onLoadedMetadata={() => {
          const vid = videoRef.current;
          if (!vid) return;
          vid.playbackRate = playbackRate;
          vid.volume = volume;
          vid.muted = isMuted;
          if (vid.duration && Number.isFinite(vid.duration)) {
            const totalFromVid = streamStartOffset + vid.duration;
            setVideoDuration((prev) => Math.max(prev, durationSeconds || 0, totalFromVid));
          }
          if (onResumeInit) {
            onResumeInit(vid);
          }
          if (selectedSubtitle && vid.textTracks[0]) {
            vid.textTracks[0].mode = 'showing';
          }
        }}
        onTimeUpdate={handleTimeUpdate}
        onSeeked={() => {
          const vid = videoRef.current;
          const pending = pendingSeekRef.current;
          if (!vid || !pending) return;
          const targetLocal = pending.targetAbsolute - streamStartOffset;
          if (Math.abs(vid.currentTime - targetLocal) > 3 && src.includes('/api/media/stream')) {
            const fallbackTarget = pending.targetAbsolute;
            pendingSeekRef.current = null;
            triggerServerSeek(fallbackTarget);
          } else {
            pendingSeekRef.current = null;
            setCurrentTime(vid.currentTime);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={() => setIsPlaying(false)}
        onError={onError}
        onClick={togglePlay}
        className={
          isVertical
            ? 'w-full max-h-[72vh] object-contain cursor-pointer'
            : 'w-full aspect-video object-contain cursor-pointer'
        }
      >
        {selectedSubtitle && (
          <track
            key={`${selectedSubtitle.lang}-${selectedSubtitle.isAuto ? 'a' : 'm'}`}
            kind="subtitles"
            srcLang={selectedSubtitle.lang}
            label={selectedSubtitle.label}
            src={`${apiBase}/api/media/subtitle?url=${encodeURIComponent(mediaUrl)}&lang=${encodeURIComponent(
              selectedSubtitle.lang
            )}&auto=${selectedSubtitle.isAuto ? '1' : '0'}`}
            default
          />
        )}
      </video>

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/25">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {/* Center Play Overlay on Pause */}
      {!isPlaying && !isBuffering && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition group-hover:bg-black/40"
        >
          <div className="w-16 h-16 rounded-full bg-white/95 dark:bg-white/90 text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
            <Play className="w-7 h-7 fill-current ms-1" />
          </div>
        </div>
      )}

      {/* Custom Control Bar Overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pt-10 pb-3 flex flex-col gap-2.5 ${
          showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          // Add safe area padding in fullscreen for mobile devices
          ...(isFullscreen && isMobile && {
            paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))',
            paddingLeft: 'calc(1rem + env(safe-area-inset-left))',
            paddingRight: 'calc(1rem + env(safe-area-inset-right))',
          }),
        }}
      >
        {/* Progress Bar */}
        <div
          ref={progressRef}
          onPointerDown={handleProgressPointerDown}
          onClick={(e) => e.stopPropagation()}
          className="relative h-2.5 w-full bg-white/20 rounded-full cursor-pointer group/progress flex items-center touch-none"
        >
          {/* Buffered Bar */}
          <div
            className="absolute left-0 h-full bg-white/30 rounded-full pointer-events-none transition-all"
            style={{ width: `${bufferedPercent}%` }}
          />
          {/* Progress Fill */}
          <div
            className="absolute left-0 h-full bg-red-600 rounded-full pointer-events-none flex items-center justify-end"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="w-3.5 h-3.5 -mr-1.5 bg-white rounded-full shadow-md transform scale-75 group-hover/progress:scale-100 transition" />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-white text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="p-1.5 rounded-lg hover:bg-white/20 active:scale-95 transition"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button
              type="button"
              onClick={() => skipTime(-10)}
              aria-label="Rewind 10s"
              className="hidden sm:flex p-1.5 rounded-lg hover:bg-white/20 active:scale-95 transition text-white/80 hover:text-white"
              title="Rewind 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => skipTime(10)}
              aria-label="Forward 10s"
              className="hidden sm:flex p-1.5 rounded-lg hover:bg-white/20 active:scale-95 transition text-white/80 hover:text-white"
              title="Forward 10s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group/vol">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="p-1.5 rounded-lg hover:bg-white/20 active:scale-95 transition"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                aria-label="Volume"
                className="w-16 sm:w-20 accent-red-600 h-1 bg-white/20 rounded-lg cursor-pointer"
              />
            </div>

            {/* Time Readout */}
            <div className="text-xs font-mono text-white/90 tabular-nums select-none">
              <span>{formatTime(actualCurrentTime)}</span>
              <span className="mx-1 text-white/50">/</span>
              <span>{formatTime(effectiveDuration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            {selectedSubtitle && (
              <div
                title={selectedSubtitle.label}
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 text-xs text-white/90"
              >
                <SubtitlesIcon className="w-3.5 h-3.5 text-red-400" />
                <span className="max-w-[80px] truncate">{selectedSubtitle.lang.toUpperCase()}</span>
              </div>
            )}

            {/* Speed Menu Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu((v) => !v)}
                aria-label="Playback Speed"
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-mono text-xs font-semibold transition"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-28 py-1 rounded-xl bg-zinc-900/95 backdrop-blur-md border border-white/15 shadow-2xl z-30 flex flex-col">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => changePlaybackRate(rate)}
                      className={`px-3 py-1.5 text-left text-xs transition font-mono ${
                        playbackRate === rate
                          ? 'bg-red-600 text-white font-bold'
                          : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
              <button
                type="button"
                onClick={togglePiP}
                aria-label="Picture-in-Picture"
                className="hidden sm:flex p-1.5 rounded-lg hover:bg-white/20 transition text-white/80 hover:text-white"
                title="Picture-in-Picture"
              >
                <PictureInPicture2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="p-1.5 rounded-lg hover:bg-white/20 transition text-white/80 hover:text-white"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
