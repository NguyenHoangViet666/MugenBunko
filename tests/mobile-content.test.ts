import test from 'node:test';
import assert from 'node:assert/strict';
import { contentBlocks, plainText, textHtml } from '../mobile/src/utils/content.ts';

test('a forum attachment retains the plain text before and after it', () => {
  const blocks = contentBlocks('Nội dung bài viết<figure><img src="/uploads/cover.jpg" /></figure>Chú thích cuối');
  assert.equal(blocks[0], 'Nội dung bài viết');
  assert.match(blocks[1], /<img /);
  assert.equal(blocks[2], 'Chú thích cuối');
});
test('chapter blocks preserve headings, paragraphs, images and loose text in order', () => {
  const blocks = contentBlocks('<div><h2>Chương 1</h2><p>Đoạn đầu</p>Ghi chú<img src="/a.png"><p>Đoạn cuối</p></div>');
  assert.deepEqual(blocks.map(plainText), ['Chương 1\n\n', 'Đoạn đầu\n\n', 'Ghi chú', '', 'Đoạn cuối\n\n']);
});
test('plain text becomes safe HTML without interpreting user markup', () => {
  const text = '2 < 3 & 5 > 4\nDòng tiếp\n\n<script>alert(1)</script>';
  const html = textHtml(text);
  assert.ok(!html.includes('<script>'));
  assert.match(plainText(html), /2 < 3 & 5 > 4\nDòng tiếp/);
});
