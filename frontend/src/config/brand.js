// Central brand + course-media config.
// Change the name here once and the whole UI follows.
// All media is data-driven: thumbnails / instructors / trailers come from
// garden props first, then fall back to category defaults below.

export const BRAND = {
  nameEn: 'Mazen Academy',
  nameAr: 'Mazen Academy',
  nameTr: 'Mazen Academy',
  // latin fallback used in emails / logs / <title>
  nameLatin: 'Mazen Academy',
  taglineEn: 'Evening coding courses for working adults',
  taglineAr: 'دورات برمجة مسائية للموظفين',
  taglineTr: 'Çalışanlar için akşam kod kursları',
  locationLine: 'Evening coding courses — Cairo / Istanbul',
};

export function brandName(lang) {
  if (lang === 'ar') return BRAND.nameAr;
  if (lang === 'tr') return BRAND.nameTr;
  return BRAND.nameEn;
}

export function brandTagline(lang) {
  if (lang === 'ar') return BRAND.taglineAr;
  if (lang === 'tr') return BRAND.taglineTr;
  return BRAND.taglineEn;
}

// High-quality fallback thumbnails per category (Unsplash, fast CDN, responsive).
// Used only when garden.image is empty — pass garden.image to override.
export const CATEGORY_THUMBNAILS = {
  Programming: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=800&auto=format&fit=crop',
  Marketing: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop',
  Languages: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop',
  default: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop',
};

export function courseThumbnail(garden) {
  if (garden?.image) return garden.image;
  if (garden?.thumbnail) return garden.thumbnail;
  return CATEGORY_THUMBNAILS[garden?.category] || CATEGORY_THUMBNAILS.default;
}

// Instructor is fully prop-driven: use garden.instructor* when present,
// otherwise fall back to a sensible default per category so new courses
// work without a DB migration.
const CATEGORY_INSTRUCTORS = {
  Programming: { nameEn: 'Evening Code Team', nameAr: 'فريق البرمجة المسائية', nameTr: 'Akşam Kod Ekibi', titleEn: 'Senior Instructor', titleAr: 'مدرّب أول', titleTr: 'Kıdemli Eğitmen' },
  Marketing: { nameEn: 'Growth Team', nameAr: 'فريق التسويق', nameTr: 'Büyüme Ekibi', titleEn: 'Marketing Mentor', titleAr: 'مرشد تسويق', titleTr: 'Pazarlama Mentoru' },
  Languages: { nameEn: 'Language Lab', nameAr: 'مختبر اللغة', nameTr: 'Dil Laboratuvarı', titleEn: 'Language Coach', titleAr: 'مدرب لغة', titleTr: 'Dil Koçu' },
  default: { nameEn: 'Mazen Team', nameAr: 'فريق مازن', nameTr: 'Mazen Ekibi', titleEn: 'Instructor', titleAr: 'المدرّب', titleTr: 'Eğitmen' },
};

export function courseInstructor(garden, lang = 'en') {
  const fallback = CATEGORY_INSTRUCTORS[garden?.category] || CATEGORY_INSTRUCTORS.default;
  const name = garden?.instructorName || garden?.instructor
    || (lang === 'ar' ? fallback.nameAr : lang === 'tr' ? fallback.nameTr : fallback.nameEn);
  const title = garden?.instructorTitle
    || (lang === 'ar' ? fallback.titleAr : lang === 'tr' ? fallback.titleTr : fallback.titleEn);
  const avatar = garden?.instructorAvatar || '';
  return { name, title, avatar };
}

export function instructorInitials(name) {
  if (!name) return 'M';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Trailer resolution: explicit garden.trailerUrl wins,
// otherwise first seed video, otherwise null.
export function courseTrailerUrl(garden, seeds = []) {
  if (garden?.trailerUrl) return garden.trailerUrl;
  if (garden?.trailer) return garden.trailer;
  const first = Array.isArray(seeds) ? seeds.find(s => s?.videoUrl && !String(s.videoUrl).startsWith('bunny_mock')) : null;
  return first?.videoUrl || null;
}

export function isYouTubeEmbed(url) {
  return typeof url === 'string' && url.includes('/embed/');
}

// Currency follows the UI language so the amount changes with it:
// Arabic & English → EGP, Turkish → TRY.
export function defaultCurrency(lang) {
  return lang === 'tr' ? 'TRY' : 'EGP';
}

export function coursePrice(garden, lang, t) {
  const useTRY = lang === 'tr';
  const amount = useTRY ? garden?.priceTRY : garden?.priceEGP;
  const currency = useTRY ? (t?.currency_try || 'TRY') : (t?.currency_egp || 'EGP');
  return { amount: amount ?? 0, currency, code: useTRY ? 'TRY' : 'EGP', label: `${amount ?? 0} ${currency}` };
}
