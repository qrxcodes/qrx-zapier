'use strict';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const { API, authData, code, problem, PROBLEM_HEADERS, setup, messageOf } = require('./helpers');

const appTester = zapier.createAppTester(App);
const action = App.creates.change_code_link;
const perform = action.operation.perform;

describe('Change QR Code Link', () => {
  setup();

  it('says "on a paid plan" in its help text', () => {
    expect(action.display.description).toMatch(/on a paid plan/);
    const destination = action.operation.inputFields.find((f) => f.key === 'destination');
    expect(destination.helpText).toMatch(/on a paid plan/);
  });

  it('points the code at the new link', async () => {
    nock(API, { reqheaders: { authorization: 'Bearer test-access-token' } })
      .patch('/v1/codes/k7m2qz', { destination: 'https://example.com/new-menu' })
      .reply(200, code({ destination: 'https://example.com/new-menu' }));

    const result = await appTester(perform, {
      authData,
      inputData: { id: 'k7m2qz', destination: 'https://example.com/new-menu' },
    });

    expect(result).toMatchObject({ id: 'k7m2qz', destination: 'https://example.com/new-menu' });
  });

  it('accepts a short link as the code', async () => {
    nock(API)
      .patch('/v1/codes/k7m2qz')
      .reply(200, code({ destination: 'https://example.com/b' }));

    const result = await appTester(perform, {
      authData,
      inputData: { id: 'https://qrx.to/k7m2qz', destination: 'https://example.com/b' },
    });
    expect(result.destination).toBe('https://example.com/b');
  });

  it('explains that changing a link is on a paid plan, without naming plans', async () => {
    nock(API)
      .patch('/v1/codes/k7m2qz')
      .reply(
        403,
        problem('plan-required', 403, 'Changing where a code points needs the Starter plan.'),
        PROBLEM_HEADERS,
      );

    const error = await appTester(perform, {
      authData,
      inputData: { id: 'k7m2qz', destination: 'https://example.com/new-menu' },
    }).catch((e) => e);

    expect(messageOf(error)).toBe("Changing a code's link is on a paid plan. See https://qrx.codes for plans.");
  });

  it('reports a missing code', async () => {
    nock(API)
      .patch('/v1/codes/nope42')
      .reply(404, problem('not-found', 404, 'You have no code nope42.'), PROBLEM_HEADERS);

    await expect(
      appTester(perform, { authData, inputData: { id: 'nope42', destination: 'https://example.com' } }),
    ).rejects.toThrow(/You have no code nope42/);
  });

  it('reports a code whose link cannot change', async () => {
    nock(API)
      .patch('/v1/codes/k7m2qz')
      .reply(422, problem('unprocessable', 422, 'Only link codes can change where they point.'), PROBLEM_HEADERS);

    await expect(
      appTester(perform, { authData, inputData: { id: 'k7m2qz', destination: 'https://example.com' } }),
    ).rejects.toThrow(/Only link codes can change/);
  });
});
