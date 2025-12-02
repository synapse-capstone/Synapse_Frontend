import React from 'react';
import Svg, { G, Path, Polygon, Rect } from 'react-native-svg';

const ColdCupIcon = ({ size = 128, color = '#1d4ed8' }) => {
  const cupColor = '#ffffff';
  const stroke = '#1f2937';
  const accent = color;
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128">
      <G fill="none" stroke={stroke} strokeWidth="2">
        <Rect x="22" y="34" width="72" height="64" rx="10" fill={cupColor} />
        <Path d="M28 34h60l6-10H22l6 10z" fill="#e5f0ff" />
        <Path d="M22 98c4 10 18 16 32 16s28-6 32-16" fill="none" />
        <Path d="M94 58h6c6 0 10 4 10 9s-4 9-10 9h-6" />
      </G>
      <G fill={accent} opacity="0.9">
        <Polygon points="40,56 50,52 56,60 46,64" />
        <Polygon points="60,66 70,62 76,70 66,74" />
        <Polygon points="48,76 58,72 64,80 54,84" />
      </G>
    </Svg>
  );
};

export default ColdCupIcon;





