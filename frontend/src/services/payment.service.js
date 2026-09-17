import { api } from './api';

export const checkout = (gardenId, country, paymentMethod, sessionId, paymentScreenshot) =>
  api('/api/payments/checkout', {
    method: 'POST',
    body: { gardenId, country, paymentMethod, sessionId, paymentScreenshot },
  });

export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api('/api/upload', { method: 'POST', body: formData });
};
