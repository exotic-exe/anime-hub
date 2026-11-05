import React, { useEffect, useRef, useState, useCallback } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import { isSafeUrl } from '../utils/sanitize';
import { recordPlayerInteraction, markInternalNavigation } from '../utils/antiRedirect';
import {
  AlertCircle,
  RefreshCw,
  Server,
  Zap,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Download,
} from 'lucide-react';

function formatPlaybackTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function VideoPlayer({
  url = '',
  iframe = '',
  standbyIframe = '',
  streamHeaders = null,
  poster = '',
  subtitleUrl = '',
  autoplay = true,
  autoskip = false,
  animeName = 'Anime Stream',
  episodeTitle = 'Episode 1',
  onEnded = () => {},
  onFallbackToIframe = null,
  onReloadStream = null,
  onNextServer = null,
  onDownload = null,
  serverLabel = '',
  autoSwitchNotice = null,
}) {
  const artRef = useRef(null);
  const instanceRef = useRef(null);
  const hlsRef = useRef(null);
  const currentTimeRef = useRef(0);
  const iframeRef = useRef(null);
  const standbyIframeRef = useRef(null);
  const containerRef = useRef(null);

  // User input states (custom stream/caption bar)
  const [streamInput, setStreamInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [activeUrl, setActiveUrl] = useState(url);
  const [activeIframe, setActiveIframe] = useState(iframe);
  const [activeSub, setActiveSub] = useState(subtitleUrl);
  const [ccStatus, setCcStatus] = useState('OFF');
  const [playbackError, setPlaybackError] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Native Control Layer States for Ad-Shielded Iframe
  const [iframeStarted, setIframeStarted] = useState(Boolean(autoplay));
  const [iframePlaying, setIframePlaying] = useState(Boolean(autoplay));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);

  // Interaction refs
  const isDraggingSeekRef = useRef(false);
  const activityTimerRef = useRef(null);
  const lastClickTimeRef = useRef(0);
  const clickTimeoutRef = useRef(null);
  const lastProgressTimeRef = useRef(Date.now());
  const errorVerificationTimerRef = useRef(null);

  // Sync state when props change
  useEffect(() => {
    setActiveUrl(url);
    setActiveIframe(iframe);
    setPlaybackError(null);
    setIframeStarted(Boolean(autoplay));
    setIframePlaying(Boolean(autoplay));
    setCurrentTime(0);
    setDuration(0);
    currentTimeRef.current = 0;
  }, [url, iframe, autoplay]);

  useEffect(() => {
    setActiveSub(subtitleUrl);
  }, [subtitleUrl]);

  // Send structured postMessage commands to AnimeEmbed iframe
  const sendIframeCommand = useCallback((command, data = {}) => {
    const iframeEl = iframeRef.current;
    if (!iframeEl || !iframeEl.contentWindow) return;
    const message = {
      channel: 'animeembed',
      version: 1,
      requestId: 'cmd-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      command,
      data,
    };
    try {
      iframeEl.contentWindow.postMessage(message, '*');
    } catch (_) {}
  }, []);

  // Silent feedback without visual overlays or animations
  const showFeedback = useCallback(() => {}, []);

  // Fast-warm iframe and immediately trigger playback to eliminate startup delay
  const handleIframeLoad = useCallback(() => {
    sendIframeCommand('play');
    setTimeout(() => {
      sendIframeCommand('play');
    }, 250);
  }, [sendIframeCommand]);

  // Reconnect and reload iframe stream at exact timestamp
  const handleIframeReconnect = useCallback(
    (targetTime) => {
      const resume =
        typeof targetTime === 'number' ? targetTime : currentTimeRef.current || currentTime || 0;
      setIsReconnecting(true);
      setPlaybackError(null);
      if (onReloadStream) {
        onReloadStream(resume);
        setTimeout(() => {
          setIsReconnecting(false);
        }, 1200);
      } else {
        setActiveIframe('');
        setTimeout(() => {
          try {
            const u = new URL(iframe, window.location.origin);
            u.searchParams.set('start', String(Math.floor(resume)));
            u.searchParams.set('autoPlay', '1');
            u.searchParams.set('_t', String(Date.now()));
            setActiveIframe(u.toString());
          } catch (_) {
            setActiveIframe(iframe);
          }
          setIsReconnecting(false);
        }, 80);
      }
    },
    [iframe, onReloadStream, currentTime]
  );

  // Track iframe playback state via postMessage from AnimeEmbed
  useEffect(() => {
    const ALLOWED = new Set([window.location.origin, 'https://www.animeembed.com']);
    function handleIframeMessage(e) {
      if (!ALLOWED.has(e.origin)) return;
      // Strictly verify that the message sender is our mounted iframe's contentWindow
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      const data = e.data;
      if (!data || data.channel !== 'animeembed' || data.version !== 1) return;

      if (data.event === 'ready') {
        // Player mounted and ready inside iframe — eagerly initiate playback to remove all delay
        sendIframeCommand('play');
        if (autoplay) {
          setIframeStarted(true);
          setIframePlaying(true);
        }
      } else if (data.event === 'play') {
        setIframeStarted(true);
        setIframePlaying(true);
        setIsBuffering(false);
        setPlaybackError(null);
        setIsReconnecting(false);
        if (errorVerificationTimerRef.current) {
          clearTimeout(errorVerificationTimerRef.current);
          errorVerificationTimerRef.current = null;
        }
      } else if (data.event === 'startuptiming') {
        // Startup timing received silently
      } else if (data.event === 'pause') {
        setIframePlaying(false);
        setIsBuffering(false);
      } else if (data.event === 'buffering') {
        setIsBuffering(true);
      } else if (data.event === 'ended') {
        setIframePlaying(false);
        setIsBuffering(false);
        if (typeof onEnded === 'function') onEnded();
      } else if (data.event === 'progress') {
        setIsBuffering(false);
        setIframeStarted(true);
        setPlaybackError(null);
        setIsReconnecting(false);
        lastProgressTimeRef.current = Date.now();

        // If an error verification timer was active, cancel it because playback is advancing smoothly!
        if (errorVerificationTimerRef.current) {
          clearTimeout(errorVerificationTimerRef.current);
          errorVerificationTimerRef.current = null;
        }

        if (typeof data.data?.currentTime === 'number') {
          if (!isDraggingSeekRef.current) {
            setCurrentTime(data.data.currentTime);
            currentTimeRef.current = data.data.currentTime;
          }
        }
        if (typeof data.data?.duration === 'number' && data.data.duration > 0) {
          setDuration(data.data.duration);
        }
      } else if (data.event === 'error') {
        const errorMsg = data.data?.message || 'Playback interrupted';
        const time = currentTimeRef.current || currentTime || 0;
        console.warn('[VideoPlayer] Transient player status:', errorMsg, 'at', time);

        // Do NOT immediately unmount/reload the iframe (which causes auto-skip intro to glitch and reload).
        // Instead, verify if progress has genuinely stopped for at least 3.5 seconds.
        if (errorVerificationTimerRef.current) clearTimeout(errorVerificationTimerRef.current);
        errorVerificationTimerRef.current = setTimeout(() => {
          const timeSinceProgress = Date.now() - lastProgressTimeRef.current;
          // If no progress event arrived for >3000ms, the stream is truly stalled
          if (timeSinceProgress > 3000) {
            setPlaybackError({
              message: errorMsg,
              time: currentTimeRef.current || currentTime || 0,
            });
            setIsReconnecting(false);
          }
          errorVerificationTimerRef.current = null;
        }, 3500);
      }
    }

    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
      if (errorVerificationTimerRef.current) {
        clearTimeout(errorVerificationTimerRef.current);
        errorVerificationTimerRef.current = null;
      }
    };
  }, [onEnded, onReloadStream, onNextServer, handleIframeReconnect, currentTime]);

  // Smooth continuous progress increment while playing (resynced on every progress event)
  useEffect(() => {
    if (!iframePlaying || !activeIframe) return;
    const interval = setInterval(() => {
      if (!isDraggingSeekRef.current) {
        setCurrentTime((prev) => {
          const next = prev + 0.25;
          currentTimeRef.current = next;
          return next;
        });
      }
    }, 250);
    return () => clearInterval(interval);
  }, [iframePlaying, activeIframe]);

  // Track browser fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  function handleToggleFullscreen() {
    markInternalNavigation();
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    recordPlayerInteraction();
    markInternalNavigation();
    setIframeStarted(true);
    if (iframePlaying) {
      setIframePlaying(false);
      sendIframeCommand('pause');
      showFeedback('pause', 'Paused');
    } else {
      setIframePlaying(true);
      sendIframeCommand('play');
      showFeedback('play', 'Playing');
    }
  }, [iframePlaying, sendIframeCommand, showFeedback]);

  // Relative seek (-10s / +10s)
  const handleSeekRelative = useCallback(
    (delta) => {
      recordPlayerInteraction();
      markInternalNavigation();
      const current = currentTimeRef.current || currentTime || 0;
      const target = Math.max(0, Math.min(duration || 999999, current + delta));
      currentTimeRef.current = target;
      setCurrentTime(target);
      sendIframeCommand('seek', { time: target });
      showFeedback(delta > 0 ? 'forward' : 'backward', `${delta > 0 ? '+' : ''}${delta}s`);
    },
    [currentTime, duration, sendIframeCommand, showFeedback]
  );

  // Absolute seek (scrubber)
  const handleSeekTo = useCallback(
    (targetTime) => {
      recordPlayerInteraction();
      markInternalNavigation();
      const clamped = Math.max(0, Math.min(duration || 999999, targetTime));
      currentTimeRef.current = clamped;
      setCurrentTime(clamped);
      sendIframeCommand('seek', { time: clamped });
    },
    [duration, sendIframeCommand]
  );

  // Toggle mute
  const toggleMute = useCallback(() => {
    recordPlayerInteraction();
    markInternalNavigation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sendIframeCommand('setMuted', { muted: nextMuted });
    showFeedback(nextMuted ? 'mute' : 'volume', nextMuted ? 'Muted' : `${Math.round(volume * 100)}%`);
  }, [isMuted, volume, sendIframeCommand, showFeedback]);

  // Volume slider change
  const handleVolumeChange = useCallback(
    (newVol) => {
      recordPlayerInteraction();
      markInternalNavigation();
      const clamped = Math.max(0, Math.min(1, newVol));
      setVolume(clamped);
      if (clamped > 0 && isMuted) {
        setIsMuted(false);
        sendIframeCommand('setMuted', { muted: false });
      }
      sendIframeCommand('setVolume', { volume: clamped });
      showFeedback('volume', `${Math.round(clamped * 100)}%`);
    },
    [isMuted, sendIframeCommand, showFeedback]
  );

  // Skip intro helper
  const handleSkipIntro = useCallback(() => {
    const current = currentTimeRef.current || currentTime || 0;
    const target = current < 30 ? 85 : current + 85;
    handleSeekTo(target);
    showFeedback('forward', 'Intro Skipped');
  }, [handleSeekTo, showFeedback, currentTime]);

  // Single & Double click detection over video surface
  function handleScreenClick(e) {
    if (e.target.closest('[data-controls]')) return;
    recordPlayerInteraction();
    markInternalNavigation();

    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    const clickX = rect ? (e.clientX - rect.left) / rect.width : 0.5;

    if (now - lastClickTimeRef.current < 260) {
      // Double click detected! Cancel single click
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      lastClickTimeRef.current = 0;

      if (clickX < 0.35) {
        handleSeekRelative(-10);
      } else if (clickX > 0.65) {
        handleSeekRelative(10);
      } else {
        handleToggleFullscreen();
      }
    } else {
      // Single click candidate
      lastClickTimeRef.current = now;
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => {
        togglePlayPause();
        clickTimeoutRef.current = null;
      }, 260);
    }
  }

  // Auto-hide controls bar after user inactivity
  const handleUserActivity = useCallback(() => {
    setIsControlsVisible(true);
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    if (iframePlaying) {
      activityTimerRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3200);
    }
  }, [iframePlaying]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!activeIframe) return;

    function handleKeyDown(e) {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) {
        return;
      }

      if (e.code === 'Space' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handleSeekRelative(-10);
      } else if (e.code === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleSeekRelative(10);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        handleVolumeChange(Math.min(1, volume + 0.1));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleVolumeChange(Math.max(0, volume - 0.1));
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleToggleFullscreen();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeIframe,
    volume,
    isMuted,
    iframePlaying,
    togglePlayPause,
    handleSeekRelative,
    handleVolumeChange,
    toggleMute,
  ]);

  // Initial Ad-Free Play Button
  function handleAdFreePlay() {
    recordPlayerInteraction();
    markInternalNavigation();
    setIframeStarted(true);
    setIframePlaying(true);
    sendIframeCommand('play');
  }

  const hasDirectStream = Boolean(activeUrl && isSafeUrl(activeUrl));
  const hasIframe = Boolean(activeIframe && isSafeUrl(activeIframe));

  // Reconnect and resume playback at exact interrupted timestamp (for Artplayer)
  function handleReconnect(targetTime) {
    const resumeTime =
      typeof targetTime === 'number' ? targetTime : playbackError?.time || currentTimeRef.current || 0;
    setIsReconnecting(true);
    setPlaybackError(null);

    if (hlsRef.current) {
      try {
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch (e) {}
      hlsRef.current = null;
    }

    const art = instanceRef.current;
    if (art && art.video && activeUrl) {
      try {
        art
          .switchUrl(activeUrl)
          .then(() => {
            if (art.video && resumeTime > 0) {
              art.video.currentTime = resumeTime;
            }
            art.play().catch(() => {});
            setIsReconnecting(false);
          })
          .catch((err) => {
            console.warn('SwitchUrl failed, reloading source:', err);
            setActiveUrl('');
            setTimeout(() => {
              setActiveUrl(url);
              setIsReconnecting(false);
            }, 100);
          });
      } catch (err) {
        setIsReconnecting(false);
      }
    } else {
      setIsReconnecting(false);
    }
  }

  // Artplayer instance initialization (when playing direct .m3u8/.mp4 stream)
  useEffect(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch (e) {}
      hlsRef.current = null;
    }

    if (instanceRef.current) {
      try {
        if (instanceRef.current.video) {
          instanceRef.current.video.pause();
          instanceRef.current.video.removeAttribute('src');
          instanceRef.current.video.load();
        }
        if (typeof instanceRef.current.destroy === 'function') {
          instanceRef.current.destroy(true);
        }
      } catch (e) {}
      instanceRef.current = null;
    }

    if (artRef.current) {
      artRef.current.innerHTML = '';
    }

    if (!hasDirectStream || hasIframe) return;
    if (!artRef.current) return;

    let netRecoveryCount = 0;
    let mediaRecoveryCount = 0;

    const art = new Artplayer({
      container: artRef.current,
      url: activeUrl,
      poster: poster,
      volume: 0.7,
      isLive: false,
      muted: false,
      autoplay: autoplay,
      pip: true,
      autoSize: true,
      autoMini: true,
      screenshot: true,
      setting: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      miniProgressBar: true,
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: true,
      airplay: true,
      theme: '#ffffff',
      moreVideoAttr: {
        crossOrigin: 'anonymous',
      },
      subtitle: activeSub
        ? {
            url: activeSub,
            type: 'vtt',
            style: {
              color: '#ffffff',
              fontSize: '22px',
              textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 2px #000',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: '700',
            },
            encoding: 'utf-8',
          }
        : undefined,
      controls: activeSub
        ? [
            {
              position: 'right',
              html: '<span style="font-size:12px; font-weight:bold; background:#27272a; padding:3px 8px; border-radius:4px; color:#ffffff; border:1px solid #3f3f46;">CC</span>',
              tooltip: 'Toggle Captions (Subtitles)',
              click: function () {
                art.subtitle.show = !art.subtitle.show;
                art.notice.show = art.subtitle.show ? 'Captions: ON' : 'Captions: OFF';
                setCcStatus(art.subtitle.show ? 'ON' : 'OFF');
              },
            },
          ]
        : [],
      customType: {
        m3u8: function (video, m3u8Url, artInstance) {
          if (Hls.isSupported()) {
            if (hlsRef.current) {
              try {
                hlsRef.current.stopLoad();
                hlsRef.current.detachMedia();
                hlsRef.current.destroy();
              } catch (e) {}
              hlsRef.current = null;
            }

            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: false,
              backBufferLength: 60,
              maxBufferLength: 60,
              maxMaxBufferLength: 120,
              maxBufferSize: 60 * 1000 * 1000,
              manifestLoadingTimeOut: 20000,
              manifestLoadingMaxRetry: 6,
              levelLoadingTimeOut: 20000,
              levelLoadingMaxRetry: 6,
              fragLoadingTimeOut: 30000,
              fragLoadingMaxRetry: 8,
              startFragPrefetch: true,
              xhrSetup: streamHeaders
                ? (xhr) => {
                    Object.entries(streamHeaders).forEach(([k, v]) => xhr.setRequestHeader(k, v));
                  }
                : undefined,
            });

            hls.on(Hls.Events.ERROR, function (event, data) {
              console.warn('[HLS Error Event]', data.type, data.details, 'Fatal:', data.fatal);

              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    if (netRecoveryCount < 3) {
                      netRecoveryCount++;
                      console.log(`[HLS] Auto-recovering network error (Attempt ${netRecoveryCount}/3)...`);
                      hls.startLoad();
                    } else {
                      console.error('[HLS] Network error recovery exhausted.');
                      const time = video.currentTime || currentTimeRef.current || 0;
                      setPlaybackError({
                        message: 'Stream connection interrupted.',
                        time,
                      });
                    }
                    break;

                  case Hls.ErrorTypes.MEDIA_ERROR:
                    if (mediaRecoveryCount < 3) {
                      mediaRecoveryCount++;
                      console.log(`[HLS] Auto-recovering media error (Attempt ${mediaRecoveryCount}/3)...`);
                      hls.recoverMediaError();
                    } else {
                      console.error('[HLS] Media decode error recovery exhausted.');
                      const time = video.currentTime || currentTimeRef.current || 0;
                      setPlaybackError({
                        message: 'Media decoding interrupted.',
                        time,
                      });
                    }
                    break;

                  default:
                    console.error('[HLS] Fatal unrecoverable error:', data.details);
                    const time = video.currentTime || currentTimeRef.current || 0;
                    setPlaybackError({
                      message: 'Playback interrupted. Stream stalled or disconnected.',
                      time,
                    });
                    break;
                }
              }
            });

            hls.loadSource(m3u8Url);
            hls.attachMedia(video);
            hlsRef.current = hls;
            if (artInstance) artInstance.hls = hls;
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = m3u8Url;
          }
        },
      },
      highlight: [
        { time: 85, text: 'Intro Ends' },
        { time: 1320, text: 'Outro Starts' },
      ],
    });

    instanceRef.current = art;

    art.on('ready', () => {
      const updateHighlights = () => {
        if (art.video && art.video.duration > 100) {
          const introEnd = 85;
          const outroStart = art.video.duration - 90;
          art.option.highlight = [
            { time: introEnd, text: 'Intro Ends' },
            { time: outroStart, text: 'Outro Starts' },
          ];
        }
      };

      art.on('video:loadedmetadata', updateHighlights);
      if (art.video && art.video.duration) updateHighlights();

      if (autoskip && art.video && art.video.currentTime < 85) {
        art.video.currentTime = 85;
      }
    });

    art.on('video:ended', () => {
      if (typeof onEnded === 'function') onEnded();
    });

    art.on('video:error', () => {
      const time = art.video?.currentTime || currentTimeRef.current || 0;
      console.warn('[Video Error] Interrupted at', time);
      setPlaybackError({
        message: 'Playback interrupted. Stream timed out or network disconnected.',
        time,
      });
    });

    art.layers.add({
      name: 'skip-intro',
      html: '<button style="background: rgba(255,255,255,0.9); color: #000; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 11px; cursor: pointer; display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">Skip Intro</button>',
      style: { position: 'absolute', bottom: '70px', right: '20px' },
      click: function () {
        if (art.video) art.video.currentTime = 90;
        this.style.display = 'none';
      },
    });

    art.layers.add({
      name: 'skip-outro',
      html: '<button style="background: rgba(255,255,255,0.9); color: #000; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 11px; cursor: pointer; display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">Skip Outro</button>',
      style: { position: 'absolute', bottom: '70px', right: '20px' },
      click: function () {
        if (typeof onEnded === 'function') onEnded();
      },
    });

    art.on('video:timeupdate', () => {
      if (!art.video) return;
      const current = art.video.currentTime;
      currentTimeRef.current = current;
      const dur = art.video.duration;
      const skipIntroBtn = art.layers['skip-intro'];
      const skipOutroBtn = art.layers['skip-outro'];

      if (current > 5 && current < 85) {
        if (skipIntroBtn) skipIntroBtn.style.display = 'block';
      } else {
        if (skipIntroBtn) skipIntroBtn.style.display = 'none';
      }

      if (dur > 100 && current > dur - 90 && current < dur - 10) {
        if (skipOutroBtn) skipOutroBtn.style.display = 'block';
      } else {
        if (skipOutroBtn) skipOutroBtn.style.display = 'none';
      }
    });

    return () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch (e) {}
        hlsRef.current = null;
      }

      if (instanceRef.current) {
        try {
          const a = instanceRef.current;
          if (a.video) {
            a.video.pause();
            a.video.removeAttribute('src');
            a.video.load();
          }
          if (typeof a.destroy === 'function') {
            a.destroy(true);
          }
        } catch (e) {}
        instanceRef.current = null;
      }

      if (artRef.current) {
        artRef.current.innerHTML = '';
      }
    };
  }, [activeUrl, activeSub, poster, hasDirectStream, hasIframe]);

  const handleCustomLoad = (e) => {
    e.preventDefault();
    if (streamInput.trim()) {
      if (isSafeUrl(streamInput.trim())) {
        setActiveIframe('');
        setActiveUrl(streamInput.trim());
        setPlaybackError(null);
      } else {
        alert('Invalid stream URL. Only secure HTTP/HTTPS streams are permitted.');
        return;
      }
    }
    if (captionInput.trim()) {
      if (isSafeUrl(captionInput.trim())) {
        setActiveSub(captionInput.trim());
      } else {
        alert('Invalid subtitle URL. Only secure HTTP/HTTPS subtitles are permitted.');
        return;
      }
    }
  };

  return (
    <div className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Player Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2.5 bg-[#0e0e0e] border-b border-zinc-800 text-xs gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 text-zinc-200 font-bold tracking-wider border border-zinc-700 flex-shrink-0">
            <img src="/logo.jpg" alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
            EXOTICHUB
          </span>
          <span className="text-zinc-300 font-semibold truncate max-w-[180px] sm:max-w-[420px]">
            {animeName} — {episodeTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {serverLabel && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 font-bold text-[11px] border border-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>{serverLabel}</span>
            </span>
          )}

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              title="Direct Download anime episode"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 font-bold text-[11px] transition active:scale-95 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Direct Download</span>
            </button>
          )}

          {onReloadStream && (
            <button
              type="button"
              onClick={onReloadStream}
              title="Refresh and reconnect current stream"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 font-bold text-[11px] transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reload</span>
            </button>
          )}

          {onNextServer && (
            <button
              type="button"
              onClick={onNextServer}
              title="Auto-switch to next best server"
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-[11px] transition active:scale-95 cursor-pointer"
            >
              <span>Auto-Switch</span>
            </button>
          )}

          {activeSub && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-200 font-semibold border border-zinc-700">
              CC: {ccStatus}
            </span>
          )}

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 font-bold text-[11px] transition active:scale-95 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Full'}</span>
          </button>
        </div>
      </div>

      {/* Screen Container */}
      <div
        ref={containerRef}
        onPointerDown={recordPlayerInteraction}
        onMouseMove={handleUserActivity}
        onTouchStart={handleUserActivity}
        className="relative w-full aspect-video bg-black group overflow-hidden select-none"
      >
        {/* Floating Auto-Switch Notice Toast */}
        {autoSwitchNotice && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/90 border border-zinc-700 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-2xl backdrop-blur-md">
            <span>{autoSwitchNotice}</span>
          </div>
        )}

        {hasIframe ? (
          <>
            {/*
              HIGH-SPEED INTERACTIVE STREAM WITH AD SHIELD:
              The active iframe has pointer-events-auto so direct user clicks instantly grant
              browser media activation, eliminating startup delay (<500ms) across all devices.
              Unauthorized popups & redirects remain neutralized by top-level antiRedirect traps.
            */}
            <iframe
              ref={iframeRef}
              key={activeIframe}
              src={activeIframe}
              title={`${animeName} — ${episodeTitle}`}
              className="absolute inset-0 w-full h-full border-0 select-none z-10 pointer-events-auto"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="origin"
              loading="eager"
              fetchPriority="high"
              onLoad={handleIframeLoad}
            />

            {/* Standby Pre-warmed Iframe: Keeps connection hot & pre-buffers next episode */}
            {standbyIframe && (
              <iframe
                ref={standbyIframeRef}
                key={standbyIframe}
                src={standbyIframe}
                title="Standby Episode Pre-warmer"
                className="absolute inset-0 w-full h-full border-0 pointer-events-none select-none opacity-0 -z-10"
                tabIndex="-1"
                aria-hidden="true"
                loading="eager"
              />
            )}

            {/* Ad-Free Direct Play Overlay before playback starts */}
            {!iframeStarted && (
              <div
                className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer"
                onClick={handleAdFreePlay}
              >
                {poster && (
                  <img
                    src={poster}
                    alt={animeName}
                    className="absolute inset-0 w-full h-full object-cover filter brightness-[0.2] blur-[2px] scale-105 pointer-events-none"
                  />
                )}
                <div className="relative z-10 flex flex-col items-center space-y-3 max-w-sm pointer-events-none">
                  <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white text-black shadow-2xl transition-all duration-300 transform group-hover:scale-110 active:scale-95">
                    <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-current translate-x-0.5 text-black" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm sm:text-base font-black text-white tracking-wide">
                      {animeName}
                    </p>
                    <p className="text-xs text-zinc-300 font-semibold">{episodeTitle}</p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ad-Shield &amp; Direct Play Active</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top-Right Quick Over-Video Actions on Hover */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
              {onDownload && (
                <button
                  type="button"
                  onClick={onDownload}
                  className="px-2.5 py-1 rounded-lg bg-black/85 hover:bg-black text-emerald-400 hover:text-emerald-300 text-[11px] font-bold border border-emerald-500/40 backdrop-blur-md shadow-lg flex items-center gap-1 transition cursor-pointer"
                  title="Direct Download episode"
                >
                  <Download className="w-3 h-3" />
                  <span>Direct Download</span>
                </button>
              )}
              {onReloadStream && (
                <button
                  type="button"
                  onClick={onReloadStream}
                  className="px-2.5 py-1 rounded-lg bg-black/85 hover:bg-black text-white text-[11px] font-bold border border-zinc-700 backdrop-blur-md shadow-lg flex items-center gap-1 transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reload Stream</span>
                </button>
              )}
              {onNextServer && (
                <button
                  type="button"
                  onClick={onNextServer}
                  className="px-2.5 py-1 rounded-lg bg-black/85 hover:bg-black text-white text-[11px] font-bold border border-zinc-700 backdrop-blur-md shadow-lg transition cursor-pointer"
                >
                  <span>Next Server</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="px-2 py-1 rounded-lg bg-black/85 hover:bg-black text-white text-[11px] font-bold border border-zinc-700 backdrop-blur-md shadow-lg flex items-center gap-1 transition cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/*
              NATIVE EXOTICHUB CONTROLS BAR:
              Rendered on ExoticHub's DOM layer so third-party ad scripts are 100% neutralized.
              Offers Play/Pause, -10s/+10s, smooth scrubber, volume, skip intro, and fullscreen.
            */}
            <div
              data-controls="true"
              className={`absolute bottom-0 inset-x-0 z-20 pointer-events-auto bg-gradient-to-t from-black/95 via-black/75 to-transparent px-3 sm:px-4 py-2 sm:py-3 pt-6 sm:pt-8 transition-all duration-300 ${
                isControlsVisible || !iframePlaying
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
              onMouseEnter={() => setIsControlsVisible(true)}
              onMouseMove={handleUserActivity}
            >
              {/* Progress Scrubber Bar */}
              <div className="relative group/seek w-full h-4 flex items-center cursor-pointer mb-2">
                <div className="w-full h-1 group-hover/seek:h-1.5 bg-white/25 rounded-full overflow-hidden transition-all duration-150 relative">
                  <div
                    className="h-full bg-white transition-[width] duration-100 rounded-full"
                    style={{
                      width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%`,
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step="any"
                  value={currentTime}
                  onMouseDown={() => {
                    isDraggingSeekRef.current = true;
                  }}
                  onTouchStart={() => {
                    isDraggingSeekRef.current = true;
                  }}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCurrentTime(val);
                    currentTimeRef.current = val;
                  }}
                  onMouseUp={(e) => {
                    isDraggingSeekRef.current = false;
                    handleSeekTo(parseFloat(e.target.value));
                  }}
                  onTouchEnd={(e) => {
                    isDraggingSeekRef.current = false;
                    handleSeekTo(parseFloat(e.target.value));
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Seek video"
                />
              </div>

              {/* Control Buttons Row */}
              <div className="flex items-center justify-between gap-2 text-white">
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Play / Pause Toggle */}
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="p-1 sm:p-1.5 rounded-lg text-white hover:bg-white/20 transition active:scale-95 cursor-pointer"
                    title={iframePlaying ? 'Pause (Space / K)' : 'Play (Space / K)'}
                  >
                    {iframePlaying ? (
                      <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current translate-x-0.5" />
                    )}
                  </button>

                  {/* Seek -10s */}
                  <button
                    type="button"
                    onClick={() => handleSeekRelative(-10)}
                    className="p-1 sm:p-1.5 rounded-lg text-white hover:bg-white/20 transition active:scale-95 cursor-pointer"
                    title="Back 10s (← / J)"
                  >
                    <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  {/* Seek +10s */}
                  <button
                    type="button"
                    onClick={() => handleSeekRelative(10)}
                    className="p-1 sm:p-1.5 rounded-lg text-white hover:bg-white/20 transition active:scale-95 cursor-pointer"
                    title="Forward 10s (→ / L)"
                  >
                    <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  {/* Volume Control Group */}
                  <div className="flex items-center gap-1 group/vol ml-1">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="p-1 sm:p-1.5 rounded-lg text-white hover:bg-white/20 transition active:scale-95 cursor-pointer"
                      title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-12 sm:w-16 h-1 bg-white/30 rounded-lg accent-white cursor-pointer"
                      aria-label="Volume slider"
                    />
                  </div>

                  {/* Time Display */}
                  <span className="text-[11px] sm:text-xs font-semibold text-zinc-300 select-none tabular-nums ml-1">
                    {formatPlaybackTime(currentTime)}
                    <span className="text-zinc-500 mx-1">/</span>
                    {formatPlaybackTime(duration)}
                  </span>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Skip Intro Button (Appears during intro interval) */}
                  {currentTime >= 5 && currentTime <= 85 && (
                    <button
                      type="button"
                      onClick={handleSkipIntro}
                      className="px-2 sm:px-2.5 py-1 rounded-lg bg-white text-black font-extrabold text-[10px] sm:text-[11px] shadow-lg hover:bg-zinc-200 transition active:scale-95 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Skip Intro</span>
                    </button>
                  )}

                  {/* Auto-Switch Server Quick Pill */}
                  {onNextServer && (
                    <button
                      type="button"
                      onClick={onNextServer}
                      className="hidden sm:inline-flex px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] border border-white/20 transition active:scale-95 cursor-pointer"
                    >
                      Next Server
                    </button>
                  )}

                  {/* Fullscreen Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="p-1 sm:p-1.5 rounded-lg text-white hover:bg-white/20 transition active:scale-95 cursor-pointer"
                    title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : hasDirectStream ? (
          <>
            <div ref={artRef} className="w-full h-full" />
          </>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden">
            {poster && (
              <img
                src={poster}
                alt={animeName}
                className="absolute inset-0 w-full h-full object-cover filter brightness-[0.25] blur-sm scale-105"
              />
            )}
            <div className="relative z-10 text-center space-y-3 px-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
              </div>
              <p className="text-sm font-bold text-zinc-200">
                Loading stream source for {episodeTitle}...
              </p>
              <p className="text-xs text-zinc-500">Select any episode from the list to stream</p>
            </div>
          </div>
        )}

        {/* Universal In-Player Error Recovery Overlay (Both Iframe & Direct Stream) */}
        {playbackError && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40 select-none">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-white">Playback Interrupted</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              {playbackError.message || 'Stream connection stalled or network disconnected.'} You were watching at{' '}
              <span className="text-white font-bold">
                {formatPlaybackTime(playbackError.time)}
              </span>
              .
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => {
                  if (hasIframe) {
                    handleIframeReconnect(playbackError.time);
                  } else {
                    handleReconnect(playbackError.time);
                  }
                }}
                disabled={isReconnecting}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs transition shadow-lg flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {isReconnecting
                    ? 'Reconnecting...'
                    : `Reconnect & Resume at ${formatPlaybackTime(playbackError.time)}`}
                </span>
              </button>
              {(onNextServer || onFallbackToIframe) && (
                <button
                  type="button"
                  onClick={() => {
                    const t = playbackError.time;
                    setPlaybackError(null);
                    if (hasIframe && onNextServer) {
                      onNextServer(t);
                    } else if (onFallbackToIframe) {
                      onFallbackToIframe();
                    } else if (onNextServer) {
                      onNextServer(t);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition border border-zinc-700 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Switch to Mirror Server</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stream & Caption Input Bar */}
      <form
        onSubmit={handleCustomLoad}
        className="flex flex-wrap items-center gap-2 p-3 bg-[#0e0e0e] border-t border-zinc-800"
      >
        <input
          type="text"
          value={streamInput}
          onChange={(e) => setStreamInput(e.target.value)}
          placeholder="Paste custom .m3u8 stream or MP4 URL..."
          className="flex-1 min-w-[180px] bg-[#141414] border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        <input
          type="text"
          value={captionInput}
          onChange={(e) => setCaptionInput(e.target.value)}
          placeholder="Optional: Subtitle .vtt URL..."
          className="flex-1 min-w-[150px] bg-[#141414] border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        <button
          type="submit"
          className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-extrabold text-xs transition duration-200 shadow-md shadow-white/5 cursor-pointer"
        >
          Load Stream
        </button>
      </form>
    </div>
  );
}
