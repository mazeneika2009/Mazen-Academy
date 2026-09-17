import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from './context/AuthContext';
import { useAppContext } from './context/AppContext';
import { localization } from './types';
import { brandName, brandTagline, BRAND } from './config/brand';
import { parseDurationToSeconds, getSeedDifficulty } from './utils/seedHelpers';
import { LanguageSelector } from './components/common/LanguageSelector';
import { CheckoutSandbox } from './components/checkout/CheckoutSandbox';
import { MockInbox } from './components/classroom/MockInbox';
import { GrowthReportModal } from './components/common/GrowthReportModal';
import { motion } from 'motion/react';

export default function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, sessionId, loading: isAuthChecking, logout, refreshUser } = useAuthContext();
  const { lang, gardens, changeLanguage, fetchGardens } = useAppContext();

  const [selectedGarden, setSelectedGarden] = useState(null);
  const [gardenSeeds, setGardenSeeds] = useState([]);
  const [activeSeed, setActiveSeed] = useState(null);
  const [checkoutGarden, setCheckoutGarden] = useState(null);
  const [emails, setEmails] = useState([]);
  const [unreadMailCount, setUnreadMailCount] = useState(0);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [gardenProgress, setGardenProgress] = useState(null);
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [isOtpRequesting, setIsOtpRequesting] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [seekToTime, setSeekToTime] = useState(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState(null);
  const [videoResolving, setVideoResolving] = useState(false);
  const [bloomedSeedIds, setBloomedSeedIds] = useState(new Set());
  const [sidebarTab, setSidebarTab] = useState('seeds');
  const [quizForceOpen, setQuizForceOpen] = useState(false);
  const [sidebarSort, setSidebarSort] = useState('index');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  const uniqueTags = useMemo(() => {
    const tagsSet = new Set();
    gardenSeeds.forEach(seed => {
      if (seed.tags) {
        seed.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet);
  }, [gardenSeeds]);

  const notifiedEmailIds = useRef(new Set());
  const isFirstMailLoad = useRef(true);
  const currentVideoTimeRef = useRef(0);
  const autoReportShown = useRef(false);
  const prevCompletedRef = useRef(new Set());
  const isFirstProgressLoadRef = useRef(true);

  useEffect(() => {
    currentVideoTimeRef.current = currentVideoTime;
  }, [currentVideoTime]);

  const completedGardenIds = useMemo(() => {
    return new Set(emails.filter(e => e.isGrowthReport).map(e => e.gardenId));
  }, [emails]);

  const screen = useMemo(() => {
    const p = location.pathname;
    if (p === '/login') return 'login';
    if (p === '/register') return 'register';
    if (p === '/verify') return 'verify';
    if (p.startsWith('/classroom')) return 'classroom';
    if (p === '/profile') return 'profile';
    if (p === '/forgot-password') return 'forgot_password';
    if (p === '/admin') return 'admin';
    if (p === '/gardens') return 'gardens';
    return 'landing';
  }, [location.pathname]);

  // Keep <title> + meta in sync with the new brand (single source: config/brand.js)
  useEffect(() => {
    const name = brandName(lang);
    document.title = `${name} — ${brandTagline(lang)}`;
    document.documentElement.lang = lang;
    let meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', `${BRAND.nameLatin} — ${BRAND.taglineEn}`);
  }, [lang, screen]);

  const syncSession = useCallback(async (cachedSessionId) => {
    if (!cachedSessionId) return;
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: cachedSessionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshUser();
      } else {
        handleLogout();
      }
    } catch (e) {
      console.warn('Session check failed, will retry.');
    }
  }, [refreshUser]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('kg_session_id');
    localStorage.removeItem('kg_active_garden_id');
    notifiedEmailIds.current.clear();
    isFirstMailLoad.current = true;
    setSelectedGarden(null);
    setActiveSeed(null);
    logout();
  }, [logout]);

  const fetchEmails = useCallback(async () => {
    const activeSession = sessionId || localStorage.getItem('kg_session_id');
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/emails?sessionId=${encodeURIComponent(activeSession)}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
        const unread = data.filter((e) => !e.isRead).length;
        setUnreadMailCount(unread);
      }
    } catch (err) {
      console.warn('Inbox refresh failed.');
    }
  }, [sessionId]);

  const fetchGardenProgress = useCallback(async (gardenId) => {
    const activeSession = sessionId || localStorage.getItem('kg_session_id');
    if (!activeSession || !gardenId) return;
    try {
      const res = await fetch('/api/student_growth/garden-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession, gardenId })
      });
      if (res.ok) {
        const data = await res.json();
        setGardenProgress(data);
      }
    } catch (err) {
      console.warn('Progress load failed:', err);
    }
  }, [sessionId]);

  useEffect(() => {
    const activeSession = sessionId || localStorage.getItem('kg_session_id');
    if (!activeSession) return;

    let pollInterval = 8000;
    let timer;
    let errorCount = 0;

    const poll = async () => {
      if (document.hidden) {
        timer = setTimeout(poll, 15000);
        return;
      }
      try {
        await fetchEmails();
        errorCount = 0;
        pollInterval = 8000;
      } catch {
        errorCount++;
        if (errorCount < 5) pollInterval = Math.min(pollInterval * 1.5, 30000);
      }
      timer = setTimeout(poll, pollInterval);
    };

    fetchEmails();
    timer = setTimeout(poll, pollInterval);

    const onVisibility = () => {
      if (!document.hidden) fetchEmails();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [sessionId, fetchEmails]);

  useEffect(() => {
    if (emails.length > 0) {
      if (isFirstMailLoad.current) {
        emails.forEach((e) => notifiedEmailIds.current.add(e.id));
        isFirstMailLoad.current = false;
        return;
      }

      const newStatusMail = emails.find(e =>
        !e.isRead &&
        !notifiedEmailIds.current.has(e.id) &&
        (e.subject.includes('Approved') || e.subject.includes('Rejected'))
      );

      if (newStatusMail) {
        notifiedEmailIds.current.add(newStatusMail.id);
        const isApproved = newStatusMail.subject.includes('Approved');

        const t = localization[lang];
        const alertTitle = isApproved
          ? t.payment_approved
          : t.payment_rejected;
        const alertBody = isApproved
          ? t.access_activated
          : t.check_inbox_details;

        alert(`${alertTitle}\n\n${alertBody}`);

        if (isApproved && (sessionId || localStorage.getItem('kg_session_id'))) {
          syncSession(sessionId || localStorage.getItem('kg_session_id'));
        }
      }
    }
  }, [emails, lang, sessionId, syncSession]);

  useEffect(() => {
    if (selectedGarden && (sessionId || localStorage.getItem('kg_session_id'))) {
      fetchGardenProgress(selectedGarden.id);
    }
  }, [selectedGarden, sessionId, fetchGardenProgress]);

  useEffect(() => {
    if (!gardenProgress || autoReportShown.current || !currentUser || !selectedGarden) return;
    const loc = localization[lang];
    if (gardenProgress.completionPercent === 100) {
      autoReportShown.current = true;
      const totalSec = (gardenProgress.seedProgressDetails || []).reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
      const studyMinutes = Math.floor(totalSec / 60);
      const studyHours = (studyMinutes / 60).toFixed(1);
      const seedDetails = (gardenProgress.seedProgressDetails || []).map(s => ({
        title: s.titleEn || s.titleAr || s.titleTr || '',
        completed: s.isCompleted
      }));
      setActiveReport({
        gardenTitle: lang === 'ar' ? selectedGarden.titleAr : lang === 'tr' ? selectedGarden.titleTr : selectedGarden.titleEn,
        userName: currentUser.name || currentUser.email?.split('@')[0] || '',
        completedAt: new Date().toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }),
        totalHours: studyHours,
        totalMinutes: studyMinutes,
        completedSeedsCount: gardenProgress.completedSeedsCount,
        totalSeedsCount: gardenProgress.totalSeedsCount,
        skillsAcquired: loc.skills_acquired,
        aiAdvice: loc.expert_advice,
        seeds: seedDetails,
      });
      setIsReportModalOpen(true);
    }
  }, [gardenProgress, currentUser, selectedGarden, lang]);

  useEffect(() => {
    if (!isAuthChecking && (screen === 'classroom' || screen === 'profile') && !currentUser) {
      navigate('/login');
    }
  }, [screen, currentUser, navigate, isAuthChecking]);

  useEffect(() => {
    const savedGardenId = localStorage.getItem('kg_active_garden_id');
    if (currentUser && gardens.length > 0 && savedGardenId && !selectedGarden) {
      const g = gardens.find(x => x.id === savedGardenId);
      if (g) {
        handleGardenAccess(g);
      }
    }
  }, [currentUser, gardens, selectedGarden]);

  const handleGardenAccess = useCallback(async (garden) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (currentUser.pendingGardens?.includes(garden.id)) {
      const t = localization[lang];
      alert(t.payment_verified_pending);
      return;
    }

    if (currentUser.paidGardens?.includes(garden.id)) {
      try {
        const res = await fetch(`/api/gardens/${garden.id}/seeds`);
        if (res.ok) {
          const seeds = await res.json();
          setGardenSeeds(seeds);
          setSelectedGarden(garden);
          localStorage.setItem('kg_active_garden_id', garden.id);
          const activeSid = sessionId || localStorage.getItem('kg_session_id');
          if (activeSid) {
            const progRes = await fetch('/api/student_growth/garden-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: activeSid, gardenId: garden.id })
            });
            if (progRes.ok) {
              const progData = await progRes.json();
              setGardenProgress(progData);
              const nextSeed = seeds.find(s => !progData.seedProgressDetails?.find(d => d.seedId === s.id)?.isCompleted);
              setActiveSeed(nextSeed || seeds[0] || null);
            } else {
              setActiveSeed(seeds[0] || null);
            }
          } else {
            setActiveSeed(seeds[0] || null);
          }
          navigate('/classroom');
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      setCheckoutGarden(garden);
    }
  }, [currentUser, sessionId, navigate, lang]);

  const handleDeleteEmail = useCallback(async (emailId) => {
    const activeSession = sessionId || localStorage.getItem('kg_session_id');
    if (!activeSession) return;
    try {
      const res = await fetch('/api/emails/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession, emailId })
      });
      if (res.ok) {
        fetchEmails();
      }
    } catch (err) {
      console.warn('Delete message failed.');
    }
  }, [sessionId, fetchEmails]);

  const handleRequestReportOtp = useCallback(async () => {
    const activeSession = sessionId || localStorage.getItem('kg_session_id');
    if (!selectedGarden || !activeSession) return;
    setIsOtpRequesting(true);
    setReportError('');
    setReportSuccess('');
    const t = localization[lang];
    try {
      const res = await fetch('/api/reports/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession, gardenId: selectedGarden.id })
      });
      const data = await res.json();
      if (res.ok) {
        setReportSuccess(t.otp_dispatched);
        await fetchGardenProgress(selectedGarden.id);
        await fetchEmails();
        setTimeout(() => {
          setIsInboxOpen(true);
        }, 1000);
      } else {
        setReportError(data.error || 'Could not send the code. Try again.');
      }
    } catch (err) {
      setReportError('Network error. Try again.');
    } finally {
      setIsOtpRequesting(false);
    }
  }, [selectedGarden, sessionId, lang, fetchGardenProgress, fetchEmails]);

  const handleVerifyReportOtp = useCallback(async (e) => {
    e.preventDefault();
    const activeSession = sessionId || localStorage.getItem('kg_session_id');
    if (!selectedGarden || !otpCodeInput || !activeSession) return;
    setIsOtpVerifying(true);
    setReportError('');
    setReportSuccess('');
    const t = localization[lang];
    try {
      const res = await fetch('/api/reports/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession,
          gardenId: selectedGarden.id,
          otpCode: otpCodeInput,
          lang
        })
      });
      const data = await res.json();
      if (res.ok) {
        setReportSuccess(t.otp_verified);
        setOtpCodeInput('');
        const seedDetails = (gardenProgress?.seedProgressDetails || []).map(s => ({ title: s.titleEn || s.titleAr || s.titleTr || '', completed: s.isCompleted }));
        setActiveReport({ ...data.report, seeds: seedDetails, completedSeedsCount: gardenProgress?.completedSeedsCount, totalSeedsCount: gardenProgress?.totalSeedsCount });
        setIsReportModalOpen(true);
        await fetchGardenProgress(selectedGarden.id);
        await fetchEmails();
      } else {
        setReportError(data.error || 'That code did not work. Try again.');
      }
    } catch (err) {
      setReportError('Could not verify. Try again.');
    } finally {
      setIsOtpVerifying(false);
    }
  }, [selectedGarden, sessionId, otpCodeInput, lang, gardenProgress, fetchGardenProgress, fetchEmails]);

  const handleViewDispatchedReport = useCallback(() => {
    if (!selectedGarden || !currentUser) return;
    const reportEmail = emails.find(e => e.gardenId === selectedGarden.id && e.isGrowthReport);
    if (reportEmail) {
      const totalSec = (gardenProgress?.seedProgressDetails || []).reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
      const studyMinutes = Math.floor(totalSec / 60);
      const studyHours = (studyMinutes / 60).toFixed(1);
      const t = localization[lang];

      const seedDetails = (gardenProgress?.seedProgressDetails || []).map(s => ({ title: s.titleEn || s.titleAr || s.titleTr || '', completed: s.isCompleted }));
      const verifiedPayload = {
        id: reportEmail.id,
        gardenId: selectedGarden.id,
        gardenTitle: lang === 'ar' ? selectedGarden.titleAr : lang === 'tr' ? selectedGarden.titleTr : selectedGarden.titleEn,
        toEmail: reportEmail.toEmail,
        userName: currentUser.name || currentUser.email.split('@')[0],
        completedAt: new Date(reportEmail.timestamp).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }),
        totalHours: studyHours,
        totalMinutes: studyMinutes,
        completedSeedsCount: gardenProgress?.completedSeedsCount,
        totalSeedsCount: gardenProgress?.totalSeedsCount,
        skillsAcquired: t.skills_acquired,
        aiAdvice: t.expert_advice,
        certificateId: 'CERT_' + reportEmail.id.substring(6).toUpperCase(),
        body: lang === 'ar' ? reportEmail.bodyAr : lang === 'tr' ? reportEmail.bodyTr : reportEmail.bodyEn,
        seeds: seedDetails,
      };
      setActiveReport(verifiedPayload);
      setIsReportModalOpen(true);
    }
  }, [selectedGarden, currentUser, emails, gardenProgress, lang]);

  const selectActiveSeed = useCallback((seed) => {
    setActiveSeed(seed);
    setCurrentVideoTime(0);
    setSeekToTime(null);
    setQuizForceOpen(false);
    setResolvedVideoUrl(null);
  }, []);

  const processedSeeds = useMemo(() => {
    let list = [...gardenSeeds];

    if (difficultyFilter !== 'all') {
      list = list.filter(seed => getSeedDifficulty(seed) === difficultyFilter);
    }
    if (durationFilter !== 'all') {
      list = list.filter(seed => {
        const sec = parseDurationToSeconds(seed.duration);
        if (durationFilter === 'short') return sec < 900;
        if (durationFilter === 'medium') return sec >= 900 && sec < 1800;
        if (durationFilter === 'long') return sec >= 1800;
        return true;
      });
    }
    if (tagFilter !== 'all') {
      list = list.filter(seed => seed.tags && seed.tags.includes(tagFilter));
    }

    if (sidebarSort === 'difficulty-asc') {
      const diffRank = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
      list.sort((a, b) => diffRank[getSeedDifficulty(a)] - diffRank[getSeedDifficulty(b)]);
    } else if (sidebarSort === 'difficulty-desc') {
      const diffRank = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
      list.sort((a, b) => diffRank[getSeedDifficulty(b)] - diffRank[getSeedDifficulty(a)]);
    } else if (sidebarSort === 'duration-asc') {
      list.sort((a, b) => parseDurationToSeconds(a.duration) - parseDurationToSeconds(b.duration));
    } else if (sidebarSort === 'duration-desc') {
      list.sort((a, b) => parseDurationToSeconds(b.duration) - parseDurationToSeconds(a.duration));
    } else if (sidebarSort === 'tag-count-desc') {
      list.sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0));
    }

    return list;
  }, [gardenSeeds, sidebarSort, difficultyFilter, durationFilter, tagFilter]);

  const activeSeedIndex = useMemo(() => {
    if (!activeSeed) return -1;
    return processedSeeds.findIndex(s => s.id === activeSeed.id);
  }, [activeSeed, processedSeeds]);

  const handlePreviousSeed = useCallback(() => {
    if (activeSeedIndex > 0) {
      selectActiveSeed(processedSeeds[activeSeedIndex - 1]);
    }
  }, [activeSeedIndex, processedSeeds, selectActiveSeed]);

  const handleNextSeed = useCallback(() => {
    if (activeSeedIndex < processedSeeds.length - 1) {
      selectActiveSeed(processedSeeds[activeSeedIndex + 1]);
    } else {
      navigate('/gardens');
    }
  }, [activeSeedIndex, processedSeeds, selectActiveSeed, navigate]);

  useEffect(() => {
    if (!activeSeed || !sessionId) {
      setResolvedVideoUrl(null);
      return;
    }
    let cancelled = false;
    const rawUrl = activeSeed.videoUrl;
    if (!rawUrl || rawUrl.startsWith('bunny_mock') || rawUrl === '') {
      setResolvedVideoUrl(null);
      return;
    }
    setVideoResolving(true);
    fetch(`/api/seeds/${activeSeed.id}/stream?token=${encodeURIComponent(sessionId)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const url = data.success && data.resolvedUrl && data.resolvedUrl.startsWith('http') ? data.resolvedUrl : rawUrl;
        setResolvedVideoUrl(url);
      })
      .catch(() => { if (!cancelled) setResolvedVideoUrl(rawUrl); })
      .finally(() => { if (!cancelled) setVideoResolving(false); });
    return () => { cancelled = true; };
  }, [activeSeed?.id, sessionId]);

  useEffect(() => {
    if (!activeSeed || !sessionId || !selectedGarden) return;
    let timer;
    const save = async () => {
      const time = currentVideoTimeRef.current;
      if (time > 0) {
        try {
          await fetch('/api/student_growth/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, seedId: activeSeed.id, watchedSeconds: Math.floor(time) }),
          });
        } catch {}
      }
      timer = setTimeout(save, 20000);
    };
    timer = setTimeout(save, 20000);
    return () => clearTimeout(timer);
  }, [activeSeed?.id, sessionId, selectedGarden?.id]);

  useEffect(() => {
    if (gardenProgress?.seedProgressDetails) {
      const currentCompleted = new Set();
      gardenProgress.seedProgressDetails.forEach((d) => {
        if (d.isCompleted) {
          currentCompleted.add(d.seedId);
        }
      });

      const newlyCompleted = [];
      if (!isFirstProgressLoadRef.current) {
        currentCompleted.forEach(id => {
          if (!prevCompletedRef.current.has(id)) {
            newlyCompleted.push(id);
          }
        });
      }

      if (newlyCompleted.length > 0) {
        setBloomedSeedIds(prev => {
          const next = new Set(prev);
          newlyCompleted.forEach(id => next.add(id));
          return next;
        });

        setTimeout(() => {
          setBloomedSeedIds(prev => {
            const next = new Set(prev);
            newlyCompleted.forEach(id => next.delete(id));
            return next;
          });
        }, 3200);
      }

      prevCompletedRef.current = currentCompleted;
      isFirstProgressLoadRef.current = false;
    } else {
      isFirstProgressLoadRef.current = true;
      prevCompletedRef.current = new Set();
    }
  }, [gardenProgress]);

  const handleMarkComplete = useCallback(async () => {
    if (!activeSeed || !sessionId || !selectedGarden) return;

    const durationSecs = parseDurationToSeconds(activeSeed.duration);

    try {
      await fetch('/api/student_growth/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, seedId: activeSeed.id, watchedSeconds: durationSecs }),
      });
    } catch (e) {
      console.warn('Progress save failed before quiz check');
    }

    try {
      const quizRes = await fetch(`/api/quiz_questions?seedId=${activeSeed.id}`);
      if (quizRes.ok) {
        const quizQuestions = await quizRes.json();
        if (quizQuestions.length > 0) {
          const answersRes = await fetch('/api/quiz_answers/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          if (answersRes.ok) {
            const answersData = await answersRes.json();
            const correctAnswerIds = new Set(
              (answersData.answers || [])
                .filter((a) => a.seedId === activeSeed.id && a.isCorrect)
                .map((a) => a.questionId)
            );
            const allAnswered = quizQuestions.every((q) => correctAnswerIds.has(q.id));
            if (!allAnswered) {
              setQuizForceOpen(true);
              setSidebarTab('quiz');
            }
          }
        }
      }
    } catch (e) {
      console.warn('Quiz check failed, proceeding with mark complete');
    }

    fetchGardenProgress(selectedGarden.id);
    handleNextSeed();
  }, [activeSeed, sessionId, selectedGarden, fetchGardenProgress, handleNextSeed]);

  const handleDirectComplete = useCallback(async (seedId) => {
    const seed = gardenSeeds.find(s => s.id === seedId);
    if (!seed || !sessionId || !selectedGarden) return;
    setGardenProgress(prev => {
      if (!prev) return prev;
      const details = prev.seedProgressDetails || [];
      const existing = details.find(d => d.seedId === seedId);
      const newDetails = existing
        ? details.map(d => d.seedId === seedId ? { ...d, isCompleted: true } : d)
        : [...details, { seedId, isCompleted: true, titleEn: seed.titleEn, titleAr: seed.titleAr, titleTr: seed.titleTr, durationSeconds: parseDurationToSeconds(seed.duration) }];
      return { ...prev, completedSeedsCount: newDetails.filter(d => d.isCompleted).length, seedProgressDetails: newDetails };
    });
    const durationSecs = parseDurationToSeconds(seed.duration);
    try {
      await fetch('/api/student_growth/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, seedId: seed.id, watchedSeconds: durationSecs }),
      });
    } catch (e) {
      console.warn('Direct complete failed');
    }
    fetchGardenProgress(selectedGarden.id);
  }, [gardenSeeds, sessionId, selectedGarden, fetchGardenProgress]);

  const t = localization[lang];

  const pageContext = useMemo(() => ({
    currentUser, sessionId, selectedGarden, setSelectedGarden,
    gardenSeeds, setGardenSeeds, activeSeed, setActiveSeed,
    gardenProgress, setGardenProgress,
    seekToTime, setSeekToTime,
    resolvedVideoUrl, videoResolving,
    completedGardenIds, bloomedSeedIds,
    otpCodeInput, setOtpCodeInput,
    reportError, reportSuccess,
    isOtpRequesting, isOtpVerifying,
    activeReport, isReportModalOpen,
    handleGardenAccess, handleLogout,
    handleMarkComplete, handleDirectComplete,
    handleNextSeed, handlePreviousSeed,
    selectActiveSeed, activeSeedIndex,
    handleRequestReportOtp, handleVerifyReportOtp,
    handleViewDispatchedReport, handleDeleteEmail,
    syncSession, fetchEmails, fetchGardenProgress,
    sidebarTab, setSidebarTab, quizForceOpen, setQuizForceOpen,
    sidebarSort, setSidebarSort, difficultyFilter, setDifficultyFilter,
    durationFilter, setDurationFilter, tagFilter, setTagFilter,
    uniqueTags, processedSeeds,
  }), [currentUser, sessionId, selectedGarden, gardenSeeds, activeSeed, gardenProgress,
      seekToTime, resolvedVideoUrl, videoResolving,
      completedGardenIds, bloomedSeedIds, otpCodeInput, reportError, reportSuccess,
      isOtpRequesting, isOtpVerifying, activeReport, isReportModalOpen,
      handleGardenAccess, handleLogout, handleMarkComplete, handleDirectComplete,
      handleNextSeed, handlePreviousSeed, selectActiveSeed, activeSeedIndex,
      handleRequestReportOtp, handleVerifyReportOtp, handleViewDispatchedReport,
      handleDeleteEmail, syncSession, fetchEmails, fetchGardenProgress,
      sidebarTab, quizForceOpen, sidebarSort, difficultyFilter, durationFilter, tagFilter,
      uniqueTags, processedSeeds]);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-bold text-slate-900 font-headline">{brandName(lang)}</p>
          <p className="text-xs text-slate-500">Getting things ready...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-16 flex flex-col items-center bg-slate-50 selection:bg-blue-600 selection:text-white overflow-x-hidden`}>

      <header className="w-full max-w-6xl px-5 mt-5 sticky top-4 z-40">
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-3.5 flex items-center justify-between" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.05)' }}>
          <div
            className="flex items-center cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div>
              <h1 className="text-[15px] font-bold text-slate-900 font-headline leading-tight">
                {brandName(lang)}
              </h1>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                {brandTagline(lang)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <LanguageSelector currentLang={lang} onLanguageChange={changeLanguage} />

            {currentUser ? (
              <nav id="header-user-controls" className="flex items-center gap-1.5" aria-label="Account">
                <button
                  onClick={() => navigate('/gardens')}
                  className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                    screen === 'gardens'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {t.gardens}
                </button>

                <button
                  id="profile-btn"
                  onClick={() => navigate('/profile')}
                  className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                    screen === 'profile'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {t.user_page_title}
                </button>

                <button
                  onClick={() => setIsInboxOpen(true)}
                  className="px-3 py-1.5 rounded-md text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {t.secure_inbox}
                  {unreadMailCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-blue-600 rounded-md text-[10px] font-bold text-white">
                      {unreadMailCount}
                    </span>
                  )}
                </button>

                <span className="hidden sm:block w-px h-5 bg-slate-200 mx-1" />

                <button
                  onClick={() => navigate('/profile')}
                  title={t.view_profile}
                  className="hidden sm:block text-[13px] font-medium text-slate-700 hover:text-blue-700 transition-colors text-left cursor-pointer max-w-[140px] truncate"
                >
                  {currentUser.email.split('@')[0]}
                </button>

                <span className={`hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                  (currentUser.paidGardens?.length ?? 0) > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {(currentUser.paidGardens?.length ?? 0) > 0 ? t.membership_paid : t.membership_free}
                </span>

                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 text-[13px] text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title={t.logout_session}
                >
                  {t.logout_session}
                </button>
              </nav>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/gardens')}
                  className="px-3.5 py-2 rounded-md border border-slate-200 text-slate-700 font-medium text-[13px] hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {t.gardens}
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary"
                >
                  {t.login_title}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {screen === 'landing' && (
        <section className="w-full max-w-6xl mx-auto px-5 mt-8">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.05)' }}>
            <div className="grid md:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="px-7 py-10 md:px-10 md:py-14 flex flex-col justify-center"
              >
                <p className="eyebrow">{t.new_era}</p>
                <h2 className="text-[32px] md:text-[40px] font-bold text-slate-900 font-headline mt-3 leading-[1.2]">
                  {t.hero_title_prefix}{' '}
                  <span className="text-blue-700">
                    {t.hero_title_highlight}
                  </span>{' '}
                  {t.hero_title_suffix}
                </h2>

                <p className="text-[15px] text-slate-600 leading-relaxed mt-4 prose-measure">
                  {t.subtitle}
                </p>

                <p className="text-[13px] text-slate-500 leading-relaxed mt-3 prose-measure">
                  {t.hero_note}
                </p>

                <div className="flex flex-wrap items-center gap-2.5 mt-6">
                  <button
                    onClick={() => navigate('/gardens')}
                    className="btn-primary"
                  >
                    {t.explore}
                  </button>
                  {currentUser && selectedGarden ? (
                    <button
                      onClick={() => navigate('/classroom')}
                      className="btn-secondary"
                    >
                      {t.classroomTitle}
                    </button>
                  ) : !currentUser ? (
                    <button
                      onClick={() => navigate('/register')}
                      className="btn-secondary"
                    >
                      {t.create_account}
                    </button>
                  ) : null}
                </div>

                <p className="text-[12px] text-slate-400 mt-5">
                  {t.realtime_status} · {t.choose_spec}
                </p>
              </motion.div>

              <div className="relative min-h-[260px] md:min-h-full">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop"
                  alt="Adults learning programming together on laptops in a modern workspace"
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
                {/* Soft editorial veil: keeps photo honest, text lives on white instead of on black */}
                <div className="absolute inset-0 hero-veil-soft md:hidden" />
                <div className="absolute inset-0 hidden md:block" style={{ background: 'linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.55) 18%, rgba(255,255,255,0) 42%)' }} />
                <p className="absolute bottom-2.5 right-3 text-[11px] text-slate-500 bg-white/90 border border-slate-200 rounded-md px-2 py-0.5">Photo: Brooke Cagle / Unsplash</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <main className="w-full max-w-6xl px-5 mt-10 flex-1">
        <Outlet context={pageContext} />
      </main>

      {checkoutGarden && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(15,23,42,0.45)' }}>
          <div className="max-w-lg w-full">
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-[13px] font-semibold text-white">{t.checkout_title}</span>
              <button
                onClick={() => setCheckoutGarden(null)}
                className="text-white/90 hover:text-white font-medium text-[13px] cursor-pointer"
              >
                {t.close_panel}
              </button>
            </div>

            <CheckoutSandbox
              garden={checkoutGarden}
              sessionId={sessionId}
              lang={lang}
              onPaymentSuccess={async () => {
                setCheckoutGarden(null);
                if (sessionId) {
                  syncSession(sessionId);
                }
              }}
            />
          </div>
        </div>
      )}

      <MockInbox
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
        lang={lang}
        sessionId={sessionId}
        emails={emails}
        onEmailRead={fetchEmails}
        onEmailDelete={handleDeleteEmail}
      />

      <GrowthReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        lang={lang}
        report={activeReport}
      />

      <footer className="mt-16 pb-10 w-full max-w-6xl px-5">
        <div className="rule-soft mb-6" />
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <p className="text-[13px] text-slate-600">© {new Date().getFullYear()} {brandName(lang)} — {t.rights_reserved}</p>
          <p className="text-[12px] text-slate-400">{BRAND.locationLine}</p>
        </div>
      </footer>
    </div>
  );
}
