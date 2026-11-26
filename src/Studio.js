import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import {
  items,
  studios,
  studioOf,
  byId,
  clamp,
  peso,
  roomSize,
  itemSize,
  shopping,
  walls,
} from './planner';
import { owned } from './state';
import Stage from './Stage';
import { Properties } from './Dialogs';
import { useLayout, useApp, T, Btn, Seg, Art, Icon, Grid, C, row, wrap, card } from './ui';

export default function Studio() {
  const { state, send, open, go } = useApp(),
    ui = useLayout(),
    r = state.room,
    p = state.disk.prefs,
    studio = studioOf(r);
  const [cat, setCat] = useState('All'),
    [roomOnly, setRoomOnly] = useState(false),
    [tray, setTray] = useState(true);
  const [level, setLevel] = useState('All'),
    [full, setFull] = useState(false),
    [side, setSide] = useState('Catalog');
  const picked = r.stickers.find((s) => s.id === state.selected),
    item = picked && byId(picked.itemId),
    est = shopping(r).split;
  const view = (fields) => send({ type: 'view', fields });
  const place = (i) => send({ type: 'drop', item: i });
  const chooseStudio = (id) => {
    if (id === r.studioId) return;
    const latest = owned(state).find((s) => s.studioId === id);
    const blank = () => send({ type: 'switch', studioId: id }),
      keep = () => send({ type: 'switch', studioId: id, keep: true });
    const load = () => (latest ? send({ type: 'load', room: latest }) : blank());
    if (p.switchRule === 'keepItems') return keep();
    if (p.switchRule === 'blank' || (!r.stickers.length && !latest)) return blank();
    if (p.switchRule === 'loadLast') return load();
    const buttons = [];
    if (r.stickers.length) {
      buttons.push(['Keep Furniture', keep]);
      if (state.disk.user)
        buttons.push([
          'Save & Switch',
          () => {
            send({ type: 'save' });
            load();
          },
        ]);
    }
    if (latest) buttons.push(['Load "' + latest.title + '"', load]);
    buttons.push(['Start Empty', blank]);
    open({
      type: 'confirm',
      title: 'Switch to ' + studios.find((s) => s.id === id).name + '?',
      message: r.stickers.length
        ? 'What would you like to do with the furniture in this room?'
        : 'You have a saved room of this type. Load it?',
      buttons,
    });
  };
  const save = () => (state.disk.user ? open({ type: 'save' }) : go('Account'));
  const fresh = () => {
    const reset = () => send({ type: 'switch', studioId: r.studioId });
    if (!r.stickers.length && !state.dirty) return reset();
    open({
      type: 'confirm',
      title: 'Start an empty room?',
      message: 'You’ll lose any changes you haven’t saved.',
      buttons: [['Start empty', reset]],
    });
  };
  const head = (
    <View
      style={{ ...row, minHeight: 44, paddingHorizontal: ui.pad, paddingTop: 6, paddingBottom: 2 }}
    >
      <View style={{ flex: 1 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Room title" onPress={save}>
          <T size={15} bold numberOfLines={1}>
            {r.title}
            {state.dirty ? ' •' : ''}
          </T>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Room budget"
          onPress={() => open({ type: 'budget' })}
        >
          <T size={11} bold color={r.budgetCap !== null && est > r.budgetCap ? C.warn : C.accent}>
            Est. {peso(est)}
            {r.budgetCap === null ? ' • Set Budget' : ' / ' + peso(r.budgetCap)}
          </T>
        </Pressable>
      </View>
      <Btn
        small
        kind="text"
        icon="tune"
        access="Quick Settings"
        onPress={() => open({ type: 'settings' })}
      />
      <Btn small icon="note-add" label={ui.slim ? '' : 'New'} access="New" onPress={fresh} />
      <Btn small kind="solid" icon="bookmark-border" label="Save" onPress={save} />
    </View>
  );
  const tools = (
    <View style={{ ...wrap, paddingVertical: 4, paddingHorizontal: ui.pad }}>
      <Btn
        small
        menu
        kind="pill"
        icon="meeting-room"
        label={studio.name + ' ▾'}
        access="Change Room Type"
        onPress={(anchor) =>
          open({
            type: 'choice',
            anchor,
            title: 'Change Room Type',
            selected: studio.id,
            options: studios.map((s) => [s.id, s.name]),
            choose: chooseStudio,
          })
        }
      />
      <Btn
        small
        kind="pill"
        icon="square-foot"
        label={roomSize(r, p.unit)}
        access="Room Dimensions"
        onPress={() => open({ type: 'dimensions' })}
      />
      <Seg
        choices={[
          ['plan', 'Top Plan'],
          ['wall', 'Wall'],
        ]}
        value={state.mode}
        onChange={(mode) => view({ mode })}
      />
      {state.mode === 'plan' ? (
        <Seg
          choices={['All', 'Floor', 'Upper'].map((x) => [x, x])}
          value={level}
          onChange={setLevel}
        />
      ) : (
        <>
          <Seg
            choices={walls.map((x) => [x, x])}
            value={state.wall}
            onChange={(wall) => view({ wall })}
          />
          <Seg
            choices={[
              [false, 'Half Depth'],
              [true, 'Full'],
            ]}
            value={full}
            onChange={setFull}
          />
        </>
      )}
      <Btn
        small
        kind="chip"
        icon={state.pan ? 'pan-tool' : 'touch-app'}
        label={state.pan ? 'Pan View' : 'Move Items'}
        selected={state.pan}
        onPress={() => view({ pan: !state.pan })}
      />
      {!ui.wide && (
        <Btn
          small
          icon={tray ? 'keyboard-arrow-down' : 'add-box'}
          label={tray ? 'Expand' : 'Catalog'}
          onPress={() => setTray(!tray)}
        />
      )}
    </View>
  );
  const action = (op) => send({ type: 'item', id: picked.id, op });
  const strip = picked && (
    <View
      style={{
        backgroundColor: C.surface,
        borderColor: C.line,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        paddingHorizontal: ui.pad,
        paddingVertical: 5,
        gap: 4,
      }}
    >
      <View style={row}>
        <T numberOfLines={1} size={12} bold style={{ flex: 1 }}>
          {item.name} • {itemSize(item, p.unit)}
        </T>
        {!ui.desk && (
          <Btn
            small
            kind="text"
            icon="straighten"
            label="Position"
            onPress={() => open({ type: 'props' })}
          />
        )}
        <Btn
          small
          kind="text"
          icon="close"
          access="Deselect"
          onPress={() => view({ selected: null })}
        />
      </View>
      <View style={row}>
        {[
          ['Turn', 'rotate-right', () => action('turn'), picked.isLocked],
          [
            picked.isLocked ? 'Unlock' : 'Lock',
            picked.isLocked ? 'lock' : 'lock-open',
            () => action('lock'),
          ],
          ['Copy', 'content-copy', () => action('copy')],
          ['Shop', 'shopping-bag', () => open({ type: 'product', item })],
          ['Delete', 'delete-outline', () => action('delete'), picked.isLocked],
        ].map(([label, icon, fn, disabled]) => (
          <Btn
            small
            vertical
            key={label}
            icon={icon}
            label={label}
            onPress={fn}
            disabled={disabled}
            kind={label === 'Shop' ? 'solid' : 'chip'}
            color={label === 'Delete' ? C.warn : label === 'Unlock' ? C.amber : undefined}
            style={{ flex: 1, borderRadius: 8, gap: 2, paddingHorizontal: 0 }}
          />
        ))}
      </View>
    </View>
  );
  const stage = (
    <View
      style={[
        {
          marginHorizontal: ui.pad,
          marginTop: 4,
          marginBottom: 6,
          ...card,
          borderRadius: 10,
          overflow: 'hidden',
        },
        ui.wide || !tray
          ? { flex: 1, minHeight: 0 }
          : { height: clamp(ui.height * 0.46, 240, 500) - 10 },
      ]}
    >
      <Stage
        room={r}
        prefs={p}
        mode={state.mode}
        wall={state.wall}
        level={level}
        full={full}
        selected={state.selected}
        pan={state.pan}
        onPick={(id) => view({ selected: id })}
        onMove={(s) =>
          send({
            type: 'item',
            op: 'coords',
            id: s.id,
            fields: { xCm: s.xCm, yCm: s.yCm, elevCm: s.elevCm },
          })
        }
        onList={() => open({ type: 'layers' })}
      />
    </View>
  );
  const shown = items.filter(
    (i) =>
      (cat === 'All' || i.cat === cat) &&
      (!roomOnly || studio.kind === 'blank' || i.rooms.includes(studio.kind)),
  );
  const catalog = (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={{ ...row, paddingHorizontal: ui.pad, paddingTop: 6, paddingBottom: 2 }}>
        <Btn
          small
          menu
          kind="pill"
          icon="category"
          label={cat + ' ▾'}
          access="Filter Category"
          onPress={(anchor) =>
            open({
              type: 'choice',
              anchor,
              title: 'Filter Category',
              selected: cat,
              options: ['All', ...new Set(items.map((i) => i.cat))].map((c) => [c, c]),
              choose: setCat,
            })
          }
        />
        <Btn
          small
          kind="chip"
          selected={roomOnly}
          label="Room Fit"
          onPress={() => setRoomOnly(!roomOnly)}
        />
        <T size={11} color={C.muted} style={{ flex: 1, textAlign: 'right' }}>
          {shown.length} items
        </T>
      </View>
      <Grid
        data={shown}
        columns={(w) => clamp(Math.floor(w / 96), 3, 6)}
        pad={ui.pad}
        empty="No items match this filter"
        render={(i) => (
          <View style={{ ...card, borderRadius: 10, aspectRatio: 0.86, overflow: 'hidden' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={'Place ' + i.name}
              onPress={() => place(i)}
              style={{ flex: 1, padding: 6, alignItems: 'center' }}
            >
              <View style={{ height: 16 }} />
              <View style={{ flex: 1, alignSelf: 'stretch' }}>
                <Art item={i} />
              </View>
              <T size={10} bold numberOfLines={1} style={{ marginTop: 4 }}>
                {i.name}
              </T>
              <T size={10} color={C.accent} bold>
                {peso(i.minPrice)}
              </T>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={'Info for ' + i.name}
              onPress={() => open({ type: 'product', item: i, place: () => place(i) })}
              hitSlop={3}
              style={{ position: 'absolute', right: 3, top: 2, padding: 4 }}
            >
              <Icon name="info-outline" size={15} color={C.muted} />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
  const sidebar = (
    <View
      style={{
        flex: ui.desk ? undefined : 2,
        width: ui.desk ? 320 : undefined,
        borderLeftWidth: 1,
        borderColor: C.line,
        minHeight: 0,
      }}
    >
      <View style={{ padding: ui.pad }}>
        <Seg
          choices={[
            ['Catalog', 'Catalog'],
            ['Properties', 'Properties'],
          ]}
          value={side}
          onChange={setSide}
        />
      </View>
      {side === 'Catalog' ? (
        catalog
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: ui.pad }}>
          <Properties asCard />
        </ScrollView>
      )}
    </View>
  );
  if (ui.wide)
    return (
      <View style={{ flex: 1 }}>
        {ui.desk && (
          <>
            {head}
            {tools}
          </>
        )}
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: ui.desk ? 1 : 3, minWidth: 0 }}>
            {!ui.desk && (
              <>
                {head}
                {tools}
              </>
            )}
            {stage}
            {strip}
          </View>
          {sidebar}
        </View>
      </View>
    );
  return (
    <View style={{ flex: 1 }}>
      {head}
      {tools}
      {stage}
      {strip}
      {tray ? (
        catalog
      ) : (
        <View style={{ padding: 8, backgroundColor: C.surface }}>
          <Btn
            label={'Open Furniture Catalog (' + items.length + ')'}
            icon="keyboard-arrow-up"
            onPress={() => setTray(true)}
          />
        </View>
      )}
    </View>
  );
}
