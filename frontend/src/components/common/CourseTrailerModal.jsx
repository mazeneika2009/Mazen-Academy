import { useEffect } from 'react';
import { courseInstructor } from '../../config/brand';

// Responsive trailer modal: YouTube embed or native <video>.
// Fully driven by props so any course can pass its trailerUrl.
export function CourseTrailerModal({ garden, lang, trailerUrl, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!garden) return null;
  const title = lang === 'ar' ? garden.titleAr : lang === 'tr' ? garden.titleTr : garden.titleEn;
  const instructor = courseInstructor(garden, lang);
  const isEmbed = typeof trailerUrl === 'string' && trailerUrl.includes('/embed/');
  const closeLabel = lang === 'ar' ? 'إغلاق' : lang === 'tr' ? 'Kapat' : 'Close';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-600">Trailer</p>
            <h3 className="text-sm font-bold text-slate-900 truncate">{title}</h3>
            <p className="text-[10px] text-slate-500 font-mono truncate">{instructor.name} — {instructor.title}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close trailer"
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {closeLabel}
          </button>
        </div>

        <div className="relative w-full aspect-video bg-black">
          {trailerUrl ? (
            isEmbed ? (
              <iframe
                src={trailerUrl}
                title={title}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <video
                src={trailerUrl}
                controls
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full"
              />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-mono p-8 text-center">
              No trailer available for this course yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
