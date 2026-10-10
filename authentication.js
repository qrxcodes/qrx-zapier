'use strict';

const { api, oauthBase, oauthResource, SCOPES } = require('./lib/config');

// Sign-in with a QRX account. QRX's sign-in runs on Clerk, which issues the access and refresh tokens for the
// "QRX for Zapier" OAuth application (a confidential client, so it has a secret, with PKCE on top).

const authorizeUrl = (z, bundle) => {
  const url = new URL(`${oauthBase()}/oauth/authorize`);
  url.searchParams.set('client_id', process.env.CLIENT_ID || '');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', bundle.inputData.redirect_uri);
  url.searchParams.set('state', bundle.inputData.state);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('resource', oauthResource());
  return url.toString();
};

const tokenRequest = (z, body) =>
  z.request({
    method: 'POST',
    url: `${oauthBase()}/oauth/token`,
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: {
      ...body,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      resource: oauthResource(),
    },
  });

const getAccessToken = async (z, bundle) => {
  const response = await tokenRequest(z, {
    grant_type: 'authorization_code',
    code: bundle.inputData.code,
    redirect_uri: bundle.inputData.redirect_uri,
    code_verifier: bundle.inputData.code_verifier,
  });
  return {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token,
  };
};

// Clerk rotates refresh tokens, so keep the new one whenever it sends one.
const refreshAccessToken = async (z, bundle) => {
  const response = await tokenRequest(z, {
    grant_type: 'refresh_token',
    refresh_token: bundle.authData.refresh_token,
  });
  return {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token || bundle.authData.refresh_token,
  };
};

// Names the connection after the QRX account's email when the sign-in shares it, so people with more than one
// account can tell them apart.
const connectionLabel = async (z, bundle) => {
  try {
    const response = await z.request({
      url: `${oauthBase()}/oauth/userinfo`,
      headers: { Authorization: `Bearer ${bundle.authData.access_token}`, accept: 'application/json' },
    });
    return response.data.email || response.data.preferred_username || 'QRX account';
  } catch {
    return 'QRX account';
  }
};

const test = async (z) => {
  const response = await z.request({ url: api('/account') });
  return response.data;
};

module.exports = {
  type: 'oauth2',
  oauth2Config: {
    authorizeUrl,
    getAccessToken,
    refreshAccessToken,
    scope: SCOPES,
    autoRefresh: true,
    enablePkce: true,
  },
  fields: [],
  test,
  connectionLabel,
};
