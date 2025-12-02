import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Image,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { useAIChat } from '../contexts/AIChatContext';

const StartVoiceOrderScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const isTabletBreakpoint = width >= 768;
  const router = useRouter();
  const { sendMessage, sendVoiceMessage, messages, sessionId } = useAIChat();

  // 마지막 사용자 메시지 찾기
  const lastUserMessage = useMemo(() => {
    const userMessages = messages.filter(msg => msg.author === 'user');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  }, [messages]);

  // 음성 녹음 관련 state
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const recordingRef = useRef(null);

  // 마이크 권한 요청
  const requestPermission = useCallback(async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('마이크 권한이 필요합니다.');
    }
  }, []);

  // 녹음 시작
  const startSimpleRecording = useCallback(async () => {
    if (isRecording) {
      console.log('이미 녹음 중입니다');
      return;
    }
    
    // 기존 녹음 객체 정리
    if (recording || recordingRef.current) {
      try {
        const recToClean = recording || recordingRef.current;
        if (recToClean) {
          try {
            const status = await recToClean.getStatusAsync();
            if (status.isRecording) {
              await recToClean.stopAndUnloadAsync();
            } else {
              await recToClean.unloadAsync();
            }
          } catch (e) {
            // 이미 언로드된 경우 무시
          }
        }
        setRecording(null);
        recordingRef.current = null;
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        setRecording(null);
        recordingRef.current = null;
      }
    }
    
    try {
      console.log('마이크 권한 요청 중...');
      await requestPermission();
      console.log('마이크 권한 획득');
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const newRecording = new Audio.Recording();
      console.log('녹음 준비 중...');
      
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };
      
      await newRecording.prepareToRecordAsync(recordingOptions);
      await newRecording.startAsync();
      setRecording(newRecording);
      recordingRef.current = newRecording;
      setIsRecording(true);
      console.log('✅ 녹음 시작됨');
    } catch (error) {
      console.error('녹음을 시작할 수 없습니다:', error);
      setIsRecording(false);
      setRecording(null);
      recordingRef.current = null;
    }
  }, [requestPermission, isRecording, recording]);

  // 녹음 중지
  const stopSimpleRecording = useCallback(async () => {
    if (!recording && !recordingRef.current) {
      console.log('녹음 중지 실패 - recording 객체가 없음');
      return null;
    }
    
    const recordingToStop = recording || recordingRef.current;
    if (!recordingToStop) {
      return null;
    }
    
    try {
      console.log('녹음 중지 중...');
      const status = await recordingToStop.getStatusAsync();
      
      if (status.isRecording) {
        await recordingToStop.stopAndUnloadAsync();
        const uri = recordingToStop.getURI();
        console.log('녹음 중지 완료, 파일 URI:', uri);
        setRecording(null);
        recordingRef.current = null;
        setIsRecording(false);
        return uri;
      } else {
        try {
          const uri = recordingToStop.getURI();
          await recordingToStop.unloadAsync();
          setRecording(null);
          recordingRef.current = null;
          setIsRecording(false);
          return uri || null;
        } catch (e) {
          setRecording(null);
          recordingRef.current = null;
          setIsRecording(false);
          return null;
        }
      }
    } catch (error) {
      if (error.message && (
        error.message.includes('already been unloaded') ||
        error.message.includes('no valid audio data') ||
        error.message.includes('has not been prepared')
      )) {
        console.log('녹음이 시작되지 않았거나 이미 언로드됨:', error.message);
        setRecording(null);
        recordingRef.current = null;
        setIsRecording(false);
        return null;
      }
      console.error('녹음을 중지할 수 없습니다:', error);
      setRecording(null);
      recordingRef.current = null;
      setIsRecording(false);
      return null;
    }
  }, [recording]);

  // 컴포넌트 언마운트 시 녹음 정리
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  // AI 응답에 따른 자동 화면 전환 처리
  const handleAIResponse = useCallback((aiResponse, backendResponse) => {
    console.log('StartVoiceOrderScreen - handleAIResponse 호출됨:', { aiResponse, backendResponse });
    
    if (!aiResponse) {
      return;
    }

    // 백엔드 응답의 context.step을 확인
    let step = null;
    if (backendResponse && backendResponse.context) {
      step = backendResponse.context.step;
      console.log('StartVoiceOrderScreen - 백엔드 context.step:', step);
    }

    // step이 "dine_type"이면 EatOrTakeScreen으로 이동
    if (step === 'dine_type') {
      console.log('StartVoiceOrderScreen - EatOrTakeScreen으로 이동');
      if (navigation?.navigate) {
        navigation.navigate('EatOrTakeScreen');
      } else {
        router.push('/EatOrTakeScreen');
      }
    }
  }, [navigation, router]);

  // 버튼 핸들러 - 버튼 클릭 시 토글 (녹음 시작/종료)
  const handlePressIn = useCallback(async () => {
    console.log('마이크 버튼 클릭');
    
    if (isRecording) {
      // 이미 녹음 중이면 중지 및 전송
      console.log('녹음 중지 및 전송');
      const audioUri = await stopSimpleRecording();
      if (audioUri && sendVoiceMessage) {
        console.log('녹음 완료, 음성 전송');
        try {
          const backendResponse = await sendVoiceMessage(audioUri);
          console.log('[VOICE] sendVoiceMessage 완료, 응답:', backendResponse);

          if (backendResponse && handleAIResponse) {
            const aiResponse = backendResponse.response_text || backendResponse.response || backendResponse.message || null;
            if (aiResponse) {
              handleAIResponse(aiResponse, backendResponse);
            }
          }
        } catch (e) {
          console.error('[VOICE] sendVoice 전체 에러:', e);
        }
      }
    } else {
      // 녹음 중이 아니면 시작
      console.log('녹음 시작');
      await startSimpleRecording();
    }
  }, [isRecording, stopSimpleRecording, startSimpleRecording, sendVoiceMessage, handleAIResponse]);

  const layout = useMemo(() => {
    const headingSize = Math.max(34, Math.min(72, width * 0.08));
    const buttonHeight = Math.max(60, Math.min(112, width * 0.14));
    const buttonFontSize = Math.max(20, Math.min(30, width * 0.035));
    const buttonRadius = Math.max(16, Math.min(28, width * 0.04));
    const sectionSpacing = isTabletBreakpoint ? 56 : 36;
    const cardHeight = isTabletBreakpoint ? Math.min(460, height * 0.45) : Math.min(360, height * 0.42);
    const horizontalPadding = isTabletBreakpoint ? 64 : 24;

    return {
      headingSize,
      buttonHeight,
      buttonFontSize,
      buttonRadius,
      sectionSpacing,
      cardHeight,
      horizontalPadding,
    };
  }, [width, height, isTabletBreakpoint]);

  // 초기 인사는 AIChatContext에서 세션 시작 시 자동으로 처리됨
  // 별도 처리 불필요

  const handleStartOrder = useCallback(async () => {
    // 세션이 아직 시작되지 않았으면 기다림
    if (!sessionId) {
      console.log('세션이 아직 시작되지 않았습니다. 잠시 기다립니다...');
      // 세션이 시작될 때까지 최대 3초 대기
      let attempts = 0;
      const checkSession = setInterval(() => {
        attempts++;
        if (sessionId || attempts >= 30) {
          clearInterval(checkSession);
          if (!sessionId) {
            console.error('세션 시작 실패');
            return;
          }
        }
      }, 100);
      
      // 세션이 시작될 때까지 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 백엔드에 "주문" 메시지 전송하여 포장/매장 선택 단계로 이동
    // 백엔드 코드에 따르면 step이 "greeting"일 때 "주문" 키워드가 있으면 
    // step을 "dine_type"으로 변경하고 "포장 또는 매장식사를 선택해주세요." 반환
    try {
      // handleAIResponse를 전달하여 백엔드 응답에 따라 자동 화면 전환
      await sendMessage('주문', handleAIResponse);
      // 백엔드 응답을 기다리지 않고 바로 이동하지 않음 (handleAIResponse에서 처리)
    } catch (error) {
      console.error('주문 시작 메시지 전송 실패:', error);
    }
  }, [sessionId, sendMessage, handleAIResponse]);


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingVertical: layout.sectionSpacing,
            minHeight: height,
          },
        ]}
      >
        <View style={styles.wrapper}>
          <View style={[styles.headingContainer, { marginBottom: layout.sectionSpacing }]}>
            <Text
              accessibilityRole="header"
              style={[
                styles.heading,
                {
                  fontSize: layout.headingSize,
                  lineHeight: layout.headingSize * 1.05,
                },
              ]}
            >
              화면 터치 대신{'\n'}목소리로 주문해요
            </Text>
            <Text
              style={[
                styles.maloText,
                {
                  fontSize: layout.headingSize * 1.8,
                  marginTop: layout.sectionSpacing * 0.3,
                },
              ]}
            >
              말로
            </Text>
          </View>

          <View
            style={[
              styles.illustrationCard,
              {
                height: layout.cardHeight,
                marginBottom: layout.sectionSpacing,
                borderRadius: layout.buttonRadius * 1.2,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
          >
            <Image
              source={require('../assets/images/menu_things/kio.png')}
              resizeMode="contain"
              style={[
                styles.heroImage,
                {
                  maxHeight: layout.cardHeight * 0.95,
                  aspectRatio: isTabletBreakpoint ? 1.1 : 1,
                },
              ]}
              accessibilityRole="image"
              accessibilityLabel="음성 주문 안내 캐릭터"
            />
          </View>

          <View
            style={[
              styles.actionRow,
              {
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: layout.sectionSpacing,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityHint="키오스크에서 직접 음성 주문을 시작합니다"
              android_ripple={{ color: '#2563eb22' }}
              style={({ pressed }) => [
                styles.baseButton,
                styles.primaryButton,
                {
                  height: layout.buttonHeight,
                  borderRadius: layout.buttonRadius,
                  width: isTabletBreakpoint ? '60%' : '100%',
                  transform: [{ scale: pressed ? 0.95 : 1 }], // 누르는 모션
                },
              ]}
              onPress={handleStartOrder}
            >
              <Text
                style={[
                  styles.primaryLabel,
                  {
                    fontSize: layout.buttonFontSize,
                  },
                ]}
              >
                여기서 주문
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  wrapper: {
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
  },
  headingContainer: {
    alignItems: 'center',
  },
  heading: {
    color: '#111827',
    fontWeight: Platform.OS === 'ios' ? '600' : '700',
    textAlign: 'center',
  },
  illustrationCard: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
  },
  actionRow: {
    width: '100%',
  },
  baseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
    borderColor: '#d1d5db',
  },
  primaryLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryLabel: {
    color: '#6b7280',
    fontWeight: '600',
  },
  maloText: {
    color: '#3b82f6',
    fontWeight: Platform.OS === 'ios' ? '700' : '800',
    textAlign: 'center',
  },
});

export default StartVoiceOrderScreen;



