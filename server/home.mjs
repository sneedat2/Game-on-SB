// Home screen layout, edited in /admin → Home Page: order, show/hide, a few labels, and custom
// message cards. The app falls back to the same default if the server can't be reached.
import { randomUUID } from 'node:crypto';

const BUILT_IN = ['header', 'happyHour', 'promos', 'gameday', 'quickActions', 'poll'];
const BUTTON_KEYS = ['order', 'taps', 'checkin', 'poll'];
const DEFAULT_BUTTON_LABELS = { order: 'Order Online', taps: 'View Tap List', checkin: 'Check In', poll: 'Today’s Poll' };

export const defaultHome = () => ({
  blocks: [
    { id: 'header', type: 'header', visible: true },
    { id: 'happyHour', type: 'happyHour', visible: true, title: 'Happy Hour' },
    { id: 'promos', type: 'promos', visible: true, title: 'Today’s Promos' },
    { id: 'gameday', type: 'gameday', visible: true },
    { id: 'quickActions', type: 'quickActions', visible: true, buttons: BUTTON_KEYS.map((key) => ({ key, label: DEFAULT_BUTTON_LABELS[key], visible: true })) },
    { id: 'poll', type: 'poll', visible: true, title: 'Game On Wants to Know' },
  ],
});

/**
 * Cleans an admin-submitted layout. Built-in blocks can be hidden or moved but never lost: any
 * missing one is put back (hidden) at the end. Throws a message for bad input via `fail`.
 */
export function validateHome(v, fail) {
  if (!Array.isArray(v?.blocks) || v.blocks.length > 20) fail('Home page layout is invalid');
  const text = (s, field, max) => {
    const t = typeof s === 'string' ? s.trim() : '';
    if (t.length > max) fail(`${field} must be ${max} characters or less`);
    return t;
  };
  const seen = new Set();
  const blocks = [];
  let messages = 0;

  for (const b of v.blocks) {
    const visible = Boolean(b?.visible);
    if (BUILT_IN.includes(b?.type)) {
      if (seen.has(b.type)) continue;
      seen.add(b.type);
      const block = { id: b.type, type: b.type, visible };
      if (b.type === 'happyHour') block.title = text(b.title, 'Happy Hour title', 30) || 'Happy Hour';
      if (b.type === 'promos') block.title = text(b.title, 'Promos title', 30) || 'Today’s Promos';
      if (b.type === 'poll') block.title = text(b.title, 'Poll heading', 40) || 'Game On Wants to Know';
      if (b.type === 'quickActions') {
        block.buttons = BUTTON_KEYS.map((key) => {
          const given = (Array.isArray(b.buttons) ? b.buttons : []).find((x) => x?.key === key) ?? {};
          return { key, label: text(given.label, 'Button label', 24) || DEFAULT_BUTTON_LABELS[key], visible: given.visible !== false };
        });
      }
      blocks.push(block);
    } else if (b?.type === 'message') {
      if (++messages > 6) fail('Up to 6 message cards');
      const title = text(b.title, 'Message title', 60);
      const body = text(b.text, 'Message text', 300);
      if (!title && !body) fail('A message card needs a title or text');
      blocks.push({
        id: typeof b.id === 'string' && /^m-[\w-]{4,40}$/.test(b.id) ? b.id : `m-${randomUUID().slice(0, 8)}`,
        type: 'message',
        visible,
        title,
        text: body,
        style: b.style === 'dark' ? 'dark' : 'yellow',
      });
    }
  }
  for (const d of defaultHome().blocks) if (!seen.has(d.type)) blocks.push({ ...d, visible: false });
  return { blocks };
}
