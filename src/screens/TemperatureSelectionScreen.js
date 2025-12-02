import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const temperatureOptions = [
  {
    id: 'hot',
    label: '따뜻하게',
    image: require('../assets/images/hot.png'),
    accentColor: '#f87171',
  },
  {
    id: 'cold',
    label: '차갑게',
    image: require('../assets/images/ice.png'),
    accentColor: '#60a5fa',
  },
];

const TemperatureSelectionScreen = ({ navigation, route }) => {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const localParams = useLocalSearchParams();
  const activeRoute = useMemo(() => {
    if (route) return route;
    return { params: { ...localParams } };
  }, [route, localParams]);

  const activeNavigation = useMemo(() => {
    if (navigation) return navigation;

    return {
      navigate: (screen, params) => {
        switch (screen) {
          case 'MenuListScreen':
            router.push({ pathname: '/MenuListScreen', params });
            break;
          default:
            console.warn(`라우트 "${screen}"가 Expo Router에 아직 연결되지 않았습니다.`, params);
        }
      },
      goBack: () => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.push('/MenuListScreen');
        }
      },
      canGoBack: () => router.canGoBack(),
    };
  }, [navigation, router]);

  const normalizeParam = (value) => (Array.isArray(value) ? value[0] : value);
  const itemName = normalizeParam(activeRoute?.params?.itemName);
  const itemId = normalizeParam(activeRoute?.params?.itemId);
  const previousMessagesParam = normalizeParam(activeRoute?.params?.previousMessages);
  const { sendMessage, messages, sendVoiceMessage } = useAIChat();
  const [selectedTemperature, setSelectedTemperature] = useState(null);
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(1.0); // 텍스트 크기 배율 (기본값 1.0 = 100%)
  
  // 하이라이트 관련 state
  const [highlightedButtonId, setHighlightedButtonId] = useState(null);
  const highlightAnimation = useRef(new Animated.Value(0)).current;

  // AI 응답에 따른 자동 화면 전환 처리
  const handleAIResponse = useCallback((aiResponse, backendResponse) => {
    console.log('TemperatureSelectionScreen - handleAIResponse 호출됨:', { aiResponse, backendResponse });
    
    // "이전으로 가려면 어떻게해?" 같은 질문 감지 - 백엔드 응답과 상관없이 바로 하이라이트
    const sttText = backendResponse?.stt_text || '';
    const previousQuestionPatterns = [
      /이전.*가려면.*어떻게/,
      /이전.*어떻게.*가/,
      /이전.*돌아가.*어떻게/,
      /이전.*어떻게.*돌아가/,
      /이전.*방법/,
      /이전.*어떡해/,
    ];
    
    const isPreviousQuestion = previousQuestionPatterns.some(pattern => pattern.test(sttText));
    
    if (isPreviousQuestion) {
      console.log('TemperatureSelectionScreen - 이전 질문 감지, 바로 이전 버튼 하이라이트');
      // 기존 애니메이션 중지 및 초기화
      highlightAnimation.stopAnimation();
      highlightAnimation.setValue(0);
      
      // 하이라이트 시작
      setHighlightedButtonId('temp_prev_button');
      
      // 깜빡임 애니메이션 시작
      requestAnimationFrame(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(highlightAnimation, {
              toValue: 1,
              duration: 500,
              useNativeDriver: false,
            }),
            Animated.timing(highlightAnimation, {
              toValue: 0,
              duration: 500,
              useNativeDriver: false,
            }),
          ]),
          { iterations: 10 }
        ).start((finished) => {
          if (finished) {
            setHighlightedButtonId(null);
            highlightAnimation.setValue(0);
          }
        });
      });
      return; // 백엔드 응답 처리 중단
    }
    
    // target_element_id 처리 (이전/다음 버튼 하이라이트)
    if (backendResponse?.target_element_id) {
      const targetElementId = backendResponse.target_element_id;
      console.log('TemperatureSelectionScreen - target_element_id 받음:', targetElementId);
      
      // temp_prev_button, temp_next_button 확인
      if (targetElementId === 'temp_prev_button' || targetElementId === 'temp_next_button') {
        // 기존 애니메이션 중지 및 초기화
        highlightAnimation.stopAnimation();
        highlightAnimation.setValue(0);
        
        // 하이라이트 시작
        setHighlightedButtonId(targetElementId);
        
        // 깜빡임 애니메이션 시작
        requestAnimationFrame(() => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(highlightAnimation, {
                toValue: 1,
                duration: 500,
                useNativeDriver: false,
              }),
              Animated.timing(highlightAnimation, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]),
            { iterations: 10 }
          ).start((finished) => {
            if (finished) {
              setHighlightedButtonId(null);
              highlightAnimation.setValue(0);
            }
          });
        });
      }
    }
    
    if (!aiResponse) {
      console.log('aiResponse가 없어서 종료');
      return;
    }

    // 백엔드 응답의 context.step을 확인
    let step = null;
    let context = null;
    
    if (backendResponse && backendResponse.context) {
      context = backendResponse.context;
      step = context.step;
      console.log('TemperatureSelectionScreen - 백엔드 context.step:', step);
      console.log('TemperatureSelectionScreen - 백엔드 context 전체:', JSON.stringify(context, null, 2));
    }

    if (!step) {
      console.log('TemperatureSelectionScreen - step이 없어서 종료');
      return;
    }

    // 백엔드 context에서 메뉴 정보 추출
    const menuId = context?.menu_id || null;
    const menuName = context?.menu_name || null;
    const temperature = context?.temp || null;
    const size = context?.size || null;

    // 메뉴 ID를 프론트엔드 형식으로 변환
    let frontendMenuId = null;
    if (menuId) {
      const parts = menuId.split('_');
      if (parts.length > 1) {
        frontendMenuId = parts.slice(1).join('-').toLowerCase();
      } else {
        frontendMenuId = menuId.toLowerCase();
      }
    }

    // 온도 값을 프론트엔드 형식으로 변환 (hot/ice -> hot/cold)
    let frontendTemperature = null;
    if (temperature) {
      frontendTemperature = temperature === 'ice' ? 'cold' : temperature;
    } else if (selectedTemperature) {
      // context에 temperature가 없으면 선택된 값 사용
      frontendTemperature = selectedTemperature;
    }

    // step에 따라 화면 전환
    switch (step) {
      case 'temp':
      case 'temperature':
        // 온도 선택 단계 - 현재 화면에 머무름
        console.log('TemperatureSelectionScreen - 온도 선택 단계, 현재 화면 유지');
        break;
      case 'menu_item':
        // 메뉴 선택 화면으로 이동 (이전 버튼 등으로 돌아갈 때)
        console.log('TemperatureSelectionScreen - 메뉴 선택 화면으로 이동');
        router.push({
          pathname: '/MenuListScreen',
        });
        break;
      case 'size':
        // 사이즈 선택 화면으로 이동
        if (frontendMenuId && menuName && frontendTemperature) {
          console.log('TemperatureSelectionScreen - 사이즈 선택 화면으로 이동:', { 
            itemId: frontendMenuId, 
            itemName: menuName, 
            temperature: frontendTemperature 
          });
          router.push({
            pathname: '/SizeSelectionScreen',
            params: {
              itemId: frontendMenuId,
              itemName: menuName,
              temperature: frontendTemperature,
            },
          });
        } else {
          console.log('TemperatureSelectionScreen - 사이즈 선택 화면 이동 실패:', { 
            frontendMenuId, 
            menuName, 
            frontendTemperature 
          });
        }
        break;
      case 'options':
      case 'option':
        // 옵션 선택 화면으로 이동
        if (frontendMenuId && menuName && frontendTemperature && size) {
          const sizeMap = {
            'tall': 'small',
            'grande': 'medium',
            'venti': 'large',
            'small': 'small',
            'medium': 'medium',
            'large': 'large',
          };
          const frontendSize = sizeMap[size.toLowerCase()] || size.toLowerCase();
          console.log('TemperatureSelectionScreen - 옵션 선택 화면으로 이동');
          router.push({
            pathname: '/OptionSelectionScreen',
            params: {
              itemId: frontendMenuId,
              itemName: menuName,
              temperature: frontendTemperature,
              size: frontendSize,
            },
          });
        }
        break;
      default:
        console.log('TemperatureSelectionScreen - 알 수 없는 step:', step);
        break;
    }
  }, [selectedTemperature, router]);
  
  // 마지막 사용자 메시지 찾기
  const lastUserMessage = useMemo(() => {
    const userMessages = messages.filter(msg => msg.author === 'user');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  }, [messages]);

  // 음성 녹음 관련 state
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const recordingRef = useRef(null);
  const pressTimerRef = useRef(null);
  const isPressingRef = useRef(false);

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
    
    let newRecording = null;
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
      
      newRecording = new Audio.Recording();
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
      if (newRecording) {
        try {
          await newRecording.stopAndUnloadAsync();
        } catch (e) {
          // 무시
        }
      }
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
      console.log('녹음 상태 확인:', {
        isRecording: status.isRecording,
        durationMillis: status.durationMillis,
        canRecord: status.canRecord,
        isDoneRecording: status.isDoneRecording,
      });
      
      // 녹음이 실제로 진행 중이면 중지
      if (status.isRecording) {
        await recordingToStop.stopAndUnloadAsync();
        const uri = recordingToStop.getURI();
        console.log('녹음 중지 완료, 파일 URI:', uri, '녹음 시간:', status.durationMillis, 'ms');
        setRecording(null);
        recordingRef.current = null;
        setIsRecording(false);
        return uri;
      } else {
        // 이미 중지된 경우
        console.log('녹음이 이미 중지된 상태, durationMillis:', status.durationMillis);
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

  // 버튼 핸들러 - 버튼 뗐을 때는 아무 동작 없음 (토글 방식이므로)
  const handlePressOut = useCallback(() => {
    // 토글 방식이므로 버튼을 떼는 것은 무시
    // handlePressIn에서 이미 처리됨
  }, []);

  // 컴포넌트 언마운트 시 녹음 정리
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);
  
  // 고유 ID 생성 함수
  const generateUniqueId = () => {
    return `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };
  
  // 이전 메시지 파싱
  const initialMessages = useMemo(() => {
    if (previousMessagesParam) {
      try {
        const parsed = JSON.parse(previousMessagesParam);
        if (Array.isArray(parsed)) {
          return [...parsed, { id: generateUniqueId(), author: 'assistant', text: '온도를 선택해주세요.' }];
        }
      } catch (e) {
        // 파싱 실패 시 기본 메시지 사용
      }
    }
    return [{ id: generateUniqueId(), author: 'assistant', text: '온도를 선택해주세요.' }];
  }, [previousMessagesParam]);
  
  const [localMessages, setLocalMessages] = useState(initialMessages);
  const hasProcessedPreviousMessages = useRef(false);
  
  // previousMessagesParam이 변경될 때 메시지 업데이트 (중복 방지)
  useEffect(() => {
    if (previousMessagesParam && !hasProcessedPreviousMessages.current) {
      try {
        const parsed = JSON.parse(previousMessagesParam);
        if (Array.isArray(parsed)) {
          // 이미 "온도를 선택해주세요" 메시지가 있는지 확인
          setLocalMessages((prevMessages) => {
            const hasTempMessage = prevMessages.some(msg => msg.text === '온도를 선택해주세요.');
            if (!hasTempMessage) {
              // 메시지 ID 중복 체크
              const existingIds = new Set(prevMessages.map(msg => msg.id));
              const newMessage = { id: generateUniqueId(), author: 'assistant', text: '온도를 선택해주세요.' };
              // ID가 중복되지 않도록 보장
              while (existingIds.has(newMessage.id)) {
                newMessage.id = generateUniqueId();
              }
              hasProcessedPreviousMessages.current = true;
              return [...parsed, newMessage];
            }
            return prevMessages;
          });
        }
      } catch (e) {
        // 파싱 실패 시 무시
      }
    }
  }, [previousMessagesParam]);

  const layout = useMemo(() => {
    const baseWidth = Math.min(width, 960);
    const scale = baseWidth / 800;
    const isLandscape = width > height;

    const containerPadding = Math.max(24, 40 * scale);
    const cardWidth = isLandscape
      ? Math.max(260, Math.min(320, baseWidth * 0.24))
      : Math.max(240, Math.min(320, baseWidth * 0.28));
    const cardHeight = isLandscape
      ? Math.max(210, Math.min(250, height * 0.32))
      : Math.max(220, Math.min(280, height * 0.26));
    const cardGap = isLandscape ? Math.max(24, 32 * scale) : Math.max(20, 28 * scale);
    const chatHeight = isLandscape ? height * 0.4 : height * 0.35;

    // 텍스트 크기 배율 적용
    const baseHeadingSize = Math.max(32, 44 * scale);
    const baseSubSize = Math.max(18, 24 * scale);
    const baseLabelSize = Math.max(22, 28 * scale);
    const baseSubHeadingSize = baseSubSize;

    return {
      containerPadding,
      innerPadding: isLandscape ? containerPadding * 0.7 : containerPadding * 0.85,
      cardWidth,
      cardHeight,
      cardRadius: Math.max(24, 36 * scale),
      cardGap,
      headingSize: baseHeadingSize * textSizeMultiplier,
      subSize: baseSubSize * textSizeMultiplier,
      subHeadingSize: baseSubHeadingSize * textSizeMultiplier,
      buttonHeight: Math.max(52, 60 * scale),
      imageSize: Math.max(120, Math.min(180, baseWidth * 0.18)),
      labelSize: baseLabelSize * textSizeMultiplier,
      chatHeight,
      chatSpacing: Math.max(12, 18 * scale),
    };
  }, [width, height, textSizeMultiplier]);

  const appendMessage = (text, author = 'assistant') => {
    setLocalMessages((prev) => [
      ...prev,
      {
        id: `${author}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        author,
        text,
      },
    ]);
  };

  const handleConfirmSelection = async () => {
    if (!selectedTemperature) {
      appendMessage('온도를 먼저 선택해주세요.');
      return;
    }

    const temperature = selectedTemperature;
    const label = temperature === 'cold' ? '차갑게' : '따뜻하게';

    const userMessage = { id: generateUniqueId(), author: 'user', text: `${label} 선택할게.` };
    const assistantMessage = { id: generateUniqueId(), author: 'assistant', text: `${label} 옵션을 선택하셨어요.` };
    const updatedMessages = [...localMessages, userMessage, assistantMessage];

    setLocalMessages(updatedMessages);

    try {
      // handleAIResponse를 전달하여 백엔드 응답에 따라 자동 화면 전환
      // 백엔드 응답에서 context.step이 "size"이면 자동으로 SizeSelectionScreen으로 이동
      await sendMessage(`${label} 선택할게.`, handleAIResponse);
      // 백엔드 응답을 기다리지 않고 바로 이동하지 않음 (handleAIResponse에서 처리)
    } catch (error) {
      console.error('온도 선택 메시지 전송 실패:', error);
      // 에러 발생 시에만 fallback으로 사이즈 선택 화면으로 이동
      router.push({
        pathname: '/SizeSelectionScreen',
        params: {
          temperature,
          itemName: itemName ?? '',
          itemId: itemId ?? '',
          previousMessages: JSON.stringify(updatedMessages),
        },
      });
    }
  };

  const handleDismiss = async () => {
    // 백엔드에 '이전' 메시지 전송
    // 백엔드가 step을 "menu_item"로 변경하고 "주문을 다시 진행해주세요." 응답 반환
    try {
      await sendMessage('이전');
    } catch (error) {
      console.error('이전 메시지 전송 실패:', error);
    }
    
    if (activeNavigation.canGoBack?.()) {
      activeNavigation.goBack?.();
    } else {
      activeNavigation.navigate?.('MenuListScreen');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.wrapper, { paddingHorizontal: layout.containerPadding, paddingVertical: layout.containerPadding }]}>
        <View style={[styles.topSection, { paddingBottom: layout.containerPadding * 0.5 }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              gap: layout.cardGap,
              paddingBottom: layout.containerPadding * 0.4,
            }}
          >
            <AssistantChatBanner
              layout={layout}
              assistantText="온도를 선택해주세요."
              assistantFontSize={layout.subSize}
            />

            <View style={{ position: 'relative' }}>
              <View
                style={[
                  styles.cardRow,
                  {
                    gap: layout.cardGap * 2,
                    marginTop: layout.sectionGap * 4,
                    paddingHorizontal: layout.innerPadding,
                    paddingVertical: layout.innerPadding * 0.9,
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}
              >
                {temperatureOptions.map((option) => (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityHint={`${option.label} 옵션을 선택합니다`}
                    style={({ pressed }) => [
                      styles.card,
                      {
                        borderRadius: layout.cardRadius,
                        borderColor:
                          pressed || selectedTemperature === option.id ? '#3b82f6' : '#cbd5f5',
                        width: layout.cardWidth * 1.2,
                        height: layout.cardHeight * 1.2,
                        transform: [
                          {
                            translateX: option.id === 'hot' ? layout.cardGap * 0.5 : -layout.cardGap * 0.5,
                          },
                          { scale: pressed ? 0.95 : 1 }, // 누르는 모션
                        ],
                      },
                    ]}
                    android_ripple={{ color: '#dbeafe55' }}
                    onPress={() => setSelectedTemperature(option.id)}
                  >
                    <View style={styles.cardContent}>
                      <Image
                        source={option.image}
                        style={[
                          styles.cardImage,
                          {
                            width: layout.imageSize * 1.15,
                            height: layout.imageSize * 1.15,
                          },
                        ]}
                        resizeMode="contain"
                      />
                      <Text style={[styles.cardLabel, { fontSize: layout.labelSize }]}>
                        {option.label}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
              
            </View>
          </ScrollView>
        </View>

        <UserVoiceBubble
          layout={layout}
          lastUserMessage={lastUserMessage}
          isRecording={isRecording}
          onPress={handlePressIn}
          userFontSize={layout.subSize}
        />

        <View
          style={[
            styles.bottomButtonRow,
            {
              marginTop: layout.chatSpacing * 2,
            },
          ]}
        >
          <AnimatedPressable
            style={[
              styles.secondaryButton,
              {
                flex: 1,
                width: '100%',
                height: layout.buttonHeight,
                borderRadius: layout.buttonHeight / 2,
                borderWidth: highlightedButtonId === 'temp_prev_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [2, 4],
                }) : 1,
                borderColor: highlightedButtonId === 'temp_prev_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#ef4444', '#dc2626'],
                }) : '#cbd5f5',
                backgroundColor: highlightedButtonId === 'temp_prev_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#fee2e2', '#fecaca'],
                }) : 'transparent',
              },
            ]}
            accessibilityRole="button"
            accessibilityHint="이전 화면으로 돌아갑니다"
            android_ripple={{ color: '#94a3b855' }}
            onPress={handleDismiss}
            testID="temp_prev_button"
          >
            <Text style={[styles.secondaryLabel, { fontSize: layout.subSize }]}>이전으로</Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[
              styles.primaryButton,
              {
                flex: 1,
                width: '100%',
                height: layout.buttonHeight,
                borderRadius: layout.buttonHeight / 2,
                borderWidth: highlightedButtonId === 'temp_next_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [2, 4],
                }) : 0,
                borderColor: highlightedButtonId === 'temp_next_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#ef4444', '#dc2626'],
                }) : 'transparent',
              },
            ]}
            accessibilityRole="button"
            accessibilityHint="선택한 옵션으로 다음 단계로 이동합니다"
            android_ripple={{ color: '#1d4ed866' }}
            onPress={handleConfirmSelection}
            testID="temp_next_button"
          >
            <Text style={[styles.primaryLabel, { fontSize: layout.subSize }]}>다음으로</Text>
          </AnimatedPressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  textSizeButton: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSizeButtonText: {
    color: '#4b5563',
    fontWeight: '600',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  wrapper: {
    flex: 1,
    alignItems: 'center',
  },
  topSection: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
  },
  content: {
    flexGrow: 1,
  },
  header: {
    width: '100%',
  },
  heading: {
    color: '#111827',
    fontWeight: '700',
    textAlign: 'left',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  selectionSurface: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    position: 'relative', // absolute 위치의 자식 요소를 위한 relative 설정
    overflow: 'visible', // 버튼이 영역 밖으로 나가도 보이도록
  },
  card: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#ffffff',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  cardImage: {
    marginBottom: 0,
  },
  cardLabel: {
    fontWeight: '600',
  },
  chatSurface: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  chatBubble: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  chatText: {
    fontWeight: '500',
    lineHeight: 22,
  },
  bottomButtonRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: 16,
  },
  secondaryButton: {
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    color: '#4b5563',
    fontWeight: '600',
  },
  primaryButton: {
    paddingHorizontal: 32,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  userBubbleContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: 12,
  },
  userBubble: {
    backgroundColor: '#2563eb',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    alignSelf: 'flex-end',
    paddingHorizontal: 48,
    paddingVertical: 25,
    borderRadius: 35,
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
    borderRightWidth: 0,
    marginTop: 20,
    marginLeft: -1,
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
    borderRightWidth: 0,
    left: -1,
    top: -1,
    zIndex: -1,
  },
  voiceButton: {
    backgroundColor: '#2563eb',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    borderRadius: 35,
    paddingHorizontal: 48,
    paddingVertical: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
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
    fontSize: 32,
  },
  voiceIconSmall: {
    fontSize: 40,
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

export default TemperatureSelectionScreen;


