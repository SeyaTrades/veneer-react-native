import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { View, Pressable, ActivityIndicator, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppContext, T, Icon, Btn, C, useLayout } from './src/ui';
import { reduce, initialState } from './src/state';
import Studio from './src/Studio';
import { Discover, Storage, Account } from './src/Screens';
import { Dialog } from './src/Dialogs';

const pages = { Studio, Discover, Storage, Account };
const icons = {
  Studio: ['weekend-outline', 'weekend'],
  Discover: ['explore-outline', 'explore'],
  Storage: ['bookmarks-outline', 'bookmarks'],
  Account: ['person-outline', 'person'],
};
const storageKey = 'veneer-planner-v2';
function Shell() {
  const [state, send] = useReducer(reduce, undefined, initialState),
    [loaded, setLoaded] = useState(false);
  const [tab, go] = useState('Studio'),
    [visited, setVisited] = useState({ Studio: true });
  const [dialogs, setDialogs] = useState([]),
    [message, setMessage] = useState('');
  const [readError, setReadError] = useState(false),
    [attempt, setAttempt] = useState(0);
  const sequence = useRef(0),
    timer = useRef(),
    writes = useRef(Promise.resolve()),
    lastDisk = useRef(null);
  const layout = useLayout();
  const notify = useCallback((text) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(''), 2400);
  }, []);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!active) return;
        if (raw) send({ type: 'hydrate', data: JSON.parse(raw) });
        setLoaded(true);
      })
      .catch(() => {
        if (active) setReadError(true);
      });
    return () => {
      active = false;
      clearTimeout(timer.current);
    };
  }, [attempt]);
  useEffect(() => {
    if (!loaded) return;
    if (lastDisk.current && lastDisk.current !== state.disk) {
      const snapshot = JSON.stringify(state.disk);
      writes.current = writes.current
        .then(() => AsyncStorage.setItem(storageKey, snapshot))
        .catch(() => notify('Could not write to device storage'));
    }
    lastDisk.current = state.disk;
  }, [loaded, state.disk, notify]);
  function navigate(tab) {
    setVisited((v) => ({ ...v, [tab]: true }));
    go(tab);
  }
  const open = (dialog) => {
    const entry = { ...dialog, key: ++sequence.current };
    setDialogs((old) => [...old, entry]);
  };
  const close = () => setDialogs((old) => old.slice(0, -1));
  const current = dialogs[dialogs.length - 1];
  const rail = layout.desk;
  const nav = (
    <View
      style={{
        flexDirection: rail ? 'column' : 'row',
        backgroundColor: rail ? '#f5faf5' : '#e9efe8',
        borderColor: C.line,
        borderRightWidth: rail ? 1 : 0,
        borderTopWidth: rail ? 0 : 1,
        width: rail ? 81 : undefined,
        height: rail ? undefined : 62,
      }}
    >
      {Object.keys(pages).map((name) => (
        <Pressable
          key={name}
          accessibilityRole="tab"
          accessibilityState={{ selected: name === tab }}
          accessibilityLabel={name}
          onPress={() => navigate(name)}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            height: rail ? 66 : undefined,
            flex: rail ? undefined : 1,
          }}
        >
          <View
            style={{
              backgroundColor: tab === name ? C.tint : 'transparent',
              width: rail ? 56 : 64,
              height: 32,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={icons[name][tab === name ? 1 : 0]} size={24} color="#414a43" />
          </View>
          <T size={12}>{name}</T>
        </Pressable>
      ))}
    </View>
  );
  return (
    <AppContext.Provider value={{ state, send, open, close, go: navigate, notify }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, flexDirection: rail ? 'row' : 'column' }}>
          {rail && nav}
          <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            {readError ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                <T>Could not load saved rooms from this device.</T>
                <Btn
                  label="Retry"
                  onPress={() => {
                    setReadError(false);
                    setAttempt((n) => n + 1);
                  }}
                />
              </View>
            ) : loaded ? (
              Object.entries(pages)
                .filter(([name]) => visited[name])
                .map(([name, Screen]) => (
                  <View key={name} style={{ flex: 1, display: tab === name ? 'flex' : 'none' }}>
                    <Screen />
                  </View>
                ))
            ) : (
              <ActivityIndicator color={C.accent} style={{ flex: 1 }} />
            )}
          </View>
          {!rail && nav}
        </View>
        {!!message && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: rail ? 18 : 74,
              left: 16,
              right: 16,
              alignItems: 'center',
            }}
          >
            <T
              accessibilityLiveRegion="polite"
              color="white"
              style={{ backgroundColor: '#2e322f', borderRadius: 6, padding: 12 }}
            >
              {message}
            </T>
          </View>
        )}
        {current && <Dialog key={current.key} dialog={current} />}
      </SafeAreaView>
    </AppContext.Provider>
  );
}
export default function App() {
  const [loaded, error] = useFonts({
    VeneerRegular: require('./assets/roboto-regular.ttf'),
    VeneerBold: require('./assets/roboto-bold.ttf'),
    VeneerIcons: require('./assets/material-icons.otf'),
  });
  return (
    <SafeAreaProvider>
      {loaded || error ? <Shell /> : <ActivityIndicator style={{ flex: 1 }} color={C.accent} />}
    </SafeAreaProvider>
  );
}
