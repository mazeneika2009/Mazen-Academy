import { api } from './api';

export const register = (email, phone, password, name) =>
  api('/api/auth/register', {
    method: 'POST',
    body: { email, phone, password, name },
  });

export const login = (email, password) =>
  api('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });

export const verify = (userId, code) =>
  api('/api/auth/verify', {
    method: 'POST',
    body: { userId, code },
  });

export const validateSession = (sessionId) =>
  api('/api/auth/session', {
    method: 'POST',
    body: { sessionId },
  });

export const forgotPassword = (email) =>
  api('/api/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });

export const resendCode = (userId) =>
  api('/api/auth/resend-code', {
    method: 'POST',
    body: { userId },
  });

export const deleteAccount = (sessionId) =>
  api('/api/auth/delete', {
    method: 'POST',
    body: { sessionId },
  });
