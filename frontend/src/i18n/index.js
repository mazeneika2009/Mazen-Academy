import { localization } from '../types.js';

export { localization };

export function tr(lang, en, ar, tr) {
  return lang === 'ar' ? ar : lang === 'tr' ? tr : en;
}

export function t(lang, key) {
  return localization[lang]?.[key] ?? localization.en[key] ?? key;
}
