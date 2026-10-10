'use strict';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const { API, CLERK, authData, setup } = require('./helpers');

const appTester = zapier.createAppTester(App);
const { oauth2Config } = App.authentication;

const account = {
  object: 'account',
  plan: 'free',
  codes: { dailyLimit: 42, remainingToday: 38, resetsAt: '2026-10-09T00:00:00.000Z' },
  features: { changeDestination: false },
  rateLimits: { requests: { limit: 30, windowSeconds: 60 }, codes: { limit: 6, windowSeconds: 10 } },
  credentials: { type: 'oauth', prefix: null, environment: 'live' },
};

const formOf = (body) => Object.fromEntries(new URLSearchParams(body));

describe('authentication', () => {
  setup();

  it('is OAuth v2 with PKCE and refresh on 401', () => {
    expect(App.authentication.type).toBe('oauth2');
    expect(oauth2Config.enablePkce).toBe(true);
    expect(oauth2Config.autoRefresh).toBe(true);
    expect(oauth2Config.scope).toBe('qrx:read qrx:generate offline_access');
  });

  it('sends people to QRX sign-in with the client, scopes and resource', async () => {
    const url = new URL(
      await appTester(oauth2Config.authorizeUrl, {
        inputData: { state: 'st4te', redirect_uri: 'https://zapier.com/dashboard/auth/oauth/return/App1CLIAPI/' },
      }),
    );

    expect(url.origin + url.pathname).toBe(`${CLERK}/oauth/authorize`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'test-client-id',
      response_type: 'code',
      redirect_uri: 'https://zapier.com/dashboard/auth/oauth/return/App1CLIAPI/',
      state: 'st4te',
      scope: 'qrx:read qrx:generate offline_access',
      resource: 'https://qrx.codes/v1',
    });
  });

  it('exchanges the code with the PKCE verifier and the client secret', async () => {
    let form;
    nock(CLERK)
      .post('/oauth/token', (body) => {
        form = typeof body === 'string' ? formOf(body) : body;
        return true;
      })
      .reply(200, {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        token_type: 'Bearer',
        expires_in: 86400,
      });

    const result = await appTester(oauth2Config.getAccessToken, {
      inputData: { code: 'auth-code', redirect_uri: 'https://zapier.example/return', code_verifier: 'verifier-123' },
    });

    expect(form).toEqual({
      grant_type: 'authorization_code',
      code: 'auth-code',
      redirect_uri: 'https://zapier.example/return',
      code_verifier: 'verifier-123',
      client_id: 'test-client-id',
      client_secret: 'test-client-secret',
      resource: 'https://qrx.codes/v1',
    });
    expect(result).toEqual({ access_token: 'new-access', refresh_token: 'new-refresh' });
  });

  it('refreshes and keeps the rotated refresh token', async () => {
    let form;
    nock(CLERK)
      .post('/oauth/token', (body) => {
        form = typeof body === 'string' ? formOf(body) : body;
        return true;
      })
      .reply(200, { access_token: 'access-2', refresh_token: 'refresh-2' });

    const result = await appTester(oauth2Config.refreshAccessToken, { authData });

    expect(form).toMatchObject({ grant_type: 'refresh_token', refresh_token: 'test-refresh-token' });
    expect(result).toEqual({ access_token: 'access-2', refresh_token: 'refresh-2' });
  });

  it('keeps the old refresh token when the server does not send a new one', async () => {
    nock(CLERK).post('/oauth/token').reply(200, { access_token: 'access-2' });

    const result = await appTester(oauth2Config.refreshAccessToken, { authData });
    expect(result).toEqual({ access_token: 'access-2', refresh_token: 'test-refresh-token' });
  });

  it('tests the connection with GET /v1/account', async () => {
    nock(API, { reqheaders: { authorization: 'Bearer test-access-token' } })
      .get('/v1/account')
      .reply(200, account);

    await expect(appTester(App.authentication.test, { authData })).resolves.toMatchObject({ object: 'account' });
  });

  it('fails the connection test with an expired token', async () => {
    nock(API).get('/v1/account').reply(401, { type: 'https://qrx.codes/developers/docs/errors#unauthorized' });

    const error = await appTester(App.authentication.test, { authData }).catch((e) => e);
    expect(error.name).toBe('RefreshAuthError');
  });

  it('labels the connection with the account email', async () => {
    nock(CLERK, { reqheaders: { authorization: 'Bearer test-access-token' } })
      .get('/oauth/userinfo')
      .reply(200, { sub: 'user_1', email: 'maker@example.com' });

    await expect(appTester(App.authentication.connectionLabel, { authData })).resolves.toBe('maker@example.com');
  });

  it('falls back to a plain label when the email is not available', async () => {
    nock(CLERK).get('/oauth/userinfo').reply(403, { error: 'insufficient_scope' });

    await expect(appTester(App.authentication.connectionLabel, { authData })).resolves.toBe('QRX account');
  });

  it('can point at dev.qrx.codes and the dev sign-in through environment variables', async () => {
    process.env.QRX_BASE_URL = 'https://dev.qrx.codes/';
    process.env.QRX_OAUTH_URL = 'https://summary-bobcat-19.clerk.accounts.dev';
    process.env.QRX_OAUTH_RESOURCE = 'https://dev.qrx.codes/mcp';

    const url = new URL(
      await appTester(oauth2Config.authorizeUrl, { inputData: { state: 's', redirect_uri: 'https://r.example/' } }),
    );
    expect(url.origin).toBe('https://summary-bobcat-19.clerk.accounts.dev');
    expect(url.searchParams.get('resource')).toBe('https://dev.qrx.codes/mcp');

    nock('https://dev.qrx.codes', { reqheaders: { authorization: 'Bearer test-access-token' } })
      .get('/v1/account')
      .reply(200, account);
    await expect(appTester(App.authentication.test, { authData })).resolves.toMatchObject({ object: 'account' });
  });

  it('sends the access token only to the QRX API', async () => {
    nock('https://qrx.codes', { badheaders: ['authorization'] })
      .get('/media/premium/k7m2qz.png')
      .reply(200, 'png');

    await appTester(
      async (z) => {
        const response = await z.request({ url: 'https://qrx.codes/media/premium/k7m2qz.png' });
        return response.status;
      },
      { authData },
    );
  });
});
