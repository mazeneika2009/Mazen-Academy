import React, { useState, useEffect } from 'react';

export function QueriesTab({ seedId, sessionId, lang }) {
  const t = (en, ar, tr) => lang === 'ar' ? ar : lang === 'tr' ? tr : en;
  const [queries, setQueries] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!seedId) return;
    fetch(`/api/queries?seedId=${seedId}&sessionId=${sessionId}`)
      .then(r => r.json())
      .then(data => { if (data.success) setQueries(data.queries || []); })
      .catch(() => {});
  }, [seedId, sessionId]);

  const postQuery = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedId, sessionId, text: text.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setQueries(prev => [...prev, { id: Date.now(), text: text.trim(), replies: [], timestamp: new Date().toISOString() }]);
        setText('');
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="glass-panel rounded-lg border border-slate-100 p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-gray-700">{t('Discussions', 'المناقشات', 'Tartışmalar')}</span>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
        {queries.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">{t('No questions yet. Be the first to ask!', 'لا توجد أسئلة بعد. كن أول من يسأل!', 'Henüz soru yok. İlk soran siz olun!')}</p>
        )}
        {queries.map(q => (
          <div key={q.id} className="bg-white rounded-md p-3 border border-slate-100">
            <p className="text-xs text-gray-700">{q.text}</p>
            <p className="text-[10px] text-gray-500 mt-1">{new Date(q.timestamp).toLocaleString()}</p>
            {q.replies?.map((r, i) => (
              <div key={i} className="mt-2 pl-3 border-l-2 border-slate-200">
                <p className="text-[11px] text-blue-700">{r.text}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t('Ask a question...', 'اسأل سؤالاً...', 'Bir soru sor...')}
          className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
          onKeyDown={e => e.key === 'Enter' && postQuery()}
        />
        <button onClick={postQuery} disabled={loading || !text.trim()} className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-colors text-xs font-bold text-blue-700">
          {loading ? '...' : t('Send', 'إرسال', 'Gönder')}
        </button>
      </div>
    </div>
  );
}
