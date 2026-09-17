import React, { useState, useEffect, useCallback } from 'react';

export function QuizReview({ seedId, sessionId, lang, isSeedCompleted }) {
  const t = (en, ar, tr) => lang === 'ar' ? ar : lang === 'tr' ? tr : en;
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (!seedId) return;
    setLoading(true);
    fetch(`/api/quiz?seedId=${seedId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setQuestions(data.questions || []);
          setAnswered(new Array((data.questions || []).length).fill(null));
          setCurrent(0);
          setSelected(null);
          setResult(null);
          setShowResult(false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [seedId]);

  const handleAnswer = useCallback(async () => {
    if (selected == null || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedId, sessionId, questionId: questions[current]?.id, answer: selected })
      });
      const data = await res.json();
      const newAnswered = [...answered];
      newAnswered[current] = { selected, correct: data.correct };
      setAnswered(newAnswered);
      if (data.correct && current < questions.length - 1) {
        setTimeout(() => { setCurrent(prev => prev + 1); setSelected(null); }, 800);
      } else if (data.correct && current === questions.length - 1) {
        setResult({ total: questions.length, correct: newAnswered.filter(a => a?.correct).length + 1 });
        setShowResult(true);
      }
    } catch {}
    setSubmitting(false);
  }, [selected, submitting, seedId, sessionId, questions, current, answered]);

  const q = questions[current];

  if (loading) {
    return (
      <div className="glass-panel rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-semibold text-slate-700">{t('Quiz', 'اختبار', 'Sınav')}</span>
        </div>
        <div className="flex items-center justify-center py-8"><span className="text-xs text-slate-500 font-mono">...</span></div>
      </div>
    );
  }

  if (showResult && result) {
    const pct = Math.round((result.correct / result.total) * 100);
    return (
      <div className="glass-panel rounded-lg border border-blue-100 p-4">
        <div className="flex flex-col items-center gap-3 py-6">
          <p className={`text-[11px] font-bold uppercase tracking-wider ${pct >= 70 ? 'text-amber-600' : 'text-slate-500'}`}>
            {pct >= 70 ? t('Passed', 'ناجح', 'Geçti') : t('Review needed', 'يحتاج مراجعة', 'Tekrar gerekli')}
          </p>
          <p className="text-lg font-bold text-gray-900">{result.correct}/{result.total}</p>
          <p className="text-sm text-gray-500">{pct}%</p>
          <button onClick={() => { setCurrent(0); setSelected(null); setAnswered(new Array(questions.length).fill(null)); setResult(null); setShowResult(false); }} className="px-4 py-2 rounded-md bg-blue-100 hover:bg-blue-200 text-xs text-blue-700 transition-colors">
            {t('Retry', 'إعادة المحاولة', 'Tekrar Dene')}
          </button>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="glass-panel rounded-lg border border-blue-100 p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-semibold text-gray-700">{t('Quiz', 'اختبار', 'Sınav')}</span>
        </div>
        <p className="text-xs text-gray-500 text-center py-4">{t('No questions available', 'لا توجد أسئلة متاحة', 'Soru bulunamadı')}</p>
      </div>
    );
  }

  const options = q.optionsEn || q.optionsAr || q.optionsTr || [];
  const answeredData = answered[current];

  return (
    <div className="glass-panel rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{t('Quiz', 'اختبار', 'Sınav')}</span>
        </div>
        <span className="text-[10px] text-gray-600">{current + 1}/{questions.length}</span>
      </div>

      <p className="text-xs text-slate-700 mb-4">{q.questionEn || q.questionAr || q.questionTr}</p>

      <div className="space-y-2 mb-4">
        {options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = answeredData?.correct && answeredData?.selected === i;
          const isWrong = answeredData && !answeredData.correct && answeredData?.selected === i;
          return (
            <button key={i} onClick={() => !answeredData && setSelected(i)} disabled={!!answeredData}
              className={`w-full text-left p-3 rounded-md border text-xs transition-all ${
                isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                isWrong ? 'bg-red-50 border-red-200 text-red-700' :
                isSelected ? 'bg-blue-50 border-blue-200 text-slate-700' :
                'bg-gray-50 border-blue-100 text-gray-600 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span>{opt}</span>
                {isCorrect && <span className="text-[10px] font-bold text-emerald-600 shrink-0">{t('Correct', 'صحيح', 'Doğru')}</span>}
                {isWrong && <span className="text-[10px] font-bold text-red-600 shrink-0">{t('Wrong', 'خطأ', 'Yanlış')}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {!answeredData && (
        <button onClick={handleAnswer} disabled={selected == null || submitting} className="w-full py-2.5 rounded-md bg-blue-100 hover:bg-blue-200 disabled:opacity-30 border border-blue-200 text-xs font-semibold text-blue-700 transition-all flex items-center justify-center gap-1.5">
          {submitting ? t('Checking...', 'جارٍ التحقق...', 'Kontrol ediliyor...') : t('Confirm Answer', 'تأكيد الإجابة', 'Cevabı Onayla')}
        </button>
      )}

      {answeredData && !answeredData.correct && current < questions.length - 1 && (
        <button onClick={() => { setCurrent(prev => prev + 1); setSelected(null); }} className="w-full py-2.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold text-amber-700 transition-all mt-2">
          {t('Next Question', 'السؤال التالي', 'Sonraki Soru')}
        </button>
      )}
    </div>
  );
}
