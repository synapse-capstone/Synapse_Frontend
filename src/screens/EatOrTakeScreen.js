import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Image,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from 'react-native';
import { AssistantChatBanner, UserVoiceBubble } from '../components/ChatBubbles';
import { useAIChat } from '../contexts/AIChatContext';

const optionAssets = {
  eatIn: require('../assets/images/eat.png'),
  takeOut: require('../assets/images/take.png'),
};

const EatOrTakeScreen = ({ navigation }) => {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isTabletBreakpoint = width >= 768;
  const { sendMessage, appendMessage, messages, sendVoiceMessage } = useAIChat();
  
  // 마지막 사용자 메시지 찾기
  const lastUserMessage = useMemo(() => {
    const userMessages = messages.filter(msg => msg.author === 'user');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  }, [messages]);

  // 음성 녹음 관련 state
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const recordingRef = useRef(null);

  // "주문" 메시지는 StartVoiceOrderScreen에서 이미 전송되었으므로
  // EatOrTakeScreen에서는 별도로 메시지를 보낼 필요 없음
  // 백엔드가 이미 "포장 또는 매장식사를 선택해주세요." 응답을 반환했을 것

  const activeNavigation = useMemo(() => {
    if (navigation) {
      return navigation;
    }

    return {
      navigate: (routeName, params) => {
        switch (routeName) {
          case 'MenuListScreen':
            router.push({ pathname: '/MenuListScreen', params });
            break;
          default:
            console.warn(`라우트 "${routeName}"가 Expo Router에 아직 연결되지 않았습니다.`, params);
        }
      },
      goBack: () => {
        if (router.canGoBack()) {
          router.back();
        } else {
          console.warn('돌아갈 수 있는 이전 화면이 없습니다.');
        }
      },
    };
  }, [navigation, router]);

  const layout = useMemo(() => {
    const cardSpacing = isTabletBreakpoint ? 32 : 20;
    const horizontalPadding = isTabletBreakpoint ? 36 : 12;
    const cardRadius = Math.max(26, Math.min(40, width * 0.05));
    const cardHeight = Math.max(200, Math.min(280, height * 0.24));
    const labelSize = Math.max(24, Math.min(36, width * 0.048)); // 텍스트 크기 증가 (0.038 -> 0.048)
    const imageSize = Math.max(80, Math.min(120, width * 0.14)); // 아이콘 크기 줄임 (0.18 -> 0.14, 최소 100->80, 최대 150->120)
    const chatSpacing = Math.max(14, 18 * (width / 800));
    const chatBubblePadding = Math.max(14, 18 * (width / 800));
    const chatBubbleFontSize = Math.max(15, 18 * (width / 800));
    const chatWindowHeight = Math.max(180, height * 0.25);
    const itemRadius = cardRadius;

    return {
      cardSpacing,
      horizontalPadding,
      cardRadius,
      cardHeight,
      labelSize,
      imageSize,
      chatSpacing,
      chatBubblePadding,
      chatBubbleFontSize,
      chatWindowHeight,
      itemRadius,
    };
  }, [width, height, isTabletBreakpoint]);

  // 마이크 권한 요청
  const requestPermission = useCallback(async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('마이크 권한이 필요합니다.');
    }
  }, []);

  // 녹음 시작
  const startRecording = useCallback(async () => {
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

  // 녹음 중지 및 전송
  const stopRecording = useCallback(async () => {
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

  // 버튼 핸들러 - 버튼 클릭 시 토글 (녹음 시작/종료)
  const handlePressIn = useCallback(async () => {
    console.log('마이크 버튼 클릭');
    
    if (isRecording) {
      // 이미 녹음 중이면 중지 및 전송
      console.log('녹음 중지 및 전송');
      const audioUri = await stopRecording();
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
      await startRecording();
    }
  }, [isRecording, stopRecording, startRecording, sendVoiceMessage, handleAIResponse]);

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
    console.log('EatOrTakeScreen - handleAIResponse 호출됨:', { aiResponse, backendResponse });
    
    if (!aiResponse) {
      return;
    }

    // 백엔드 응답의 context.step을 확인
    let step = null;
    if (backendResponse && backendResponse.context) {
      step = backendResponse.context.step;
      console.log('EatOrTakeScreen - 백엔드 context.step:', step);
    }

    // step이 "menu_item"이면 MenuListScreen으로 이동
    if (step === 'menu_item') {
      console.log('EatOrTakeScreen - MenuListScreen으로 이동');
      if (activeNavigation?.navigate) {
        activeNavigation.navigate('MenuListScreen', {});
      }
    }
  }, [activeNavigation]);

  const handleNavigate = async (type) => {
    // 백엔드에 포장/매장 선택 메시지 전송
    // 백엔드가 step을 "menu_item"로 변경하고 "{dine_name}을 선택하셨습니다. 원하시는 메뉴를 말씀해주세요." 응답 반환
    const userMessage = type === 'eat-in' ? '매장에서 드실게요' : '포장해서 가져갈게요';
    
    try {
      // AI API 호출 및 응답 처리
      // handleAIResponse를 전달하여 백엔드 응답에 따라 자동 화면 전환
      await sendMessage(userMessage, handleAIResponse);
      // 백엔드 응답을 기다리지 않고 바로 이동하지 않음 (handleAIResponse에서 처리)
    } catch (error) {
      console.error('포장/매장 선택 메시지 전송 실패:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingHorizontal: layout.horizontalPadding * 0.75,
            paddingVertical: layout.cardSpacing * 1.5,
            minHeight: height,
          },
        ]}
      >
        <AssistantChatBanner
          layout={{
            containerPadding: layout.horizontalPadding * 0.75,
            sectionGap: layout.cardSpacing,
            subHeadingSize: layout.labelSize * 0.9,
          }}
          assistantText="포장 또는 매장을 선택해주세요."
          assistantFontSize={layout.labelSize * 0.9}
        />

        <View style={styles.wrapper}>
          <View
            style={[
              styles.grid,
              {
                flexDirection: 'column',
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.card,
                {
                  borderRadius: layout.cardRadius,
                  height: layout.cardHeight,
                  marginBottom: layout.cardSpacing,
                  width: isTabletBreakpoint ? '70%' : '80%', // 가로 너비 줄임
                  alignSelf: 'center',
                  transform: [{ scale: pressed ? 0.95 : 1 }], // 누르는 모션
                },
              ]}
              android_ripple={{ color: '#d1d5db44' }}
              accessibilityRole="button"
              accessibilityLabel="매장"
              accessibilityHint="매장 내 식사 주문을 진행합니다."
              onPress={() => handleNavigate('eat-in')}
            >
              <Image
                source={optionAssets.eatIn}
                style={[
                  styles.cardImage,
                  {
                    width: layout.imageSize,
                    height: layout.imageSize,
                  },
                ]}
                resizeMode="cover"
              />
              <Text
                style={[
                  styles.cardLabel,
                  {
                    fontSize: layout.labelSize,
                  },
                ]}
              >
                매장
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.card,
                {
                  borderRadius: layout.cardRadius,
                  height: layout.cardHeight,
                  width: isTabletBreakpoint ? '70%' : '80%', // 가로 너비 줄임
                  alignSelf: 'center',
                  transform: [{ scale: pressed ? 0.95 : 1 }], // 누르는 모션
                },
              ]}
              android_ripple={{ color: '#d1d5db44' }}
              accessibilityRole="button"
              accessibilityLabel="포장"
              accessibilityHint="포장 주문을 진행합니다."
              onPress={() => handleNavigate('take-out')}
            >
              <Image
                source={optionAssets.takeOut}
                style={[
                  styles.cardImage,
                  {
                    width: layout.imageSize,
                    height: layout.imageSize,
                  },
                ]}
                resizeMode="cover"
              />
              <Text
                style={[
                  styles.cardLabel,
                  {
                    fontSize: layout.labelSize,
                  },
                ]}
              >
                포장
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.bottomVoiceButton}>
        <UserVoiceBubble
          layout={{
            containerPadding: layout.horizontalPadding * 0.75,
            sectionGap: layout.cardSpacing,
            subHeadingSize: layout.labelSize * 1.1,
          }}
          
          isRecording={isRecording}
          onPress={handlePressIn}
          userFontSize={layout.labelSize * 1.1}
        />
      </View>
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
    maxWidth: 640,
    alignSelf: 'center',
  },
  grid: {
    width: '100%',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderStyle: 'solid',
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 20,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  cardImage: {
    borderRadius: 24,
    marginBottom: 12,
  },
  cardLabel: {
    color: '#6b7280',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  bottomVoiceButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
});

export default EatOrTakeScreen;