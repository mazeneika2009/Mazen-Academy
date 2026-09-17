import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { localization } from '../types';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, verify: verifyAuth } = useAuthContext();
  const { lang } = useAppContext();

  const screen = location.pathname.replace('/', '') || 'login';

  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [authError, setAuthError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [verificationUserId, setVerificationUserId] = useState(() => sessionStorage.getItem('kg_verify_user_id') || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const persistVerifyUserId = (id) => {
    setVerificationUserId(id || '');
    if (id) sessionStorage.setItem('kg_verify_user_id', id);
    else sessionStorage.removeItem('kg_verify_user_id');
  };

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const t = localization[lang];
  const showPassLabel = lang === 'ar' ? (showPass ? 'إخفاء' : 'إظهار') : lang === 'tr' ? (showPass ? 'Gizle' : 'Göster') : (showPass ? 'Hide' : 'Show');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setSuccessMsg('');
    try {
      const data = await login(emailInput, passInput);
      if (data.requiresVerification) {
        persistVerifyUserId(data.userId);
        navigate('/verify');
        setSuccessMsg(data.message);
        return;
      }
      navigate('/');
      setSuccessMsg('Logged in. Welcome back.');
    } catch (err) {
      setAuthError(err.message || 'Can\'t reach the server. Check your connection and try again.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setSuccessMsg('');
    if (!emailInput || !phoneInput || !passInput) {
      setAuthError('Please fill in every field.');
      return;
    }
    try {
      const data = await register(emailInput, phoneInput, passInput, nameInput);
      persistVerifyUserId(data.userId);
      navigate('/verify');
      setSuccessMsg('Account created. Enter the code we sent you.');
    } catch (err) {
      setAuthError(err.message || 'Could not create the account. Try again.');
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const data = await verifyAuth(verificationUserId, verificationCode);
      persistVerifyUserId('');
      navigate('/');
      setSuccessMsg('Verified. You\'re good to go.');
    } catch (err) {
      setAuthError(err.message || 'That code didn\'t work. Try again.');
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setSuccessMsg('');
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(t.reset_success_msg);
        persistVerifyUserId(data.userId);
        navigate('/verify');
      } else {
        setAuthError(data.error);
      }
    } catch {
      setAuthError('Network error. Try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendLoading || resendCooldown > 0) return;
    if (!verificationUserId) {
      setAuthError('No pending verification found. Please register or log in again to get a code.');
      return;
    }
    setAuthError('');
    setSuccessMsg('');
    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: verificationUserId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'New code sent — check your inbox.');
        setResendCooldown(30);
      } else {
        setAuthError(data.error || 'Could not resend the code. Try again.');
      }
    } catch {
      setAuthError('Network error. Try again.');
    } finally {
      setResendLoading(false);
    }
  };

  if (screen === 'login') {
    return (
      <div className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <h2 className="text-2xl font-extrabold text-gray-900 text-center font-headline">{t.login_title}</h2>
        <p className="text-xs text-gray-500 text-center mt-1.5 mb-6">{t.login_subtitle}</p>

        {authError && (
          <div className="p-3 bg-blue-50 border border-slate-200 text-red-700 rounded-md text-center text-xs mb-4 font-mono">
            {authError}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-semibold text-blue-700 block uppercase tracking-wider">{t.email_or_phone}</label>
            <input
              type="text"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={t.email_placeholder}
              className="input-field"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono font-semibold text-blue-700 uppercase tracking-wider">{t.password}</label>
              <button type="button" onClick={() => navigate('/forgot-password')} className="text-[9px] text-blue-600 hover:text-blue-700 font-mono cursor-pointer transition-colors">{t.forgot_password}</button>
            </div>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                placeholder={t.password_placeholder}
                className="input-field pr-16"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-700 hover:text-[#1d4ed8] px-2 py-1 rounded-md cursor-pointer transition-colors"
              >
                {showPassLabel}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full cursor-pointer"
          >
            {t.login_title}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => navigate('/register')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors"
          >
            {t.create_account}
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'register') {
    return (
      <div className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <h2 className="text-2xl font-extrabold text-gray-900 text-center font-headline">{t.create_account}</h2>
        <p className="text-xs text-gray-500 text-center mt-1.5 mb-6">{t.register_subtitle}</p>

        {authError && (
          <div className="p-3 bg-blue-50 border border-slate-200 text-red-700 rounded-md text-center text-xs mb-4 font-mono">
            {authError}
          </div>
        )}

        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-semibold text-blue-700 block uppercase tracking-wider">{t.email_address}</label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={t.email_placeholder}
              className="input-field"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-semibold text-blue-700 block uppercase tracking-wider">{t.full_name}</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={t.full_name_placeholder}
              className="input-field"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-semibold text-blue-700 block uppercase tracking-wider">{t.phone_wallet_num}</label>
            <input
              type="text"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder={t.phone_placeholder}
              className="input-field"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-semibold text-blue-700 block uppercase tracking-wider">{t.password}</label>
            <input
              type="password"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              placeholder={t.password_placeholder}
              className="input-field"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full cursor-pointer"
          >
            {t.create_account}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors cursor-pointer"
          >
            {t.already_have_account}
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'verify') {
    return (
      <div className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <h2 className="text-2xl font-extrabold text-gray-900 text-center font-headline">{t.verify_title}</h2>
        <p className="text-xs text-gray-500 text-center mt-1.5 mb-6 leading-relaxed">
          {t.verify_subtitle}
        </p>

        {authError && (
          <div className="p-3 bg-blue-50 border border-slate-200 text-red-700 rounded-md text-center text-xs mb-4 font-mono">
            {authError}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-center text-xs mb-4 font-mono">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleVerifySubmit} className="space-y-4">
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder={t.sync_key_placeholder}
            maxLength={6}
            className="input-field text-center text-xl font-bold tracking-[0.3em] py-3.5"
            required
          />

          <div className="space-y-3">
            <button
              type="submit"
              className="btn-primary w-full cursor-pointer"
            >
              {t.verify_btn}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendLoading || resendCooldown > 0}
              className="w-full py-2 text-[10px] text-blue-600 hover:text-blue-700 font-semibold uppercase tracking-widest cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading ? '...' : resendCooldown > 0 ? `Resend again in ${resendCooldown}s` : t.resend_btn}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (screen === 'forgot-password') {
    return (
      <div className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <h2 className="text-2xl font-extrabold text-gray-900 text-center font-headline">{t.forgot_password_title}</h2>
        <p className="text-xs text-gray-500 text-center mt-1.5 mb-6 leading-relaxed">
          {t.forgot_password_subtitle}
        </p>

        {authError && (
          <div className="p-3 bg-blue-50 border border-slate-200 text-red-700 rounded-md text-center text-xs mb-4 font-mono">
            {authError}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-center text-xs mb-4 font-mono">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
          <input
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder={t.email_placeholder}
            className="input-field"
            required
          />

          <button
            type="submit"
            disabled={resetLoading}
            className="btn-primary w-full cursor-pointer disabled:opacity-50"
          >
            {resetLoading ? '...' : t.send_reset_btn}
          </button>
        </form>
        <div className="mt-5 text-center">
          <button onClick={() => navigate('/login')} className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors cursor-pointer">
            {t.already_have_account.split(/[?؟]/)[1]?.trim() || t.login_title}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
