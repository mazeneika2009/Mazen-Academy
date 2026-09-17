import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import RootLayout from './RootLayout';

const HomePage = lazy(() => import('./pages/HomePage'));
const ClassroomPage = lazy(() => import('./pages/ClassroomPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Loading...</p>
      </div>
    </div>
  );
}

export function getTagStyles(tag) {
  const t = tag.toLowerCase().trim();
  if (['react', 'react hooks', 'vite', 'frontend', 'ui'].some(k => t.includes(k))) {
    return 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100';
  }
  if (['typescript', 'js', 'javascript'].some(k => t.includes(k))) {
    return 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100';
  }
  if (['system design', 'concurrency', 'threading', 'cloud', 'architect', 'performance'].some(k => t.includes(k))) {
    return 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200';
  }
  if (['python', 'oop', 'fastapi', 'backend', 'routing'].some(k => t.includes(k))) {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100';
  }
  return 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200';
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<RootLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/gardens" element={<HomePage />} />
                <Route path="/profile" element={<HomePage />} />
                <Route path="/classroom" element={<ClassroomPage />} />
                <Route path="/classroom/:gardenId" element={<ClassroomPage />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/register" element={<AuthPage />} />
                <Route path="/verify" element={<AuthPage />} />
                <Route path="/forgot-password" element={<AuthPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Route>
            </Routes>
          </Suspense>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
