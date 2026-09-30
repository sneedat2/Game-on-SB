import { Image, type ImageSourcePropType, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

// Drop the official logo at assets/logo.png and point this at it:
//   const LOGO: ImageSourcePropType | null = require('../../assets/logo.png');
// Until then a close stand-in wordmark renders instead.
const LOGO: ImageSourcePropType | null = null;
const LOGO_ASPECT = 1000 / 254; // width / height of the supplied logo artwork

const INK = '#1C1C1C';

/** Weizen glass with foam - stands in for the "I" between GAME and ON in the logo. */
function BeerGlass({ height }: { height: number }) {
  return (
    <Svg width={height * 0.42} height={height} viewBox="0 0 30 72">
      {/* beer */}
      <Path d="M4 16 C4 30 9 40 9 50 C9 58 8 62 8 66 L22 66 C22 62 21 58 21 50 C21 40 26 30 26 16 Z" fill="#F7B32B" />
      <Path d="M18 18 C18 30 15 40 15 50 C15 58 16 62 16 66 L22 66 C22 62 21 58 21 50 C21 40 26 30 26 16 Z" fill="#E8901C" />
      <Rect x={8} y={60} width={14} height={6} fill="#B5651D" />
      {/* foam */}
      <Path
        d="M4 17 C1 15 2 9 6 9 C6 4 12 2 15 5 C18 2 24 3 24 8 C28 8 29 14 26 17 C25 21 21 20 20 18 C18 22 12 22 11 18 C9 21 5 20 4 17 Z"
        fill="#FFF7E0"
        stroke={INK}
        strokeWidth={1.6}
      />
      {/* glass outline */}
      <Path
        d="M4 16 C4 30 9 40 9 50 C9 58 8 62 8 66 C8 69 10 70 15 70 C20 70 22 69 22 66 C22 62 21 58 21 50 C21 40 26 30 26 16"
        fill="none"
        stroke={INK}
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function Wordmark() {
  const letters = 'text-[46px] font-black leading-[50px] text-[#1C1C1C]';
  return (
    <View className="items-center" accessibilityRole="header" accessibilityLabel="Game On. Westside. Strongside.">
      <View className="flex-row items-end gap-2">
        <View className="mb-5 h-2 w-2 rounded-full bg-[#1C1C1C]" />
        <Text className={letters}>GAME</Text>
        <View className="mb-1">
          <BeerGlass height={60} />
        </View>
        <Text className={letters}>ON</Text>
        <View className="mb-5 h-2 w-2 rounded-full bg-[#1C1C1C]" />
      </View>
      <Text className="mt-1 text-[15px] font-medium tracking-[2px] text-[#1C1C1C]">WESTSIDE. STRONGSIDE.</Text>
    </View>
  );
}

/** Home header: the logo on the same yellow the website uses behind it. */
export function BrandHeader() {
  return (
    <View className="items-center overflow-hidden rounded-3xl bg-gold px-4 pb-4 pt-5">
      {LOGO ? (
        <Image source={LOGO} style={{ width: '100%', aspectRatio: LOGO_ASPECT }} resizeMode="contain" accessibilityLabel="Game On" />
      ) : (
        <Wordmark />
      )}
      <Text className="mt-3 text-[11px] font-black uppercase tracking-[3px] text-[#1C1C1C]/70">
        5880 Cheviot Rd · Cincinnati
      </Text>
    </View>
  );
}
