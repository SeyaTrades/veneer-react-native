import React, { useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { items, studioOf, itemSize, roomSize, peso, shopping, clamp } from './planner';
import { owned, feed } from './state';
import Stage from './Stage';
import { Settings } from './Dialogs';
import { useLayout, useApp, C, T, Btn, Seg, Field, Art, Icon, Grid, card, row, wrap } from './ui';

function RoomCard({ room, mode, community }) {
  const { state, send, open, go } = useApp(),
    p = state.disk.prefs,
    price = shopping(room).split;
  function edit() {
    const load = () => {
      send({ type: 'load', room });
      go('Studio');
    };
    if (!state.dirty) return load();
    open({
      type: 'confirm',
      title: 'Load Room?',
      message: 'This will replace your unsaved changes in Studio.',
      buttons: [['Load', load]],
    });
  }
  const remix = () => {
    send({ type: 'remix', room });
    go('Studio');
  };
  return (
    <View style={{ ...card, overflow: 'hidden' }}>
      <View style={{ aspectRatio: 1.5 }}>
        <Stage room={room} prefs={p} mode={mode} readonly />
      </View>
      <View style={{ padding: 12, gap: 4 }}>
        <View style={row}>
          <T bold size={15} style={{ flex: 1 }} numberOfLines={1}>
            {room.title}
          </T>
          {!community && room.isPublic && (
            <T bold size={10} color={C.accent}>
              Public
            </T>
          )}
        </View>
        <T size={11} color={C.muted}>
          {studioOf(room).name} • {roomSize(room, p.unit)}
        </T>
        <T
          size={12}
          bold
          color={
            !community && room.budgetCap !== null && price > room.budgetCap ? C.warn : C.accent
          }
        >
          {room.stickers.length} items • Est. {peso(price)}
        </T>
        <View style={{ ...wrap, marginTop: 6 }}>
          <Btn
            kind={community ? 'solid' : 'chip'}
            icon={community ? 'copy-all' : 'edit'}
            label={community ? 'Remix' : 'Edit'}
            onPress={community ? remix : edit}
          />
          <Btn
            label={community ? 'Shop Look' : 'Shop List'}
            icon="shopping-bag"
            onPress={() => open({ type: 'shop', room })}
          />
          {!community && (
            <Btn
              kind="text"
              icon="delete-outline"
              access="Delete Room"
              color={C.warn}
              onPress={() =>
                open({
                  type: 'confirm',
                  title: 'Delete Saved Room?',
                  message: 'Remove "' + room.title + '" permanently?',
                  buttons: [['Delete', () => send({ type: 'remove', id: room.id })]],
                })
              }
            />
          )}
        </View>
      </View>
    </View>
  );
}
export function Discover() {
  const { state, send, open, go } = useApp(),
    ui = useLayout();
  const [tab, setTab] = useState('catalog'),
    [mode, setMode] = useState('wall'),
    [style, setStyle] = useState('All'),
    [q, setQ] = useState('');
  const choices = ['All', ...new Set(items.flatMap((i) => i.styles))],
    search = q.trim().toLowerCase();
  const shown = items.filter(
    (i) =>
      (style === 'All' || i.styles.includes(style)) &&
      (i.name + ' ' + i.cat).toLowerCase().includes(search),
  );
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          ...wrap,
          paddingHorizontal: ui.pad,
          paddingVertical: 8,
          justifyContent: 'space-between',
        }}
      >
        <T size={18} bold>
          Discover
        </T>
        <Seg
          small={false}
          choices={[
            ['catalog', 'Catalog'],
            ['books', 'Lookbooks'],
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      {tab === 'catalog' ? (
        <>
          <View style={{ paddingHorizontal: ui.pad, paddingVertical: 4 }}>
            <Field placeholder="Search furniture or category..." value={q} onChangeText={setQ} />
          </View>
          <View style={{ ...wrap, paddingHorizontal: ui.pad, paddingVertical: 4 }}>
            {choices.map((s) => (
              <Btn
                small
                kind="chip"
                key={s}
                selected={s === style}
                label={s}
                onPress={() => setStyle(s)}
              />
            ))}
          </View>
          <Grid
            data={shown}
            pad={ui.pad}
            gap={10}
            columns={(w) => clamp(Math.floor(w / 160), 2, 5)}
            empty="No matching furniture found"
            render={(i) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={i.name}
                onPress={() =>
                  open({
                    type: 'product',
                    item: i,
                    place: () => {
                      send({ type: 'drop', item: i });
                      go('Studio');
                    },
                  })
                }
                style={{ ...card, padding: 10, aspectRatio: 0.82, gap: 3 }}
              >
                <View style={{ flex: 1, marginBottom: 5 }}>
                  <Art item={i} />
                </View>
                <T bold size={13} numberOfLines={1}>
                  {i.name}
                </T>
                <T size={10} color={C.muted}>
                  {itemSize(i, state.disk.prefs.unit)}
                </T>
                <T size={12} bold color={C.accent}>
                  From {peso(i.minPrice)}
                </T>
              </Pressable>
            )}
          />
        </>
      ) : (
        <>
          <View style={{ ...row, paddingHorizontal: ui.pad }}>
            <T size={12} color={C.muted}>
              Preview:
            </T>
            {[
              ['wall', 'North Wall'],
              ['plan', 'Top Plan'],
            ].map(([v, label]) => (
              <Btn
                small
                key={v}
                label={label}
                kind="chip"
                selected={v === mode}
                onPress={() => setMode(v)}
              />
            ))}
          </View>
          <Grid
            data={feed(state)}
            columns={(w) => (w >= 680 ? 2 : 1)}
            pad={ui.pad}
            gap={12}
            empty="No community lookbooks yet"
            render={(r) => <RoomCard room={r} mode={mode} community />}
          />
        </>
      )}
    </View>
  );
}
export function Storage() {
  const { state, send, open, go } = useApp(),
    ui = useLayout(),
    rooms = owned(state);
  const [mode, setMode] = useState('plan');
  if (!state.disk.user || !rooms.length) {
    const guest = !state.disk.user;
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: ui.pad * 2,
          gap: 9,
        }}
      >
        <Icon name={guest ? 'bookmarks' : 'meeting-room'} color={C.muted} size={52} />
        <T bold size={18}>
          {guest ? 'Saved Rooms & Shopping Lists' : 'No saved rooms yet'}
        </T>
        <T color={C.muted} style={{ textAlign: 'center' }}>
          {guest
            ? 'Sign in to store room layouts and generate grouped shopping lists.'
            : 'Decorate a room in Studio and tap Save to keep it here.'}
        </T>
        <View style={{ ...wrap, justifyContent: 'center', marginTop: 7 }}>
          <Btn
            kind="solid"
            label={guest ? 'Sign In / Register' : 'Open Studio'}
            onPress={() => go(guest ? 'Account' : 'Studio')}
          />
          {guest && <Btn label="Demo Account" onPress={() => send({ type: 'user', user: demo })} />}
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <View style={{ ...wrap, padding: ui.pad, paddingBottom: 4 }}>
        <T size={18} bold>
          Saved Rooms ({rooms.length})
        </T>
        {[
          ['plan', 'Plan'],
          ['wall', 'Wall'],
        ].map(([v, label]) => (
          <Btn
            small
            key={v}
            kind="chip"
            selected={v === mode}
            label={label}
            onPress={() => setMode(v)}
          />
        ))}
        {!!state.room.stickers.length && (
          <Btn
            kind="text"
            label="Draft List"
            icon="receipt-long"
            onPress={() => open({ type: 'shop', room: state.room })}
          />
        )}
      </View>
      <Grid
        data={rooms}
        pad={ui.pad}
        gap={12}
        columns={(w) => (w >= 680 ? 2 : 1)}
        render={(r) => <RoomCard room={r} mode={mode} />}
      />
    </View>
  );
}
const demo = { id: 'usr_demo@veneer.app', name: 'demo', email: 'demo@veneer.app' };
export function Account() {
  const { state, send, go, notify } = useApp(),
    ui = useLayout(),
    user = state.disk.user;
  const [signUp, setSignUp] = useState(false),
    [email, setEmail] = useState(''),
    [name, setName] = useState(''),
    [pass, setPass] = useState(''),
    [errors, setErrors] = useState({});
  function login() {
    const e = {};
    if (signUp && name.trim().length < 2) e.name = 'Enter a name';
    if (!email.includes('@')) e.email = 'Enter a valid email';
    if (pass.length < 4) e.pass = 'Min 4 characters';
    setErrors(e);
    if (Object.keys(e).length) return;
    const address = email.trim();
    send({
      type: 'user',
      user: {
        id: 'usr_' + address,
        email: address,
        name: signUp ? name.trim() : address.split('@')[0],
      },
    });
    setPass('');
    notify(signUp ? 'Account created (local mock)' : 'Signed in (local mock)');
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: ui.pad * 1.5,
      }}
    >
      <View style={{ width: '100%', maxWidth: 460, gap: 16 }}>
        {user ? (
          <View style={{ ...card, padding: 20, alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: C.accent,
              }}
            >
              <T size={22} color="white">
                {user.name[0]?.toUpperCase() || '?'}
              </T>
            </View>
            <T size={18} bold>
              {user.name}
            </T>
            <T color={C.muted}>{user.email}</T>
            <T bold>Saved Rooms: {owned(state).length}</T>
            {state.dirty && (
              <Btn
                style={{ alignSelf: 'stretch' }}
                kind="solid"
                label="Return to Studio & Save Draft"
                onPress={() => go('Studio')}
              />
            )}
            <Btn
              style={{ alignSelf: 'stretch' }}
              label="Sign Out"
              icon="logout"
              onPress={() => send({ type: 'user', user: null })}
            />
          </View>
        ) : (
          <View style={{ ...card, padding: 20, gap: 10 }}>
            <T size={20} bold>
              {signUp ? 'Create Account' : 'Sign In to Veneer'}
            </T>
            <T color={C.muted} size={12}>
              Save rooms, publish lookbooks, and track shopping lists.
            </T>
            {signUp && (
              <>
                <Field label="Display Name" value={name} onChangeText={setName} />
                {errors.name && <T color={C.warn}>{errors.name}</T>}
              </>
            )}
            <Field
              label="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            {errors.email && <T color={C.warn}>{errors.email}</T>}
            <Field label="Password" secureTextEntry value={pass} onChangeText={setPass} />
            {errors.pass && <T color={C.warn}>{errors.pass}</T>}
            <Btn kind="solid" label={signUp ? 'Create Account' : 'Sign In'} onPress={login} />
            <Btn
              label="1-Tap Demo Account"
              onPress={() => {
                setPass('');
                send({ type: 'user', user: demo });
                notify('Signed in as Demo User');
              }}
            />
            <Btn
              kind="text"
              label={signUp ? 'Already have an account? Sign In' : 'Need an account? Register'}
              onPress={() => {
                setSignUp(!signUp);
                setErrors({});
              }}
            />
          </View>
        )}
        <View style={{ ...card, padding: 16 }}>
          <Settings />
        </View>
      </View>
    </ScrollView>
  );
}
