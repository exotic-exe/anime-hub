import React, { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

const DEFAULT_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
const DEFAULT_SUBTITLE = '/subtitles/demo.vtt';

export default function VideoPlayer({
  url = DEFAULT_STREAM,
  poster = '',
  subtitleUrl = DEFAULT_SUBTITLE,
  autoplay = true,
  autoskip = false,
  animeName = 'Anime Stream',
  episodeTitle = 'Episode 1',
  onEnded = () => {},
}) {
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
      theme: '#0284c7', // Dark Electric Blue
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
          html: '<span style="font-size:12px; font-weight:bold; background:rgba(2,132,199,0.25); padding:3px 8px; border-radius:4px; color:#38bdf8;">CC</span>',
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
      html: '<button style="background: #0284c7; color: #fff; border: 1px solid #38bdf8; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; display: none; font-size: 13px; box-shadow: 0 4px 12px rgba(2,132,199,0.4);">Skip Intro (85s)</button>',
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
      html: '<button style="background: #0284c7; color: #fff; border: 1px solid #38bdf8; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; display: none; font-size: 13px; box-shadow: 0 4px 12px rgba(2,132,199,0.4);">Skip Outro</button>',
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
  }, [activeUrl, activeSub, poster]);

  const handleCustomLoad = (e) => {
    e.preventDefault();
    if (streamInput.trim()) {
      setActiveUrl(streamInput.trim());
    }
    if (captionInput.trim()) {
      setActiveSub(captionInput.trim());
    }
  };

  return (
    <div className="w-full bg-[#050814] border border-[#1e293b] rounded-2xl overflow-hidden shadow-2xl">
      {/* Player Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#070c1a] border-b border-[#1e293b] text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0284c7]/20 text-[#38bdf8] font-bold tracking-wider border border-[#0284c7]/30">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse"></span>
            EXOTICHUB
          </span>
          <span className="text-gray-200 font-semibold truncate max-w-[280px] sm:max-w-[500px]">
            {animeName} — {episodeTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0284c7]/20 text-[#38bdf8] font-semibold border border-[#0284c7]/30">
            CC: {ccStatus}
          </span>
        </div>
      </div>

      {/* Screen Container */}
      <div className="relative w-full aspect-video bg-black">
        <div ref={artRef} className="w-full h-full" />
      </div>

      {/* Stream & Caption Input Bar */}
      <form onSubmit={handleCustomLoad} className="flex flex-wrap items-center gap-2 p-3 bg-[#070c1a]/60 border-t border-[#1e293b]">
        <input
          type="text"
          value={streamInput}
          onChange={(e) => setStreamInput(e.target.value)}
          placeholder="Paste .m3u8 stream or MP4 URL..."
          className="flex-1 min-w-[180px] bg-[#0a101f] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38bdf8]"
        />
        <input
          type="text"
          value={captionInput}
          onChange={(e) => setCaptionInput(e.target.value)}
          placeholder="Optional: Subtitle .vtt URL..."
          className="flex-1 min-w-[150px] bg-[#0a101f] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38bdf8]"
        />
        <button
          type="submit"
          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] hover:from-[#0369a1] hover:to-[#0284c7] text-white font-bold text-xs transition duration-200 shadow-md shadow-[#0284c7]/30"
        >
          Load Stream &amp; CC
        </button>
      </form>
    </div>
  );
}
