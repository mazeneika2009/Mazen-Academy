import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as gardenService from '../services/garden.service';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('kg_lang');
    return (saved === 'en' || saved === 'ar' || saved === 'tr') ? saved : 'ar';
  });

  const [gardens, setGardens] = useState([]);
  const [gardensLoading, setGardensLoading] = useState(false);

  const changeLanguage = useCallback((l) => {
    setLang(l);
    localStorage.setItem('kg_lang', l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  }, []);

  const fetchGardens = useCallback(async () => {
    setGardensLoading(true);
    try {
      const data = await gardenService.listGardens();
      if (Array.isArray(data)) setGardens(data);
    } catch {
      // backend not available
    } finally {
      setGardensLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGardens();
  }, [fetchGardens]);

  useEffect(() => {
    changeLanguage(lang);
  }, []);

  return (
    <AppContext.Provider value={{ lang, gardens, gardensLoading, changeLanguage, fetchGardens, setGardens }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
