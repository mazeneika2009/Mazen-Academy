import React from 'react';

export function GrowthReportModal({ isOpen, onClose, lang, report }) {
  const t = (en, ar, tr) => lang === 'ar' ? ar : lang === 'tr' ? tr : en;
  if (!isOpen || !report) return null;

  const hours = report.totalHours || report.hoursSpent || 0;
  const minutes = report.totalMinutes || 0;
  const hoursDisplay = typeof hours === 'number' && !isNaN(hours) ? hours : parseFloat(hours) || 0;
  const totalHours = Math.floor(hoursDisplay);
  const totalMinutes = minutes > 0 ? minutes : Math.round((hoursDisplay - totalHours) * 60);
  const completedSeeds = report.completedSeeds || report.completedSeedsCount || 0;
  const totalSeeds = report.totalSeeds || report.totalSeedsCount || 0;
  const score = report.score || (totalSeeds > 0 ? Math.round((completedSeeds / totalSeeds) * 100) : 0);
  const closeLabel = t('Close', 'إغلاق', 'Kapat');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-700">{t('Course certificate', 'شهادة الدورة', 'Kurs sertifikası')}</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {closeLabel}
          </button>
        </div>

        <div className="p-5 space-y-5">
          {report.gardenTitle && (
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">{t('Course', 'الدورة', 'Kurs')}</p>
              <p className="text-sm font-semibold text-gray-900">{report.gardenTitle}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-md p-3 border border-slate-200 text-center shadow-sm">
              <p className="text-lg font-bold text-blue-700">{completedSeeds}</p>
              <p className="text-[10px] text-gray-500">{t('Completed', 'مكتمل', 'Tamamlandı')}</p>
            </div>
            <div className="bg-white rounded-md p-3 border border-slate-200 text-center shadow-sm">
              <p className="text-lg font-bold text-amber-600">{score}%</p>
              <p className="text-[10px] text-gray-500">{t('Progress', 'تقدم', 'İlerleme')}</p>
            </div>
            <div className="bg-white rounded-md p-3 border border-slate-200 text-center shadow-sm">
              <p className="text-lg font-bold text-amber-600">{totalHours}{t('h', 'س', 's')}</p>
              <p className="text-[10px] text-gray-500">{t('Hours', 'ساعات', 'Saat')}</p>
            </div>
          </div>

          {report.userName && (
            <div className="bg-white rounded-md p-3 border border-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                {t('Student', 'طالب', 'Öğrenci')}
              </p>
              <p className="text-sm text-gray-900">{report.userName}</p>
              {report.completedAt && <p className="text-[10px] text-gray-400 mt-1">{report.completedAt}</p>}
            </div>
          )}

          {report.skillsAcquired && (
            <div className="bg-white rounded-md p-3 border border-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                {t('Skills Acquired', 'المهارات المكتسبة', 'Kazanılan Beceriler')}
              </p>
              <p className="text-xs text-gray-700 leading-relaxed">{report.skillsAcquired}</p>
            </div>
          )}

          {report.seeds?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">{t('Lessons', 'الدروس', 'Dersler')}</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {report.seeds.map((seed, i) => (
                  <div key={i} className="bg-white rounded-md p-2.5 border border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-gray-700 truncate mr-2">{seed.title}</span>
                    <span className={`text-[10px] flex-shrink-0 ${seed.completed ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {seed.completed ? t('Done', 'تم', 'Tamamlandı') : t('In Progress', 'قيد التنفيذ', 'Devam Ediyor')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.certificateId && (
            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-[10px] text-gray-400 mb-1">{t('Certificate', 'شهادة', 'Sertifika')}</p>
              <p className="text-xs font-mono text-blue-600">{report.certificateId}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
