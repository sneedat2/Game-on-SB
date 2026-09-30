import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { config, isLive } from './config';

let client: SupabaseClient | null = null;

/** Returns the Supabase client. Only call from live implementations. */
export function supabase(): SupabaseClient {
  if (!isLive) throw new Error('Supabase is not configured (running in mock mode).');
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/**
 * Every guest gets an anonymous Supabase session on first launch, so votes and push tokens are
 * tied to auth.uid() and protected by RLS - no sign-up friction. Enable "Anonymous sign-ins" in
 * the Supabase dashboard. Can later be linked to a phone/email identity.
 */
export async function ensureSession(): Promise<string> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signIn, error } = await sb.auth.signInAnonymously();
  if (error || !signIn.user) throw error ?? new Error('Anonymous sign-in failed');
  return signIn.user.id;
}

/** Invokes an Edge Function and unwraps its JSON body. */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  await ensureSession();
  const { data, error } = await supabase().functions.invoke<T>(name, { body });
  if (error) throw error;
  return data as T;
}
