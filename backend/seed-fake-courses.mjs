import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pool, upsertQuery } from './server/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

function yt(id) { return `https://www.youtube.com/embed/${id}`; }

const gardens = [
  {
    id: 'g_py_evening01',
    titleEn: 'Python After Work – Evening Course',
    titleAr: 'بايثون بعد الشغل – دورة مسائية',
    titleTr: 'İş Sonrası Python – Akşam Kursu',
    descriptionEn: 'Evening Python course for busy adults. 5-7 hours a week: basics, loops, functions, OOP and one real mini-project.',
    descriptionAr: 'دورة بايثون مسائية للناس المشغولة. ٥-٧ ساعات أسبوعياً: أساسيات، شروط، دوال، برمجة كائنية ومشروع حقيقي واحد.',
    descriptionTr: 'Yoğun yetişkinler için akşam Python kursu. Haftada 5-7 saat: temeller, döngüler, fonksiyonlar, OOP ve gerçek bir mini proje.',
    category: 'Programming',
    priceEGP: 650, priceTRY: 190, rating: 4.8, image: '',
  },
  {
    id: 'g_js_evening01',
    titleEn: 'JavaScript After Work – Evening Course',
    titleAr: 'جافاسكريبت بعد الشغل – دورة مسائية',
    titleTr: 'İş Sonrası JavaScript – Akşam Kursu',
    descriptionEn: 'Evening JavaScript course: DOM, events, fetch API and a to-do app you build after work hours.',
    descriptionAr: 'دورة جافاسكريبت مسائية: التعامل مع الصفحة، الأحداث، جلب البيانات ومشروع تطبيق مهام تعمله بعد الشغل.',
    descriptionTr: 'Akşam JavaScript kursu: DOM, eventler, fetch API ve iş çıkışı yapacağınız bir yapılacaklar uygulaması.',
    category: 'Programming',
    priceEGP: 700, priceTRY: 210, rating: 4.9, image: '',
  },
  {
    id: 'g_css_evening01',
    titleEn: 'CSS + Tailwind After Work – Evening Course',
    titleAr: 'CSS وتايلويند بعد الشغل – دورة مسائية',
    titleTr: 'İş Sonrası CSS + Tailwind – Akşam Kursu',
    descriptionEn: 'Evening CSS course: flexbox, grid, responsive design and Tailwind. Short evening lessons, real landing page at the end.',
    descriptionAr: 'دورة CSS مسائية: فليكس، جريد، تصميم متجاوب وتايلويند. دروس مسائية قصيرة ومشروع صفحة هبوط حقيقية في الآخر.',
    descriptionTr: 'Akşam CSS kursu: flexbox, grid, responsive ve Tailwind. Kısa akşam dersleri, sonunda gerçek bir açılış sayfası.',
    category: 'Programming',
    priceEGP: 550, priceTRY: 165, rating: 4.7, image: '',
  },
];

const seeds = [
  // Python - 5 lessons
  { id: 's_py_e1', gardenId: 'g_py_evening01', titleEn: 'Evening Setup + First Python Script', titleAr: 'الإعداد وأول سكريبت بايثون', titleTr: 'Kurulum + İlk Python Betiği', duration: '12:00', videoUrl: yt('rfscVS0vtbw'), section: 'Getting Started', sortOrder: 1, tags: ['Python', 'Setup'] },
  { id: 's_py_e2', gardenId: 'g_py_evening01', titleEn: 'Variables & Data Types in 20 Minutes', titleAr: 'المتغيرات وأنواع البيانات', titleTr: 'Değişkenler ve Veri Tipleri', duration: '18:30', videoUrl: yt('_uQrJ0TkZlc'), section: 'Basics', sortOrder: 2, tags: ['Python', 'Basics'] },
  { id: 's_py_e3', gardenId: 'g_py_evening01', titleEn: 'If, Loops & Functions After Work', titleAr: 'الشروط والحلقات والدوال', titleTr: 'Koşullar, Döngüler ve Fonksiyonlar', duration: '22:10', videoUrl: yt('Xjv1sY630Uc'), section: 'Basics', sortOrder: 3, tags: ['Python', 'Loops'] },
  { id: 's_py_e4', gardenId: 'g_py_evening01', titleEn: 'Lists, Dicts & Files', titleAr: 'القوائم والقواميس والملفات', titleTr: 'Listeler, Sözlükler ve Dosyalar', duration: '24:00', videoUrl: yt('eWRfhZUzrAc'), section: 'Intermediate', sortOrder: 4, tags: ['Python', 'Data'] },
  { id: 's_py_e5', gardenId: 'g_py_evening01', titleEn: 'Evening Mini-Project: Expense Tracker', titleAr: 'مشروع مسائي: متتبع المصاريف', titleTr: 'Akşam Mini Projesi: Harcama Takibi', duration: '28:15', videoUrl: yt('kqtD5dpn9C8'), section: 'Projects', sortOrder: 5, tags: ['Python', 'Project'] },
  // JS - 5 lessons
  { id: 's_js_e1', gardenId: 'g_js_evening01', titleEn: 'JS After Work: Setup & First Script', titleAr: 'إعداد جافاسكريبت وأول سكريبت', titleTr: 'JS Kurulum ve İlk Betik', duration: '15:00', videoUrl: yt('W6NZfCO5SIk'), section: 'Getting Started', sortOrder: 1, tags: ['JavaScript', 'Setup'] },
  { id: 's_js_e2', gardenId: 'g_js_evening01', titleEn: 'Variables, Arrays & DOM Basics', titleAr: 'المتغيرات والمصفوفات وأساسيات DOM', titleTr: 'Değişkenler, Diziler ve DOM', duration: '21:30', videoUrl: yt('hdI2bqOjy3c'), section: 'Basics', sortOrder: 2, tags: ['JavaScript', 'DOM'] },
  { id: 's_js_e3', gardenId: 'g_js_evening01', titleEn: 'Functions & Evening Events Practice', titleAr: 'الدوال والتعامل مع الأحداث', titleTr: 'Fonksiyonlar ve Eventler', duration: '19:45', videoUrl: yt('UpzC6Uxgosk'), section: 'Basics', sortOrder: 3, tags: ['JavaScript', 'Events'] },
  { id: 's_js_e4', gardenId: 'g_js_evening01', titleEn: 'Event Loop Explained Simply', titleAr: 'شرح Event Loop ببساطة', titleTr: 'Event Loop Basit Anlatım', duration: '26:00', videoUrl: yt('8aGhZQkoFbQ'), section: 'Intermediate', sortOrder: 4, tags: ['JavaScript', 'Async'] },
  { id: 's_js_e5', gardenId: 'g_js_evening01', titleEn: 'Evening Project: To-Do App', titleAr: 'مشروع مسائي: تطبيق مهام', titleTr: 'Akşam Projesi: Yapılacaklar Uygulaması', duration: '30:20', videoUrl: yt('8dWL3wF_OMw'), section: 'Projects', sortOrder: 5, tags: ['JavaScript', 'Project'] },
  // CSS - 4 lessons
  { id: 's_css_e1', gardenId: 'g_css_evening01', titleEn: 'CSS Crash Evening: Selectors & Box Model', titleAr: 'أساسيات CSS: المحددات ونموذج الصندوق', titleTr: 'CSS Akşamı: Seçiciler ve Kutu Modeli', duration: '18:00', videoUrl: yt('yfoY53QXEnI'), section: 'CSS Basics', sortOrder: 1, tags: ['CSS', 'Basics'] },
  { id: 's_css_e2', gardenId: 'g_css_evening01', titleEn: 'Flexbox & Grid After Work', titleAr: 'فليكس وجريد بعد الشغل', titleTr: 'İş Sonrası Flexbox ve Grid', duration: '22:00', videoUrl: yt('1Rs2ND1ryYc'), section: 'Layout', sortOrder: 2, tags: ['CSS', 'Flexbox'] },
  { id: 's_css_e3', gardenId: 'g_css_evening01', titleEn: 'Tailwind in One Evening', titleAr: 'تايلويند في أمسية واحدة', titleTr: 'Bir Akşamda Tailwind', duration: '25:30', videoUrl: yt('D-h8L5hgWBGY'), section: 'Tailwind', sortOrder: 3, tags: ['CSS', 'Tailwind'] },
  { id: 's_css_e4', gardenId: 'g_css_evening01', titleEn: 'Evening Project: Landing Page', titleAr: 'مشروع مسائي: صفحة هبوط', titleTr: 'Akşam Projesi: Açılış Sayfası', duration: '28:00', videoUrl: yt('dFgzHOX84xQ'), section: 'Projects', sortOrder: 4, tags: ['CSS', 'Project'] },
];

async function upsert(table, columns, conflict, values) {
  await pool.query(upsertQuery(table, columns, conflict), values);
}

async function run() {
  try {
    for (const g of gardens) {
      await upsert('gardens',
        ['id','titleEn','titleAr','titleTr','descriptionEn','descriptionAr','descriptionTr','category','priceEGP','priceTRY','rating','image'],
        ['id'],
        [g.id, g.titleEn, g.titleAr, g.titleTr, g.descriptionEn, g.descriptionAr, g.descriptionTr, g.category, g.priceEGP, g.priceTRY, g.rating, g.image]);
      console.log('[OK] garden', g.id);
    }
    for (const s of seeds) {
      await upsert('seeds',
        ['id','gardenId','titleEn','titleAr','titleTr','duration','videoUrl','status','section','sortOrder'],
        ['id'],
        [s.id, s.gardenId, s.titleEn, s.titleAr, s.titleTr, s.duration, s.videoUrl, 'bloomed', s.section, s.sortOrder]);
      for (const tag of s.tags) {
        try { await pool.query(upsertQuery('seed_tags', ['seedId', 'tag'], ['seedId', 'tag']), [s.id, tag]); } catch {}
      }
      console.log('[OK] seed', s.id);
    }

    // update local cache db.json too
    const cachePath = path.join(__dirname, 'data', 'db.json');
    if (fs.existsSync(cachePath)) {
      const db = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      for (const g of gardens) {
        const i = db.gardens.findIndex(x => x.id === g.id);
        if (i === -1) db.gardens.push({ ...g, rating: String(g.rating) });
        else db.gardens[i] = { ...db.gardens[i], ...g, rating: String(g.rating) };
      }
      for (const s of seeds) {
        const i = db.seeds.findIndex(x => x.id === s.id);
        const row = { ...s, status: 'bloomed' };
        if (i === -1) db.seeds.push(row);
        else db.seeds[i] = { ...db.seeds[i], ...row };
      }
      fs.writeFileSync(cachePath, JSON.stringify(db, null, 2), 'utf8');
      console.log('[OK] db.json updated:', db.gardens.length, 'gardens,', db.seeds.length, 'seeds');
    }
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  } finally {
    await pool.end();
  }
}
run();
