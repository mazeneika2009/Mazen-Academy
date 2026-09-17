import { useState } from 'react';
import { courseThumbnail, courseInstructor, instructorInitials, courseTrailerUrl } from '../../config/brand';

// Course overview — calm editorial split, no iconography.
export function CourseHero({ garden, seeds = [], lang }) {
  const [showTrailer, setShowTrailer] = useState(false);
  if (!garden) return null;

  const title = lang === 'ar' ? garden.titleAr : lang === 'tr' ? garden.titleTr : garden.titleEn;
  const description = lang === 'ar' ? garden.descriptionAr : lang === 'tr' ? garden.descriptionTr : garden.descriptionEn;
  const instructor = courseInstructor(garden, lang);
  const trailer = courseTrailerUrl(garden, seeds);
  const isEmbed = typeof trailer === 'string' && trailer.includes('/embed/');
  const thumb = courseThumbnail(garden);
  const watchLabel = lang === 'ar' ? 'شاهد المقدمة' : lang === 'tr' ? 'Tanıtımı izle' : 'Watch trailer';

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.05)' }}>
      <div className="grid grid-cols-1 md:grid-cols-5">
        {/* Cover / trailer player */}
        <div className="md:col-span-3 relative aspect-video md:aspect-auto md:min-h-[300px] bg-slate-100">
          {showTrailer && trailer ? (
            isEmbed ? (
              <iframe
                src={trailer}
                title={`${title} trailer`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <video src={trailer} controls playsInline preload="metadata" className="absolute inset-0 w-full h-full" />
            )
          ) : (
            <>
              <img
                src={thumb}
                alt={title}
                loading="eager"
                decoding="async"
                sizes="(max-width: 768px) 100vw, 60vw"
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0) 50%, rgba(15,23,42,0.32) 100%)' }} />
              {trailer && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="absolute bottom-3.5 left-3.5 px-3.5 py-2 rounded-md bg-white border border-slate-200 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {watchLabel}
                </button>
              )}
              <span className="absolute top-3.5 left-3.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[11px] font-medium">
                {garden.category}
              </span>
            </>
          )}
        </div>

        {/* Meta */}
        <div className="md:col-span-2 p-6 flex flex-col gap-4">
          <div>
            <p className="eyebrow">{lang === 'ar' ? 'نظرة على الدورة' : lang === 'tr' ? 'Kursa bakış' : 'Course overview'}</p>
            <h2 className="text-[20px] font-bold text-slate-900 font-headline leading-snug mt-2">{title}</h2>
            <p className="text-[13px] text-slate-500 leading-relaxed mt-2 line-clamp-4">{description}</p>
          </div>

          <div className="flex items-center gap-2.5">
            {instructor.avatar ? (
              <img src={instructor.avatar} alt={instructor.name} loading="lazy" className="w-9 h-9 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
            ) : (
              <span className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[12px] font-bold flex items-center justify-center">
                {instructorInitials(instructor.name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-800 truncate">{instructor.name}</p>
              <p className="text-[12px] text-slate-500 truncate mt-0.5">{instructor.title}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-600">
            {garden.rating && (
              <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
                {garden.rating} / 5
              </span>
            )}
            <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200">
              {seeds.length} {lang === 'ar' ? 'درس' : lang === 'tr' ? 'ders' : 'lessons'}
            </span>
            {seeds[0]?.duration && (
              <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200">
                {lang === 'ar' ? 'يبدأ بـ ' : lang === 'tr' ? 'Başlangıç ' : 'Starts '}{seeds[0].duration}
              </span>
            )}
          </div>

          {trailer && !showTrailer && (
            <button
              onClick={() => setShowTrailer(true)}
              className="btn-primary mt-1 text-center"
            >
              {watchLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
