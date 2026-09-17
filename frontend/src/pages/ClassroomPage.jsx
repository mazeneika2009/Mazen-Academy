import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { localization } from '../types';
import { SecureVideoPlayer } from '../components/classroom/WatermarkPlayer';
import { CourseHero } from '../components/classroom/CourseHero';
import { QueriesTab } from '../components/classroom/QueriesTab';
import { DigitalNotebook } from '../components/classroom/DigitalNotebook';
import { QuizReview } from '../components/classroom/QuizReview';
import { getTagStyles } from '../App';
import { parseDurationToSeconds, getSeedDifficulty } from '../utils/seedHelpers';
import { motion } from 'motion/react';

function SelectDropdown({ options, value, onChange, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = options.find(o => o.value === value) || options[0];
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className={`relative ${className || ''}`} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-gray-100 text-[10px] text-gray-900 border border-slate-200 py-1.5 px-2 rounded-md outline-none focus:border-blue-400 cursor-pointer font-mono text-left flex items-center justify-between gap-1"
      >
        <span className="truncate">{current.label}</span>
        <span className={`text-gray-500 shrink-0 text-[10px] transition-transform duration-200 ${open ? 'rotate-180 inline-block' : 'inline-block'}`}>▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md py-1 shadow-sm z-50 max-h-48 overflow-y-auto">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 text-[10px] font-mono hover:bg-blue-50 transition-colors cursor-pointer ${o.value === value ? 'text-blue-700 font-bold' : 'text-gray-500'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClassroomPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { user: currentUser, sessionId } = useAuthContext();
  const { lang } = useAppContext();
  const {
    selectedGarden, gardenSeeds, activeSeed, setActiveSeed,
    gardenProgress, setGardenProgress,
    seekToTime, setSeekToTime, resolvedVideoUrl, videoResolving,
    bloomedSeedIds, otpCodeInput, setOtpCodeInput,
    reportError, reportSuccess, isOtpRequesting, isOtpVerifying,
    handleGardenAccess, handleMarkComplete, handleDirectComplete,
    handleNextSeed, handlePreviousSeed, selectActiveSeed, activeSeedIndex,
    handleRequestReportOtp, handleVerifyReportOtp, handleViewDispatchedReport,
    fetchGardenProgress,
    sidebarTab, setSidebarTab, quizForceOpen, setQuizForceOpen,
    sidebarSort, setSidebarSort, difficultyFilter, setDifficultyFilter,
    durationFilter, setDurationFilter, tagFilter, setTagFilter,
    uniqueTags, processedSeeds,
  } = useOutletContext();

  const [currentVideoTime, setCurrentVideoTime] = useState(0);

  const t = localization[lang];

  if (!selectedGarden) {
    return (
      <div className="text-center py-20">
        <p className="text-sm font-bold text-slate-500 mb-2">{t.classroom_path || 'Classroom'}</p>
        <p className="text-slate-500 text-sm font-mono">{t.browse_gardens || 'Browse courses'}</p>
        <button
          onClick={() => navigate('/gardens')}
          className="mt-4 px-6 py-2 text-white font-bold text-xs rounded-md transition-colors cursor-pointer"
          style={{ backgroundColor: '#2563eb' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563eb'}
        >
          {t.browse_gardens}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      <div className="lg:col-span-2 space-y-6">

        <CourseHero garden={selectedGarden} seeds={gardenSeeds} lang={lang} />

        <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-md border border-slate-200 text-xs flex-wrap">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100">
            <span className="text-blue-700 font-bold uppercase tracking-widest text-[10px]">{t.classroom_path}</span>
          </div>
          <span className="text-slate-300 shrink-0">/</span>
          <span className="text-slate-900 font-semibold truncate">{lang === 'ar' ? selectedGarden.titleAr : lang === 'tr' ? selectedGarden.titleTr : selectedGarden.titleEn}</span>
          {activeSeed && (
            <>
              <span className="text-slate-300 shrink-0">/</span>
              <span className={`font-mono truncate ${gardenProgress?.seedProgressDetails?.find(d => d.seedId === activeSeed.id)?.isCompleted ? 'text-emerald-600' : 'text-blue-700'}`}>
                {lang === 'ar' ? activeSeed.titleAr : lang === 'tr' ? activeSeed.titleTr : activeSeed.titleEn}
              </span>
              {gardenProgress?.seedProgressDetails?.find(d => d.seedId === activeSeed.id)?.isCompleted && (
                <span className="text-[10px] font-bold text-emerald-600 shrink-0">{t.completed}</span>
              )}
            </>
          )}
        </div>

        {activeSeed && (
          <div className="glass-panel rounded-lg border border-slate-100 p-5 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-bold text-gray-900 truncate">
                    {lang === 'ar' ? activeSeed.titleAr : lang === 'tr' ? activeSeed.titleTr : activeSeed.titleEn}
                  </h3>
                  {gardenProgress?.seedProgressDetails?.find(d => d.seedId === activeSeed.id)?.isCompleted && (
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {t.completed}
                    </span>
                  )}
                </div>
                {activeSeed.descriptionEn && (
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {lang === 'ar' ? activeSeed.descriptionAr : lang === 'tr' ? activeSeed.descriptionTr : activeSeed.descriptionEn}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-[10px] text-gray-500 font-mono">
                    {activeSeed.duration}
                  </span>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md ${
                    (() => {
                      const diff = getSeedDifficulty(activeSeed);
                      return diff === 'Beginner' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : diff === 'Intermediate' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-red-50 text-red-600 border border-red-200';
                    })()
                  }`}>
                    {(function() {
                      const diff = getSeedDifficulty(activeSeed);
                      return diff === 'Beginner' ? t.beginner : diff === 'Intermediate' ? t.intermediate : t.difficult;
                    })()}
                  </span>
                  {activeSeed.tags && activeSeed.tags.length > 0 && activeSeed.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-md text-[8px] font-mono border uppercase tracking-wider ${getTagStyles(tag)}`}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold font-mono text-gray-900">{activeSeedIndex + 1}</span>
                  <span className="text-[9px] text-gray-500 font-mono uppercase">{t.of} {processedSeeds.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSeed && videoResolving && !resolvedVideoUrl && !activeSeed.videoUrl?.startsWith('bunny_mock') && activeSeed.videoUrl ? (
          <div className="glass-panel rounded-lg border border-slate-200 p-12 flex flex-col items-center gap-4 bg-white shadow-sm">
            <p className="text-slate-500 text-sm font-mono">...</p>
            <p className="text-slate-500 text-sm">Loading video...</p>
          </div>
        ) : null}
        {activeSeed && (
          <SecureVideoPlayer
            key={activeSeed.id}
            seedId={activeSeed.id}
            videoUrl={resolvedVideoUrl || activeSeed.videoUrl}
            studentEmail={currentUser?.email || ''}
            studentPhone={currentUser?.phone || ''}
            sessionId={sessionId}
            lang={lang}
            onProgressSaved={() => selectedGarden && fetchGardenProgress(selectedGarden.id)}
            onTimeUpdate={(time) => setCurrentVideoTime(time)}
            seekToTime={seekToTime}
            onSeekCompleted={() => setSeekToTime(null)}
            onQuizComplete={handleNextSeed}
            onComplete={handleMarkComplete}
          />
        )}

        {processedSeeds.length > 1 && (
          <div className="flex justify-between items-center gap-4 mt-4">
            <button
              onClick={handlePreviousSeed}
              disabled={activeSeedIndex <= 0}
              className="px-5 py-2.5 rounded-md bg-white border border-slate-200 text-blue-700 hover:border-blue-300 transition-all duration-200 cursor-pointer text-xs font-mono font-bold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span>{t.previous_seed}</span>
            </button>

            <div className="flex items-center gap-1.5">
              {processedSeeds.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => selectActiveSeed(s)}
                  className={`h-2 rounded-md transition-all duration-200 cursor-pointer ${
                    i === activeSeedIndex
                      ? 'bg-blue-600 w-5'
                      : gardenProgress?.seedProgressDetails?.find(d => d.seedId === s.id)?.isCompleted
                        ? 'bg-emerald-500 w-2'
                        : 'bg-slate-200 hover:bg-blue-300 w-2'
                  }`}
                  style={i === activeSeedIndex ? { backgroundColor: '#2563eb' } : undefined}
                />
              ))}
            </div>

            <button
              onClick={handleNextSeed}
              disabled={activeSeedIndex >= processedSeeds.length - 1}
              className="px-5 py-2.5 rounded-md bg-white border border-slate-200 text-blue-700 hover:border-blue-300 transition-all duration-200 cursor-pointer text-xs font-mono font-bold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span>{t.next_seed}</span>
            </button>
          </div>
        )}


        {activeSeed && (
          <QueriesTab
            seedId={activeSeed.id}
            sessionId={sessionId}
            lang={lang}
          />
        )}
      </div>

      <div className="space-y-6">
        <div className="glass-panel p-4 rounded-lg border border-slate-100 bg-white shadow-sm animate-fade-in">
          <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-md border border-slate-100">
            {[
              { key: 'seeds', label: t.classroom_seeds },
              { key: 'notebook', label: t.notebook_title },
              { key: 'quiz', label: t.quiz_short },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSidebarTab(key)}
                className={`flex-1 py-2 text-[10px] uppercase font-mono tracking-wider font-extrabold flex items-center justify-center gap-1.5 rounded-md transition-all duration-200 cursor-pointer ${
                  sidebarTab === key
                    ? 'bg-blue-50 text-blue-700 border border-slate-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{label}</span>
              </button>
            ))}
          </div>

          {sidebarTab === 'seeds' ? (
            <div className="space-y-3">
              {gardenSeeds.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <p className="text-sm font-bold text-slate-500 mb-1">{t.classroom_seeds}</p>
                  <p className="text-xs text-slate-500 font-mono">{t.no_garden_seeds}</p>
                </div>
              ) : (<>
              {(sidebarSort !== 'index' || difficultyFilter !== 'all' || durationFilter !== 'all' || tagFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSidebarSort('index');
                    setDifficultyFilter('all');
                    setDurationFilter('all');
                    setTagFilter('all');
                  }}
                  className="w-full text-[9px] text-blue-700 hover:text-blue-800 underline cursor-pointer text-center py-1"
                >
                  {t.reset} filters
                </button>
              )}

              <div className="grid grid-cols-4 gap-1.5">
                <SelectDropdown
                  options={[
                    { value: 'index', label: t.default_order },
                    { value: 'difficulty-asc', label: t.difficulty_low_high },
                    { value: 'difficulty-desc', label: t.difficulty_high_low },
                    { value: 'duration-asc', label: t.duration_short_long },
                    { value: 'duration-desc', label: t.duration_long_short },
                    { value: 'tag-count-desc', label: t.skill_tag_count },
                  ]}
                  value={sidebarSort}
                  onChange={setSidebarSort}
                />
                <SelectDropdown
                  options={[
                    { value: 'all', label: t.difficulty },
                    { value: 'Beginner', label: t.beginner },
                    { value: 'Intermediate', label: t.intermediate },
                    { value: 'Advanced', label: t.advanced },
                  ]}
                  value={difficultyFilter}
                  onChange={setDifficultyFilter}
                />
                <SelectDropdown
                  options={[
                    { value: 'all', label: t.duration },
                    { value: 'short', label: t.short_duration },
                    { value: 'medium', label: t.medium_duration },
                    { value: 'long', label: t.long_duration },
                  ]}
                  value={durationFilter}
                  onChange={setDurationFilter}
                />
                <SelectDropdown
                  options={[
                    { value: 'all', label: t.skill_tag },
                    ...uniqueTags.map(tag => ({ value: tag, label: tag })),
                  ]}
                  value={tagFilter}
                  onChange={setTagFilter}
                />
              </div>

              {processedSeeds.length === 0 ? (
                <div className="text-center py-6 px-4 bg-gray-50 border border-slate-100 rounded-md">
                  <p className="text-[11px] font-bold text-slate-500 mb-1">{t.filter || 'Filter'}</p>
                  <p className="text-xs text-gray-700 font-bold mb-0.5">
                    {t.no_matching_seeds}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {t.adjust_filters}
                  </p>
                </div>
              ) : (
                (() => {
                  const grouped = {};
                  let globalIdx = 0;
                  processedSeeds.forEach(seed => {
                    const sec = gardenSeeds.find(s => s.id === seed.id)?.section || 'General';
                    if (!grouped[sec]) grouped[sec] = { seeds: [], globalStart: globalIdx };
                    grouped[sec].seeds.push(seed);
                    globalIdx++;
                  });
                  return Object.entries(grouped).flatMap(([secName, { seeds: secSeeds, globalStart }]) => {
                    const items = [];
                    items.push(
                      <div key={`section-${secName}`} className="text-[9px] text-slate-400 font-mono uppercase tracking-wider px-1 py-2 border-b border-slate-200 mb-1">
                        {secName}
                      </div>
                    );
                    secSeeds.forEach((seed, localIdx) => {
                      const originalIndex = gardenSeeds.findIndex(s => s.id === seed.id);
                      const isActive = activeSeed?.id === seed.id;
                      const isCompleted = gardenProgress?.seedProgressDetails?.find((d) => d.seedId === seed.id)?.isCompleted || false;
                      const isBlooming = bloomedSeedIds.has(seed.id);
                      const durationSecs = parseDurationToSeconds(seed.duration);
                      const difficulty = getSeedDifficulty(seed);
                      items.push(
                        <motion.button
                          key={seed.id}
                          id={`seed-card-${seed.id}`}
                          onClick={() => selectActiveSeed(seed)}
                          animate={{
                            scale: isBlooming ? [1, 1.03, 1] : 1,
                          }}
                          transition={isBlooming ? { duration: 0.6, ease: "easeInOut" } : { duration: 0.2 }}
                          className={`flex items-center gap-3 w-full p-3 rounded-md text-left border cursor-pointer relative overflow-hidden focus:outline-none transition-all duration-300 ${
                            isActive
                              ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-200 shadow-sm'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-transparent hover:border-slate-200'
                          } ${isCompleted ? 'opacity-80' : ''}`}
                        >
                          <div className={`shrink-0 w-8 h-8 rounded-md border flex items-center justify-center text-xs font-mono font-bold transition-all ${
                            isCompleted
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                              : isActive
                                ? 'bg-blue-50 border-slate-200 text-blue-700'
                                : 'bg-gray-50 border-gray-200 text-gray-600'
                          }`}>
                            {isCompleted ? t.completed : originalIndex + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-semibold truncate ${isCompleted ? 'text-gray-500' : isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                              {lang === 'ar' ? seed.titleAr : lang === 'tr' ? seed.titleTr : seed.titleEn}
                            </h4>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-gray-500 font-mono">
                                {seed.duration}
                              </span>
                              <span className="text-gray-500 text-[9px]">|</span>
                              <span className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-md ${
                                difficulty === 'Beginner' ? 'bg-emerald-50 text-emerald-600' :
                                difficulty === 'Intermediate' ? 'bg-amber-50 text-amber-600' :
                                'bg-red-50 text-red-600'
                              }`}>
                                {difficulty === 'Beginner' ? t.beginner :
                                 difficulty === 'Intermediate' ? t.intermediate :
                                 t.difficult}
                              </span>
                              {isCompleted && (
                                <span className="text-[9px] text-emerald-600 font-mono font-medium">{t.completed}</span>
                              )}
                            </div>

                            {seed.tags && seed.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {seed.tags.slice(0, 3).map((tag, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className={`px-1.5 py-0.5 rounded-md text-[7px] font-mono border uppercase tracking-wider ${getTagStyles(tag)}`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {seed.tags.length > 3 && (
                                  <span className="text-[7px] text-gray-500 font-mono">+{seed.tags.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                          {!isCompleted && (
                            <span
                              onClick={(e) => { e.stopPropagation(); handleDirectComplete(seed.id); }}
                              className="shrink-0 px-3 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold transition-all cursor-pointer"
                            >
                              Mark done
                            </span>
                          )}
                        </motion.button>
                      );
                    });
                    return items;
                  });
                })()
              )}
            </>)}
          </div>
          ) : sidebarTab === 'notebook' ? (
            <DigitalNotebook
              seedId={activeSeed?.id || ''}
              studentEmail={currentUser?.email || ''}
              currentVideoTime={currentVideoTime}
              onSeekTo={(time) => setSeekToTime(time)}
              lang={lang}
            />
          ) : sidebarTab === 'quiz' && activeSeed ? (
            <QuizReview
              seedId={activeSeed.id}
              sessionId={sessionId}
              lang={lang}
              isSeedCompleted={gardenProgress?.seedProgressDetails?.find((d) => d.seedId === activeSeed.id)?.isCompleted || false || quizForceOpen}
            />
          ) : null}
        </div>
        <div className="p-5 rounded-lg border border-slate-100 bg-blue-50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div>
                <h4 className="text-xs uppercase font-mono font-bold tracking-widest text-blue-700">
                  {t.student_growth_metrics}
                </h4>
                <p className="text-[8px] text-gray-500 font-mono mt-0.5">{t.progress_tracking}</p>
              </div>
            </div>
            <div className={`text-sm font-mono font-bold px-3 py-1 rounded-md border ${
              (gardenProgress?.completionPercent || 0) >= 100
                ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                : (gardenProgress?.completionPercent || 0) >= 50
                  ? 'text-amber-600 bg-amber-50 border-amber-200'
                  : 'text-blue-700 bg-blue-50 border-slate-200'
            }`}>
              {gardenProgress?.completionPercent || 0}%
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-md h-3 overflow-hidden border border-slate-200 mb-4">
            <div
              className="h-full rounded-md transition-all duration-700 ease-out"
              style={{
                width: `${gardenProgress?.completionPercent || 0}%`,
                backgroundColor: '#2563eb',
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-md bg-white border border-slate-200 flex flex-col items-center">
              <span className="text-lg font-bold font-mono text-blue-700">{gardenProgress?.completedSeedsCount || 0}</span>
              <span className="text-[8px] text-gray-500 font-mono uppercase tracking-wider mt-1">{t.completed}</span>
            </div>
            <div className="p-3 rounded-md bg-white border border-slate-200 flex flex-col items-center">
              <span className="text-lg font-bold font-mono text-blue-700">{gardenProgress?.totalSeedsCount || gardenSeeds.length}</span>
              <span className="text-[8px] text-gray-500 font-mono uppercase tracking-wider mt-1">{t.total}</span>
            </div>
            <div className="p-3 rounded-md bg-white border border-slate-200 flex flex-col items-center">
              <span className="text-lg font-bold font-mono text-amber-600">{gardenProgress ? gardenProgress.totalSeedsCount - gardenProgress.completedSeedsCount : gardenSeeds.length}</span>
              <span className="text-[8px] text-gray-500 font-mono uppercase tracking-wider mt-1">{t.remaining}</span>
            </div>
          </div>

          <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-4">
            <span>
              {gardenProgress?.completedSeedsCount || 0} / {gardenProgress?.totalSeedsCount || gardenSeeds.length} {t.seeds_bloomed}
            </span>
            <span className={`font-semibold ${(gardenProgress?.completionPercent || 0) >= 100 ? 'text-emerald-600' : 'text-gray-400'}`}>
              {gardenProgress?.completionPercent || 0}%
            </span>
          </div>

          {reportError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-[10px] leading-relaxed text-center font-mono">
              {reportError}
            </div>
          )}
          {reportSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-[10px] leading-relaxed text-center font-mono">
              {reportSuccess}
            </div>
          )}

          <div className="border-t border-slate-200 pt-3 flex flex-col gap-2.5">

            {(gardenProgress?.completionPercent || 0) < 100 && (
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  {t.report_instruction}
                </p>
              </div>
            )}

            {(gardenProgress?.completionPercent || 0) === 100 && !gardenProgress?.isReportIssued && !gardenProgress?.isOtpPending && (
              <div className="space-y-2.5">
                <p className="text-[11px] font-bold text-emerald-600 text-center">
                  {t.garden_complete}
                </p>
                <button
                  onClick={handleRequestReportOtp}
                  disabled={isOtpRequesting}
                  className="w-full py-2.5 text-white text-xs font-bold rounded-md transition-colors cursor-pointer text-center"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  {isOtpRequesting ? '...' : t.request_report}
                </button>
              </div>
            )}

            {gardenProgress?.isOtpPending && (
              <div className="space-y-2.5 bg-amber-50 p-3 rounded-md border border-amber-200">
                <form onSubmit={handleVerifyReportOtp} className="space-y-2">
                  <label className="block text-[10px] text-amber-700 font-mono font-bold uppercase leading-relaxed text-center">
                    {t.report_otp_label}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 123456"
                    maxLength={6}
                    value={otpCodeInput}
                    onChange={(e) => setOtpCodeInput(e.target.value)}
                    className="w-full text-center py-2 bg-white border border-amber-300 text-slate-900 rounded-md text-sm font-mono tracking-widest focus:outline-none focus:border-amber-500 font-bold"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isOtpVerifying}
                    className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-md transition-colors cursor-pointer text-center"
                  >
                    {isOtpVerifying ? '...' : t.verify_certificate}
                  </button>
                </form>
                <p className="text-[9px] text-slate-500 leading-tight text-center leading-relaxed">
                  {t.otp_instruction}
                </p>
              </div>
            )}

            {gardenProgress?.isReportIssued && (
              <div className="space-y-2 text-center bg-emerald-50 p-3 rounded-md border border-emerald-200">
                <p className="text-[11px] font-mono font-bold text-emerald-700">
                  {t.certificate_issued}
                </p>
                <button
                  onClick={handleViewDispatchedReport}
                  className="w-full py-2 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 font-bold text-xs rounded-md transition-all cursor-pointer"
                >
                  {t.view_report}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

    </div>
  );
}
