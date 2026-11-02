import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changeCategories, defaultCategories } from '../lib/category-shared.ts';
import { expiryFor, countdownText } from '../lib/trash-shared.ts';
import { parseChatLinks } from '../lib/chat-links.ts';
test('category rename preserves IDs and empty registry stays empty', () => {
    const result = changeCategories(defaultCategories.products, { type: 'rename', id: 'bone-straight', label: 'Luxury wigs' });
    assert.equal(result[0].id, 'bone-straight');
    assert.equal(result[0].label, 'Luxury wigs');
    assert.deepEqual(changeCategories([], { type: 'reorder', ids: [] }), []);
});
test('duplicate names and invalid reorder rejected', () => {
    assert.throws(() => changeCategories(defaultCategories.products, { type: 'create', id: 'new', label: ' BONE STRAIGHT ' }));
    assert.throws(() => changeCategories(defaultCategories.products, { type: 'reorder', ids: ['bone-straight'] }));
});
test('trash expires in 24 hours and timer shows pending cleanup', () => {
    assert.equal(expiryFor(1000), 86401000);
    assert.equal(countdownText(1000, 1000), 'Awaiting cleanup');
    assert.equal(countdownText(undefined, 1000), 'Retention not started');
});
test('links allow only approved destinations and reject unsafe schemes', () => {
    const links = parseChatLinks('See [TikTok](https://www.tiktok.com/@zara) or https://evil.test.', ['https://www.tiktok.com/@zara']);
    assert.equal(links.filter(x => x.href).length, 1);
    assert.equal(parseChatLinks('[bad](javascript:alert(1))', []).filter(x => x.href).length, 0);
});
