import React, { useContext, createContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  Modal,
  Image,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import glyphs from './glyphs.json';
import { artwork } from './art';
import { clamp } from './planner';

export const C = {
  bg: '#F6F4EF',
  surface: '#FFFFFF',
  ink: '#1F2421',
  muted: '#6F736E',
  accent: '#2D6A4F',
  line: '#E0DDD5',
  good: '#2E7D32',
  warn: '#C62828',
  blue: '#1D4ED8',
  amber: '#D97706',
  tint: '#d2e8d8',
  outline: '#787d77',
};
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
export const row = { flexDirection: 'row', alignItems: 'center', gap: 6 };
export const wrap = { ...row, flexWrap: 'wrap' };
export const card = {
  backgroundColor: C.surface,
  borderWidth: 1,
  borderColor: C.line,
  borderRadius: 12,
};
export const fill = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 };
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const wide = width > height && width >= 640,
    desk = wide && width >= 900;
  return { width, height, wide, desk, slim: width < 420, pad: clamp(width * 0.03, 8, 20) };
}
export function T({ children, size = 14, bold = false, color = C.ink, style, ...props }) {
  return (
    <Text
      {...props}
      style={[{ color, fontSize: size, fontFamily: bold ? 'VeneerBold' : 'VeneerRegular' }, style]}
    >
      {children}
    </Text>
  );
}
export function Icon({ name, size = 18, color = C.ink }) {
  return (
    <Text
      accessible={false}
      allowFontScaling={false}
      style={{
        fontFamily: 'VeneerIcons',
        fontSize: size,
        color,
        lineHeight: size + 1,
        includeFontPadding: false,
      }}
    >
      {String.fromCodePoint(glyphs[name])}
    </Text>
  );
}
export function Btn({
  label,
  icon,
  onPress,
  kind = 'outline',
  small = false,
  selected = false,
  disabled = false,
  access,
  style,
  color,
  vertical = false,
  menu = false,
}) {
  const node = useRef(null);
  const press = menu
    ? () => node.current.measureInWindow((x, y, w, h) => onPress({ x, y, w, h }))
    : onPress;
  const solid = kind === 'solid',
    plain = kind === 'text',
    chip = kind === 'chip',
    hud = kind === 'hud',
    pill = kind === 'pill';
  const fg = color || (solid ? 'white' : plain || (!chip && !hud && !pill) ? C.accent : C.ink);
  const bg = solid
    ? C.accent
    : selected
      ? C.tint
      : pill || hud
        ? '#ffffffed'
        : chip
          ? '#f5faf5'
          : 'transparent';
  return (
    <Pressable
      ref={node}
      accessibilityRole="button"
      accessibilityLabel={access || label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={press}
      style={({ pressed }) => [
        {
          ...row,
          flexDirection: vertical ? 'column' : 'row',
          justifyContent: 'center',
          gap: small ? 4 : 6,
          borderRadius: chip ? 9 : 24,
          borderWidth: plain || solid ? 0 : 1,
          borderColor: pill || hud ? C.line : chip ? '#b9c6bb' : C.outline,
          backgroundColor: bg,
          opacity: disabled ? 0.4 : pressed ? 0.72 : 1,
          paddingHorizontal: small ? (chip ? 14 : 10) : 16,
          paddingVertical: small ? 4 : 8,
          minHeight: small ? (chip ? 30 : hud ? 26 : pill ? 28 : 24) : 38,
        },
        style,
      ]}
    >
      {selected && chip && <Icon name="check" size={15} />}
      {icon && <Icon name={icon} size={small ? 15 : 18} color={fg} />}
      {!!label && (
        <T size={small ? 11 : 14} bold={solid || pill || hud} color={fg}>
          {label}
        </T>
      )}
    </Pressable>
  );
}
export function Seg({ choices, value, onChange, small = true }) {
  const width =
    choices[0][0] === 'plan'
      ? 96
      : choices.length === 4
        ? 56
        : choices.length === 3
          ? 66
          : undefined;
  return (
    <View
      style={{
        ...row,
        gap: 0,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: C.outline,
      }}
    >
      {choices.map(([v, label], i) => (
        <Pressable
          key={String(v)}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: v === value }}
          onPress={() => onChange(v)}
          style={{
            ...row,
            gap: 5,
            justifyContent: 'center',
            flexGrow: 1,
            minWidth: width,
            borderLeftWidth: i ? 1 : 0,
            borderColor: C.outline,
            paddingHorizontal: small ? 10 : 14,
            minHeight: small ? 30 : 38,
            backgroundColor: v === value ? C.tint : 'transparent',
          }}
        >
          {v === value && <Icon name="check" size={small ? 15 : 18} />}
          <T size={small ? 11 : 13}>{label}</T>
        </Pressable>
      ))}
    </View>
  );
}
export function Field({ label, style, ...props }) {
  return (
    <View style={[{ gap: 4 }, style]}>
      {label && (
        <T size={12} color={C.muted}>
          {label}
        </T>
      )}
      <TextInput
        accessibilityLabel={label || props.placeholder}
        placeholderTextColor={C.muted}
        {...props}
        style={{
          color: C.ink,
          borderColor: C.outline,
          borderWidth: 1,
          borderRadius: 6,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 15,
          backgroundColor: C.surface,
        }}
      />
    </View>
  );
}
export function Toggle({ label, value, change }) {
  return (
    <View style={{ ...row, justifyContent: 'space-between', paddingVertical: 5 }}>
      <T style={{ flexShrink: 1 }}>{label}</T>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={change}
        trackColor={{ true: C.accent, false: '#dcded9' }}
      />
    </View>
  );
}
export function Art({ item, variant = 'card', style }) {
  return (
    <Image
      accessible={false}
      source={artwork[item.shapeKey + '_' + variant]}
      resizeMode="stretch"
      style={[{ width: '100%', height: '100%' }, style]}
    />
  );
}
export function Overlay({ title, children, close, sheet = false }) {
  const { height } = useWindowDimensions(),
    insets = useSafeAreaInsets();
  const startY = useRef(0);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const key = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [close]);
  return (
    <Modal transparent visible onRequestClose={close} animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: sheet ? 'flex-end' : 'center',
          backgroundColor: '#0006',
          padding: sheet ? 0 : 16,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={fill}
          onPress={close}
        />
        <View
          style={{
            width: '100%',
            maxWidth: sheet ? 640 : 440,
            maxHeight: height * 0.87,
            backgroundColor: sheet ? C.surface : '#f6f7f1',
            borderRadius: sheet ? 16 : 24,
            padding: sheet ? 16 : 24,
            paddingBottom: sheet ? Math.max(insets.bottom, 16) : 24,
          }}
        >
          {sheet && (
            <View
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                startY.current = e.nativeEvent.pageY;
              }}
              onResponderRelease={(e) => {
                if (e.nativeEvent.pageY - startY.current > 30) close();
              }}
              style={{ height: 20, alignItems: 'center' }}
            >
              <View style={{ backgroundColor: C.line, width: 36, height: 4, borderRadius: 3 }} />
            </View>
          )}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
            {!!title && (
              <T size={sheet ? 17 : 20} bold>
                {title}
              </T>
            )}
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Menu({ anchor, options, selected, choose, close }) {
  const { width, height } = useWindowDimensions();
  const menuWidth = Math.min(
    width - 16,
    Math.max(180, anchor.w, Math.max(...options.map(([, label]) => label.length)) * 7 + 44),
  );
  const menuHeight = Math.min(height - 40, options.length * 44 + 12);
  const left = clamp(anchor.x, 8, width - menuWidth - 8),
    top = clamp(anchor.y + anchor.h, 12, height - menuHeight - 12);
  return (
    <Modal transparent visible onRequestClose={close} statusBarTranslucent>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={fill}
        onPress={close}
      />
      <View
        style={{
          position: 'absolute',
          left,
          top,
          width: menuWidth,
          maxHeight: menuHeight,
          backgroundColor: '#f7f9f3',
          borderRadius: 6,
          elevation: 6,
          boxShadow: '0px 3px 10px #0003',
        }}
      >
        <ScrollView contentContainerStyle={{ paddingVertical: 6 }}>
          {options.map(([id, label]) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => {
                close();
                choose(id);
              }}
              style={{ ...row, minHeight: 44, paddingHorizontal: 12 }}
            >
              {id === selected && <Icon name="check-circle" size={16} color={C.accent} />}
              <T>{label}</T>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
export function Grid({ data, columns, gap = 8, pad = 12, render, empty }) {
  const [width, setWidth] = useState(0);
  const cols = typeof columns === 'function' ? columns(width) : columns;
  const cell = Math.max(1, (width - 2 * pad - (cols - 1) * gap - 0.5) / cols);
  return (
    <View style={{ flex: 1, minHeight: 0 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {!data.length ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <T color={C.muted}>{empty}</T>
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: pad,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            gap,
          }}
        >
          {width > 0 &&
            data.map((entry) => (
              <View key={entry.id} style={{ width: cell }}>
                {render(entry, cell)}
              </View>
            ))}
        </ScrollView>
      )}
    </View>
  );
}
