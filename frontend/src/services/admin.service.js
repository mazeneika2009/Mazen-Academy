import { api } from './api';

function adminHeaders(token) {
  return { 'x-admin-token': token };
}

export const login = (username, password) =>
  api('/api/admin/login', {
    method: 'POST',
    body: { username, password },
  });

export const getUsers = (token) =>
  api('/api/admin/users', { headers: adminHeaders(token) });

export const togglePaid = (token, userId, paidGardens) =>
  api('/api/admin/users/toggle-paid', {
    method: 'POST',
    headers: adminHeaders(token),
    body: { userId, paidGardens },
  });

export const getPayments = (token) =>
  api('/api/admin/payments', { headers: adminHeaders(token) });

export const approvePayment = (token, transactionId) =>
  api('/api/admin/payments/approve', {
    method: 'POST',
    headers: adminHeaders(token),
    body: { transactionId },
  });

export const rejectPayment = (token, transactionId, reason) =>
  api('/api/admin/payments/reject', {
    method: 'POST',
    headers: adminHeaders(token),
    body: { transactionId, reason },
  });

export const getAnalytics = (token) =>
  api('/api/admin/analytics', { headers: adminHeaders(token) });

export const getQuizDegrees = (token) =>
  api('/api/admin/quiz-degrees', { headers: adminHeaders(token) });

export const getQueries = (token) =>
  api('/api/admin/queries', { headers: adminHeaders(token) });

export const answerQuery = (token, queryId, text) =>
  api('/api/admin/queries/answer', {
    method: 'POST',
    headers: adminHeaders(token),
    body: { queryId, text },
  });

export const getAuditLogs = (token) =>
  api('/api/admin/audit-logs', { headers: adminHeaders(token) });

export const getSmtpStatus = (token) =>
  api('/api/admin/smtp/status', { headers: adminHeaders(token) });

export const testSmtp = (token, testEmail) =>
  api('/api/admin/smtp/test', {
    method: 'POST',
    headers: adminHeaders(token),
    body: { testEmail },
  });

export const createGarden = (token, data) =>
  api('/api/admin/cms/gardens', {
    method: 'POST',
    headers: adminHeaders(token),
    body: data,
  });

export const updateGarden = (token, data) =>
  api('/api/admin/cms/gardens', {
    method: 'POST',
    headers: adminHeaders(token),
    body: data,
  });

export const deleteGarden = (token, id) =>
  api('/api/admin/cms/delete', {
    method: 'POST',
    headers: adminHeaders(token),
    body: { type: 'garden', id },
  });

export const createSeed = (token, data) =>
  api('/api/admin/cms/seeds', {
    method: 'POST',
    headers: adminHeaders(token),
    body: data,
  });

export const updateSeed = (token, data) =>
  api('/api/admin/cms/seeds', {
    method: 'POST',
    headers: adminHeaders(token),
    body: data,
  });

export const deleteSeed = (token, id) =>
  api('/api/admin/cms/delete', {
    method: 'POST',
    headers: adminHeaders(token),
    body: { type: 'seed', id },
  });

export const getQuizQuestions = (seedId) =>
  api(`/api/quiz_questions?seedId=${encodeURIComponent(seedId)}`);

export const createQuizQuestion = (token, data) =>
  api('/api/admin/quiz_questions', {
    method: 'POST',
    headers: adminHeaders(token),
    body: data,
  });

export const deleteQuizQuestion = (token, id) =>
  api('/api/admin/quiz_questions/delete', {
    method: 'POST',
    headers: adminHeaders(token),
    body: { id },
  });

export const getQuizAnswers = (sessionId) =>
  api('/api/quiz_answers/get', {
    method: 'POST',
    body: { sessionId },
  });
