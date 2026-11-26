import React, { useState } from 'react';
import { View, Pressable, Linking } from 'react-native';
import { byId, ratio, peso, gap, itemSize, footprint, shopping } from './planner';
import { owned } from './state';
import { useApp, T, Btn, Toggle, Seg, Overlay, Menu, Field, Art, C, card, row, wrap } from './ui';

export const rules = [
  ['ask', 'Ask me (Save / Keep / Load Latest)'],
  ['loadLast', 'Auto-load my latest room for that type'],
  ['keepItems', 'Keep current furniture across rooms'],
  ['blank', 'Always start empty'],
];
export function Settings({ quick = false }) {
  const { state, send, open } = useApp(),
    p = state.disk.prefs;
  const set = (fields) => send({ type: 'prefs', fields });
  return (
    <View style={{ gap: 8 }}>
      <T size={16} bold>
        {quick ? 'Planner Settings' : 'Planner Preferences'}
      </T>
      <View style={{ ...row, justifyContent: 'space-between' }}>
        <T>{quick ? 'Measurement Units' : 'Units'}</T>
        <Seg
          choices={[
            ['metric', 'Metric'],
            ['imperial', 'Imperial'],
          ]}
          value={p.unit}
          onChange={(unit) => set({ unit })}
        />
      </View>
      <Toggle
        label={'Snap to Grid (' + (p.unit === 'metric' ? '5 cm' : '2 in') + ')'}
        value={p.snapOn}
        change={(snapOn) => set({ snapOn })}
      />
      <Toggle
        label="Show Blueprint Grid"
        value={p.showGrid}
        change={(showGrid) => set({ showGrid })}
      />
      {!quick && (
        <>
          <T bold size={13}>
            When Switching Room Type
          </T>
          <Btn
            menu
            label={rules.find(([key]) => key === p.switchRule)?.[1]}
            icon="arrow-drop-down"
            style={{ borderRadius: 5 }}
            onPress={(anchor) =>
              open({
                type: 'choice',
                anchor,
                title: 'When Switching Room Type',
                options: rules,
                selected: p.switchRule,
                choose: (switchRule) => set({ switchRule }),
              })
            }
          />
        </>
      )}
    </View>
  );
}
export function Properties({ asCard = false }) {
  const { state, send, open } = useApp(),
    r = state.room,
    p = state.disk.prefs,
    s = r.stickers.find((s) => s.id === state.selected);
  if (!s)
    return (
      <T color={C.muted} style={{ textAlign: 'center', padding: 16 }}>
        Tap a piece of furniture to see its position.
      </T>
    );
  const i = byId(s.itemId),
    [w, d] = footprint(s),
    step = ratio(p.unit);
  const edit = (field, value) =>
    send({ type: 'item', id: s.id, op: 'coords', fields: { [field]: value } });
  const rows = [
    ['From West Wall', 'Distance from West Wall', 'xCm', w / 2, step],
    ['From North Wall', 'Distance from North Wall', 'yCm', d / 2, step],
    ['Height Above Floor', 'Height Above Floor', 'elevCm', 0, step * 5],
  ];
  return (
    <View style={{ gap: 9 }}>
      <View style={row}>
        <T bold size={15} style={{ flex: 1 }}>
          {i.name}
        </T>
        {s.isLocked && (
          <T color={C.amber} bold>
            Locked
          </T>
        )}
      </View>
      <T size={12} color={C.muted}>
        {itemSize(i, p.unit)} • {s.rotDeg}°
      </T>
      {rows.map(([label, title, field, offset, nudge]) => {
        const value = Math.max(0, s[field] - offset);
        return (
          <View key={field} style={row}>
            <T size={12} bold style={{ flex: 1 }}>
              {label}
            </T>
            <Btn
              small
              kind="text"
              access={'Decrease ' + label}
              icon="remove-circle-outline"
              disabled={s.isLocked}
              onPress={() => edit(field, s[field] - nudge)}
            />
            <Btn
              small
              kind="chip"
              access={'Edit ' + label}
              label={gap(value, p.unit)}
              disabled={s.isLocked}
              onPress={() =>
                open({
                  type: 'number',
                  title,
                  label: 'Value (' + (p.unit === 'metric' ? 'cm' : 'in') + ')',
                  initial: (value / step).toFixed(p.unit === 'metric' ? 0 : 1),
                  apply: (n) => edit(field, n * step + offset),
                })
              }
            />
            <Btn
              small
              kind="text"
              access={'Increase ' + label}
              icon="add-circle-outline"
              disabled={s.isLocked}
              onPress={() => edit(field, s[field] + nudge)}
            />
          </View>
        );
      })}
      {!asCard && (
        <View style={wrap}>
          <Btn label="Drop to Floor" disabled={s.isLocked} onPress={() => edit('elevCm', 0)} />
          <Btn
            label={s.isLocked ? 'Unlock' : 'Lock'}
            onPress={() => send({ type: 'item', id: s.id, op: 'lock' })}
          />
        </View>
      )}
    </View>
  );
}
function Product({ item, place }) {
  const { state, close, notify } = useApp();
  const visit = (url) => Linking.openURL(url).catch(() => notify('Could not open store link'));
  const listings = [...item.listings].sort((a, b) => a.bestPrice - b.bestPrice);
  return (
    <View style={{ gap: 10 }}>
      <View style={row}>
        <View style={{ ...card, padding: 8, width: 68, height: 68, backgroundColor: C.bg }}>
          <Art item={item} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <T size={17} bold>
            {item.name}
          </T>
          <T color={C.muted} size={12}>
            {item.cat} • {itemSize(item, state.disk.prefs.unit)}
          </T>
          <T bold color={C.accent}>
            From {peso(item.minPrice)}
          </T>
        </View>
        {place && (
          <Btn
            kind="solid"
            label="Place"
            onPress={() => {
              close();
              place();
            }}
          />
        )}
      </View>
      <T size={13} bold>
        Compare Stores
      </T>
      {listings.map((l, i) => (
        <View
          key={l.id}
          style={{
            ...row,
            ...card,
            backgroundColor: i ? C.bg : '#f4f8f5',
            borderColor: i ? C.line : C.accent,
            padding: 10,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <View style={wrap}>
              <T bold>{l.store}</T>
              {!i && <Tag label="BEST" color={C.accent} />}{' '}
              {!!l.promoTag && <Tag label={l.promoTag} color={C.amber} />}
            </View>
            <View style={row}>
              <T bold>{peso(l.bestPrice)}</T>
              {l.bestPrice < l.regPrice && (
                <T size={12} color={C.muted} style={{ textDecorationLine: 'line-through' }}>
                  {peso(l.regPrice)}
                </T>
              )}
            </View>
          </View>
          <Btn kind="text" label="Visit" icon="open-in-new" onPress={() => visit(l.url)} />
        </View>
      ))}
      <Btn
        label="Search More Stores Online"
        icon="search"
        onPress={() =>
          visit('https://www.google.com/search?tbm=shop&q=' + encodeURIComponent(item.name))
        }
      />
    </View>
  );
}
function Tag({ label, color }) {
  return (
    <T
      size={10}
      bold
      color="white"
      style={{ backgroundColor: color, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}
    >
      {label}
    </T>
  );
}
function Shop({ room }) {
  const { open } = useApp(),
    { rows, split, ikea } = shopping(room);
  if (!rows.length) return <T color={C.muted}>No items placed in this room yet.</T>;
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          ...row,
          ...card,
          borderColor: C.accent,
          backgroundColor: '#f4f8f5',
          padding: 10,
          justifyContent: 'space-between',
        }}
      >
        <View>
          <T size={11} color={C.muted}>
            Lowest total across stores
          </T>
          <T size={16} bold color={C.accent}>
            {peso(split)}
          </T>
        </View>
        {ikea !== null && (
          <View style={{ alignItems: 'flex-end' }}>
            <T size={11} color={C.muted}>
              All from IKEA PH
            </T>
            <T bold>{peso(ikea)}</T>
          </View>
        )}
      </View>
      {rows.map(({ item, qty }) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.name + ' ×' + qty}
          onPress={() => open({ type: 'product', item })}
          style={{ ...row, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 8 }}
        >
          <View style={{ width: 44, height: 44, padding: 4, backgroundColor: C.bg }}>
            <Art item={item} />
          </View>
          <View style={{ flex: 1 }}>
            <T bold>
              {item.name} ×{qty}
            </T>
            <T size={12} color={C.muted}>
              {peso(item.minPrice)} each • Best at{' '}
              {item.listings.find((l) => l.bestPrice === item.minPrice)?.store}
            </T>
          </View>
          <T bold size={13}>
            {peso(item.minPrice * qty)}
          </T>
        </Pressable>
      ))}
    </View>
  );
}
export function Dialog({ dialog: q }) {
  const { state, send, close, notify } = useApp(),
    r = state.room,
    p = state.disk.prefs,
    scale = ratio(p.unit);
  const [name, setName] = useState(r.title),
    [pub, setPub] = useState(r.isPublic);
  const [number, setNumber] = useState(q.initial ?? (r.budgetCap?.toString() || ''));
  const [dims, setDims] = useState([r.roomW, r.roomD, r.ceilH].map((x) => (x / scale).toFixed(0)));
  const done = (fn) => () => {
    close();
    fn?.();
  };
  const actions = (children) => (
    <View style={{ ...wrap, justifyContent: 'flex-end' }}>{children}</View>
  );
  const cancel = <Btn label="Cancel" kind="text" onPress={close} />;
  let title = q.title,
    content,
    sheet = false;
  switch (q.type) {
    case 'choice':
      if (q.anchor) return <Menu {...q} close={close} />;
      content = q.options.map(([key, label]) => (
        <Btn
          key={key}
          kind="text"
          label={label}
          icon={q.selected === key ? 'check-circle' : undefined}
          onPress={done(() => q.choose(key))}
        />
      ));
      break;
    case 'confirm':
      content = (
        <>
          <T>{q.message}</T>
          {actions(
            <>
              {cancel}
              {q.buttons.map(([label, fn]) => (
                <Btn key={label} label={label} onPress={done(fn)} />
              ))}
            </>,
          )}
        </>
      );
      break;
    case 'settings':
      sheet = true;
      content = <Settings quick />;
      break;
    case 'product':
      sheet = true;
      content = <Product item={q.item} place={q.place} />;
      break;
    case 'shop':
      sheet = true;
      title = q.room.title + ' — Shopping List';
      content = <Shop room={q.room} />;
      break;
    case 'props':
      sheet = true;
      content = <Properties />;
      break;
    case 'layers':
      sheet = true;
      content = r.stickers.length ? (
        [...r.stickers]
          .sort((a, b) => b.zIdx - a.zIdx)
          .map((s) => {
            const i = byId(s.itemId);
            return (
              <View key={s.id} style={{ ...row, borderBottomWidth: 1, borderColor: C.line }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={'Select ' + i.name}
                  onPress={done(() => send({ type: 'view', fields: { selected: s.id } }))}
                  style={{ ...row, flex: 1, paddingVertical: 6 }}
                >
                  <View style={{ width: 40, height: 40 }}>
                    <Art item={i} />
                  </View>
                  <View>
                    <T bold={s.id === state.selected}>{i.name}</T>
                    <T size={12} color={C.muted}>
                      {s.rotDeg}°{s.isLocked ? ' • Locked' : ''}
                    </T>
                  </View>
                </Pressable>
                <Btn
                  kind="text"
                  access={(s.isLocked ? 'Unlock ' : 'Lock ') + i.name}
                  icon={s.isLocked ? 'lock' : 'lock-open'}
                  onPress={() => send({ type: 'item', id: s.id, op: 'lock' })}
                />
              </View>
            );
          })
      ) : (
        <T style={{ textAlign: 'center', padding: 28 }}>No items placed yet</T>
      );
      break;
    case 'save': {
      const canUpdate = owned(state).some((s) => s.id === r.id);
      title = canUpdate ? 'Save Changes' : 'Save Room';
      const commit = (copy) => {
        send({ type: 'save', fields: { title: name, isPublic: pub }, copy });
        notify(copy ? 'Room copy saved' : 'Room saved');
      };
      content = (
        <>
          <Field label="Room Name" value={name} onChangeText={setName} />
          <Toggle label="Share to Lookbooks" value={pub} change={setPub} />
          {actions(
            <>
              {cancel}
              {canUpdate && <Btn label="Save as Copy" onPress={done(() => commit(true))} />}
              <Btn
                kind="solid"
                label={canUpdate ? 'Update' : 'Save'}
                onPress={done(() => commit(false))}
              />
            </>,
          )}
        </>
      );
      break;
    }
    case 'dimensions':
      title = 'Room Dimensions';
      content = (
        <>
          {['Width', 'Depth', 'Ceiling Height'].map((label, i) => (
            <Field
              key={label}
              label={label + ' (' + (scale === 1 ? 'cm' : 'in') + ')'}
              keyboardType="decimal-pad"
              value={dims[i]}
              onChangeText={(v) => setDims((old) => old.map((x, j) => (i === j ? v : x)))}
            />
          ))}
          {actions(
            <>
              {cancel}
              <Btn
                kind="solid"
                label="Apply"
                onPress={done(() => {
                  if (dims.every((v) => v.trim() && Number.isFinite(Number(v))))
                    send({ type: 'size', values: dims.map((v) => Number(v) * scale) });
                })}
              />
            </>,
          )}
        </>
      );
      break;
    case 'budget':
      title = 'Room Budget Cap';
      content = (
        <>
          <Field
            label="Max Budget (₱)"
            placeholder="e.g. 25000"
            keyboardType="decimal-pad"
            value={number}
            onChangeText={setNumber}
          />
          {actions(
            <>
              <Btn
                kind="text"
                label="Clear"
                onPress={done(() => send({ type: 'room', fields: { budgetCap: null } }))}
              />
              <Btn
                kind="solid"
                label="Apply"
                onPress={done(() =>
                  send({
                    type: 'room',
                    fields: { budgetCap: Number.isFinite(+number) && +number > 0 ? +number : null },
                  }),
                )}
              />
            </>,
          )}
        </>
      );
      break;
    case 'number':
      content = (
        <>
          <Field
            label={q.label}
            keyboardType="decimal-pad"
            value={number}
            onChangeText={setNumber}
          />
          {actions(
            <>
              {cancel}
              <Btn
                kind="solid"
                label="Set"
                onPress={done(() => {
                  if (number.trim() && Number.isFinite(+number) && +number >= 0) q.apply(+number);
                })}
              />
            </>,
          )}
        </>
      );
      break;
    default:
      return null;
  }
  return (
    <Overlay title={title} close={close} sheet={sheet}>
      {content}
    </Overlay>
  );
}
