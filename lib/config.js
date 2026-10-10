'use strict';

// Every value can be overridden with `zapier-platform env:set <version> NAME=value`, so one build can point at
// dev.qrx.codes and the dev Clerk instance. Read at call time, not load time, so the values set on Zapier apply.

const trimSlash = (value) => value.replace(/\/+$/, '');

const apiBase = () => trimSlash(process.env.QRX_BASE_URL || 'https://qrx.codes');

const oauthBase = () => trimSlash(process.env.QRX_OAUTH_URL || 'https://clerk.qrx.codes');

// The RFC 8707 resource the access token is issued for; Clerk sets the token's `aud` from it.
const oauthResource = () => process.env.QRX_OAUTH_RESOURCE || `${apiBase()}/v1`;

const api = (path) => `${apiBase()}/v1${path}`;

const isApiUrl = (url) => typeof url === 'string' && url.startsWith(`${apiBase()}/v1/`);

const SCOPES = 'qrx:read qrx:generate offline_access';

const PLANS_URL = 'https://qrx.codes';

module.exports = { apiBase, oauthBase, oauthResource, api, isApiUrl, SCOPES, PLANS_URL };
