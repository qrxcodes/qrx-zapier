'use strict';

const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const { API, authData, code, setup, mockCursorStore } = require('./helpers');

const appTester = zapier.createAppTester(App);

describe('dropdowns', () => {
  setup();

  it('lists styles for Create QR Code', async () => {
    nock(API)
      .get('/v1/styles')
      .reply(200, {
        object: 'list',
        data: [
          { id: 'a64c5', object: 'style', name: 'Anime', previewUrl: 'https://qrx.codes/images/styles/anime.png' },
          { id: '06184', object: 'style', name: 'Cartoon', previewUrl: null },
        ],
        hasMore: false,
        nextCursor: null,
      });

    const results = await appTester(App.triggers.style_list.operation.perform, { authData, meta: {} });
    expect(results).toEqual([
      { id: 'a64c5', name: 'Anime', previewUrl: 'https://qrx.codes/images/styles/anime.png' },
      { id: '06184', name: 'Cartoon', previewUrl: null },
    ]);
  });

  it('lists link codes a page at a time for Change QR Code Link and Find QR Code', async () => {
    const op = App.triggers.code_list.operation;
    mockCursorStore();
    nock(API)
      .get('/v1/codes')
      .query({ limit: 50 })
      .reply(200, {
        object: 'list',
        data: [code(), code({ id: 'other0', type: 'other', destination: null })],
        hasMore: true,
        nextCursor: 'cur_2',
      })
      .get('/v1/codes')
      .query({ limit: 50, cursor: 'cur_2' })
      .reply(200, {
        object: 'list',
        data: [code({ id: 'second', prompt: 'A red fox', destination: 'https://example.com/fox' })],
        hasMore: false,
        nextCursor: null,
      });

    const first = await appTester(op.perform, { authData, meta: { page: 0 } });
    expect(first).toEqual([{ id: 'k7m2qz', label: 'A lighthouse on a cliff at sunset → https://example.com/menu' }]);

    const second = await appTester(op.perform, { authData, meta: { page: 1 } });
    expect(second).toEqual([{ id: 'second', label: 'A red fox → https://example.com/fox' }]);
  });
});
