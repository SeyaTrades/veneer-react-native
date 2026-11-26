const test = require('node:test');
const assert = require('node:assert/strict');
const {
  items,
  studios,
  lookbooks,
  byId,
  newRoom,
  defaults,
  spawn,
  resize,
  projection,
  visible,
  footprint,
  shopping,
  snap,
  gap,
  roomSize,
  uniqueTitle,
} = require('../src/planner');
const { initialState, reduce, owned, feed } = require('../src/state');
const sofa = byId('itm_sofa');
const user = { id: 'usr_demo@veneer.app', email: 'demo@veneer.app', name: 'demo' };

test('all source catalog entries, listings and lookbook shopping totals are present', () => {
  assert.equal(studios.length, 5);
  assert.equal(items.length, 20);
  assert.equal(new Set(items.flatMap((i) => i.listings.map((l) => l.id))).size, 40);
  for (const i of items) {
    assert.equal(i.minPrice, Math.min(...i.listings.map((l) => l.salePrice ?? l.regPrice)));
    for (const l of i.listings) assert.equal(new URL(l.url).protocol, 'https:');
  }
  assert.deepEqual(
    lookbooks.map((r) => shopping(r).split),
    [24126, 19869, 44879, 27812, 16386, 16495, 12864],
  );
  assert.equal(shopping(lookbooks[5]).rows.find((x) => x.item.id === 'itm_lamp').qty, 5);
  assert.equal(
    shopping(lookbooks[5]).ikea,
    5 * byId('itm_lamp').listings[0].bestPrice + sofa.listings[0].bestPrice,
  );
});

test('rotated footprint and height clamp to the resized room', () => {
  const r = newRoom(),
    s = { ...spawn(r, sofa, defaults), rotDeg: 90, xCm: -99, yCm: 999, elevCm: 999 };
  const small = resize({ ...r, stickers: [s] }, 1, 50, 100);
  assert.deepEqual([small.roomW, small.roomD, small.ceilH], [200, 200, 220]);
  assert.deepEqual(footprint(s), [88, 180]);
  assert.deepEqual(
    [small.stickers[0].xCm, small.stickers[0].yCm, small.stickers[0].elevCm],
    [44, 110, 154],
  );
});

test('wall projection mirrors south and west, and uses rotated sprite faces', () => {
  const r = { ...newRoom(), roomW: 450, roomD: 380 },
    s = { ...spawn(r, sofa, defaults), xCm: 85, yCm: 120 };
  const projections = ['N', 'E', 'S', 'W'].map((w) => projection(s, r, w));
  assert.deepEqual(
    projections.map((p) => [p.u, p.depth, p.face, p.flip]),
    [
      [85, 120, 'front', false],
      [120, 365, 'side', false],
      [365, 260, 'back', false],
      [260, 85, 'side', true],
    ],
  );
  const rug = { ...s, id: 'rug', itemId: 'itm_rug', zIdx: 99 },
    high = { ...s, id: 'lamp', itemId: 'itm_pendant', elevCm: 190 },
    far = { ...s, id: 'far', yCm: 320 };
  const scene = { ...r, stickers: [s, rug, high, far] };
  assert.deepEqual(
    visible(scene, 'plan', 'N', 'Upper', false).map((x) => x.id),
    ['lamp'],
  );
  assert.equal(
    visible(scene, 'wall', 'N', 'All', false).some((x) => x.id === 'far'),
    false,
  );
  assert.equal(visible(scene, 'wall', 'N', 'All', true)[0].id, 'rug');
});
test('metric and imperial displays use the same stored coordinates', () => {
  assert.equal(snap(19, defaults), 20);
  assert.equal(snap(19, { unit: 'imperial', snapOn: true }), 20.32);
  assert.equal(snap(19.4, { ...defaults, snapOn: false }), 19);
  assert.equal(gap(190.5, 'imperial'), '6\' 3"');
  assert.equal(roomSize(newRoom(), 'metric'), '4.0 × 4.0 m (16.0 m²)');
});
test('locks block edits and deletion while a copy gets a new unlocked identity', () => {
  let state = reduce(initialState(), { type: 'drop', item: sofa });
  const id = state.selected;
  state = reduce(state, { type: 'item', id, op: 'lock' });
  for (const op of ['turn', 'coords', 'delete'])
    assert.equal(reduce(state, { type: 'item', op, id, fields: { xCm: 0 } }), state);
  const clone = reduce(state, { type: 'item', id, op: 'copy' });
  assert.notEqual(clone.selected, id);
  assert.equal(clone.room.stickers[1].isLocked, false);
  assert.equal(clone.room.stickers[1].xCm, state.room.stickers[0].xCm + 25);
});
test('save, update, public feed, save-as-copy, ownership and remix remain distinct', () => {
  let s = reduce(initialState(), { type: 'remix', room: lookbooks[0] });
  assert.equal(s.room.cloneFrom, lookbooks[0].id);
  assert.equal(s.room.isPublic, false);
  assert.notEqual(s.room.stickers[0].id, lookbooks[0].stickers[0].id);
  assert.equal(reduce(s, { type: 'save' }), s);
  s = reduce(s, { type: 'user', user });
  s = reduce(s, { type: 'save', fields: { title: 'My room', isPublic: true } });
  const id = s.room.id;
  assert.equal(feed(s)[0].id, id);
  s = reduce(s, { type: 'save', fields: { isPublic: false } });
  assert.equal(s.room.id, id);
  assert.equal(feed(s).length, 7);
  s = reduce(s, { type: 'save', copy: true });
  assert.notEqual(s.room.id, id);
  assert.equal(s.room.title, 'My room (2)');
  const hydrated = reduce(initialState(), {
    type: 'hydrate',
    data: JSON.parse(JSON.stringify(s.disk)),
  });
  assert.equal(owned(hydrated).length, 2);
  assert.equal(uniqueTitle('MY ROOM (2)', owned(s)), 'MY ROOM (3)');
  s = reduce(s, { type: 'user', user: null });
  assert.deepEqual(owned(s), []);
  assert.equal(reduce(s, { type: 'remove', id }).disk.rooms.length, 2);
});
test('switching presets preserves furniture only on the keep path', () => {
  let s = reduce(initialState(), { type: 'drop', item: sofa });
  s = reduce(s, { type: 'switch', studioId: 'std_kitchen', keep: true });
  assert.equal(s.room.stickers.length, 1);
  assert.equal(s.room.roomW, 300);
  assert.equal(s.selected, null);
  s = reduce(s, { type: 'switch', studioId: 'std_bed' });
  assert.equal(s.room.stickers.length, 0);
  assert.equal(s.room.roomD, 320);
  assert.equal(s.dirty, false);
});
