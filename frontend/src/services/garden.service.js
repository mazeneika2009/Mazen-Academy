import { api } from './api';

export const listGardens = () =>
  api('/api/gardens');

export const getSeeds = (gardenId) =>
  api(`/api/gardens/${gardenId}/seeds`);

export const getAllSeeds = () =>
  api('/api/seeds');

export const streamSeed = (seedId, token) =>
  api(`/api/seeds/${seedId}/stream?token=${encodeURIComponent(token)}`);
