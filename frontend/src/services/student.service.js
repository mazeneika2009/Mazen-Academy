import { api } from './api';

export const saveProgress = (sessionId, seedId, watchedSeconds) =>
  api('/api/student_growth/save', {
    method: 'POST',
    body: { sessionId, seedId, watchedSeconds },
  });

export const getProgress = (sessionId) =>
  api('/api/student_growth/progress', {
    method: 'POST',
    body: { sessionId },
  });

export const getGardenProgress = (sessionId, gardenId) =>
  api('/api/student_growth/garden-progress', {
    method: 'POST',
    body: { sessionId, gardenId },
  });

export const getNotebook = (seedId, email) =>
  api(`/api/notebook?seedId=${encodeURIComponent(seedId)}&email=${encodeURIComponent(email)}`);

export const saveNote = (seedId, email, note) =>
  api('/api/notebook', {
    method: 'POST',
    body: { seedId, email, note },
  });

export const deleteNote = (seedId, email, index) =>
  api('/api/notebook/delete', {
    method: 'POST',
    body: { seedId, email, index },
  });

export const getQueries = (seedId, sessionId) =>
  api(`/api/queries?seedId=${encodeURIComponent(seedId)}&sessionId=${encodeURIComponent(sessionId)}`);

export const postQuery = (seedId, sessionId, text) =>
  api('/api/queries', {
    method: 'POST',
    body: { seedId, sessionId, text },
  });

export const getEmails = (sessionId) =>
  api(`/api/emails?sessionId=${encodeURIComponent(sessionId)}`);

export const markEmailRead = (sessionId, emailId) =>
  api('/api/emails/read', {
    method: 'POST',
    body: { sessionId, emailId },
  });

export const sendEmail = (toEmail, subject, body) =>
  api('/api/emails/send', {
    method: 'POST',
    body: { toEmail, subject, body },
  });

export const deleteEmail = (sessionId, emailId) =>
  api('/api/emails/delete', {
    method: 'POST',
    body: { sessionId, emailId },
  });

export const requestOTP = (sessionId, gardenId) =>
  api('/api/reports/request-otp', {
    method: 'POST',
    body: { sessionId, gardenId },
  });

export const verifyOTP = (sessionId, gardenId, otpCode, lang) =>
  api('/api/reports/verify-otp', {
    method: 'POST',
    body: { sessionId, gardenId, otpCode, lang },
  });
