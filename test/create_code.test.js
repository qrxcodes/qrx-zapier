'use strict';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const { idempotencyKeyFor } = require('../lib/idempotency');
const {
  API,
  CALLBACK_URL,
  authData,
  code,
  processing,
  problem,
  PROBLEM_HEADERS,
  setup,
  messageOf,
} = require('./helpers');

const appTester = zapier.createAppTester(App);
const op = App.creates.create_code.operation;

const inputData = { prompt: 'A lighthouse on a cliff at sunset', destination: 'https://example.com/menu' };

describe('Create QR Code', () => {
  setup();

  describe('perform', () => {
    it('starts the code with the callback URL and an idempotency key derived from it', async () => {
      let sentBody;
      nock(API, {
        reqheaders: {
          authorization: 'Bearer test-access-token',
          'idempotency-key': idempotencyKeyFor(CALLBACK_URL),
        },
      })
        .post('/v1/codes', (body) => {
          sentBody = body;
          return true;
        })
        .reply(202, processing());

      const result = await appTester(op.perform, { authData, inputData });

      expect(sentBody).toEqual({ ...inputData, callbackUrl: CALLBACK_URL });
      expect(result).toEqual({
        id: 'k7m2qz',
        status: 'processing',
        prompt: inputData.prompt,
        destination: inputData.destination,
        shortUrl: 'https://qrx.to/k7m2qz',
        pageUrl: 'https://qrx.codes/view/k7m2qz',
        createdAt: '2026-10-08T01:23:45.000Z',
      });
    });

    it('sends the style only when one is chosen', async () => {
      let sentBody;
      nock(API)
        .post('/v1/codes', (body) => {
          sentBody = body;
          return true;
        })
        .reply(202, processing({ style: 'a64c5' }));

      await appTester(op.perform, { authData, inputData: { ...inputData, style: 'a64c5' } });
      expect(sentBody.style).toBe('a64c5');

      nock(API)
        .post('/v1/codes', (body) => {
          sentBody = body;
          return true;
        })
        .reply(202, processing());
      await appTester(op.perform, { authData, inputData: { ...inputData, style: '' } });
      expect(sentBody).not.toHaveProperty('style');
    });

    it('makes one code when Zapier repeats the step with the same callback URL', async () => {
      const keys = [];
      const recordKey = function () {
        keys.push(this.req.headers['idempotency-key']);
      };
      // First run: the API makes the code. Forced repeat: the same key gets the same code back, not a second one.
      nock(API)
        .post('/v1/codes')
        .reply(202, function () {
          recordKey.call(this);
          return processing();
        })
        .post('/v1/codes')
        .reply(
          202,
          function () {
            recordKey.call(this);
            return processing();
          },
          { 'Idempotent-Replayed': 'true' },
        );

      const first = await appTester(op.perform, { authData, inputData });
      const repeat = await appTester(op.perform, { authData, inputData });

      expect(keys).toHaveLength(2);
      expect(keys[0]).toBe(keys[1]);
      expect(keys[0]).toBe(idempotencyKeyFor(CALLBACK_URL));
      expect(repeat).toEqual(first);
    });

    it('derives a different key from a different callback URL', () => {
      // If Zapier hands a replay a new callback URL, the key changes too (open question 9 in the scoping doc).
      const a = idempotencyKeyFor('https://hooks.zapier.com/callback/1');
      const b = idempotencyKeyFor('https://hooks.zapier.com/callback/2');
      expect(a).not.toBe(b);
      expect(a).toMatch(/^zapier-[0-9a-f]{64}$/);
      expect(a.length).toBeLessThanOrEqual(255);
      expect(idempotencyKeyFor('https://hooks.zapier.com/callback/1')).toBe(a);
    });

    it('waits and asks again while the first request with the key is still running', async () => {
      nock(API)
        .post('/v1/codes')
        .reply(409, problem('idempotency-in-progress', 409, 'A request with this Idempotency-Key is still running.'), {
          ...PROBLEM_HEADERS,
          'Retry-After': '0',
        })
        .post('/v1/codes')
        .reply(202, processing(), { 'Idempotent-Replayed': 'true' });

      const result = await appTester(op.perform, { authData, inputData });
      expect(result.id).toBe('k7m2qz');
    });

    it('gives up after a few in-progress answers', async () => {
      nock(API)
        .post('/v1/codes')
        .times(4)
        .reply(409, problem('idempotency-in-progress', 409, 'Still running.'), {
          ...PROBLEM_HEADERS,
          'Retry-After': '0',
        });

      await expect(appTester(op.perform, { authData, inputData })).rejects.toThrow(/Still running/);
    });

    it('returns the sample in the Zap editor without making a code', async () => {
      const result = await appTester(op.perform, { authData, inputData, meta: { isLoadingSample: true } });
      expect(result).toEqual(op.sample);
    });

    it('explains a used-up daily allowance without naming plans or prices', async () => {
      nock(API)
        .post('/v1/codes')
        .reply(
          429,
          problem(
            'daily-limit',
            429,
            'No codes are left today. The Free plan resets at 2026-10-09T00:00:00.000Z; Starter has no daily limit.',
          ),
          { ...PROBLEM_HEADERS, 'Retry-After': '3600' },
        );

      const error = await appTester(op.perform, { authData, inputData }).catch((e) => e);
      const message = messageOf(error);
      expect(message).toMatch(/No codes are left today/);
      expect(message).not.toMatch(/Starter|Free plan|\$/);
    });

    it('throttles on a short rate limit', async () => {
      nock(API)
        .post('/v1/codes')
        .reply(429, problem('rate-limited', 429, 'Too many requests. Try again in 4 seconds.'), {
          ...PROBLEM_HEADERS,
          'Retry-After': '4',
        });

      const error = await appTester(op.perform, { authData, inputData }).catch((e) => e);
      expect(error.name).toBe('ThrottledError');
    });

    it('lists each invalid field', async () => {
      nock(API)
        .post('/v1/codes')
        .reply(
          400,
          problem('invalid-request', 400, 'destination is invalid', {
            errors: [{ field: 'destination', message: 'must be an http:// or https:// URL' }],
          }),
          PROBLEM_HEADERS,
        );

      await expect(appTester(op.perform, { authData, inputData })).rejects.toThrow(
        /destination must be an http:\/\/ or https:\/\/ URL/,
      );
    });

    it('asks Zapier to refresh the token on 401', async () => {
      nock(API)
        .post('/v1/codes')
        .reply(401, problem('unauthorized', 401, 'Missing or invalid credentials'), PROBLEM_HEADERS);

      const error = await appTester(op.perform, { authData, inputData }).catch((e) => e);
      expect(error.name).toBe('RefreshAuthError');
    });
  });

  describe('performResume', () => {
    const outputData = { id: 'k7m2qz', status: 'processing' };

    it('reads the finished code from the API and returns it with the image file', async () => {
      nock(API, { reqheaders: { authorization: 'Bearer test-access-token' } })
        .get('/v1/codes/k7m2qz')
        .reply(200, code());

      const result = await appTester(op.performResume, { authData, outputData, cleanedRequest: code() });

      expect(result).toMatchObject({
        id: 'k7m2qz',
        status: 'succeeded',
        shortUrl: 'https://qrx.to/k7m2qz',
        pageUrl: 'https://qrx.codes/view/k7m2qz',
        imageUrl: 'https://qrx.codes/media/premium/k7m2qz.png',
        completedAt: '2026-10-08T01:24:31.000Z',
      });
      expect(result.image).toMatch(/^hydrate\|\|\|.*downloadImage.*\|\|\|hydrate$/);
      expect(Object.keys(result).sort()).toEqual(op.outputFields.map((f) => f.key).sort());
    });

    it('trusts the API, not the callback body', async () => {
      nock(API).get('/v1/codes/k7m2qz').reply(200, code());

      const forged = code({ destination: 'https://attacker.example/', imageUrl: 'https://attacker.example/x.png' });
      const result = await appTester(op.performResume, { authData, outputData, cleanedRequest: forged });

      expect(result.destination).toBe('https://example.com/menu');
      expect(result.imageUrl).toBe('https://qrx.codes/media/premium/k7m2qz.png');
    });

    it('fails the step when the code failed', async () => {
      nock(API)
        .get('/v1/codes/k7m2qz')
        .reply(200, code({ status: 'failed', imageUrl: null, error: { message: 'The picture did not scan.' } }));

      const error = await appTester(op.performResume, {
        authData,
        outputData,
        cleanedRequest: { id: 'k7m2qz', status: 'failed' },
      }).catch((e) => e);
      expect(messageOf(error)).toMatch(/QRX could not make this code\. The picture did not scan\./);
    });

    it('waits for a code that has not finished yet', async () => {
      nock(API)
        .get('/v1/codes/k7m2qz')
        .reply(200, processing())
        .get('/v1/codes/k7m2qz')
        .query({ wait: 20 })
        .reply(200, code());

      const result = await appTester(op.performResume, { authData, outputData, cleanedRequest: {} });
      expect(result.status).toBe('succeeded');
    });

    it('errors if the code is still not finished after waiting', async () => {
      nock(API)
        .get('/v1/codes/k7m2qz')
        .reply(200, processing())
        .get('/v1/codes/k7m2qz')
        .query({ wait: 20 })
        .reply(200, processing());

      await expect(appTester(op.performResume, { authData, outputData, cleanedRequest: {} })).rejects.toThrow(
        /still being made/,
      );
    });

    it('falls back to the id in the callback body', async () => {
      nock(API).get('/v1/codes/k7m2qz').reply(200, code());

      const result = await appTester(op.performResume, {
        authData,
        outputData: {},
        cleanedRequest: { id: 'k7m2qz' },
      });
      expect(result.id).toBe('k7m2qz');
    });

    it('rejects a callback without any code id', async () => {
      await expect(appTester(op.performResume, { authData, outputData: {}, cleanedRequest: {} })).rejects.toThrow(
        /without a code id/,
      );
    });
  });
});
