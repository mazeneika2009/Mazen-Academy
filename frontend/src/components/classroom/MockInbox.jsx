import React, { useState } from 'react';

export function MockInbox({ isOpen, onClose, lang, sessionId, emails, onEmailRead, onEmailDelete }) {
  const t = (en, ar, tr) => lang === 'ar' ? ar : lang === 'tr' ? tr : en;
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const filtered = (emails || []).filter(e =>
    !search || (e.subject || '').toLowerCase().includes(search.toLowerCase()) || (e.bodyEn || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (emailId) => {
    setDeleting(emailId);
    await onEmailDelete(emailId);
    setDeleting(null);
    if (selectedEmail?.id === emailId) setSelectedEmail(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="glass-panel rounded-lg border border-slate-200 w-full max-w-2xl max-h-[80vh] flex flex-col bg-white shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {selectedEmail ? (
              <button onClick={() => setSelectedEmail(null)} className="flex items-center gap-1.5 text-blue-700 hover:text-blue-800 transition-colors cursor-pointer">
                <span className="text-xs font-semibold">{t('Back', 'رجوع', 'Geri')}</span>
              </button>
            ) : (
              <span className="text-sm font-semibold text-slate-700">{t('Inbox', 'الرسائل', 'Mesajlar')}</span>
            )}
          </div>
          <button onClick={onClose} className="px-2 py-1 rounded-md hover:bg-gray-100 transition-colors text-xs font-bold text-slate-500">
            {t('Close', 'إغلاق', 'Kapat')}
          </button>
        </div>

        {selectedEmail ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">{selectedEmail.subject || '(No Subject)'}</h3>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] text-gray-500 font-mono">
                  {new Date(selectedEmail.timestamp).toLocaleString()}
                </span>
                {selectedEmail.isGrowthReport && (
                  <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {t('Growth Report', 'تقرير النمو', 'Gelişim Raporu')}
                  </span>
                )}
              </div>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {(lang === 'ar' ? selectedEmail.bodyAr : lang === 'tr' ? selectedEmail.bodyTr : selectedEmail.bodyEn) || selectedEmail.bodyEn}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={(e) => { e.stopPropagation(); handleDelete(selectedEmail.id); }} disabled={deleting === selectedEmail.id} className="px-3 py-1.5 rounded-md text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                {deleting === selectedEmail.id ? '...' : t('Delete', 'حذف', 'Sil')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-2 bg-gray-50 rounded-md px-3 py-2 border border-slate-100">
                <span className="text-[11px] text-gray-500">{t('Search:', 'بحث:', 'Ara:')}</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search emails...', 'ابحث في الرسائل...', 'E-postalarda ara...')} className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filtered.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-12">
                  <p className="text-xs font-bold text-slate-500">{t('Inbox', 'الرسائل', 'Mesajlar')}</p>
                  <p className="text-xs text-gray-500">{t('Inbox is empty', 'صندوق الوارد فارغ', 'Gelen kutusu boş')}</p>
                </div>
              )}
              {filtered.map(email => (
                <div key={email.id} className="bg-white rounded-md p-4 border border-slate-100 hover:border-slate-200 hover:bg-gray-50 transition-all group cursor-pointer" onClick={() => { setSelectedEmail(email); onEmailRead && onEmailRead(email.id); }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-gray-700">{email.subject || '(No Subject)'}</p>
                        {email.isGrowthReport && <span className="text-[9px] font-bold text-emerald-600 shrink-0">{t('Report', 'تقرير', 'Rapor')}</span>}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{(lang === 'ar' ? email.bodyAr : lang === 'tr' ? email.bodyTr : email.bodyEn) || email.bodyEn}</p>
                      <p className="text-[10px] text-gray-400 mt-2">{new Date(email.timestamp).toLocaleString()}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(email.id); }} disabled={deleting === email.id} className="px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all text-[10px] font-bold text-red-600">
                      {deleting === email.id ? '...' : t('Delete', 'حذف', 'Sil')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
