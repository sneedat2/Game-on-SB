import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { BAR, fullAddress } from '@/constants/bar';
import { colors } from '@/constants/theme';

/**
 * Opens Toast Online Ordering in an in-app browser (SFSafariViewController / Chrome Custom Tab),
 * so guests stay "in" the app and cookies/saved cards on Toast's side keep working.
 * `path` can deep-link to a Toast sub-page if Toast provides one (e.g. an item or pickup page).
 */
export async function openOnlineOrdering(path = ''): Promise<void> {
  const url = `${BAR.orderingUrl}${path}`;
  try {
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: colors.ink900,
      controlsColor: colors.brand,
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  } catch {
    await Linking.openURL(url);
  }
}

export const callBar = () => Linking.openURL(`tel:${BAR.phoneE164}`);

export function openDirections(): Promise<void> {
  const q = encodeURIComponent(`${BAR.name}, ${fullAddress}`);
  // Universal Google Maps URL: opens the Maps app on Android, Google Maps/web on iOS & web.
  return Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${q}`);
}

export const openExternal = (url: string) => Linking.openURL(url);
