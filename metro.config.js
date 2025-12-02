const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// whatwg-url 패키지를 무시하여 URL 객체의 protocol 속성 충돌 방지
config.resolver.blockList = [
  /node_modules\/whatwg-url\/.*/,
];

module.exports = config;

