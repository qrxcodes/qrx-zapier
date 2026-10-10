'use strict';

const fs = require('fs');
const path = require('path');

const App = require('../index');

// Copy rules for everything people read: the app's labels and help text, the README and the publishing pack.
const BANNED = [
  [/US\$|\$\s?\d|\bUSD\b|\bper month\b|\ba month\b|\/mo\b/i, 'a price'],
  [/\b\d+\s+codes?\s+(a|per)\s+day\b/i, 'a plan number'],
  [/\bstarter\b|\bpro plan\b|\bpremium plan\b|\bfree plan\b/i, 'a plan name'],
  [/\bwi-?fi\b/i, 'Wi-Fi'],
  [/\bbadges?\b|\btiers?\b/i, 'a tier badge'],
  [/\bAI\b|\bclaude\b|\banthropic\b|\bgenerated with\b/i, 'an authorship tell'],
];

const strings = [];
const collect = (value, where) => {
  if (typeof value === 'string') strings.push([where, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => collect(v, `${where}[${i}]`));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (['label', 'description', 'helpText', 'noun'].includes(k) || typeof v === 'object')
        collect(v, `${where}.${k}`);
    }
  }
};
for (const kind of ['triggers', 'searches', 'creates']) {
  for (const [key, def] of Object.entries(App[kind]))
    collect(
      {
        display: def.display,
        noun: def.noun,
        inputFields: def.operation.inputFields,
        outputFields: def.operation.outputFields,
      },
      `${kind}.${key}`,
    );
}

const docs = [
  'README.md',
  ...fs
    .readdirSync(path.join(__dirname, '..', 'publishing'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => `publishing/${f}`),
];
for (const file of docs) strings.push([file, fs.readFileSync(path.join(__dirname, '..', file), 'utf8')]);

describe('copy', () => {
  it.each(BANNED)('has no %s', (pattern, what) => {
    const hits = strings
      .filter(([, text]) => pattern.test(text))
      .map(([where, text]) => `${where}: ${text.match(pattern)[0]}`);
    expect({ what, hits }).toEqual({ what, hits: [] });
  });

  it('says "on a paid plan" wherever the app describes changing a link', () => {
    const mentions = strings.filter(
      ([where, text]) =>
        !where.includes('.md') && !where.endsWith('.label') && /chang(e|es|ing)\b.*\b(link|where)/i.test(text),
    );
    expect(mentions.length).toBeGreaterThan(0);
    for (const [where, text] of mentions) {
      expect(`${where}: ${text}`).toMatch(/on a paid plan/);
    }
  });

  it('keeps the listing description within Zapier limits', () => {
    const settings = fs.readFileSync(path.join(__dirname, '..', 'publishing', 'integration-settings.md'), 'utf8');
    const description = settings.match(/\| Description \| `([^`]+)`/)[1];
    expect(description.startsWith('QRX is a')).toBe(true);
    expect(description.length).toBeLessThanOrEqual(140);
    expect(description).not.toMatch(/https?:\/\//);
  });
});
