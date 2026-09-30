export type DataSource = 'mock' | 'live';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const requested = (process.env.EXPO_PUBLIC_DATA_SOURCE ?? 'mock') as DataSource;
const supabaseConfigured = /^https:\/\/.+/.test(supabaseUrl) && supabaseAnonKey.length > 20;

if (requested === 'live' && !supabaseConfigured) {
  console.warn('[config] EXPO_PUBLIC_DATA_SOURCE=live but Supabase env vars are missing - falling back to mock data.');
}

export const config = {
  dataSource: (requested === 'live' && supabaseConfigured ? 'live' : 'mock') as DataSource,
  supabaseUrl,
  supabaseAnonKey,
  easProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || undefined,
};

export const isLive = config.dataSource === 'live';
