'use strict';

const crypto = require('crypto');

const { api } = require('../lib/config');
const { isTerminal, shapeCode, sample, outputFields } = require('../lib/code');
const { idempotencyKeyFor } = require('../lib/idempotency');

// A code takes about a minute, longer than Zapier's 30 s step limit. In a Zap run, `perform` starts the code with a
// callback URL and returns at once; QRX POSTs the finished code to that URL and Zapier then runs `performResume`.
// The editor's Test step makes a real code too, but waits for it with `?wait=` instead of a callback, and returns
// the code as it stands when the wait runs out.

const IN_PROGRESS_RETRIES = 3;
const MAX_IN_PROGRESS_WAIT_S = 5;
// The Test step's whole wait, kept under Zapier's 30 s limit with room for the request itself.
const TEST_WAIT_S = 25;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// `waitUntil` (a time in ms) asks the API to hold the answer until the code finishes or that time comes.
const startCode = async (z, body, idempotencyKey, waitUntil) => {
  for (let attempt = 0; ; attempt += 1) {
    const params = {};
    if (waitUntil) params.wait = Math.max(0, Math.floor((waitUntil - Date.now()) / 1000));
    try {
      const response = await z.request({
        method: 'POST',
        url: api('/codes'),
        params,
        headers: { 'Idempotency-Key': idempotencyKey, 'Content-Type': 'application/json' },
        body,
      });
      return response.data;
    } catch (error) {
      // The first request with this key is still running: wait briefly and ask again for its code.
      if (error.qrxProblem === 'idempotency-in-progress' && attempt < IN_PROGRESS_RETRIES) {
        let seconds = Math.min(error.retryAfter ?? 1, MAX_IN_PROGRESS_WAIT_S);
        if (waitUntil) seconds = Math.min(seconds, Math.max(0, (waitUntil - Date.now()) / 1000));
        await sleep(seconds * 1000);
        continue;
      }
      throw error;
    }
  }
};

const failure = (z, code) => {
  const reason = code.error && code.error.message ? ` ${code.error.message}` : '';
  const error = new z.errors.Error(
    `QRX could not make this code.${reason} Nothing was delivered; try again with another prompt.`,
    'code-failed',
    422,
  );
  error.qrxProblem = 'code-failed';
  return error;
};

const requestBody = (bundle) => {
  const { prompt, destination, style } = bundle.inputData;
  const body = { prompt, destination };
  if (style) body.style = style;
  return body;
};

// The Test step: a real code from the user's inputs, finished if it finishes within the wait, otherwise as it stands
// (its id, short link and page exist at once; the image follows on its page).
const performTest = async (z, bundle) => {
  const waitUntil = Date.now() + TEST_WAIT_S * 1000;
  const code = await startCode(z, requestBody(bundle), `zapier-test-${crypto.randomUUID()}`, waitUntil);
  if (code.status === 'failed') {
    throw failure(z, code);
  }
  return shapeCode(z, code);
};

const perform = async (z, bundle) => {
  if (bundle.meta && bundle.meta.isLoadingSample) {
    return performTest(z, bundle);
  }

  const callbackUrl = z.generateCallbackUrl();
  const body = { ...requestBody(bundle), callbackUrl };

  const code = await startCode(z, body, idempotencyKeyFor(callbackUrl));
  return {
    id: code.id,
    status: code.status,
    prompt: code.prompt,
    destination: code.destination,
    shortUrl: code.shortUrl,
    pageUrl: code.pageUrl,
    createdAt: code.createdAt,
  };
};

// The callback only says the code has finished. Read the code from the API with the user's token rather than trust
// the callback body, then error the step if it failed, so later steps never get a code without an image.
const performResume = async (z, bundle) => {
  const callback = bundle.cleanedRequest || {};
  const id = (bundle.outputData && bundle.outputData.id) || callback.id;
  if (!id) {
    throw new z.errors.Error('QRX sent a completion without a code id.', 'callback-invalid', 400);
  }

  let code = (await z.request({ url: api(`/codes/${encodeURIComponent(id)}`) })).data;
  if (!isTerminal(code)) {
    code = (await z.request({ url: api(`/codes/${encodeURIComponent(id)}`), params: { wait: 20 } })).data;
  }
  if (code.status === 'failed') {
    throw failure(z, code);
  }
  if (code.status !== 'succeeded') {
    throw new z.errors.Error('The code is still being made. Try this step again in a minute.', 'not-finished', 409);
  }
  return shapeCode(z, code);
};

module.exports = {
  key: 'create_code',
  noun: 'QR Code',
  display: {
    label: 'Create QR Code',
    description:
      'Creates a branded QR code from a picture prompt and a link. Each code is checked to scan before it is delivered. Testing this step makes a real code.',
  },
  operation: {
    inputFields: [
      {
        key: 'test_note',
        type: 'copy',
        helpText:
          '**Test step makes a real code** from these fields, and it counts against your QRX allowance like any other code. The test waits up to 25 seconds: if the code is not finished by then, it shows as `processing` with its short link and page but no image yet, and the image fills in on its page. When the Zap runs, this step waits for the finished code and its image.',
      },
      {
        key: 'prompt',
        label: 'Picture Prompt',
        required: true,
        type: 'text',
        helpText:
          'What the picture should show, in a sentence. For example: "A lighthouse on a cliff at sunset". Up to 1,000 characters.',
      },
      {
        key: 'destination',
        label: 'Link',
        required: true,
        type: 'string',
        helpText:
          'Where scans go: a full web address starting with `https://` or `http://`. The code encodes a short qrx.to link that sends people here.',
      },
      {
        key: 'style',
        label: 'Style',
        required: false,
        dynamic: 'style_list.id.name',
        altersDynamicFields: false,
        helpText: 'A picture style. Leave empty to let the prompt decide.',
      },
    ],
    perform,
    performResume,
    sample,
    outputFields,
  },
};
