const catalog = require('./catalog.json');
const { items, studios, lookbooks } = catalog;
const itemMap = new Map(items.map((item) => [item.id, item]));
const byId = (id) => itemMap.get(id);
const studioOf = (room) => studios.find((studio) => studio.id === room.studioId) || studios[0];
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const peso = (n) => '₱' + Math.round(n).toLocaleString('en-US');
const ratio = (unit) => (unit === 'imperial' ? 2.54 : 1);
const snap = (value, p) => {
  const step = p.snapOn ? (p.unit === 'imperial' ? 5.08 : 5) : 1;
  return Math.round(value / step) * step;
};
function gap(value, unit) {
  if (unit === 'metric')
    return Math.abs(value) < 100 ? Math.round(value) + ' cm' : (value / 100).toFixed(2) + ' m';
  const inches = Math.round(value / 2.54);
  if (Math.abs(inches) < 12) return inches + '"';
  const rest = Math.abs(inches) % 12;
  return Math.trunc(inches / 12) + "'" + (rest ? ' ' + rest + '"' : '');
}
function itemSize(i, u) {
  return (
    [i.wCm, i.dCm, i.hCm]
      .map((n) => Math.round(n / ratio(u)) + (u === 'imperial' ? '"' : ''))
      .join(' × ') + (u === 'metric' ? ' cm' : '')
  );
}
function roomSize(r, u) {
  if (u === 'metric')
    return (
      (r.roomW / 100).toFixed(1) +
      ' × ' +
      (r.roomD / 100).toFixed(1) +
      ' m (' +
      ((r.roomW * r.roomD) / 10000).toFixed(1) +
      ' m²)'
    );
  return (
    gap(r.roomW, u) +
    ' × ' +
    gap(r.roomD, u) +
    ' (' +
    Math.round((r.roomW * r.roomD) / 929.0304) +
    ' sq ft)'
  );
}
let serial = 0;
const uid = (prefix) => prefix + '_' + Date.now().toString(36) + '_' + (++serial).toString(36);
function newRoom(studio = studios[0], title = 'Untitled Room', userId = 'guest') {
  return {
    id: uid('draft'),
    studioId: studio.id,
    title,
    userId,
    roomW: studio.roomW,
    roomD: studio.roomD,
    ceilH: studio.ceilH,
    budgetCap: null,
    cloneFrom: null,
    isPublic: false,
    stickers: [],
  };
}
const defaults = { unit: 'metric', snapOn: true, showGrid: true, switchRule: 'ask' };
const footprint = (s, i = byId(s.itemId)) =>
  s.rotDeg % 180 === 0 ? [i.wCm, i.dCm] : [i.dCm, i.wCm];
function constrain(s, room) {
  const i = byId(s.itemId);
  const [w, d] = footprint(s, i);
  return {
    ...s,
    xCm: w >= room.roomW ? room.roomW / 2 : clamp(s.xCm, w / 2, room.roomW - w / 2),
    yCm: d >= room.roomD ? room.roomD / 2 : clamp(s.yCm, d / 2, room.roomD - d / 2),
    elevCm: clamp(s.elevCm, 0, Math.max(0, room.ceilH - i.hCm)),
  };
}
function resize(room, width, depth, ceiling) {
  const r = {
    ...room,
    roomW: clamp(width, 200, 1000),
    roomD: clamp(depth, 200, 1000),
    ceilH: clamp(ceiling, 220, 400),
  };
  return { ...r, stickers: r.stickers.map((s) => constrain(s, r)) };
}
function spawn(room, item, prefs) {
  const offset = ((room.stickers.length % 5) - 2) * 20;
  const band = room.stickers.filter((s) => s.zIdx >= item.spawnZ && s.zIdx < item.spawnZ + 9);
  return constrain(
    {
      id: uid('stk'),
      itemId: item.id,
      rotDeg: 0,
      flipX: false,
      isLocked: false,
      xCm: snap(room.roomW / 2 + offset, prefs),
      yCm: snap(item.zone === 'wall' ? item.dCm / 2 + 2 : room.roomD / 2 + offset, prefs),
      elevCm: item.defElev,
      zIdx: band.length ? Math.max(...band.map((s) => s.zIdx)) + 1 : item.spawnZ,
    },
    room,
  );
}
function duplicate(s, room) {
  return constrain(
    {
      ...s,
      id: uid('stk'),
      isLocked: false,
      xCm: s.xCm + (s.xCm > room.roomW * 0.75 ? -25 : 25),
      zIdx: Math.max(...room.stickers.map((x) => x.zIdx)) + 1,
    },
    room,
  );
}
function uniqueTitle(title, saves, ignore) {
  const clean = title.trim() || 'Untitled Room';
  const taken = new Set(saves.filter((r) => r.id !== ignore).map((r) => r.title.toLowerCase()));
  if (!taken.has(clean.toLowerCase())) return clean;
  const stem = clean.replace(/\s*\(\d+\)$/, '');
  let n = 2;
  while (taken.has((stem + ' (' + n + ')').toLowerCase())) n++;
  return stem + ' (' + n + ')';
}
function shopping(room) {
  const counts = new Map();
  for (const s of room.stickers) counts.set(s.itemId, (counts.get(s.itemId) || 0) + 1);
  const rows = Array.from(counts, ([id, qty]) => ({ item: byId(id), qty })).filter((r) => r.item);
  const split = rows.reduce((sum, { item, qty }) => sum + qty * item.minPrice, 0);
  const ikea = rows.every(({ item }) => item.listings.some((l) => l.store === 'IKEA PH'))
    ? rows.reduce(
        (sum, { item, qty }) =>
          sum + qty * item.listings.find((l) => l.store === 'IKEA PH').bestPrice,
        0,
      )
    : null;
  return { rows, split, ikea };
}
const walls = ['N', 'E', 'S', 'W'];
function projection(s, r, wall) {
  const i = byId(s.itemId);
  const index = walls.indexOf(wall);
  const rel = (s.rotDeg - index * 90 + 360) % 360;
  const side = rel === 90 || rel === 270;
  const face = side ? 'side' : rel === 180 ? 'back' : 'front';
  return {
    u: [s.xCm, s.yCm, r.roomW - s.xCm, r.roomD - s.yCm][index],
    depth: [s.yCm, r.roomW - s.xCm, r.roomD - s.yCm, s.xCm][index],
    span: index % 2 ? r.roomD : r.roomW,
    maxDepth: index % 2 ? r.roomW : r.roomD,
    w: side ? i.dCm : i.wCm,
    face: i.views.includes(face) ? face : 'front',
    flip: rel === 90 ? !s.flipX : s.flipX,
  };
}
const upper = (s) => ['wall', 'ceiling'].includes(byId(s.itemId).zone) || s.elevCm >= 90;
const planLayer = (s) => (byId(s.itemId).zone === 'rug' ? 0 : upper(s) ? 2 : 1);
function visible(room, mode, wall, level, full) {
  if (mode === 'plan')
    return room.stickers
      .filter((s) => level === 'All' || (level === 'Upper') === upper(s))
      .sort((a, b) => planLayer(a) - planLayer(b) || a.zIdx - b.zIdx);
  return room.stickers
    .filter((s) => {
      const p = projection(s, room, wall);
      return full || p.depth <= p.maxDepth * 0.55;
    })
    .sort(
      (a, b) =>
        Number(byId(b.itemId).zone === 'rug') - Number(byId(a.itemId).zone === 'rug') ||
        projection(a, room, wall).depth - projection(b, room, wall).depth ||
        a.zIdx - b.zIdx,
    );
}
module.exports = {
  items,
  studios,
  lookbooks,
  byId,
  studioOf,
  clamp,
  peso,
  ratio,
  snap,
  gap,
  itemSize,
  roomSize,
  uid,
  newRoom,
  defaults,
  footprint,
  constrain,
  resize,
  spawn,
  duplicate,
  uniqueTitle,
  shopping,
  walls,
  projection,
  upper,
  visible,
};
