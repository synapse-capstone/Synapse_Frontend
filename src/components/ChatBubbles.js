import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

const assistantImage = require('../assets/images/menu_things/kio.png');
const micImage = require('../assets/images/mic.png');

const ChatBubbles = {
  Assistant: ({
    layout = {},
    assistantText,
    assistantFontSize,
    containerStyle,
    textStyle,
    imageStyle,
  }) => {
    const sectionGap = layout?.sectionGap ?? 16;
    const containerPadding = layout?.containerPadding ?? 24;
    const horizontalPadding = containerPadding * 0.25;
    const fontSize = assistantFontSize ?? layout?.subHeadingSize ?? 18;

    return (
      <View
        style={[
          styles.assistantWrapper,
          {
            paddingHorizontal: horizontalPadding,
            marginBottom: sectionGap * 0.4,
            marginTop: sectionGap * 0.15,
          },
          containerStyle,
        ]}
      >
        <View style={styles.assistantRow}>
          <Image source={assistantImage} style={[styles.assistantEmoji, imageStyle]} resizeMode="contain" />
          <View style={styles.assistantBubbleContainer}>
            <View style={styles.assistantBubbleTail}>
              <View style={styles.assistantBubbleTailBorder} />
            </View>
            <View style={styles.assistantBubble}>
              <Text style={[styles.assistantBubbleText, { fontSize }, textStyle]}>{assistantText}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  },

  User: ({
    layout = {},
    lastUserMessage,
    isRecording,
    onPressIn,
    onPress,
    userFontSize,
    containerStyle,
    textStyle,
    buttonStyle,
    whiteTheme = false,
    align = 'center', // 'center' | 'flex-end' | 'flex-start'
  }) => {
    const sectionGap = layout?.sectionGap ?? 16;
    const containerPadding = layout?.containerPadding ?? 24;
    const fontSize = userFontSize ?? layout?.subHeadingSize ?? 18;

    const voiceButton = (size = 'large') => {
      const isSmall = size === 'small';
      return (
        <Pressable
          onPress={onPress || onPressIn}
          style={[
            isSmall ? styles.voiceButtonSmall : styles.voiceButton,
            isRecording && styles.voiceButtonRecording,
            buttonStyle,
            whiteTheme && {
              backgroundColor: 'transparent',
              borderColor: '#ffffff',
              borderWidth: 1,
            },
          ]}
          android_ripple={{ color: whiteTheme ? '#ffffff33' : '#2563eb33' }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isRecording ? (
            <View style={isSmall ? styles.recordingIndicatorSmall : styles.recordingIndicator}>
              <View style={[
                isSmall ? styles.recordingDotSmall : styles.recordingDot,
                whiteTheme && { backgroundColor: '#ffffff' },
              ]} />
            </View>
          ) : (
            <Image
              source={micImage}
              style={[
                isSmall ? styles.voiceIconSmall : styles.voiceIcon,
                whiteTheme && { tintColor: '#ffffff' },
              ]}
              resizeMode="contain"
            />
          )}
        </Pressable>
      );
    };

    return (
      <View
        style={[
          {
            paddingHorizontal: containerPadding,
            marginTop: sectionGap * 1.5,
            marginBottom: sectionGap * 2.3,
          },
          containerStyle,
        ]}
      >
        <View style={[styles.userBubbleContainer, { justifyContent: align }]}>
          {whiteTheme ? (
            <Pressable
              onPress={onPress || onPressIn}
              style={[
                styles.voiceButton,
                {
                  backgroundColor: 'transparent',
                  borderColor: '#ffffff',
                  borderWidth: 1,
                },
              ]}
              android_ripple={{ color: '#ffffff33' }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={{ color: '#ffffff', fontSize: 16 }}>음성 입력</Text>
            </Pressable>
          ) : (
            voiceButton('large')
          )}
        </View>
      </View>
    );
  },
};

const styles = StyleSheet.create({
  assistantWrapper: {
    width: '100%',
    alignItems: 'flex-start',
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  assistantEmoji: {
    width: 130,
    height: 130,
  },
  assistantBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  assistantBubbleTail: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#E5E7EB',
    marginTop: 20,
    marginRight: -1,
    position: 'relative',
  },
  assistantBubbleTailBorder: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopWidth: 13,
    borderBottomWidth: 13,
    borderRightWidth: 13,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#D1D5DB',
    left: -1,
    top: -1,
    zIndex: -1,
  },
  assistantBubble: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 40,
    paddingVertical: 22,
    borderRadius: 32,
    flexShrink: 1,
  },
  assistantBubbleText: {
    color: '#1f2937',
    fontWeight: '500',
    lineHeight: 32,
  },
  userBubbleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 12,
  },
  userBubble: {
    backgroundColor: '#2563eb',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    paddingHorizontal: 48,
    paddingVertical: 25,
    borderRadius: 35,
    maxWidth: '80%',
  },
  userBubbleText: {
    color: '#ffffff',
    fontWeight: '500',
    lineHeight: 36,
  },
  userBubbleTail: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#2563eb',
    marginTop: 20,
    position: 'relative',
  },
  userBubbleTailBorder: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopWidth: 13,
    borderBottomWidth: 13,
    borderLeftWidth: 13,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#1D4ED8',
    left: -1,
    top: -1,
    zIndex: -1,
  },
  voiceButton: {
    backgroundColor: '#2563eb',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    borderRadius: 50,
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonSmall: {
    backgroundColor: '#2563eb',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonRecording: {
    backgroundColor: '#ef4444',
    borderColor: '#dc2626',
  },
  voiceIcon: {
    width: 60,
    height: 60,
  },
  voiceIconSmall: {
    width: 50,
    height: 50,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingIndicatorSmall: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  recordingDotSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  recordingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export const AssistantChatBanner = ChatBubbles.Assistant;
export const UserVoiceBubble = ChatBubbles.User;

export default ChatBubbles;

