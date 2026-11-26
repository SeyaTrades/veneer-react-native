const {
  studios,
  lookbooks,
  uid,
  newRoom,
  defaults,
  spawn,
  duplicate,
  constrain,
  resize,
  uniqueTitle,
} = require('./planner');

function initialState() {
  return {
    disk: { user: null, rooms: [], prefs: { ...defaults } },
    room: newRoom(),
    selected: null,
    dirty: false,
    pan: false,
    mode: 'plan',
    wall: 'N',
  };
}
const owned = (state) =>
  state.disk.rooms
    .filter((r) => state.disk.user && r.userId === state.disk.user.id)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
const feed = (state) => [...state.disk.rooms.filter((r) => r.isPublic), ...lookbooks];
function save(state, fields = {}, copy = false) {
  if (!state.disk.user) return state;
  const saves = owned(state);
  const existing = !copy && saves.some((r) => r.id === state.room.id);
  const id = existing ? state.room.id : uid('rm');
  const room = {
    ...state.room,
    ...fields,
    id,
    userId: state.disk.user.id,
    savedAt: new Date().toISOString(),
  };
  room.title = uniqueTitle(room.title, saves, id);
  const rooms = state.disk.rooms.filter((r) => r.id !== id).concat(room);
  return { ...state, room, dirty: false, disk: { ...state.disk, rooms } };
}
function reduce(state, action) {
  const { room, disk } = state;
  const draft = (next) => ({ ...state, room: next, dirty: true });
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        disk: { ...disk, ...action.data, prefs: { ...defaults, ...action.data?.prefs } },
      };
    case 'user':
      return { ...state, disk: { ...disk, user: action.user } };
    case 'prefs':
      return { ...state, disk: { ...disk, prefs: { ...disk.prefs, ...action.fields } } };
    case 'view':
      return { ...state, ...action.fields };
    case 'room':
      return draft({ ...room, ...action.fields });
    case 'size':
      return draft(resize(room, ...action.values));
    case 'drop': {
      const s = spawn(room, action.item, disk.prefs);
      return { ...draft({ ...room, stickers: [...room.stickers, s] }), selected: s.id, pan: false };
    }
    case 'item': {
      const s = room.stickers.find((x) => x.id === action.id);
      if (!s || (s.isLocked && !['lock', 'copy'].includes(action.op))) return state;
      if (action.op === 'copy') {
        const c = duplicate(s, room);
        return { ...draft({ ...room, stickers: [...room.stickers, c] }), selected: c.id };
      }
      if (action.op === 'delete')
        return {
          ...draft({ ...room, stickers: room.stickers.filter((x) => x.id !== s.id) }),
          selected: null,
        };
      const patch =
        action.op === 'lock'
          ? { isLocked: !s.isLocked }
          : action.op === 'turn'
            ? { rotDeg: (s.rotDeg + 90) % 360 }
            : action.fields;
      const next = constrain({ ...s, ...patch }, room);
      return draft({ ...room, stickers: room.stickers.map((x) => (x.id === s.id ? next : x)) });
    }
    case 'switch': {
      const studio = studios.find((st) => st.id === action.studioId);
      if (action.keep)
        return {
          ...draft(
            resize({ ...room, studioId: studio.id }, studio.roomW, studio.roomD, studio.ceilH),
          ),
          selected: null,
        };
      return {
        ...state,
        room: newRoom(studio, uniqueTitle('Untitled Room', owned(state)), disk.user?.id),
        selected: null,
        dirty: false,
      };
    }
    case 'save':
      return save(state, action.fields, action.copy);
    case 'load':
      return { ...state, room: action.room, selected: null, dirty: false };
    case 'remix': {
      const r = action.room;
      return {
        ...draft({
          ...r,
          id: uid('draft'),
          userId: disk.user?.id || 'guest',
          isPublic: false,
          cloneFrom: r.id,
          title: uniqueTitle(r.title + ' Remix', owned(state)),
          stickers: r.stickers.map((s) => ({ ...s, id: uid('stk'), isLocked: false })),
        }),
        selected: null,
      };
    }
    case 'remove':
      return {
        ...state,
        disk: {
          ...disk,
          rooms: disk.rooms.filter((r) => r.id !== action.id || r.userId !== disk.user?.id),
        },
      };
    default:
      return state;
  }
}
module.exports = { initialState, reduce, owned, feed };
