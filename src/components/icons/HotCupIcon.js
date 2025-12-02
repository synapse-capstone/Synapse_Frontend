import React from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';

const HotCupIcon = ({ size = 128, color = '#ef4444' }) => {
  const cupColor = '#ffffff';
  const stroke = '#1f2937';
  const steamColor = color;
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128">
      <G fill="none" stroke={stroke} strokeWidth="2">
        <Rect x="22" y="40" width="64" height="54" rx="10" fill={cupColor} />
        <Path d="M86 48h10c10 0 16 6 16 14s-6 14-16 14h-8" fill="none" />
        <Path d="M22 94c4 10 18 16 32 16s28-6 32-16" fill="none" />
      </G>
      <G stroke={steamColor} strokeWidth="3" strokeLinecap="round">
        <Path d="M38 24c6 6 0 10 0 14s6 8 0 14" />
        <Path d="M56 24c6 6 0 10 0 14s6 8 0 14" />
        <Path d="M74 24c6 6 0 10 0 14s6 8 0 14" />
      </G>
    </Svg>
  );
};

export default HotCupIcon;





