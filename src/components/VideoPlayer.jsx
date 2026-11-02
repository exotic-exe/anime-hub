import React, { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import { isSafeUrl } from '../utils/sanitize';
import { AlertCircle, RefreshCw, Server, Zap, CheckCircle2 } from 'lucide-react';

function formatPlaybackTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function VideoPlayer({
  url = '',
  iframe = '',
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
  serverLabel = '',
  autoSwitchNotice = null,
}) {
  const artRef = useRef(null);
  const instanceRef = useRef(null);
  const hlsRef = useRef(null);
  const currentTimeRef = useRef(0);

  const [streamInput, setStreamInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [activeUrl, setActiveUrl] = useState(url);
  const [activeIframe, setActiveIframe] = useState(iframe);
  const [activeSub, setActiveSub] = useState(subtitleUrl);
  const [ccStatus, setCcStatus] = useState('OFF');
  const [playbackError, setPlaybackError] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Sync state when props change
  useEffect(() => {
    setActiveUrl(url);
    setActiveIframe(iframe);
    setPlaybackError(null);
  }, [url, iframe]);

  useEffect(() => {
    setActiveSub(subtitleUrl);
  }, [subtitleUrl]);

  const hasDirectStream = Boolean(activeUrl && isSafeUrl(activeUrl));
  const hasIframe = Boolean(activeIframe && isSafeUrl(activeIframe));

  // Reconnect and resume playback at exact interrupted timestamp
  function handleReconnect(targetTime) {
    const resumeTime = typeof targetTime === 'number' ? targetTime : (playbackError?.time || currentTimeRef.current || 0);
    setIsReconnecting(true);
    setPlaybackError(null);

    // Destroy existing HLS instance
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
        art.switchUrl(activeUrl).then(() => {
          if (art.video && resumeTime > 0) {
            art.video.currentTime = resumeTime;
          }
          art.play().catch(() => {});
          setIsReconnecting(false);
        }).catch((err) => {
          console.warn('SwitchUrl failed, reloading source:', err);
          // Hard reload fallback
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

  useEffect(() => {
    // Teardown prior instance before creating new one
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

            // High-reliability VOD HLS buffer configuration
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: false, // Must be FALSE for VOD anime episodes to avoid segment starvation
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

            // Automatic Error Recovery for Network Glitches and Buffer Stalls
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
        art.notice.show = 'Intro skipped automatically';
      }
    });

    art.on('video:ended', () => {
      if (typeof onEnded === 'function') onEnded();
    });

    // Native Video Error Interception
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
        art.notice.show = 'Intro skipped';
      },
    });

    art.layers.add({
      name: 'skip-outro',
      html: '<button style="background: rgba(255,255,255,0.9); color: #000; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 11px; cursor: pointer; display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">Skip Outro</button>',
      style: { position: 'absolute', bottom: '70px', right: '20px' },
      click: function () {
        if (typeof onEnded === 'function') onEnded();
        art.notice.show = 'Skipping to next episode...';
      },
    });

    art.on('video:timeupdate', () => {
      if (!art.video) return;
      const current = art.video.currentTime;
      currentTimeRef.current = current;
      const duration = art.video.duration;
      const skipIntroBtn = art.layers['skip-intro'];
      const skipOutroBtn = art.layers['skip-outro'];

      if (current > 5 && current < 85) {
        if (skipIntroBtn) skipIntroBtn.style.display = 'block';
      } else {
        if (skipIntroBtn) skipIntroBtn.style.display = 'none';
      }

      if (duration > 100 && current > duration - 90 && current < duration - 10) {
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
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{serverLabel}</span>
            </span>
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
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-[11px] transition active:scale-95 cursor-pointer"
            >
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Auto-Switch</span>
            </button>
          )}

          {activeSub && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-200 font-semibold border border-zinc-700">
              CC: {ccStatus}
            </span>
          )}
        </div>
      </div>

      {/* Screen Container */}
      <div className="relative w-full aspect-video bg-black group">
        {/* Floating Auto-Switch Notice Toast */}
        {autoSwitchNotice && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/90 border border-zinc-700 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{autoSwitchNotice}</span>
          </div>
        )}

        {hasIframe ? (
          <>
            <iframe
              src={activeIframe}
              title={`${animeName} — ${episodeTitle}`}
              className="absolute inset-0 w-full h-full border-0"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="origin"
            />
            {/* Quick Over-Video Actions on Hover for Iframe */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
              {onReloadStream && (
                <button
                  type="button"
                  onClick={onReloadStream}
                  className="px-2.5 py-1 rounded-lg bg-black/85 hover:bg-black text-white text-[11px] font-bold border border-zinc-700 backdrop-blur-md shadow-lg flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reload Stream</span>
                </button>
              )}
              {onNextServer && (
                <button
                  type="button"
                  onClick={onNextServer}
                  className="px-2.5 py-1 rounded-lg bg-black/85 hover:bg-black text-amber-300 text-[11px] font-bold border border-zinc-700 backdrop-blur-md shadow-lg flex items-center gap-1 transition"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Next Server</span>
                </button>
              )}
            </div>
          </>
        ) : hasDirectStream ? (
          <>
            <div ref={artRef} className="w-full h-full" />

            {/* In-Player Error Recovery Overlay */}
            {playbackError && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-white">
                  Playback Interrupted
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  {playbackError.message} You were watching at{' '}
                  <span className="text-white font-bold">{formatPlaybackTime(playbackError.time)}</span>.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
                  <button
                    type="button"
                    onClick={() => handleReconnect(playbackError.time)}
                    disabled={isReconnecting}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs transition shadow-lg flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
                    <span>Reconnect & Resume at {formatPlaybackTime(playbackError.time)}</span>
                  </button>
                  {onFallbackToIframe && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlaybackError(null);
                        onFallbackToIframe();
                      }}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition border border-zinc-700 flex items-center gap-1.5 active:scale-95"
                    >
                      <Server className="w-3.5 h-3.5" />
                      <span>Switch to Backup Player</span>
                    </button>
                  )}
                </div>
              </div>
            )}
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
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              </div>
              <p className="text-sm font-bold text-zinc-200">
                Loading stream source for {episodeTitle}...
              </p>
              <p className="text-xs text-zinc-500">
                Select any episode from the list to stream
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stream & Caption Input Bar */}
      <form onSubmit={handleCustomLoad} className="flex flex-wrap items-center gap-2 p-3 bg-[#0e0e0e] border-t border-zinc-800">
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
          className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-extrabold text-xs transition duration-200 shadow-md shadow-white/5"
        >
          Load Stream
        </button>
      </form>
    </div>
  );
}
