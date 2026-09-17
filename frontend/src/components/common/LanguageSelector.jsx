import React from 'react';

export function LanguageSelector({ currentLang, onLanguageChange }) {
  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'ar', label: 'AR' },
    { code: 'tr', label: 'TR' },
  ];

  return (
    <div className="flex items-center gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onLanguageChange(lang.code)}
          className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors duration-200 cursor-pointer ${
            currentLang === lang.code
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-500 hover:text-slate-700 border border-transparent'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
