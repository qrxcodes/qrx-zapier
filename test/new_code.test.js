'use strict';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const { API, authData, code, setup } = require('./helpers');

const appTester = zapier.createAppTester(App);
const op = App.triggers.new_code.operation;

const page = (data, nextCursor = null) => ({ object: 'list', data, hasMore: Boolean(nextCursor), nextCursor });

describe('New QR Code', () => {
  setup();

  it('asks for codes completed in the last hour, follows pages and returns them newest first', async () => {
    const queries = [];
    const a = code({ id: 'aaaaaa', completedAt: '2026-10-10T01:00:00.000Z' });
    const b = code({ id: 'bbbbbb', completedAt: '2026-10-10T01:05:00.000Z' });
    const c = code({ id: 'cccccc', completedAt: '2026-10-10T00:50:00.000Z' });

    nock(API, { reqheaders: { authorization: 'Bearer test-access-token' } })
      .get('/v1/codes')
      .query((q) => !q.cursor && queries.push(q))
      .reply(200, page([b, a], 'cur_2'))
      .get('/v1/codes')
      .query((q) => q.cursor === 'cur_2' && queries.push(q))
      .reply(200, page([a, c]));

    const before = Date.now();
    const results = await appTester(op.perform, { authData, meta: {} });

    expect(results.map((r) => r.id)).toEqual(['bbbbbb', 'aaaaaa', 'cccccc']);
    expect(queries[0]).toMatchObject({ status: 'succeeded', limit: '100' });
    const lookback = before - Date.parse(queries[0].completedAfter);
    expect(lookback).toBeGreaterThanOrEqual(60 * 60 * 1000 - 1000);
    expect(lookback).toBeLessThanOrEqual(60 * 60 * 1000 + 5000);
    expect(queries[1].completedAfter).toBe(queries[0].completedAfter);
    expect(results[0]).toMatchObject({ completedAt: '2026-10-10T01:05:00.000Z', shortUrl: 'https://qrx.to/k7m2qz' });
    expect(results[0].image).toMatch(/^hydrate\|\|\|/);
  });

  it('leaves out codes that are not finished link codes', async () => {
    nock(API)
      .get('/v1/codes')
      .query(true)
      .reply(
        200,
        page([
          code({ id: 'okokok' }),
          code({ id: 'failed', status: 'failed', imageUrl: null }),
          code({ id: 'other0', type: 'other', destination: null, shortUrl: null }),
        ]),
      );

    const results = await appTester(op.perform, { authData, meta: {} });
    expect(results.map((r) => r.id)).toEqual(['okokok']);
  });

  it('returns nothing when no code finished in the last hour', async () => {
    nock(API).get('/v1/codes').query(true).reply(200, page([]));
    await expect(appTester(op.perform, { authData, meta: {} })).resolves.toEqual([]);
  });

  it('shows the latest finished codes in the Zap editor, however old', async () => {
    nock(API)
      .get('/v1/codes')
      .query({ status: 'succeeded', limit: 10 })
      .reply(200, page([code()]));

    const results = await appTester(op.perform, { authData, meta: { isLoadingSample: true } });
    expect(results).toHaveLength(1);
  });

  it('stops following pages after twenty', async () => {
    let n = 0;
    nock(API)
      .get('/v1/codes')
      .query(true)
      .times(20)
      .reply(200, () => {
        n += 1;
        return page([code({ id: `code${String(n).padStart(2, '0')}` })], `cur_${n}`);
      });

    const results = await appTester(op.perform, { authData, meta: {} });
    expect(results).toHaveLength(20);
  });
});
