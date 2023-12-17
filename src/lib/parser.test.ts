import { getAbsoluteMediaLinks, getRelativeMediaLinks, markdownToHtml } from './parser';

test('Markdown is converted to HTML', async () => {
  expect(await markdownToHtml('# A heading')).toStrictEqual('<h1>A heading</h1>\n');
});

test('Covered Markdown code blocks are highlighted', async () => {
  expect(await markdownToHtml('```javascript\nconst foo = 1;\n```')).toStrictEqual(
    '<pre><code><span class="token keyword">const</span> foo <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span>\n</code></pre>'
  );
});

test('Uncovered Markdown code blocks are not highlighted', async () => {
  expect(await markdownToHtml('```php\n$foo = 1;\n```')).toStrictEqual(
    '<pre><code>$foo = 1;\n</code></pre>'
  );
});

test('Outbound links are not retrieved when getting links', () => {
  expect(getAbsoluteMediaLinks('[a link](https://google.com)')).toStrictEqual([]);
  expect(getRelativeMediaLinks('[a link](https://google.com)')).toStrictEqual([]);
});

test('URLs are retrieved from Markdown links', () => {
  expect(getAbsoluteMediaLinks('[a link](/foo/bar/baz.zip)')).toStrictEqual(['/foo/bar/baz.zip']);
  expect(getRelativeMediaLinks('[a link](foo/bar.zip)')).toStrictEqual(['foo/bar.zip']);
});

test('URLs are retrieved from Markdown images', () => {
  expect(getAbsoluteMediaLinks('![a link](/foo/bar/baz.jpg)')).toStrictEqual(['/foo/bar/baz.jpg']);
  expect(getRelativeMediaLinks('![a link](bar.jpg)')).toStrictEqual(['bar.jpg']);
});

test('Multiple links are retrieved from Markdown text', () => {
  expect(getAbsoluteMediaLinks('![a link](/foo/bar.jpg)\n[another link](/baz.zip)')).toStrictEqual([
    '/foo/bar.jpg',
    '/baz.zip'
  ]);
  expect(getRelativeMediaLinks('[link](foo.png)\n[link](bar.jpg)')).toStrictEqual([
    'foo.png',
    'bar.jpg'
  ]);
});

test('Badly-formatted Markdown links are not returned', () => {
  expect(getRelativeMediaLinks('[a link](foo.jpg')).toStrictEqual([]);
  expect(getAbsoluteMediaLinks('[a link](/foo/bar.jpg')).toStrictEqual([]);
  expect(getRelativeMediaLinks('[a link](/foo/bar.jpg)')).toStrictEqual([]);
  expect(getAbsoluteMediaLinks('[a link](foo.jpg)')).toStrictEqual([]);
});

test('Links with unusual structures are properly recognized', () => {
  expect(getAbsoluteMediaLinks('[link](/foo/bar/link with spaces.zip)')).toStrictEqual([
    '/foo/bar/link with spaces.zip'
  ]);
  expect(getAbsoluteMediaLinks('[link](/foo/bar/link-with-dashes.zip)')).toStrictEqual([
    '/foo/bar/link-with-dashes.zip'
  ]);
  expect(getAbsoluteMediaLinks('[link](/foo/bar/link_with_underscores.zip)')).toStrictEqual([
    '/foo/bar/link_with_underscores.zip'
  ]);
  expect(getAbsoluteMediaLinks('[link](/foo/bar/1234567890.zip)')).toStrictEqual([
    '/foo/bar/1234567890.zip'
  ]);
  expect(getRelativeMediaLinks('[link](foo/)')).toStrictEqual([]);
  expect(
    getRelativeMediaLinks(
      'http://MVSXX.COMPANY.COM:04445/CICSPLEXSM//JSMITH/VIEW/OURLOCTRAN?CONTEXT=FRED&SCOPE=FRED&A_TRANID=PAY*'
    )
  ).toStrictEqual([]);
});
