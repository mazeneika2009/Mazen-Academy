import { memo, useState } from 'react';
import { courseThumbnail, courseInstructor, instructorInitials, coursePrice } from '../../config/brand';

// Quiet, editorial course card — typography first, no iconography.
// Same palette: white surface, slate borders, blue-700 accents.
export const GardenCard = memo(function GardenCard({
  garden, lang, t, currentUser, isCompleted, isEnrolled, isInMyGardens,
  onAccess, onTrailer, stats, borderClass = ''
}) {
  const title = lang === 'ar' ? garden.titleAr : lang === 'tr' ? garden.titleTr : garden.titleEn;
  const description = lang === 'ar' ? garden.descriptionAr : lang === 'tr' ? garden.descriptionTr : garden.descriptionEn;
  const price = coursePrice(garden, lang, t).label;
  const instructor = courseInstructor(garden, lang);

  const [imgSrc, setImgSrc] = useState(() => courseThumbnail(garden));
  const lessonCount = stats?.lessonCount ?? garden.lessonCount ?? null;
  const totalDuration = stats?.totalDuration ?? garden.totalDuration ?? null;

  const handleTrailer = (e) => {
    e.stopPropagation();
    if (onTrailer) onTrailer(garden);
    else if (onAccess) onAccess(garden, { trailer: true });
  };

  return (
    <article
      className={`card-elevated overflow-hidden flex flex-col ${borderClass}`}
    >
      {/* Media: calm 16/10, no harsh frame, soft inner veil */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <img
          src={imgSrc}
          alt={title}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          onError={() => setImgSrc('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop')}
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0) 55%, rgba(15,23,42,0.28) 100%)' }} />

        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-md text-[11px] font-medium">
            {garden.category}
          </span>
          {isEnrolled && (
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-[11px] font-semibold text-blue-700">
              {t.enrolled_badge}
            </span>
          )}
        </div>

        <button
          onClick={handleTrailer}
          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-[12px] font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          {lang === 'ar' ? 'شاهد المقدمة' : lang === 'tr' ? 'Tanıtımı izle' : 'Watch intro'}
        </button>

        {(lessonCount || totalDuration) && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] text-slate-600">
            {lessonCount ? (
              <span className="px-2 py-0.5 rounded-md bg-white/95 border border-slate-200">
                {lessonCount} {lang === 'ar' ? 'درس' : lang === 'tr' ? 'ders' : 'lessons'}
              </span>
            ) : null}
            {totalDuration ? (
              <span className="px-2 py-0.5 rounded-md bg-white/95 border border-slate-200">
                {totalDuration}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Body: measured rhythm, left-aligned */}
      <div className="p-5 flex-1 flex flex-col">
        <h4 className="text-[15px] font-bold text-slate-900 leading-snug font-headline line-clamp-2">
          {title}
        </h4>
        <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
          {description}
        </p>

        {/* Instructor row — initials only, no icon */}
        <div className="flex items-center gap-2.5 mt-4">
          {instructor.avatar ? (
            <img
              src={instructor.avatar}
              alt={instructor.name}
              loading="lazy"
              decoding="async"
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center">
              {instructorInitials(instructor.name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{instructor.name}</p>
            <p className="text-[12px] text-slate-500 truncate leading-tight mt-0.5">{instructor.title}</p>
          </div>
          {garden.rating && (
            <span className="ml-auto text-[12px] text-slate-500 shrink-0">
              {garden.rating} / 5
            </span>
          )}
        </div>

        {/* Footer: price + text CTA */}
        <div className="mt-4 border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
          <div className="text-[13px] font-bold text-slate-900">{price}</div>
          {isInMyGardens ? (
            isCompleted ? (
              <span className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-semibold rounded-md">
                {t.completed}
              </span>
            ) : (
              <button
                onClick={() => onAccess(garden)}
                className="btn-primary !py-1.5 !text-[12px]"
              >
                {t.open_garden}
              </button>
            )
          ) : (
            isEnrolled ? (
              isCompleted ? (
                <span className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-semibold rounded-md">
                  {t.completed}
                </span>
              ) : (
                <button
                  onClick={() => onAccess(garden)}
                  className="btn-primary !py-1.5 !text-[12px]"
                >
                  {t.open_garden}
                </button>
              )
            ) : currentUser?.pendingGardens?.includes(garden.id) ? (
              <span className="px-3.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 font-semibold text-[12px] rounded-md">
                {t.pending_approval}
              </span>
            ) : (
              <button
                onClick={() => onAccess(garden)}
                className="btn-primary !py-1.5 !text-[12px]"
              >
                {t.plant_skill}
              </button>
            )
          )}
        </div>
      </div>
    </article>
  );
});
