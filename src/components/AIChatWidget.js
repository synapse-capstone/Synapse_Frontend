import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useAIChat } from '../contexts/AIChatContext';

const AIChatWidget = ({ onSendMessage, layout, displayMode = 'default', assistantPrompt }) => {
  let chatContext;
  try {
    chatContext = useAIChat();
  } catch (error) {
    console.error('AIChatContext를 가져올 수 없습니다:', error);
    chatContext = null;
  }
  
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingError, setRecordingError] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef(null);
  
  const requestPermission = useCallback(async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('마이크 권한이 필요합니다.');
    }
  }, []);
  
  const startRecording = useCallback(async () => {
    if (isRecording || recording) {
      setRecordingError('이미 녹음이 진행 중입니다.');
      return;
    }
    let newRecording = null;
    try {
      await requestPermission();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await newRecording.startAsync();
      setRecording(newRecording);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      setIsRecording(true);
      setRecordingError('');
    } catch (error) {
      console.error('녹음을 시작할 수 없습니다:', error);
      setRecordingError(error.message || '녹음을 시작할 수 없습니다.');
      setIsRecording(false);
      if (newRecording) {
        newRecording.stopAndUnloadAsync().catch(() => {});
      }
      setRecording(null);
    }
  }, [requestPermission, isRecording, recording]);
  
  const stopRecording = useCallback(async () => {
    if (!recording) {
      return null;
    }
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      return uri;
    } catch (error) {
      console.error('녹음을 중지할 수 없습니다:', error);
      setRecordingError('녹음을 중지하는 중 오류가 발생했습니다.');
      setRecording(null);
      return null;
    }
  }, [recording]);
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);
  
  // 안전하게 messages 가져오기
  const messages = (chatContext && Array.isArray(chatContext.messages)) ? chatContext.messages : [];
  const isAILoading = chatContext?.isAILoading || false;
  const sendVoiceMessage = chatContext?.sendVoiceMessage;

  const latestAssistantText = useMemo(() => {
    if (assistantPrompt) {
      return assistantPrompt;
    }
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.author === 'assistant' && typeof messages[i]?.text === 'string') {
        return messages[i].text;
      }
    }
    return null;
  }, [messages, assistantPrompt]);

  const latestUserText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.author === 'user' && typeof messages[i]?.text === 'string') {
        return messages[i].text;
      }
    }
    return null;
  }, [messages]);

  // layout이 제공되지 않으면 기본값 사용
  const defaultLayout = {
    chatSpacing: 14,
    chatBubblePadding: 18,
    chatBubbleFontSize: 18,
    itemRadius: 24,
    chatWindowHeight: 200,
  };

  const finalLayout = layout || defaultLayout;

  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setIsRecording(false);
      const audioUri = await stopRecording();
      setRecordingDuration(0);
      if (audioUri && typeof sendVoiceMessage === 'function') {
        await sendVoiceMessage(audioUri, onSendMessage);
      }
    } else {
      await startRecording();
    }
  }, [isRecording, stopRecording, startRecording, sendVoiceMessage, onSendMessage]);

  const formattedDuration = `${String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:${String(recordingDuration % 60).padStart(2, '0')}`;

  if (displayMode === 'single') {
    const assistantDisplay = latestAssistantText || '안내 문구를 불러오고 있어요.';
    const userDisplay = latestUserText || '아직 제 대답을 말씀하지 않았어요.';

    return (
      <View
        style={[
          styles.singleContainer,
          {
            borderRadius: finalLayout?.itemRadius || 24,
            minHeight: finalLayout?.chatWindowHeight || 220,
          },
        ]}
      >
        <View style={styles.singleChatArea}>
          <View style={[styles.chatBubble, styles.singleAssistantBubble]}>
            <Text
              style={[
                styles.chatText,
                {
                  color: '#1f2937',
                  fontSize: finalLayout?.chatBubbleFontSize || 18,
                },
              ]}
            >
              {assistantDisplay}
            </Text>
          </View>

          <View style={styles.singleSpacer} />

          <View style={[styles.chatBubble, styles.singleUserBubble]}>
            <Text
              style={[
                styles.chatText,
                {
                  color: '#ffffff',
                  fontSize: finalLayout?.chatBubbleFontSize || 18,
                },
              ]}
            >
              {userDisplay}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.chatContainer,
        {
          borderRadius: finalLayout.itemRadius || 24,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: finalLayout.chatSpacing || 14,
          paddingBottom: (finalLayout.chatSpacing || 14) * 1.2,
          gap: (finalLayout.chatSpacing || 14) * 0.5,
        }}
        style={{ height: finalLayout.chatWindowHeight || 200 }}
        showsVerticalScrollIndicator
      >
        {messages.map((message) => {
          const isAssistant = message.author === 'assistant';
          return (
            <View
              key={message.id}
              style={[
                styles.chatBubble,
                {
                  alignSelf: isAssistant ? 'flex-start' : 'flex-end',
                  backgroundColor: isAssistant ? '#E5E7EB' : '#1D4ED8',
                  borderColor: isAssistant ? '#D1D5DB' : '#1E40AF',
                  padding: finalLayout.chatBubblePadding || 18,
                  maxWidth: '88%',
                },
              ]}
            >
              <Text
                style={[
                  styles.chatText,
                  {
                    color: isAssistant ? '#1f2937' : '#ffffff',
                    fontSize: finalLayout.chatBubbleFontSize || 18,
                  },
                ]}
              >
                {message.text}
              </Text>
            </View>
          );
        })}
        {isAILoading && (
          <View
            style={[
              styles.chatBubble,
              {
                alignSelf: 'flex-start',
                backgroundColor: '#E5E7EB',
                borderColor: '#D1D5DB',
                padding: finalLayout.chatBubblePadding || 18,
                maxWidth: '88%',
              },
            ]}
          >
            <ActivityIndicator size="small" color="#1f2937" />
          </View>
        )}
      </ScrollView>
      <View style={styles.voiceControls}>
        <Pressable
          style={[
            styles.voiceButton,
            {
              backgroundColor: isRecording ? '#ef4444' : '#1d4ed8',
              opacity: isAILoading ? 0.7 : 1,
            },
          ]}
          onPress={handleToggleRecording}
          disabled={isAILoading}
        >
          <Text style={styles.voiceButtonText}>
            {isRecording ? '녹음 중지' : '음성 입력'}
          </Text>
        </Pressable>
        {isRecording && (
          <Text style={styles.recordingTimer}>{formattedDuration}</Text>
        )}
        {recordingError ? (
          <Text style={styles.errorText}>{recordingError}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chatContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderStyle: 'solid',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  chatBubble: {
    borderWidth: 1,
    borderRadius: 24,
  },
  chatText: {
    lineHeight: 22,
  },
  voiceControls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  voiceButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  voiceButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  recordingTimer: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  singleContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderStyle: 'solid',
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  singleChatArea: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 12,
  },
  singleAssistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  singleUserBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
    borderColor: '#1D4ED8',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  singleSpacer: {
    flexGrow: 1,
  },
});

export default AIChatWidget;

