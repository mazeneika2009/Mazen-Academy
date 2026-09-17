import React, { useState, useEffect } from 'react';

export function DigitalNotebook({ seedId, studentEmail, currentVideoTime, onSeekTo, lang }) {
  const t = (en, ar, tr) => lang === 'ar' ? ar : lang === 'tr' ? tr : en;
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!seedId || !studentEmail) return;
    fetch(`/api/notebook?seedId=${seedId}&email=${studentEmail}`)
      .then(r => r.json())
      .then(data => { if (data.success) setNotes(data.notes || []); })
      .catch(() => {});
  }, [seedId, studentEmail]);

  const addNote = async () => {
    if (!text.trim()) return;
    const note = { text: text.trim(), timestamp: currentVideoTime, createdAt: new Date().toISOString() };
    try {
      await fetch('/api/notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedId, email: studentEmail, note })
      });
      setNotes(prev => [...prev, note]);
      setText('');
    } catch {}
  };

  const deleteNote = async (idx) => {
    try {
      await fetch('/api/notebook/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedId, email: studentEmail, index: idx })
      });
      setNotes(prev => prev.filter((_, i) => i !== idx));
    } catch {}
  };

  const formatTime = (s) => {
    if (s == null) return '--:--';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const filtered = notes.filter(n => !search || n.text.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="glass-panel rounded-lg border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{t('Notebook', 'المفكرة', 'Not Defteri')}</span>
        </div>
        <button onClick={() => { const txt = notes.map(n => `[${formatTime(n.timestamp)}] ${n.text}`).join('\n'); navigator.clipboard?.writeText(txt); }} className="px-2 py-1 rounded-md hover:bg-gray-100 transition-colors text-[11px] font-bold text-slate-600">
          {t('Copy', 'نسخ', 'Kopyala')}
        </button>
      </div>

      <div className="flex items-center gap-2 bg-gray-50 rounded-md px-3 py-2 border border-slate-100 mb-3">
        <span className="text-[11px] text-gray-500">{t('Search:', 'بحث:', 'Ara:')}</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search notes...', 'ابحث في الملاحظات...', 'Notlarda ara...')} className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none" />
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
        {filtered.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">{t('No notes yet', 'لا توجد ملاحظات بعد', 'Henüz not yok')}</p>
        )}
        {filtered.map((note, i) => (
          <div key={i} className="bg-white rounded-md p-3 border border-slate-100 group">
            <p className="text-xs text-gray-700 pr-6">{note.text}</p>
            <div className="flex items-center justify-between mt-2">
              <button onClick={() => onSeekTo(note.timestamp)} className="text-[10px] text-blue-600 hover:text-blue-700 transition-colors font-mono">
                {formatTime(note.timestamp)}
              </button>
              <button onClick={() => deleteNote(i)} className="px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all text-[10px] font-bold text-red-600">
                {t('Delete', 'حذف', 'Sil')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} placeholder={t('Write a note...', 'اكتب ملاحظة...', 'Not yaz...')} className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500" onKeyDown={e => e.key === 'Enter' && addNote()} />
        <button onClick={addNote} disabled={!text.trim()} className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-colors text-xs font-bold text-blue-700">
          {t('Add', 'إضافة', 'Ekle')}
        </button>
      </div>
      {currentVideoTime > 0 && (
        <p className="text-[10px] text-gray-400 mt-2">{t('Capturing time:', 'التقاط الوقت:', 'Yakalanan süre:')} {formatTime(currentVideoTime)}</p>
      )}
    </div>
  );
}
