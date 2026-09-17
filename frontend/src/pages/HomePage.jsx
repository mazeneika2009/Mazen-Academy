import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { localization } from '../types';
import { UserProfile } from '../components/profile/UserProfile';
import { GardenCard } from '../components/common/GardenCard';
import { CourseTrailerModal } from '../components/common/CourseTrailerModal';
import { courseTrailerUrl } from '../config/brand';
import { getSeeds } from '../services/garden.service';

export default function HomePage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthContext();
  const { lang, gardens } = useAppContext();
  const {
    selectedGarden,
    gardenProgress,
    completedGardenIds,
    handleGardenAccess,
  } = useOutletContext();

  const t = localization[lang];
  const location = useLocation();

  const screen = useMemo(() => {
    const p = location.pathname;
    if (p === '/profile') return 'profile';
    if (p === '/gardens') return 'gardens';
    return 'landing';
  }, [location.pathname]);

  // All hooks must run before any early return (Rules of Hooks).
  // Trailer modal (data-driven: garden.trailerUrl > first seed video)
  const [trailerGarden, setTrailerGarden] = useState(null);
  const [trailerUrl, setTrailerUrl] = useState(null);
  // Per-course stats for rich cards (lesson counts), fetched lazily
  const [courseStats, setCourseStats] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      if (!gardens?.length) return;
      const entries = await Promise.all(
        gardens.slice(0, 12).map(async (g) => {
          try {
            const seeds = await getSeeds(g.id);
            if (!Array.isArray(seeds)) return [g.id, null];
            return [g.id, { lessonCount: seeds.length }];
          } catch {
            return [g.id, null];
          }
        })
      );
      if (!cancelled) {
        const map = {};
        entries.forEach(([id, s]) => { if (s) map[id] = s; });
        setCourseStats(map);
      }
    }
    loadStats();
    return () => { cancelled = true; };
  }, [gardens]);

  if (screen === 'profile' && currentUser) {
    return (
      <UserProfile
        currentUser={currentUser}
        onUpdateCurrentUser={(updatedUser) => {
          Object.assign(currentUser, updatedUser);
        }}
        gardens={gardens}
        selectedGarden={selectedGarden}
        gardenProgress={gardenProgress}
        onBack={() => {
          if (selectedGarden) {
            navigate('/classroom');
          } else {
            navigate('/');
          }
        }}
        onOpenGarden={(garden) => handleGardenAccess(garden)}
        lang={lang}
      />
    );
  }

  const myGardens = currentUser?.paidGardens?.length > 0
    ? gardens.filter(g => currentUser.paidGardens.includes(g.id))
    : [];

  const openTrailer = async (garden) => {
    setTrailerGarden(garden);
    setTrailerUrl(courseTrailerUrl(garden, []));
    try {
      const seeds = await getSeeds(garden.id);
      if (Array.isArray(seeds) && seeds.length) {
        setTrailerUrl(courseTrailerUrl(garden, seeds));
      }
    } catch {
      // keep fallback (may be null -> modal shows empty state)
    }
  };

  return (
    <>
      {(screen === 'landing' || screen === 'gardens') && (
        <div className="space-y-8">
          {myGardens.length > 0 && (
            <div className="mb-8">
              <div className="border-b border-slate-200 pb-4 mb-4">
                <p className="eyebrow font-headline">{t.my_gardens}</p>
                <h3 className="text-xl font-bold text-slate-900 font-headline mt-1">
                  {t.my_gardens}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t.my_gardens_desc}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {myGardens.map((g) => (
                  <GardenCard
                    key={g.id}
                    garden={g}
                    lang={lang}
                    t={t}
                    currentUser={currentUser}
                    isCompleted={completedGardenIds.has(g.id)}
                    isEnrolled={true}
                    isInMyGardens={true}
                    onAccess={handleGardenAccess}
                    onTrailer={openTrailer}
                    stats={courseStats[g.id]}
                    borderClass="border-blue-200"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="eyebrow font-headline">{screen === 'gardens' ? t.all_gardens : t.available_gardens}</p>
              <h3 className="text-xl font-bold text-slate-900 font-headline mt-1">
                {screen === 'gardens' ? t.all_gardens : t.available_gardens}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{t.choose_spec}</p>
            </div>
            {screen === 'gardens' ? (
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-mono font-bold transition-colors cursor-pointer"
              >
                {t.back_to_home}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/gardens')}
                  className="text-xs font-semibold text-blue-700 hover:text-[#1d4ed8] px-2 py-1.5 rounded-md transition-colors cursor-pointer"
                >
                  {t.view_all}
                </button>
                <span className="text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-md">
                  {t.realtime_status}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {gardens.length > 0 ? gardens.map((g) => (
              <GardenCard
                key={g.id}
                garden={g}
                lang={lang}
                t={t}
                currentUser={currentUser}
                isCompleted={completedGardenIds.has(g.id)}
                isEnrolled={currentUser?.paidGardens?.includes(g.id)}
                isInMyGardens={false}
                onAccess={handleGardenAccess}
                onTrailer={openTrailer}
                stats={courseStats[g.id]}
              />
            )) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-semibold text-slate-900 font-headline">{t.no_gardens_available}</p>
                <p className="text-xs text-slate-500 mt-1">{t.choose_spec}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {trailerGarden && (
        <CourseTrailerModal
          garden={trailerGarden}
          lang={lang}
          trailerUrl={trailerUrl}
          onClose={() => { setTrailerGarden(null); setTrailerUrl(null); }}
        />
      )}
    </>
  );
}
