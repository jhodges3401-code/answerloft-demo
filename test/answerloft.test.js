const test = require('node:test'); const assert = require('node:assert');
const A = require('../answerloft.js');
const arts = A.load(require('../articles.json'));
test('drafts hidden, slugs unique', () => {
  assert.ok(!arts.find(a => a.title === 'Internal draft'));
  const d = A.load([{ title: 'Same' }, { title: 'Same' }]);
  assert.deepStrictEqual(d.map(a => a.slug), ['same', 'same-2']);
});
test('slugify handles accents and symbols', () => { assert.strictEqual(A.slugify('Crème brûlée & Co!'), 'creme-brulee-co'); });
test('markdown renders subset', () => {
  const h = A.markdown('## Hi\n**b** *i* `c`\n\n- one\n- two\n\n1. x\n\n```\n<b>\n```');
  for (const s of ['<h3 id="hi">Hi</h3>', '<strong>b</strong>', '<em>i</em>', '<code>c</code>', '<ul>', '<li>two</li>', '<ol>', '<pre><code>&lt;b&gt;</code></pre>']) assert.ok(h.includes(s), s);
});
test('markdown is XSS-safe', () => {
  const h = A.markdown('<script>alert(1)</script> [x](javascript:alert(1)) [y](https://ok.com/a?b=1&c=2)');
  assert.ok(!h.includes('<script>')); assert.ok(h.includes('href="#"')); assert.ok(h.includes('href="https://ok.com/a?b=1&amp;c=2"'));
});
test('categories keep order and sort by order', () => {
  const c = A.categories(arts);
  assert.deepStrictEqual(c.map(x => x.name), ['Basics', 'Hosting', 'Account']);
  assert.deepStrictEqual(c[0].articles.map(a => a.title), ['Getting started', 'Writing articles']);
});
test('search ranks title over body and requires all terms', () => {
  assert.strictEqual(A.search(arts, 'domain')[0].title, 'Custom domain');
  assert.strictEqual(A.search(arts, 'password billing').length, 0);
  assert.strictEqual(A.search(arts, 'password forgot')[0].slug, 'resetting-your-password-sample');
  assert.deepStrictEqual(A.search(arts, ''), []);
});
test('snippet and related', () => {
  const a = arts.find(x => x.title === 'Custom domain');
  assert.ok(A.snippet(a, 'cname').toLowerCase().includes('cname'));
  assert.deepStrictEqual(A.related(arts, arts[0]).map(a => a.title).slice(0, 2), ['Custom domain', 'Writing articles']);
});
test('llms.txt index lists categories and articles', () => {
  const t = A.llmsTxt(arts, 'Demo'); assert.ok(t.startsWith('# Demo')); assert.ok(t.includes('## Hosting\n- [Custom domain](#/a/custom-domain)'));
});
