import { useState, useEffect, useCallback } from 'react';
import * as gardenService from '../services/garden.service';

export function useGardens() {
  const [gardens, setGardens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGardens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gardenService.listGardens();
      if (Array.isArray(data)) setGardens(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGardens();
  }, [fetchGardens]);

  return { gardens, loading, error, refresh: fetchGardens };
}

export function useGardenSeeds(gardenId) {
  const [seeds, setSeeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSeeds = useCallback(async () => {
    if (!gardenId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await gardenService.getSeeds(gardenId);
      if (Array.isArray(data)) setSeeds(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [gardenId]);

  useEffect(() => {
    fetchSeeds();
  }, [fetchSeeds]);

  return { seeds, loading, error, refresh: fetchSeeds };
}
