'use strict';

const nock = require('nock');

const API = 'https://qrx.codes';
const CLERK = 'https://clerk.qrx.codes';
const CALLBACK_URL = 'https://auth-json-server.zapier-staging.com/echo';

const authData = { access_token: 'test-access-token', refresh_token: 'test-refresh-token' };

const code = (overrides = {}) => ({
  id: 'k7m2qz',
  object: 'code',
  status: 'succeeded',
  type: 'url',
  prompt: 'A lighthouse on a cliff at sunset',
  style: null,
  destination: 'https://example.com/menu',
  shortUrl: 'https://qrx.to/k7m2qz',
  imageUrl: 'https://qrx.codes/media/premium/k7m2qz.png',
  pageUrl: 'https://qrx.codes/view/k7m2qz',
  error: null,
  createdAt: '2026-10-08T01:23:45.000Z',
  completedAt: '2026-10-08T01:24:31.000Z',
  ...overrides,
});

const processing = (overrides = {}) => code({ status: 'processing', imageUrl: null, completedAt: null, ...overrides });

const problem = (name, status, detail, extra = {}) => ({
  type: `https://qrx.codes/developers/docs/errors#${name}`,
  title: name,
  status,
  detail,
  requestId: 'req_test',
  ...extra,
});

const PROBLEM_HEADERS = { 'Content-Type': 'application/problem+json' };

const resetEnv = () => {
  process.env.CLIENT_ID = 'test-client-id';
  process.env.CLIENT_SECRET = 'test-client-secret';
  delete process.env.QRX_BASE_URL;
  delete process.env.QRX_OAUTH_URL;
  delete process.env.QRX_OAUTH_RESOURCE;
};

const setup = () => {
  beforeAll(() => {
    if (!nock.isActive()) nock.activate();
    nock.disableNetConnect();
  });
  beforeEach(resetEnv);
  afterEach(() => {
    const pending = nock.pendingMocks();
    nock.cleanAll();
    expect(pending).toEqual([]);
  });
  // Each test file loads its own nock; unhook this one so the next file's can take over.
  afterAll(() => {
    nock.enableNetConnect();
    nock.restore();
  });
};

// Stands in for Zapier's cursor store (z.cursor), which the app tester reaches over RPC.
const mockCursorStore = () => {
  process.env.ZAPIER_DEPLOY_KEY = 'test-deploy-key';
  const store = {};
  nock('https://rpc.zapier.com')
    .persist()
    .post('/cli')
    .reply(200, (uri, body) => {
      const { id, storeKey, method, params } = typeof body === 'string' ? JSON.parse(body) : body;
      if (method === 'set_cursor') {
        store[storeKey] = params[0];
        return { id, result: null };
      }
      return { id, result: store[storeKey] ?? null };
    });
  return store;
};

// Zapier's error classes put a JSON payload in `message`; this reads the human part back out.
const messageOf = (error) => {
  try {
    return JSON.parse(error.message).message;
  } catch {
    return error.message;
  }
};

module.exports = {
  API,
  CLERK,
  CALLBACK_URL,
  authData,
  code,
  processing,
  problem,
  PROBLEM_HEADERS,
  setup,
  messageOf,
  mockCursorStore,
};
