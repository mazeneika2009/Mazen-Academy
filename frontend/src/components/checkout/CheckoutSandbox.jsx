import React, { useState, useRef, useEffect } from 'react';

export function CheckoutSandbox({ garden, sessionId, lang, onPaymentSuccess }) {
  const t = (en, ar, tr) => lang === 'ar' ? ar : lang === 'tr' ? tr : en;
  // Checkout currency follows the UI language (AR/EN → EGP, TR → TRY)
  const initialCurrency = lang === 'tr' ? 'TRY' : 'EGP';
  const [currency, setCurrency] = useState(initialCurrency);
  const [amount, setAmount] = useState(
    initialCurrency === 'TRY' ? (garden?.priceTRY || 500) : (garden?.priceEGP || 1000)
  );

  // Re-sync amount when language or course changes
  useEffect(() => {
    const c = lang === 'tr' ? 'TRY' : 'EGP';
    setCurrency(c);
    setAmount(c === 'TRY' ? (garden?.priceTRY || 500) : (garden?.priceEGP || 1000));
  }, [lang, garden?.id]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('Please select an image file', 'يرجى اختيار ملف صورة', 'Lütfen bir resim dosyası seçin'));
      return;
    }
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('Please select an image file', 'يرجى اختيار ملف صورة', 'Lütfen bir resim dosyası seçin'));
      return;
    }
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handlePayment = async () => {
    if (!screenshot) {
      setError(t('Please upload a payment screenshot', 'يرجى رفع لقطة شاشة الدفع', 'Lütfen ödeme ekran görüntüsünü yükleyin'));
      return;
    }
    if (!phoneNumber.trim()) {
      setError(t('Please enter your InstaPay phone number', 'يرجى إدخال رقم هاتف إنستاباي الخاص بك', 'Lütfen InstaPay telefon numaranızı girin'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', screenshot);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(t('Failed to upload screenshot', 'فشل رفع لقطة الشاشة', 'Ekran görüntüsü yüklenemedi'));
      }

      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gardenId: garden?.id,
          country: currency === 'EGP' ? 'eg' : 'tr',
          paymentMethod: 'instapay:' + phoneNumber.trim(),
          sessionId,
          paymentScreenshot: uploadData.url
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => onPaymentSuccess(), 1500);
      } else {
        setError(data.error || t('Payment failed', 'فشل الدفع', 'Ödeme başarısız'));
      }
    } catch (err) {
      setError(err.message || t('Network error', 'خطأ في الشبكة', 'Ağ hatası'));
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-sm font-bold text-emerald-600">{t('Payment Successful!', 'تم الدفع بنجاح!', 'Ödeme Başarılı!')}</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-lg border border-slate-200 p-6 bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm font-semibold text-gray-700">{t('InstaPay Payment', 'الدفع عبر إنستاباي', 'InstaPay ile Ödeme')}</span>
        <span className="ml-auto text-[10px] text-blue-700 font-mono font-bold">{t('SECURE', 'آمن', 'GÜVENLİ')}</span>
      </div>

      {garden && (
        <div className="bg-white rounded-md p-3 mb-4 border border-blue-100">
          <p className="text-xs text-gray-500">{garden.titleEn || garden.titleAr}</p>
          <p className="text-lg font-bold text-blue-700">{currency} {amount}</p>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={() => { setCurrency('EGP'); setAmount(garden?.priceEGP || 1000); }}
          className={`px-3 py-1.5 text-xs rounded-md ${currency === 'EGP' ? 'bg-blue-100 text-blue-700 border border-slate-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
          {t('Egypt (EGP)', 'مصر (EGP)', 'Mısır (EGP)')}
        </button>
        <button onClick={() => { setCurrency('TRY'); setAmount(garden?.priceTRY || 500); }}
          className={`px-3 py-1.5 text-xs rounded-md ${currency === 'TRY' ? 'bg-blue-100 text-blue-700 border border-slate-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
          {t('Turkey (TRY)', 'تركيا (TRY)', 'Türkiye (TRY)')}
        </button>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2">
          {t('Send exact amount via InstaPay and upload the payment screenshot', 'أرسل المبلغ المحدد عبر إنستاباي وارفع لقطة شاشة الدفع', 'Tam tutarı InstaPay ile gönderin ve ödeme ekran görüntüsünü yükleyin')}
        </div>
        <div className="bg-white rounded-md p-3 border border-blue-100 mb-2">
          <p className="text-[10px] text-gray-500">{t('InstaPay Account', 'حساب إنستاباي', 'InstaPay Hesabı')}</p>
          <p className="text-sm font-mono text-blue-700">01000000000</p>
        </div>

        <div className="mb-3">
          <label className="text-[10px] text-gray-500 mb-1.5 block">
            {t('Your InstaPay Phone Number', 'رقم هاتف إنستاباي الخاص بك', 'InstaPay Telefon Numaranız')}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
            placeholder={t('e.g. 01012345678', 'مثال: 01012345678', 'ör: 01012345678')}
            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400"
          />
        </div>

        <div className="mb-1">
          <label className="text-[10px] text-gray-500 mb-1.5 block">
            {t('Payment Screenshot', 'لقطة شاشة الدفع', 'Ödeme Ekran Görüntüsü')}
            <span className="text-red-500 ml-1">*</span>
          </label>
        </div>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors ${screenshotPreview ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-blue-400 bg-white'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          {screenshotPreview ? (
            <div className="flex flex-col items-center gap-2">
              <img src={screenshotPreview} alt="Payment screenshot" className="max-h-32 rounded-md object-contain" />
              <span className="text-[10px] text-emerald-600">{t('Click to Replace', 'انقر للاستبدال', 'Değiştirmek için Tıkla')}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-500">{t('Upload', 'رفع', 'Yükle')}</span>
              <span className="text-xs text-gray-500">
                {t('Drop screenshot here or click to browse', 'اسحب لقطة الشاشة هنا أو انقر للتصفح', 'Ekran görüntüsünü sürükleyin veya göz atmak için tıklayın')}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full py-3 rounded-md bg-blue-600 hover:bg-blue-700 border border-blue-600 text-white font-semibold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        style={{ backgroundColor: '#2563eb' }}
      >
        {loading ? t('Processing...', 'جارٍ المعالجة...', 'İşleniyor...') : `${t('Pay with InstaPay', 'ادفع عبر إنستاباي', 'InstaPay ile Öde')} ${currency} ${amount}`}
      </button>
    </div>
  );
}
