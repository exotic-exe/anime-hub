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

    if (instanceRef.current && typeof instanceRef.current.destroy === 'function') {
      instanceRef.current.destroy(false);
      instanceRef.current = null;
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
      theme: '#cae962', // oni-chan's lime theme
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
          html: '<span style="font-size:12px; font-weight:bold; background:rgba(202,233,98,0.2); padding:3px 6px; border-radius:4px; color:#cae962;">💬 CC</span>',
          tooltip: 'Toggle Captions (Subtitles)',
          click: function () {
            art.subtitle.show = !art.subtitle.show;
            art.notice.show = art.subtitle.show ? 'Captions: ON' : 'Captions: OFF';
            setCcStatus(art.subtitle.show ? 'ON' : 'OFF');
          },
        },
      ],
      customType: {
        m3u8: function (video, m3u8Url) {
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(m3u8Url);
            hls.attachMedia(video);
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
      if (autoskip && art.video.currentTime < 85) {
        art.video.currentTime = 85;
        art.notice.show = 'Intro skipped automatically';
      }
    });

    art.on('video:ended', () => {
      if (onEnded) onEnded();
    });

    // Skip Intro layer from oni-chan
    art.layers.add({
      name: 'skip-intro',
      html: '<button style="background: rgba(202,233,98,0.95); color: #000; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; display: none; font-size: 13px;">Skip Intro (85s)</button>',
      style: { position: 'absolute', bottom: '80px', right: '20px' },
      click: function () {
        art.video.currentTime = 90;
        this.style.display = 'none';
        art.notice.show = 'Intro skipped';
      },
    });

    // Skip Outro layer from oni-chan
    art.layers.add({
      name: 'skip-outro',
      html: '<button style="background: rgba(202,233,98,0.95); color: #000; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; display: none; font-size: 13px;">Skip Outro</button>',
      style: { position: 'absolute', bottom: '80px', right: '20px' },
      click: function () {
        if (onEnded) onEnded();
        art.notice.show = 'Skipping to next...';
      },
    });

    art.on('video:timeupdate', () => {
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
      if (art && typeof art.destroy === 'function') {
        art.destroy(false);
      }
      instanceRef.current = null;
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
    <div className="w-full bg-[#08090e] border border-[#1f2437] rounded-2xl overflow-hidden shadow-2xl">
      {/* Player Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-[#1f2437] text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#cae962]/15 text-[#cae962] font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#cae962] animate-pulse"></span>
            STREAM
          </span>
          <span className="text-gray-300 font-semibold truncate max-w-[280px] sm:max-w-[500px]">
            {animeName} — {episodeTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#00cec9]/15 text-[#00cec9] font-semibold">
            💬 CC: {ccStatus}
          </span>
        </div>
      </div>

      {/* Screen Container */}
      <div className="relative w-full aspect-video bg-black">
        <div ref={artRef} className="w-full h-full" />
      </div>

      {/* Stream & Caption Input Bar */}
      <form onSubmit={handleCustomLoad} className="flex flex-wrap items-center gap-2 p-3 bg-white/[0.02] border-t border-[#1f2437]">
        <input
          type="text"
          value={streamInput}
          onChange={(e) => setStreamInput(e.target.value)}
          placeholder="Paste .m3u8 stream or MP4 URL..."
          className="flex-1 min-w-[180px] bg-[#161a27] border border-[#1f2437] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#cae962]"
        />
        <input
          type="text"
          value={captionInput}
          onChange={(e) => setCaptionInput(e.target.value)}
          placeholder="Optional: Subtitle .vtt URL..."
          className="flex-1 min-w-[150px] bg-[#161a27] border border-[#1f2437] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#cae962]"
        />
        <button
          type="submit"
          className="px-4 py-1.5 rounded-lg bg-[#cae962] hover:bg-[#b5d64e] text-black font-bold text-xs transition duration-200"
        >
          Load Stream &amp; CC
        </button>
      </form>
    </div>
  );
}
