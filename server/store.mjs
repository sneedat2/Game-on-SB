// Tiny JSON document store for admin-edited content. One file, written atomically.
// On Railway, attach a Volume to the service: Railway sets RAILWAY_VOLUME_MOUNT_PATH and the file
// lives there, surviving redeploys. Without a volume, edits reset on every deploy.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defaultContent, migrateContent } from './defaults.mjs';

const volume = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || '';
const dir = volume || join(process.cwd(), 'data');
const file = join(dir, 'content.json');

/** False only when running on Railway without a volume (edits would vanish on redeploy). */
export const storageIsPersistent = Boolean(volume) || !process.env.RAILWAY_ENVIRONMENT;

let content = null;
let writeChain = Promise.resolve();

export async function loadStore() {
  await mkdir(dir, { recursive: true });
  try {
    content = JSON.parse(await readFile(file, 'utf8'));
    if (migrateContent(content)) {
      await persist();
      console.log('[store] upgraded saved content to the current format');
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    content = defaultContent();
    await persist();
    console.log(`[store] created ${file} with starter content`);
  }
  if (!volume && process.env.RAILWAY_ENVIRONMENT) {
    console.warn('[store] No Railway volume attached - admin edits will be lost on redeploy.');
  }
  return content;
}

export const getContent = () => content;

function persist() {
  const snapshot = JSON.stringify(content, null, 2);
  writeChain = writeChain.then(async () => {
    const tmp = `${file}.tmp`;
    await writeFile(tmp, snapshot, 'utf8');
    await rename(tmp, file);
  });
  return writeChain;
}

/** Apply a change and save it. Changes are serialized, so concurrent votes/edits don't collide. */
export async function update(mutator) {
  const result = mutator(content);
  await persist();
  return result;
}
