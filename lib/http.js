'use strict';

const { isApiUrl, PLANS_URL } = require('./config');

// Adds the access token to QRX API calls only: never to Clerk's token endpoint or to image downloads.
const addBearerHeader = (request, z, bundle) => {
  if (isApiUrl(request.url)) {
    if (bundle.authData && bundle.authData.access_token) {
      request.headers.Authorization = `Bearer ${bundle.authData.access_token}`;
    }
    request.headers.Accept = request.headers.Accept || 'application/json';
    // Let handleProblems tell a used-up daily allowance apart from a short rate limit.
    request.throwForThrottlingEarly = false;
  }
  return request;
};

const problemName = (problem) => {
  const type = problem && typeof problem.type === 'string' ? problem.type : '';
  const hash = type.lastIndexOf('#');
  return hash >= 0 ? type.slice(hash + 1) : '';
};

const parseProblem = (response) => {
  try {
    const body = response.json !== undefined ? response.json : JSON.parse(response.content);
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
};

const retryAfterSeconds = (response) => {
  const value = parseInt(response.getHeader ? response.getHeader('retry-after') : '', 10);
  return Number.isNaN(value) ? null : value;
};

const appError = (z, message, name, status, extra = {}) => {
  const error = new z.errors.Error(message, name || 'error', status);
  Object.assign(error, { qrxProblem: name, qrxStatus: status }, extra);
  return error;
};

// Turns the API's RFC 9457 problems into errors that read well in a Zap's history.
const handleProblems = (response, z) => {
  if (!isApiUrl(response.request && response.request.url) || response.status < 400) {
    return response;
  }

  const problem = parseProblem(response);
  const name = problemName(problem);
  const status = response.status;
  const retryAfter = retryAfterSeconds(response);
  let detail = problem.detail || problem.title || `QRX answered ${status}.`;
  if (Array.isArray(problem.errors) && problem.errors.length > 0) {
    detail = problem.errors.map((e) => `${e.field} ${e.message}`).join('; ');
  }

  if (status === 401) {
    throw new z.errors.RefreshAuthError('Your QRX connection has expired. Reconnect your QRX account.');
  }
  if (name === 'plan-required') {
    const method = (response.request.method || '').toUpperCase();
    const message =
      method === 'PATCH'
        ? `Changing a code's link is on a paid plan. See ${PLANS_URL} for plans.`
        : `This is on a paid plan. See ${PLANS_URL} for plans.`;
    throw appError(z, message, name, status);
  }
  if (name === 'daily-limit') {
    throw appError(
      z,
      `No codes are left today on this QRX account. The count resets daily; see ${PLANS_URL} for plans.`,
      name,
      status,
      { retryAfter },
    );
  }
  if (status === 429 || status === 503) {
    throw new z.errors.ThrottledError(detail, retryAfter || 10);
  }
  if (name === 'not-found' || status === 404) {
    throw appError(z, detail, 'not-found', 404);
  }
  throw appError(z, detail, name || `http-${status}`, status, { retryAfter });
};

module.exports = { addBearerHeader, handleProblems, problemName };
