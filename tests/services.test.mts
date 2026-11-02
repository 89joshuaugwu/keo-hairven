import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
// Provider interception makes these tests unable to touch live services.
registerHooks({ resolve(specifier, ctx, next) {
        if (specifier === 'server-only')
            return { url: 'data:text/javascript,export {}', shortCircuit: true };
        if (specifier === '@/lib/firebase-admin')
            return { url: 'data:text/javascript,export function getAdminDb(){return globalThis.__testDb;}', shortCircuit: true };
        if (specifier === '@/lib/cloudinary-admin')
            return { url: 'data:text/javascript,export async function destroyCloudinaryAsset(){return globalThis.__destroy();}', shortCircuit: true };
        if (specifier.startsWith('@/'))
            return { url: pathToFileURL(resolvePath(import.meta.dirname, '..', specifier.slice(2) + '.ts')).href, shortCircuit: true };
        return next(specifier, ctx);
    } });
const { Timestamp, FieldValue } = await import('firebase-admin/firestore');
const { trashRecord, restoreRecord, purgeRecord, migrateLegacyTrash } = await import('../lib/trash-server.ts');
const { mutateCategoryRegistry, writeCategorized } = await import('../lib/categories-server.ts');
class FakeDb {
    data = new Map();
    readSizes = [];
    seq = 0;
    queue = Promise.resolve();
    collection(name) {
        const db = this;
        const query = { name, filters: [], orders: [], count: Infinity, cursor: null,
            doc(id = String(++db.seq)) { return { id, path: name + '/' + id, get: async () => db.snapshot(name + '/' + id), delete: async () => db.data.delete(name + '/' + id), set: async (v) => db.data.set(name + '/' + id, v) }; },
            where(key, op, value) { this.filters.push([key, op, value]); return this; }, orderBy(key) { this.orders.push(typeof key === 'string' ? key : '__name__'); return this; }, limit(n) { this.count = n; return this; }, startAfter(...values) { this.cursor = values; return this; }, async get() { return db.query(this); } };
        return query;
    }
    query(q) { const value = (raw, key, id) => key === '__name__' ? id : raw[key]?.toMillis?.() ?? raw[key]; let docs = [...this.data].filter(([path, raw]) => path.startsWith(q.name + '/') && (q.filters || []).every(([key, op, v]) => op === 'array-contains' ? (raw[key] || []).includes(v) : op === '<=' ? value(raw, key, '') <= (v?.toMillis?.() ?? v) : raw[key] === v)); const orders = q.orders?.length ? q.orders : ['__name__']; docs.sort(([a, x], [b, y]) => { for (const k of orders) {
        const av = value(x, k, a.split('/')[1]);
        const bv = value(y, k, b.split('/')[1]);
        if (av < bv)
            return -1;
        if (av > bv)
            return 1;
    } return 0; }); if (q.cursor)
        docs = docs.filter(([path, raw]) => { for (let i = 0; i < q.cursor.length; i++) {
            const av = value(raw, orders[i], path.split('/')[1]);
            const bv = q.cursor[i]?.toMillis?.() ?? q.cursor[i];
            if (av > bv)
                return true;
            if (av < bv)
                return false;
        } return false; }); docs = docs.slice(0, q.count ?? Infinity); this.readSizes.push(docs.length); return { docs: docs.map(([path]) => this.snapshot(path)), empty: !docs.length }; }
    snapshot(path) { const raw = this.data.get(path); return { exists: !!raw, id: path.split('/')[1], ref: { path }, data: () => raw }; }
    async runTransaction(fn) {
        let release;
        const old = this.queue;
        this.queue = new Promise(r => release = r);
        await old;
        const writes = [];
        const db = this;
        const tx = { async get(ref) { if (ref.path)
                return db.snapshot(ref.path); return db.query(ref); }, set(ref, v) { writes.push(() => db.data.set(ref.path, v)); }, update(ref, v) { writes.push(() => { const raw = { ...db.data.get(ref.path) }; for (const [k, value] of Object.entries(v)) {
                if (value instanceof FieldValue && value.isEqual(FieldValue.delete()))
                    delete raw[k];
                else
                    raw[k] = value;
            } db.data.set(ref.path, raw); }); }, delete(ref) { writes.push(() => db.data.delete(ref.path)); } };
        try {
            const result = await fn(tx);
            writes.forEach(f => f());
            return result;
        }
        finally {
            release();
        }
    }
}
function setup() { const db = new FakeDb(); globalThis.__testDb = db; globalThis.__destroy = async () => ({ ok: true }); return db; }
test('trash preserves expiry on repeated removal and restore cancels it', async () => { const db = setup(); db.data.set('products/a', { status: 'published', revision: 1 }); await trashRecord('products', 'a', 1, 'owner'); const first = db.data.get('products/a'); assert.equal(first.purgeAt.toMillis() - first.deletedAt.toMillis(), 86400000); await trashRecord('products', 'a', 2, 'owner'); assert.equal(db.data.get('products/a').purgeAt, first.purgeAt); await restoreRecord('products', 'a', 2, 'owner'); assert.equal(db.data.get('products/a').status, 'draft'); assert.equal(db.data.get('products/a').purgeAt, undefined); });
test('scheduled cleanup skips active and unexpired items', async () => { const db = setup(); db.data.set('products/a', { status: 'trashed', revision: 1, purgeAt: Timestamp.fromMillis(Date.now() + 100000) }); assert.equal(await purgeRecord('products', 'a', { actor: 'cron', onlyExpired: true }), 'skipped'); db.data.set('products/a', { status: 'published', revision: 1 }); assert.equal(await purgeRecord('products', 'a', { actor: 'cron', onlyExpired: true }), 'skipped'); });
test('restore versus deletion permits only one outcome', async () => { const db = setup(); db.data.set('products/a', { status: 'trashed', revision: 1, purgeAt: Timestamp.fromMillis(Date.now() - 1) }); await Promise.allSettled([restoreRecord('products', 'a', 1, 'owner'), purgeRecord('products', 'a', { actor: 'cron', onlyExpired: true })]); assert.equal(db.data.get('products/a')?.status, 'draft'); });
test('content deletion preserves media and writes starter suppression', async () => { const db = setup(); db.data.set('looks/a', { status: 'trashed', revision: 1, sourceStarterId: 'starter', mediaIds: ['m'], purgeAt: Timestamp.fromMillis(1) }); db.data.set('media/m', { status: 'active' }); assert.equal(await purgeRecord('looks', 'a', { actor: 'cron', onlyExpired: true }), 'deleted'); assert.ok(db.data.has('media/m')); assert.ok(db.data.has('starterSuppressions/looks-starter')); });
test('referenced media is blocked and provider failure preserves metadata', async () => { const db = setup(); db.data.set('media/m', { status: 'trashed', revision: 1, publicId: 'm', purgeAt: Timestamp.fromMillis(1) }); db.data.set('products/a', { mediaIds: ['m'] }); assert.equal(await purgeRecord('media', 'm', { actor: 'cron', onlyExpired: true }), 'blocked'); db.data.delete('products/a'); globalThis.__destroy = async () => ({ ok: false }); assert.equal(await purgeRecord('media', 'm', { actor: 'cron', onlyExpired: true }), 'failed'); assert.ok(db.data.has('media/m')); assert.equal(db.data.get('media/m').purgeClaim, undefined); });
test('manual purge requires trash and stale restore is rejected', async () => { const db = setup(); db.data.set('products/a', { status: 'draft', revision: 2 }); assert.equal(await purgeRecord('products', 'a', { actor: 'owner', onlyExpired: false }), 'skipped'); await assert.rejects(() => restoreRecord('products', 'a', 1, 'owner')); });
test('referenced category cannot be deleted and editor cannot delete', async () => { const db = setup(); db.data.set('products/a', { category: 'bone-straight', status: 'trashed' }); await assert.rejects(() => mutateCategoryRegistry('products', 0, { type: 'delete', id: 'bone-straight' }, { role: 'owner' })); await assert.rejects(() => mutateCategoryRegistry('products', 0, { type: 'delete', id: 'attachments' }, { role: 'editor' })); });
test('assignment after category deletion is rejected', async () => { const db = setup(); await mutateCategoryRegistry('products', 0, { type: 'delete', id: 'bone-straight' }, { role: 'owner' }); await assert.rejects(() => writeCategorized(db.collection('products').doc('a'), { category: 'bone-straight' }, 'products')); });
test('category mutation requires the current revision', async () => { setup(); await mutateCategoryRegistry('products', 0, { type: 'rename', id: 'bone-straight', label: 'Luxury wigs' }, { role: 'editor' }); await assert.rejects(() => mutateCategoryRegistry('products', 0, { type: 'rename', id: 'bone-straight', label: 'More wigs' }, { role: 'editor' })); });
test('public service media object blocks referenced asset without crashing', async () => { const db = setup(); db.data.set('media/m', { status: 'trashed', revision: 1, secureUrl: 'https://images.test/m', purgeAt: Timestamp.fromMillis(1) }); db.data.set('publicServices/s', { media: { src: 'https://images.test/m' } }); assert.equal(await purgeRecord('media', 'm', { actor: 'cron', onlyExpired: true }), 'blocked'); });
test('import cannot recreate a tombstoned starter or overwrite concurrent trash', async () => { const db = setup(); const { writeImported } = await import('../lib/categories-server.ts'); db.data.set('starterSuppressions/looks-a', { kind: 'looks', sourceStarterId: 'a' }); assert.equal(await writeImported(db.collection('looks').doc('a'), { revision: 1, category: 'wigs', mediaIds: [] }, 'looks', 0, 'a', 'publicLooks', {}), false); db.data.delete('starterSuppressions/looks-a'); db.data.set('looks/a', { status: 'trashed', revision: 2 }); assert.equal(await writeImported(db.collection('looks').doc('a'), { revision: 2, category: 'wigs', mediaIds: [] }, 'looks', 1, 'a', 'publicLooks', {}), false); assert.equal(db.data.get('looks/a').status, 'trashed'); });
test('chat cards exclude previews, limit to three, and follow up on a named product', async () => { const { selectChatCards } = await import('../lib/chat-presentation.ts'); const fixture = (id) => ({ id, slug: id, title: `Luxury wig ${id}`, category: 'wigs', priceMode: 'fixed', priceMinor: 100000, currency: 'NGN', availability: 'available', media: [], status: 'published', ownerConfirmed: true, designPreview: false, featuredOrder: 1 }); const products = ['a', 'b', 'c', 'd'].map(fixture); products.push({ ...fixture('preview'), status: 'design-preview', designPreview: true }); assert.equal(selectChatCards('Show me your wigs', [], products).length, 3); assert.ok(selectChatCards('Show me your wigs', [], products).every(c => c.id !== 'preview')); assert.equal(selectChatCards('Where are you located?', [], products).length, 0); assert.equal(selectChatCards('How much is it?', [{ role: 'user', text: 'Luxury wig a' }], products)[0].id, 'a'); assert.equal(selectChatCards('How much is it?', [{ role: 'user', text: 'Luxury wig a' }], products)[0].priceLabel, '₦1,000'); });
test('legacy migration grants a fresh day and is idempotent', async () => { const db = setup(); db.data.set('products/a', { status: 'trashed', revision: 1, deletedAt: Timestamp.fromMillis(1) }); const before = Date.now(); const first = await migrateLegacyTrash('owner'); assert.equal(first.migrated, 1); const expiry = db.data.get('products/a').purgeAt.toMillis(); assert.ok(expiry >= before + 86400000); assert.equal((await migrateLegacyTrash('owner')).migrated, 0); assert.equal(db.data.get('products/a').purgeAt.toMillis(), expiry); });
test('scheduler refuses missing or incorrect bearer secret', async () => { const { GET } = await import('../app/api/cron/trash/route.ts'); delete process.env.TRASH_CRON_SECRET; assert.equal((await GET(new Request('http://test/'))).status, 503); process.env.TRASH_CRON_SECRET = 'test-secret'; assert.equal((await GET(new Request('http://test/'))).status, 401); assert.equal((await GET(new Request('http://test/', { headers: { authorization: 'Bearer wrong-secret' } }))).status, 401); delete process.env.TRASH_CRON_SECRET; });
test('cleanup processes eligible content before media and respects future expiry', async () => { const db = setup(); db.data.set('products/a', { status: 'trashed', revision: 1, purgeAt: Timestamp.fromMillis(1), mediaIds: ['m'] }); db.data.set('media/m', { status: 'trashed', revision: 1, purgeAt: Timestamp.fromMillis(1) }); db.data.set('products/future', { status: 'trashed', revision: 1, purgeAt: Timestamp.fromMillis(Date.now() + 100000) }); const { runTrashCleanup } = await import('../lib/trash-cleanup.ts'); const counts = await runTrashCleanup(); assert.equal(counts.deleted, 2); assert.equal(db.data.has('products/future'), true); });
test('cleanup cursor gets past repeatedly blocked media', async () => { const db = setup(); for (let n = 0; n < 25; n++) {
    const id = String(n).padStart(2, '0');
    db.data.set('media/' + id, { status: 'trashed', revision: 1, purgeAt: Timestamp.fromMillis(1) });
    db.data.set('products/ref' + id, { mediaIds: [id] });
} db.data.set('media/z', { status: 'trashed', revision: 1, purgeAt: Timestamp.fromMillis(1) }); const { runTrashCleanup } = await import('../lib/trash-cleanup.ts'); assert.equal((await runTrashCleanup()).blocked, 20); const second = await runTrashCleanup(); assert.equal(second.blocked, 5); assert.equal(second.deleted, 1); });
test('import private and public projections commit together', async () => { const db = setup(); const { writeImported } = await import('../lib/categories-server.ts'); assert.equal(await writeImported(db.collection('looks').doc('a'), { revision: 1, status: 'published', category: 'wigs', mediaIds: [] }, 'looks', 0, 'a', 'publicLooks', { title: 'Wig' }), true); assert.equal(db.data.get('looks/a').status, 'published'); assert.equal(db.data.get('publicLooks/a').title, 'Wig'); });
test('legacy migration bounds each page and continues without resetting expiry', async () => { const db = setup(); for (let n = 0; n < 105; n++)
    db.data.set('products/' + String(n).padStart(3, '0'), { status: 'trashed', revision: 1 }); const first = await migrateLegacyTrash('owner'); assert.equal(first.migrated, 100); assert.ok(db.readSizes.every(size => size <= 100)); assert.equal(first.remaining, true); const second = await migrateLegacyTrash('owner'); assert.equal(second.migrated, 5); assert.equal(second.remaining, false); });
test('trashed and purged KEO products stay out of browse and detail views', async () => {
    const db = setup();
    const { getBrowseProductsServer, getProductDetailBySlugServer } = await import('../lib/public-products-server.ts');
    const product = { id: 'keo-test-hair', slug: 'keo-test-hair', title: 'Test hair', category: 'bone-straight', priceMode: 'quote', currency: 'NGN', availability: 'confirm', media: [], status: 'published', ownerConfirmed: true, revision: 1 };
    db.data.set('products/' + product.id, product);
    db.data.set('publicProducts/' + product.id, product);
    assert.ok((await getBrowseProductsServer(false)).some(p => p.id === product.id));
    assert.ok(await getProductDetailBySlugServer(product.slug, false));
    await trashRecord('products', product.id, 1, 'owner');
    assert.ok(!(await getBrowseProductsServer(true)).some(p => p.id === product.id));
    assert.equal(await getProductDetailBySlugServer(product.slug, true), undefined);
    assert.equal(await purgeRecord('products', product.id, { actor: 'owner', onlyExpired: false }), 'deleted');
    assert.ok(!(await getBrowseProductsServer(true)).some(p => p.id === product.id));
    assert.equal(await getProductDetailBySlugServer(product.slug, true), undefined);
});
test('purged starter media and services do not return in admin lists', async () => { const db = setup(); const { getStarterMediaLibrary, getAdminMediaLibrary } = await import('../lib/admin-media.ts'); const media = getStarterMediaLibrary()[0]; db.data.set('starterSuppressions/media-' + media.id, { kind: 'media', sourceStarterId: media.id }); assert.ok(!(await getAdminMediaLibrary()).some(m => m.id === media.id)); const { serviceDesignPreview } = await import('../lib/services.ts'); const starter = serviceDesignPreview[0]; db.data.set('starterSuppressions/services-' + starter.id, { kind: 'services', sourceStarterId: starter.id }); db.data.set('services/other', { title: 'Other service', revision: 1, status: 'draft', mediaIds: [] }); const { getAdminServices } = await import('../lib/admin-services.ts'); assert.ok(!(await getAdminServices()).some(s => s.id === starter.id)); });
test('restored KEO draft stays private until a published projection exists', async () => {
    const db = setup();
    const { getBrowseProductsServer, getProductDetailBySlugServer } = await import('../lib/public-products-server.ts');
    const product = { id: 'keo-restored-hair', slug: 'keo-restored-hair', title: 'Restored test hair', category: 'bone-straight', priceMode: 'quote', currency: 'NGN', availability: 'confirm', media: [], status: 'trashed', ownerConfirmed: true, revision: 1 };
    db.data.set('products/' + product.id, product);
    await restoreRecord('products', product.id, 1, 'owner');
    assert.equal(db.data.get('products/' + product.id).status, 'draft');
    assert.ok(!(await getBrowseProductsServer(true)).some(p => p.id === product.id));
    assert.equal(await getProductDetailBySlugServer(product.slug, true), undefined);
    db.data.set('publicProducts/' + product.id, { ...product, status: 'published' });
    assert.ok((await getBrowseProductsServer(false)).some(p => p.id === product.id));
    assert.ok(await getProductDetailBySlugServer(product.slug, false));
});
test('import rejects media purged after its source snapshot was cached',async()=>{const db=setup();const {writeImported}=await import('../lib/categories-server.ts');await assert.rejects(()=>writeImported(db.collection('looks').doc('a'),{revision:1,category:'wigs',mediaIds:['gone']},'looks',0,'a','publicLooks',{media:[{src:'https://deleted.test/image'}]}));assert.equal(db.data.has('publicLooks/a'),false);});
