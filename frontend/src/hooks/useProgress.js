import { useState, useCallback } from 'react';
import * as studentService from '../services/student.service';

export function useProgress() {
  const [gardenProgress, setGardenProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGardenProgress = useCallback(async (sessionId, gardenId) => {
    if (!sessionId || !gardenId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await studentService.getGardenProgress(sessionId, gardenId);
      setGardenProgress(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProgress = useCallback(async (sessionId, seedId, watchedSeconds) => {
    try {
      await studentService.saveProgress(sessionId, seedId, watchedSeconds);
    } catch {
      // silently fail
    }
  }, []);

  return { gardenProgress, loading, error, fetchGardenProgress, saveProgress };
}
