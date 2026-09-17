import React, { useState } from 'react';

export function UserProfile({ currentUser, onUpdateCurrentUser, gardens, selectedGarden, gardenProgress, onBack, onOpenGarden, lang }) {
  const t = (en, ar, tr) => lang === 'ar' ? ar : lang === 'tr' ? tr : en;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!currentUser) return null;

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const sessionId = localStorage.getItem('kg_session_id');
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('kg_session_id');
        localStorage.removeItem('kg_active_garden_id');
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Delete account failed:', err);
    }
    setDeleting(false);
  };

return (
    <div className="glass-panel rounded-lg border border-slate-200 p-6 mt-6 bg-white shadow-sm">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        {t('Back', 'رجوع', 'Geri')}
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
          <span className="text-xl font-bold text-blue-700">{(currentUser.email?.[0] || 'S').toUpperCase()}</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">{currentUser.email?.split('@')[0] || t('Student', 'طالب', 'Öğrenci')}</h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('Verified student', 'طالب موثّق', 'Doğrulanmış öğrenci')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-md p-3 border border-slate-100">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] text-gray-500">{t('Email', 'البريد', 'E-posta')}</span>
          </div>
          <p className="text-xs text-gray-700 truncate">{currentUser.email}</p>
        </div>
        <div className="bg-white rounded-md p-3 border border-slate-100">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] text-gray-500">{t('Phone', 'الهاتف', 'Telefon')}</span>
          </div>
          <p className="text-xs text-gray-700">{currentUser.phone || '—'}</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-gray-500">{t('My courses', 'دوراتي', 'Kurslarım')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(gardens || []).filter(g => (currentUser.paidGardens || []).includes(g.id)).map(g => (
            <button key={g.id} onClick={() => onOpenGarden(g)} className="bg-white rounded-md p-3 border border-slate-100 hover:border-slate-200 text-left transition-all group">
              <p className="text-xs text-gray-700 group-hover:text-blue-700 transition-colors">{g.titleEn || g.titleAr}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] font-bold text-emerald-600">{t('Enrolled', 'مشترك', 'Kayıtlı')}</span>
              </div>
            </button>
          ))}
          {(currentUser.paidGardens || []).length === 0 && (
            <p className="text-xs text-gray-500 col-span-2 text-center py-4">{t('No courses yet — browse and enroll in one.', 'لا توجد دورات بعد — تصفح واشترك في واحدة.', 'Henüz kurs yok — göz at ve birine kaydol.')}</p>
          )}
        </div>
      </div>

      {gardenProgress && (
        <div className="bg-white rounded-md p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-gray-500">{t('Progress', 'التقدم', 'İlerleme')}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-md overflow-hidden">
              <div className="h-full rounded-md transition-all" style={{ width: `${gardenProgress.completionPercent || 0}%`, backgroundColor: '#2563eb' }} />
            </div>
            <span className="text-xs font-mono text-gray-500">{gardenProgress.completionPercent || 0}%</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">{gardenProgress.completedSeedsCount || 0}/{gardenProgress.totalSeedsCount || 0} {t('lessons done', 'درس منجز', 'ders bitti')}</p>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-red-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-red-500">{t('Danger Zone', 'منطقة الخطر', 'Tehlikeli Bölge')}</span>
        </div>
        <p className="text-[10px] text-gray-500 mb-3">{t('This deletes your account and progress for good.', 'سيحذف هذا حسابك وتقدمك نهائياً.', 'Bu, hesabını ve ilerlemeni kalıcı olarak siler.')}</p>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {deleting ? t('Deleting...', 'جاري الحذف...', 'Siliniyor...') : t('Yes, Delete My Account', 'نعم، احذف حسابي', 'Evet, Hesabımı Sil')}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="px-4 py-2 rounded-md bg-gray-100 border border-slate-200 text-gray-500 hover:text-gray-700 text-xs font-bold transition-all cursor-pointer"
            >
              {t('Cancel', 'إلغاء', 'İptal')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 rounded-md bg-blue-50 border border-slate-200 text-red-600 hover:bg-slate-100 hover:text-red-700 text-xs font-bold transition-all cursor-pointer"
          >
            {t('Delete Account', 'حذف الحساب', 'Hesabı Sil')}
          </button>
        )}
      </div>
    </div>
  );
}
