import assert from 'node:assert/strict';
import test from 'node:test';
import { parseArticle } from './article.js';
import { renderArticle } from './renderer.js';

test('renders fixed WeChat inline styles for sample markdown', () => {
  const article = parseArticle('test/fixtures/sample.md');
  const rendered = renderArticle(article);
  assert.equal(article.readiness.length, 0);
  assert.match(rendered.contentHtml, /font-size:15px/);
  assert.match(rendered.contentHtml, /line-height:1.75/);
  assert.match(rendered.contentHtml, /letter-spacing:1px/);
  assert.match(rendered.contentHtml, /text-align:justify/);
  assert.doesNotMatch(rendered.contentHtml, /<script/i);
  assert.doesNotMatch(rendered.contentHtml, /<style/i);
});

test('converts markdown bold markers inside list items', () => {
  const article = parseArticle('test/fixtures/sample.md');
  article.markdown += '\n\n- **办公自动化** → 自动生成日报';
  const rendered = renderArticle(article);
  assert.match(rendered.contentHtml, /<li[^>]*><strong>办公自动化<\/strong> → 自动生成日报<\/li>/);
  assert.doesNotMatch(rendered.contentHtml, /\*\*办公自动化\*\*/);
});
