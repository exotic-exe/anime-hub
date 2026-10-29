import React, { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import { isSafeUrl } from '../utils/sanitize';

const DEFAULT_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
const DEFAULT_SUBTITLE = '/subtitles/demo.vtt';

export default function VideoPlayer({
  url = '',
  iframe = '',
  streamHeaders = null,
  poster = '',
  subtitleUrl = DEFAULT_SUBTITLE,
  autoplay = true,
  autoskip = false,
  animeName = 'Anime Stream',
  episodeTitle = 'Episode 1',
  onEnded = () => {},
}) {
  // Iframe fallback only when caller gave an embed and no direct stream url
  const useIframe = Boolean(iframe) && !url && isSafeUrl(iframe);
  const artRef = useRef(null);
  const instanceRef = useRef(null);
  const hlsRef = useRef(null);
  const [streamInput, setStreamInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [activeUrl, setActiveUrl] = useState(url);
  const [activeSub, setActiveSub] = useState(subtitleUrl);
  const [ccStatus, setCcStatus] = useState('ON');

  useEffect(() => {
    setActiveUrl(url || DEFAULT_STREAM);
  }, [url]);

  useEffect(() => {
    if (!artRef.current) return;

    // Teardown any prior instance before creating new one
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

    // oni-chan embed: no direct stream, render provider iframe instead of Artplayer
    if (useIframe) return;

    const art = new Artplayer({
      container: artRef.current,
      url: activeUrl || DEFAULT_STREAM,
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
      theme: '#ffffff', // Clean white highlight for pure black theme
      moreVideoAttr: {
        crossOrigin: 'anonymous',
      },
      subtitle: {
        url: activeSub || DEFAULT_SUBTITLE,
        type: 'vtt',
        style: {
          color: '#ffffff',
          fontSize: '22px',
          textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 2px #000',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: '700',
        },
        encoding: 'utf-8',
      },
      controls: [
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
      ],
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
              lowLatencyMode: true,
              // forward provider stream headers (e.g. Referer) on segment requests
              xhrSetup: streamHeaders
                ? (xhr) => {
                    Object.entries(streamHeaders).forEach(([k, v]) => xhr.setRequestHeader(k, v));
                  }
                : undefined,
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
      if (autoskip && art.video && art.video.currentTime < 85) {
        art.video.currentTime = 85;
        art.notice.show = 'Intro skipped automatically';
      }
    });

    art.on('video:ended', () => {
      if (onEnded) onEnded();
    });

    // Skip Intro layer
    art.layers.add({
      name: 'skip-intro',
      html: '<button style="background: #ffffff; color: #000000; border: 1px solid #ffffff; padding: 8px 16px; border-radius: 6px; font-weight: 800; cursor: pointer; display: none; font-size: 13px; box-shadow: 0 4px 16px rgba(0,0,0,0.8);">Skip Intro (85s)</button>',
      style: { position: 'absolute', bottom: '80px', right: '20px' },
      click: function () {
        if (art.video) art.video.currentTime = 90;
        this.style.display = 'none';
        art.notice.show = 'Intro skipped';
      },
    });

    // Skip Outro layer
    art.layers.add({
      name: 'skip-outro',
      html: '<button style="background: #ffffff; color: #000000; border: 1px solid #ffffff; padding: 8px 16px; border-radius: 6px; font-weight: 800; cursor: pointer; display: none; font-size: 13px; box-shadow: 0 4px 16px rgba(0,0,0,0.8);">Skip Outro</button>',
      style: { position: 'absolute', bottom: '80px', right: '20px' },
      click: function () {
        if (onEnded) onEnded();
        art.notice.show = 'Skipping to next...';
      },
    });

    art.on('video:timeupdate', () => {
      if (!art.video) return;
      const current = art.video.currentTime;
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
      // 1. Destroy HLS instance and cancel buffer downloading
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch (e) {
          console.error('Error destroying HLS:', e);
        }
        hlsRef.current = null;
      }

      // 2. Pause and reset any video elements in container
      if (artRef.current) {
        try {
          const videos = artRef.current.querySelectorAll('video');
          videos.forEach((vid) => {
            vid.pause();
            vid.removeAttribute('src');
            vid.load();
          });
        } catch (e) {}
      }

      // 3. Destroy Artplayer completely
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
        } catch (e) {
          console.error('Error destroying Artplayer:', e);
        }
        instanceRef.current = null;
      }

      // 4. Wipe DOM container
      if (artRef.current) {
        artRef.current.innerHTML = '';
      }
    };
  }, [activeUrl, activeSub, poster, useIframe]);

  const handleCustomLoad = (e) => {
    e.preventDefault();
    if (streamInput.trim()) {
      if (isSafeUrl(streamInput.trim())) {
        setActiveUrl(streamInput.trim());
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
      <div className="flex items-center justify-between px-4 py-3 bg-[#0e0e0e] border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 text-zinc-200 font-bold tracking-wider border border-zinc-700">
            <img src="/logo.jpg" alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
            EXOTICHUB
          </span>
          <span className="text-zinc-300 font-semibold truncate max-w-[280px] sm:max-w-[500px]">
            {animeName} — {episodeTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-200 font-semibold border border-zinc-700">
            CC: {ccStatus}
          </span>
        </div>
      </div>

      {/* Screen Container */}
      <div className="relative w-full aspect-video bg-black">
        {useIframe ? (
          <iframe
            src={iframe}
            title={`${animeName} — ${episodeTitle}`}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="origin"
          />
        ) : (
          <div ref={artRef} className="w-full h-full" />
        )}
      </div>

      {/* Stream & Caption Input Bar */}
      <form onSubmit={handleCustomLoad} className="flex flex-wrap items-center gap-2 p-3 bg-[#0e0e0e] border-t border-zinc-800">
        <input
          type="text"
          value={streamInput}
          onChange={(e) => setStreamInput(e.target.value)}
          placeholder="Paste .m3u8 stream or MP4 URL..."
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
          Load Stream &amp; CC
        </button>
      </form>
    </div>
  );
}
