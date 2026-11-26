import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Platform } from 'react-native';
import { artwork } from './art';
import {
  byId,
  studioOf,
  clamp,
  visible,
  projection,
  footprint,
  upper,
  constrain,
  snap,
  gap,
} from './planner';
import { T, Btn, Art, C, fill, row, Icon } from './ui';

const box = (left, top, width, height) => ({ position: 'absolute', left, top, width, height });
const identity = { zoom: 1, x: 0, y: 0 };
function gridLines(dim, unit) {
  const step = unit === 'metric' ? 50 : 30.48,
    count = Math.ceil(dim / step);
  return Array.from({ length: Math.max(0, count - 1) }, (_, i) => ({
    cm: (i + 1) * step,
    major: (i + 1) % (unit === 'metric' ? 2 : 3) === 0,
  }));
}
function Blueprint({ room, studio, w, h, k, wall, grid, unit }) {
  const floor = studio.floor
    .slice(1)
    .match(/../g)
    .map((c) => Math.round(parseInt(c, 16) * 0.28 + 255 * 0.72));
  const edges = { N: [0, -5, w, 4], E: [w + 1, 0, 4, h], S: [0, h + 1, w, 4], W: [-5, 0, 4, h] };
  const cue = {
    living: [0.66, 0.88],
    bedroom: [0.12, 0.32],
    dining: [0.36, 0.64],
    kitchen: [0, 1],
  }[studio.kind];
  const labels = { N: [w / 2, -13], E: [w + 13, h / 2], S: [w / 2, h + 13], W: [-13, h / 2] };
  return (
    <>
      <View
        style={{
          ...box(-6, -6, w + 12, h + 12),
          backgroundColor: 'rgb(' + floor.join(',') + ')',
          borderWidth: 6,
          borderColor: '#2d312e',
        }}
      />
      {grid &&
        ['x', 'y'].map((axis) =>
          gridLines(axis === 'x' ? room.roomW : room.roomD, unit).map(({ cm, major }) => (
            <View
              key={axis + cm}
              style={{
                ...box(
                  axis === 'x' ? cm * k : 0,
                  axis === 'y' ? cm * k : 0,
                  axis === 'x' ? 1 : w,
                  axis === 'y' ? 1 : h,
                ),
                backgroundColor: major ? '#0000002a' : '#00000014',
              }}
            />
          )),
        )}
      {cue && (
        <View
          style={{
            ...box(w * cue[0], -5, w * (cue[1] - cue[0]), 5),
            backgroundColor: studio.kind === 'kitchen' ? '#94a3b8' : '#60a5fa',
          }}
        />
      )}
      <View style={{ ...box(...edges[wall]), backgroundColor: C.accent }} />
      {Object.entries(labels).map(([label, [x, y]]) => (
        <T
          key={label}
          size={10}
          bold
          color={label === wall ? C.accent : C.muted}
          style={{ ...box(x - 8, y - 7, 16, 16), textAlign: 'center' }}
        >
          {label}
        </T>
      ))}
    </>
  );
}
function objectBox(s, r, isPlan, wall, k, h) {
  const i = byId(s.itemId),
    [fw, fd] = footprint(s);
  if (isPlan) {
    const w = Math.max(10, fw * k),
      height = Math.max(10, fd * k);
    return {
      s,
      i,
      x: s.xCm * k - w / 2,
      y: s.yCm * k - height / 2,
      w,
      h: height,
      variant: upper(s) ? 'upper' : 'plan',
      rotate: s.rotDeg,
      flip: s.flipX,
    };
  }
  const p = projection(s, r, wall),
    w = Math.max(8, p.w * k),
    rug = i.zone === 'rug';
  const height = rug ? Math.max(12, fd * k * 0.11) : Math.max(8, i.hCm * k);
  const floor = h * (0.85 + 0.12 * clamp(p.depth / p.maxDepth, 0, 1));
  return {
    s,
    i,
    x: p.u * k - w / 2,
    y: rug ? floor - height * 0.65 : floor - s.elevCm * k - height,
    w,
    h: height,
    variant: p.face,
    flip: p.flip,
    far: p.depth > p.maxDepth * 0.55,
    floor,
  };
}
function Rulers({ b, room, plan, w, h, k, unit }) {
  const list = [];
  function add(x, y, endX, endY, cm, near = false) {
    if (cm <= (near ? 0.99 : 2)) return;
    list.push({ x, y, endX, endY, cm, color: near ? C.accent : C.blue });
  }
  const cx = b.x + b.w / 2,
    cy = b.y + b.h / 2,
    right = b.x + b.w,
    bottom = b.y + b.h;
  add(0, cy, b.x, cy, b.x / k);
  add(right, cy, w, cy, (w - right) / k);
  if (plan) {
    add(cx, 0, cx, b.y, b.y / k);
    add(cx, bottom, cx, h, (h - bottom) / k);
    if (b.i.zone !== 'rug') {
      const nearest = {};
      const record = (side, start, end, across) => {
        const dist = end - start;
        if (dist >= k && (!nearest[side] || dist < nearest[side].dist))
          nearest[side] = { start, end, across, dist };
      };
      for (const s of room.stickers) {
        if (s.id === b.s.id || byId(s.itemId).zone === 'rug') continue;
        const q = objectBox(s, room, true, 'N', k, h);
        if (q.y + q.h > b.y && q.y < bottom) {
          const at = (Math.max(b.y, q.y) + Math.min(bottom, q.y + q.h)) / 2;
          record('left', q.x + q.w, b.x, at);
          record('right', right, q.x, at);
        }
        if (q.x + q.w > b.x && q.x < right) {
          const at = (Math.max(q.x, b.x) + Math.min(right, q.x + q.w)) / 2;
          record('top', q.y + q.h, b.y, at);
          record('bottom', bottom, q.y, at);
        }
      }
      for (const [side, n] of Object.entries(nearest)) {
        if (side === 'left' || side === 'right') {
          const y = Math.abs(n.across - cy) < 12 ? cy + 11 : n.across;
          add(n.start, y, n.end, y, n.dist / k, true);
        } else {
          const x = Math.abs(n.across - cx) < 18 ? cx + 18 : n.across;
          add(x, n.start, x, n.end, n.dist / k, true);
        }
      }
    }
  } else add(cx, bottom, cx, b.floor, b.s.elevCm);
  return list.map((l, i) => (
    <React.Fragment key={i}>
      <View
        style={{
          ...box(l.x, l.y, Math.max(1, l.endX - l.x), Math.max(1, l.endY - l.y)),
          backgroundColor: l.color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: (l.x + l.endX) / 2 - 32,
          top: (l.y + l.endY) / 2 - 7,
          width: 64,
          alignItems: 'center',
        }}
      >
        <T
          bold
          size={10}
          color={l.color}
          style={{ backgroundColor: '#fffffff0', borderRadius: 3, paddingHorizontal: 2 }}
        >
          {gap(l.cm, unit)}
        </T>
      </View>
    </React.Fragment>
  ));
}
const touchDistance = (t) =>
  t?.length >= 2 ? Math.hypot(t[1].pageX - t[0].pageX, t[1].pageY - t[0].pageY) : 0;
export default function Stage({
  room,
  prefs,
  mode = 'plan',
  wall = 'N',
  level = 'All',
  full = false,
  selected,
  pan = false,
  readonly = false,
  onPick,
  onMove,
  onList,
}) {
  const [size, setSize] = useState({ width: 0, height: 0 }),
    [camera, setCamera] = useState(identity),
    [live, setLive] = useState(null);
  const drag = useRef(null),
    plane = useRef(null);
  useEffect(() => {
    setCamera(identity);
    setLive(null);
    drag.current = null;
  }, [room.id, mode, wall, room.studioId]);
  const isPlan = mode === 'plan',
    studio = studioOf(room),
    span = isPlan || wall === 'N' || wall === 'S' ? room.roomW : room.roomD;
  const height = isPlan ? room.roomD : room.ceilH / 0.85,
    padding = readonly ? 8 : 22;
  const k = Math.max(
    0.001,
    Math.min((size.width - 2 * padding) / span, (size.height - 2 * padding) / height) * camera.zoom,
  );
  const w = span * k,
    h = height * k,
    left = (size.width - w) / 2 + camera.x,
    top = (size.height - h) / 2 + camera.y;
  const r = live
    ? { ...room, stickers: room.stickers.map((s) => (s.id === live.id ? live : s)) }
    : room;
  const boxes = visible(r, mode, wall, level, full || readonly).map((s) =>
    objectBox(s, r, isPlan, wall, k, h),
  );
  const picked = boxes.find((b) => b.s.id === selected);
  function zoomBy(factor) {
    setCamera((c) => {
      const zoom = clamp(c.zoom * factor, 0.7, 3.5);
      return { zoom, x: (c.x * zoom) / c.zoom, y: (c.y * zoom) / c.zoom };
    });
  }
  useEffect(() => {
    const node = plane.current;
    if (Platform.OS !== 'web' || readonly || !node?.addEventListener) return;
    const wheel = (e) => {
      e.preventDefault();
      zoomBy(e.deltaY > 0 ? 0.91 : 1.1);
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, [readonly, size.width]);
  function start(e) {
    const n = e.nativeEvent,
      x = n.locationX - left,
      y = n.locationY - top;
    const hits = boxes
      .filter((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)
      .reverse();
    const current = hits.find((b) => b.s.id === selected);
    drag.current = {
      px: n.pageX,
      py: n.pageY,
      hits,
      start: !pan && current && !current.s.isLocked ? current.s : null,
      camera,
      k,
      moved: false,
      pinch: touchDistance(n.touches),
    };
  }
  function move(e) {
    const g = drag.current;
    if (!g) return;
    const n = e.nativeEvent,
      dist = touchDistance(n.touches);
    if (dist) {
      g.moved = true;
      if (!g.pinch) {
        g.pinch = dist;
        g.camera = camera;
      }
      const zoom = clamp((g.camera.zoom * dist) / g.pinch, 0.7, 3.5);
      setCamera({ ...g.camera, zoom });
      return;
    }
    if (g.pinch) return;
    const dx = n.pageX - g.px,
      dy = n.pageY - g.py;
    if (!g.moved && Math.hypot(dx, dy) < 3) return;
    g.moved = true;
    if (!g.start) {
      setCamera({
        ...g.camera,
        x: clamp(g.camera.x + dx, -size.width, size.width),
        y: clamp(g.camera.y + dy, -size.height, size.height),
      });
      return;
    }
    const s = g.start,
      du = dx / g.k,
      dv = dy / g.k;
    let { xCm, yCm, elevCm } = s;
    if (isPlan) {
      xCm += du;
      yCm += dv;
    } else {
      if (wall === 'N' || wall === 'S') xCm += wall === 'N' ? du : -du;
      else yCm += wall === 'E' ? du : -du;
      if (['ceiling', 'wall', 'decor'].includes(byId(s.itemId).zone)) elevCm -= dv;
    }
    g.next = constrain(
      {
        ...s,
        xCm: snap(xCm, prefs),
        yCm: snap(yCm, prefs),
        elevCm: isPlan ? elevCm : snap(elevCm, prefs),
      },
      room,
    );
    setLive(g.next);
  }
  function end() {
    const g = drag.current;
    if (!g) return;
    if (g.next && !g.pinch) onMove(g.next);
    else if (!g.moved) {
      const index = g.hits.findIndex((b) => b.s.id === selected);
      onPick(
        !g.hits.length || (g.hits.length === 1 && index === 0)
          ? null
          : g.hits[(index + 1) % g.hits.length].s.id,
      );
    }
    drag.current = null;
    setLive(null);
  }
  return (
    <View
      onLayout={(e) => setSize(e.nativeEvent.layout)}
      style={{ flex: 1, overflow: 'hidden', backgroundColor: '#e7e4dc' }}
    >
      {size.width > 0 && (
        <View pointerEvents="none" style={box(left, top, w, h)}>
          {isPlan ? (
            <Blueprint
              room={room}
              studio={studio}
              w={w}
              h={h}
              k={k}
              wall={wall}
              grid={!readonly && prefs.showGrid}
              unit={prefs.unit}
            />
          ) : (
            <View style={{ ...box(-3, -3, w + 6, h + 6), borderWidth: 3, borderColor: '#2d312e' }}>
              <Image
                source={artwork[studio.id + '_' + (wall === 'N' ? 'north' : 'east')]}
                resizeMode="stretch"
                style={{ width: '100%', height: '100%' }}
              />
            </View>
          )}
          {boxes.map((b) => {
            const active = b.s.id === selected,
              turned = isPlan && b.rotate % 180 !== 0,
              iw = turned ? b.h : b.w,
              ih = turned ? b.w : b.h;
            const opacity = !readonly && !active && b.far ? 0.58 : 1;
            return (
              <React.Fragment key={b.s.id}>
                {!isPlan && b.i.zone === 'ceiling' && (
                  <View
                    style={{
                      ...box(b.x + b.w / 2, 0, 1.5, Math.max(1, b.y + b.h * 0.1)),
                      backgroundColor: '#444',
                      opacity,
                    }}
                  />
                )}
                <View style={{ ...box(b.x, b.y, b.w, b.h), opacity }}>
                  <Art
                    item={b.i}
                    variant={b.variant}
                    style={{
                      ...box((b.w - iw) / 2, (b.h - ih) / 2, iw, ih),
                      transform: [{ rotate: (b.rotate || 0) + 'deg' }, { scaleX: b.flip ? -1 : 1 }],
                    }}
                  />
                  {active && (
                    <View
                      style={{
                        ...fill,
                        borderWidth: 2,
                        borderColor: b.s.isLocked ? C.amber : C.accent,
                        borderRadius: 3,
                        backgroundColor: '#2d6a4f14',
                      }}
                    />
                  )}
                  {b.s.isLocked && (
                    <View
                      style={{
                        position: 'absolute',
                        right: -3,
                        top: -3,
                        borderRadius: 8,
                        padding: 2,
                        backgroundColor: C.amber,
                      }}
                    >
                      <Icon name="lock" size={9} color="white" />
                    </View>
                  )}
                  {isPlan && !readonly && upper(b.s) && b.s.elevCm > 0 && (
                    <T
                      size={8}
                      bold
                      color={C.blue}
                      style={{ position: 'absolute', bottom: 2, left: 2, backgroundColor: '#fffd' }}
                    >
                      ↑{gap(b.s.elevCm, prefs.unit)}
                    </T>
                  )}
                </View>
              </React.Fragment>
            );
          })}
          {picked && !readonly && (
            <Rulers b={picked} room={r} plan={isPlan} w={w} h={h} k={k} unit={prefs.unit} />
          )}
        </View>
      )}
      {!readonly && (
        <>
          <View
            ref={plane}
            testID="stage-gestures"
            style={[fill, Platform.OS === 'web' && { touchAction: 'none', userSelect: 'none' }]}
            onStartShouldSetResponder={() => true}
            onResponderGrant={start}
            onResponderMove={move}
            onResponderRelease={end}
            onResponderTerminate={end}
            onResponderTerminationRequest={() => false}
          />
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              right: 8,
              ...row,
              justifyContent: 'space-between',
            }}
          >
            <View style={row}>
              <Btn
                small
                kind="hud"
                label={'Items (' + room.stickers.length + ')'}
                onPress={onList}
              />
              {!isPlan && boxes.length < room.stickers.length && (
                <T size={10} style={{ backgroundColor: '#fffd', padding: 4, borderRadius: 8 }}>
                  {room.stickers.length - boxes.length} behind cut
                </T>
              )}
            </View>
            <View style={{ ...row, gap: 3 }}>
              <Btn small kind="hud" label="-" access="Zoom out" onPress={() => zoomBy(0.85)} />
              <Btn small kind="hud" label="Fit" onPress={() => setCamera(identity)} />
              <Btn small kind="hud" label="+" access="Zoom in" onPress={() => zoomBy(1.18)} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}
