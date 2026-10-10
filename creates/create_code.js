'use strict';

const { api } = require('../lib/config');
const { isTerminal, shapeCode, sample, outputFields } = require('../lib/code');
const { idempotencyKeyFor } = require('../lib/idempotency');

// A code takes about a minute, longer than Zapier's 30 s step limit. `perform` starts the code with a callback URL
// and returns at once; QRX POSTs the finished code to that URL and Zapier then runs `performResume`.

const IN_PROGRESS_RETRIES = 3;
const MAX_IN_PROGRESS_WAIT_S = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const startCode = async (z, body, idempotencyKey) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await z.request({
        method: 'POST',
        url: api('/codes'),
        headers: { 'Idempotency-Key': idempotencyKey, 'Content-Type': 'application/json' },
        body,
      });
      return response.data;
    } catch (error) {
      // The first request with this key is still running: wait briefly and ask again for its code.
      if (error.qrxProblem === 'idempotency-in-progress' && attempt < IN_PROGRESS_RETRIES) {
        const seconds = Math.min(error.retryAfter ?? 1, MAX_IN_PROGRESS_WAIT_S);
        await sleep(seconds * 1000);
        continue;
      }
      throw error;
    }
  }
};

const perform = async (z, bundle) => {
  if (bundle.meta && bundle.meta.isLoadingSample) {
    return sample;
  }

  const { prompt, destination, style } = bundle.inputData;
  const callbackUrl = z.generateCallbackUrl();
  const body = { prompt, destination, callbackUrl };
  if (style) body.style = style;

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
      'Creates a branded QR code from a picture prompt and a link. Each code is checked to scan before it is delivered.',
  },
  operation: {
    inputFields: [
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
