'use strict';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const { API, authData, code, problem, PROBLEM_HEADERS, setup } = require('./helpers');

const appTester = zapier.createAppTester(App);
const op = App.searches.find_code.operation;

describe('Find QR Code', () => {
  setup();

  it.each([
    ['an id', 'k7m2qz'],
    ['a short link', 'https://qrx.to/k7m2qz'],
    ['a short link without the scheme', 'qrx.to/k7m2qz'],
    ['a code page URL', 'https://qrx.codes/view/k7m2qz'],
    ['an id with spaces around it', '  k7m2qz '],
  ])('finds a code by %s', async (_, id) => {
    nock(API, { reqheaders: { authorization: 'Bearer test-access-token' } })
      .get('/v1/codes/k7m2qz')
      .reply(200, code());

    const results = await appTester(op.perform, { authData, inputData: { id } });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: 'k7m2qz', shortUrl: 'https://qrx.to/k7m2qz', status: 'succeeded' });
  });

  it('returns nothing when the account has no such code', async () => {
    nock(API)
      .get('/v1/codes/nope42')
      .reply(404, problem('not-found', 404, 'You have no code nope42.'), PROBLEM_HEADERS);

    await expect(appTester(op.perform, { authData, inputData: { id: 'nope42' } })).resolves.toEqual([]);
  });

  it('returns nothing for a code that is not a link code', async () => {
    const id = '0b9a1c1e-1111-4222-8333-444455556666';
    nock(API)
      .get(`/v1/codes/${id}`)
      .reply(200, code({ id, type: 'other', destination: null, shortUrl: null }));

    await expect(appTester(op.perform, { authData, inputData: { id } })).resolves.toEqual([]);
  });

  it('finds a code that is still being made, without an image', async () => {
    nock(API)
      .get('/v1/codes/k7m2qz')
      .reply(200, code({ status: 'processing', imageUrl: null, completedAt: null }));

    const [result] = await appTester(op.perform, { authData, inputData: { id: 'k7m2qz' } });
    expect(result.status).toBe('processing');
    expect(result.image).toBeNull();
  });

  it('passes other errors on', async () => {
    nock(API)
      .get('/v1/codes/k7m2qz')
      .reply(500, problem('internal', 500, 'Something went wrong'), PROBLEM_HEADERS);

    await expect(appTester(op.perform, { authData, inputData: { id: 'k7m2qz' } })).rejects.toThrow(
      /Something went wrong/,
    );
  });
});
