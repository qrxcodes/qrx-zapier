'use strict';

const { downloadImage } = require('../hydrators');

describe('downloadImage', () => {
  it('downloads the PNG and stashes it as a named image file', async () => {
    const response = { status: 200 };
    const z = {
      request: jest.fn().mockResolvedValue(response),
      stashFile: jest.fn().mockResolvedValue('https://zapier-files.example/qrx-k7m2qz.png'),
    };

    const result = await downloadImage(z, {
      inputData: { url: 'https://qrx.codes/media/premium/k7m2qz.png', id: 'k7m2qz' },
    });

    expect(z.request).toHaveBeenCalledWith({ url: 'https://qrx.codes/media/premium/k7m2qz.png', raw: true });
    expect(z.stashFile).toHaveBeenCalledWith(response, undefined, 'qrx-k7m2qz.png', 'image/png');
    expect(result).toBe('https://zapier-files.example/qrx-k7m2qz.png');
  });
});
