import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import type { HomeLayout } from '@/types';
import { loadContent } from './content';

// Home screen order/labels from /admin → Home Page. Same default as server/home.mjs.
export const DEFAULT_HOME: HomeLayout = {
  blocks: [
    { id: 'header', type: 'header', visible: true },
    { id: 'happyHour', type: 'happyHour', visible: true, title: 'Happy Hour' },
    { id: 'promos', type: 'promos', visible: true, title: 'Today’s Promos' },
    { id: 'gameday', type: 'gameday', visible: true },
    {
      id: 'quickActions',
      type: 'quickActions',
      visible: true,
      buttons: [
        { key: 'order', label: 'Order Online', visible: true },
        { key: 'taps', label: 'View Tap List', visible: true },
        { key: 'checkin', label: 'Check In', visible: true },
        { key: 'poll', label: 'Today’s Poll', visible: true },
      ],
    },
    { id: 'poll', type: 'poll', visible: true, title: 'Game On Wants to Know' },
  ],
};

let saved: HomeLayout | null = null;
let preview: HomeLayout | null = null; // unsaved draft from the admin's preview window
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const current = () => preview ?? saved ?? DEFAULT_HOME;

// ---------------- Admin live preview (website only) ----------------
// /admin shows this app in a frame at /?homePreview=1 and posts the draft layout here as you edit.
// Only messages from our own site are accepted, and only in that preview mode.

const isPreviewMode = Platform.OS === 'web' && typeof window !== 'undefined' && /[?&]homePreview=1\b/.test(window.location.search);

if (isPreviewMode) {
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    const data = event.data as { type?: string; home?: HomeLayout };
    if (data?.type === 'gameon:home-preview' && Array.isArray(data.home?.blocks)) {
      preview = data.home;
      notify();
    }
  });
  window.parent?.postMessage({ type: 'gameon:preview-ready' }, window.location.origin);
}

export function useHomeLayout(): HomeLayout {
  useEffect(() => {
    void loadContent()
      .then((c) => {
        if (c?.home && Array.isArray(c.home.blocks)) {
          saved = c.home;
          notify();
        }
      })
      .catch(() => {});
  }, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    current,
    current,
  );
}
