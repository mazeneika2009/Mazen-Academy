import React, { useState, useRef, useEffect, useCallback } from 'react';

function isEmbedUrl(url) {
  if (!url) return false;
  if (url.includes('iframe.mediadelivery.net') || url.includes('/embed/')) return true;
  return false;
}

function isPlayableVideoUrl(url) {
  if (!url || url.startsWith('bunny_mock') || url === '') return false;
  if (isEmbedUrl(url)) return false;
  if (!url.startsWith('http') && !url.startsWith('/uploads/')) return false;
  return true;
}

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${(m % 60).toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function Controls({
  playing, currentTime, duration, volume, muted, fullscreen, playbackRate,
  onTogglePlay, onSeek, onToggleMute, onVolumeChange, onToggleFullscreen,
  onTogglePip, onPlaybackRateChange, showPip, buffered, lang
}) {
  const t = (en, ar, tr) => lang === 'ar' ? ar : lang === 'tr' ? tr : en;
  const progressRef = useRef(null);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPct, setHoverPct] = useState(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const speedMenuRef = useRef(null);

  const handleProgressMove = (e) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPct(pct);
    setHoverTime(pct * duration);
  };
  const handleProgressLeave = () => { setHoverTime(null); setHoverPct(null); };
  const handleProgressClick = (e) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pct * duration);
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = buffered || 0;

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target)) {
        setShowSpeedMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 pt-14 pb-3 px-3 rounded-b-lg" style={{ backgroundColor: 'rgba(15,23,42,0.7)' }}>
      <div
        ref={progressRef}
        className="relative w-full h-6 cursor-pointer group/progress -top-3"
        onMouseMove={handleProgressMove}
        onMouseLeave={handleProgressLeave}
        onClick={handleProgressClick}
      >
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-white/10 rounded-md overflow-hidden transition-all duration-150">
          <div className="absolute inset-0 bg-white/10 rounded-md" style={{ width: `${bufferedPct}%` }} />
          <div className="absolute inset-0 rounded-md transition-all duration-100" style={{ width: `${progressPct}%`, backgroundColor: '#2563eb' }} />
          <div className="absolute top-1/2 -translate-y-1/2 rounded-md bg-white w-3 h-3 opacity-0 group-hover/progress:opacity-100 transition-all duration-150" style={{ left: `${progressPct}%`, marginLeft: '-6px' }} />
        </div>
        {hoverTime != null && (
          <div
            className="absolute -top-8 -translate-x-1/2 text-white text-[11px] font-mono px-2 py-1 rounded-md border border-slate-600 pointer-events-none whitespace-nowrap"
            style={{ left: `${hoverPct * 100}%`, backgroundColor: 'rgba(15,23,42,0.95)' }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 -mt-1">
        <button onClick={onTogglePlay} className="px-3 py-1.5 rounded-md hover:bg-white/10 transition-all cursor-pointer shrink-0 text-[11px] font-bold text-white">
          {playing ? t('Pause', 'إيقاف', 'Duraklat') : t('Play', 'تشغيل', 'Oynat')}
        </button>
        <span className="text-[12px] text-gray-400 font-mono tabular-nums min-w-[90px] shrink-0 select-none">
          {formatTime(currentTime)} <span className="text-gray-600">/</span> {formatTime(duration)}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button onClick={onToggleMute} className="px-2 py-1.5 rounded-md hover:bg-white/10 transition-all cursor-pointer shrink-0 text-[11px] font-bold text-gray-300">
            {muted || volume === 0 ? t('Sound', 'صوت', 'Ses') : t('Mute', 'كتم', 'Sessiz')}
          </button>
          <input
            type="range" min="0" max="1" step="0.05"
            value={muted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1 accent-blue-600 cursor-pointer volume-slider"
          />
        </div>
        <div className="relative" ref={speedMenuRef}>
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="px-2 py-1 rounded-md hover:bg-white/10 transition-all cursor-pointer shrink-0 text-[11px] font-mono text-gray-400 hover:text-white font-medium min-w-[36px]"
          >
            {playbackRate}x
          </button>
          {showSpeedMenu && (
            <div className="absolute bottom-full right-0 mb-2 border border-slate-600 rounded-md py-1.5 shadow-sm min-w-[72px]" style={{ backgroundColor: 'rgba(15,23,42,0.95)' }}>
              {speeds.map(s => (
                <button key={s} onClick={() => { onPlaybackRateChange(s); setShowSpeedMenu(false); }}
                  className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-all cursor-pointer whitespace-nowrap ${playbackRate === s ? 'text-white font-bold' : 'text-gray-400'}`}
                >{s}x</button>
              ))}
            </div>
          )}
        </div>
        {showPip && document.pictureInPictureEnabled && (
          <button onClick={onTogglePip} className="px-2 py-1.5 rounded-md hover:bg-white/10 transition-all cursor-pointer shrink-0 text-[11px] font-bold text-gray-300">
            PiP
          </button>
        )}
        <button onClick={onToggleFullscreen} className="px-2 py-1.5 rounded-md hover:bg-white/10 transition-all cursor-pointer shrink-0 text-[11px] font-bold text-gray-300">
          {fullscreen ? t('Exit', 'خروج', 'Çık') : t('Full', 'ملء', 'Tam')}
        </button>
      </div>
    </div>
  );
}

export function SecureVideoPlayer({
  seedId, videoUrl, studentEmail, studentPhone, sessionId, lang,
  onProgressSaved, onTimeUpdate, seekToTime, onSeekCompleted, onQuizComplete,
  onComplete
}) {
  const t = (en, ar, tr) => lang === 'ar' ? ar : lang === 'tr' ? tr : en;
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [buffered, setBuffered] = useState(0);
  const hideTimer = useRef(null);
  const progressReportedRef = useRef(false);
  const watermarkText = `${studentEmail || 'Student'} • ${sessionId?.slice(0, 8) || 'preview'}`;

  useEffect(() => {
    if (seekToTime != null && videoRef.current) {
      videoRef.current.currentTime = seekToTime;
      onSeekCompleted();
    }
  }, [seekToTime, onSeekCompleted]);

  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target) && e.target !== containerRef.current) return;
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlay(); break;
        case 'ArrowLeft': e.preventDefault(); seekRelative(-10); break;
        case 'ArrowRight': e.preventDefault(); seekRelative(10); break;
        case 'KeyF': e.preventDefault(); toggleFullscreen(); break;
        case 'KeyM': e.preventDefault(); toggleMute(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playing, currentTime, duration, muted]);

  const seekRelative = (delta) => {
    if (!videoRef.current || !duration) return;
    const t = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
    videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const reportProgress = useCallback(() => {
    if (onProgressSaved && !progressReportedRef.current) {
      progressReportedRef.current = true;
      onProgressSaved();
    }
  }, [onProgressSaved]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const t = videoRef.current.currentTime;
      setCurrentTime(t);
      onTimeUpdate(t);
      const v = videoRef.current;
      if (v.buffered?.length > 0 && v.duration) {
        setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
      }
      if (duration > 0 && t / duration > 0.8) {
        reportProgress();
      }
    }
  }, [onTimeUpdate, duration, reportProgress]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setCurrentTime(0);
      progressReportedRef.current = false;
      setCompleted(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => setError(t('Playback blocked', 'تم حظر التشغيل', 'Oynatma engellendi')));
      }
      setPlaying(!playing);
    }
  };

  const handleVideoEnded = useCallback(() => {
    if (!videoRef.current) return;
    const actualTime = videoRef.current.currentTime;
    const actualDuration = videoRef.current.duration;
    setCurrentTime(actualTime);
    setPlaying(false);
    reportProgress();
    if (!completed && actualDuration > 0 && actualTime / actualDuration >= 0.9 && onComplete) {
      setCompleted(true);
      onComplete();
    }
  }, [reportProgress, completed, onComplete]);

  const handleSeek = (time) => {
    if (!videoRef.current || !duration) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    progressReportedRef.current = false;
  };

  const toggleMute = () => {
    setMuted(m => !m);
    if (videoRef.current) videoRef.current.muted = !muted;
  };

  const handleVolumeChange = (v) => {
    setVolume(v);
    if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; setMuted(v === 0); }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
    } else { document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {}); }
  };

  const togglePip = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else { await videoRef.current.requestPictureInPicture(); }
    } catch {}
  };

  const handlePlaybackRateChange = (rate) => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const showControlsBriefly = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (!videoUrl || videoUrl.startsWith('bunny_mock') || videoUrl === '') {
    return (
      <div className="glass-panel rounded-lg border border-slate-200 p-12 flex flex-col items-center gap-4 bg-white shadow-sm">
        <p className="text-sm font-bold text-slate-500">{t('Video', 'فيديو', 'Video')}</p>
        <p className="text-slate-500 text-sm">{t('No video for this lesson yet', 'لا يوجد فيديو لهذا الدرس بعد', 'Bu ders için henüz video yok')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel rounded-lg border border-red-200 p-8 flex flex-col items-center gap-4 bg-white shadow-sm">
        <p className="text-xs font-bold text-red-600 uppercase tracking-wider">{t('Error', 'خطأ', 'Hata')}</p>
        <p className="text-red-600 text-sm">{error}</p>
        {videoUrl && (
          <a href={videoUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-700 hover:text-blue-800 underline mt-2">
            {t('Open in new tab', 'فتح في علامة تبويب جديدة', 'Yeni sekmede aç')}
          </a>
        )}
      </div>
    );
  }

  if (isEmbedUrl(videoUrl)) {
    return (
      <div className="glass-panel rounded-lg border border-slate-200 overflow-hidden relative bg-white shadow-sm">
        <div className="bg-black relative" style={{ padding: '56.25% 0 0 0' }}>
          <iframe
            src={videoUrl}
            className="absolute inset-0 w-full h-full"
            style={{ border: 0 }}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video player"
          />
        </div>
        <div className="absolute top-3 right-3 text-[10px] text-slate-300 px-2 py-0.5 rounded-md font-mono pointer-events-none select-none z-10" style={{ backgroundColor: 'rgba(15,23,42,0.7)' }}>
          {watermarkText}
        </div>
        {onComplete && !completed && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
            <button onClick={() => { setCompleted(true); if (onComplete) onComplete(); }}
              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-all cursor-pointer">
              {t('Mark done', 'تم', 'Tamamla')}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!isPlayableVideoUrl(videoUrl)) {
    return (
      <div className="glass-panel rounded-lg border border-slate-200 p-12 flex flex-col items-center gap-4 bg-white shadow-sm">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('Notice', 'تنبيه', 'Bildirim')}</p>
        <p className="text-slate-500 text-sm">{t('This video can only be opened directly', 'يمكن فتح هذا الفيديو مباشرة فقط', 'Bu video yalnızca doğrudan açılabilir')}</p>
        <a href={videoUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-700 hover:text-blue-800 underline">
          {t('Open video directly', 'فتح الفيديو مباشرة', 'Videoyu doğrudan aç')}
        </a>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="glass-panel rounded-lg border border-slate-200 overflow-hidden relative group select-none bg-black shadow-sm"
      onMouseMove={showControlsBriefly}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="relative">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full aspect-video object-contain bg-black"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleVideoEnded}
          onError={() => setError(t('Failed to load video', 'فشل تحميل الفيديو', 'Video yüklenemedi'))}
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          controls={false}
          playsInline
          preload="metadata"
        />
        {!playing && !error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <button onClick={togglePlay} className="pointer-events-auto px-8 py-3 rounded-md bg-white hover:bg-slate-100 transition-all duration-200 flex items-center justify-center cursor-pointer">
              <span className="text-sm font-bold text-slate-900">{t('Play', 'تشغيل', 'Oynat')}</span>
            </button>
          </div>
        )}
        <div className={`absolute bottom-0 left-0 right-0 transition-all duration-300 z-20 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
          <Controls
            playing={playing}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            muted={muted}
            fullscreen={fullscreen}
            playbackRate={playbackRate}
            onTogglePlay={togglePlay}
            onSeek={handleSeek}
            onToggleMute={toggleMute}
            onVolumeChange={handleVolumeChange}
            onToggleFullscreen={toggleFullscreen}
            onTogglePip={togglePip}
            onPlaybackRateChange={handlePlaybackRateChange}
            showPip={true}
            buffered={buffered}
            lang={lang}
          />
        </div>
        <div className="absolute top-3 right-3 text-[10px] text-slate-300 px-2 py-0.5 rounded-md font-mono pointer-events-none select-none z-10" style={{ backgroundColor: 'rgba(15,23,42,0.7)' }}>
          {watermarkText}
        </div>
        {onComplete && !completed && duration > 0 && (
          <div className="absolute top-3 left-3 z-10">
            <button onClick={() => { setCompleted(true); if (onComplete) onComplete(); }}
              className="px-3 py-1.5 rounded-md text-white text-[11px] font-medium transition-all cursor-pointer border border-slate-600" style={{ backgroundColor: 'rgba(15,23,42,0.7)' }}>
              {t('Mark done', 'تم', 'Tamamla')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
