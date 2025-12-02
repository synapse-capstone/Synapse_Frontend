import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from 'react-native';
import { AssistantChatBanner, UserVoiceBubble } from '../components/ChatBubbles';
import { useAIChat } from '../contexts/AIChatContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const beanOptions = [
  { id: 'regular', label: '일반 원두', price: 0 },
  { id: 'decaf', label: '디카페인', price: 500 },
];

const addOnOptions = [
  { id: 'shot', label: '샷 추가', price: 500 },
  { id: 'syrup', label: '시럽 추가', price: 0 },
];

const OptionSelectionScreen = ({ navigation, route }) => {
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
  const temperature = normalizeParam(activeRoute?.params?.temperature);
  const size = normalizeParam(activeRoute?.params?.size);
  const previousMessagesParam = normalizeParam(activeRoute?.params?.previousMessages);
  
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
          return [...parsed, { id: generateUniqueId(), author: 'assistant', text: '추가 옵션을 선택해주세요.' }];
        }
      } catch (e) {
        // 파싱 실패 시 기본 메시지 사용
      }
    }
    return [{ id: generateUniqueId(), author: 'assistant', text: '추가 옵션을 선택해주세요.' }];
  }, [previousMessagesParam]);
  
  const [messages, setMessages] = useState(initialMessages);
  const hasProcessedPreviousMessages = useRef(false);
  const { messages: aiMessages, sendVoiceMessage, sendMessage } = useAIChat();
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(1.0); // 텍스트 크기 배율 (기본값 1.0 = 100%)
  
  // 하이라이트 관련 state
  const [highlightedButtonId, setHighlightedButtonId] = useState(null);
  const highlightAnimation = useRef(new Animated.Value(0)).current;
  
  // 마지막 사용자 메시지 찾기
  const lastUserMessage = useMemo(() => {
    const userMessages = aiMessages.filter(msg => msg.author === 'user');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  }, [aiMessages]);

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

  // AI 응답에 따른 자동 화면 전환 처리
  const handleAIResponse = useCallback((aiResponse, backendResponse) => {
    console.log('OptionSelectionScreen - handleAIResponse 호출됨:', { aiResponse, backendResponse });
    
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
      console.log('OptionSelectionScreen - 이전 질문 감지, 바로 이전 버튼 하이라이트');
      // 기존 애니메이션 중지 및 초기화
      highlightAnimation.stopAnimation();
      highlightAnimation.setValue(0);
      
      // 하이라이트 시작
      setHighlightedButtonId('option_prev_button');
      
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
      console.log('OptionSelectionScreen - target_element_id 받음:', targetElementId);
      
      // option_prev_button, option_next_button 확인
      if (targetElementId === 'option_prev_button' || targetElementId === 'option_next_button') {
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
    if (backendResponse && backendResponse.context) {
      step = backendResponse.context.step;
      console.log('OptionSelectionScreen - 백엔드 context.step:', step);
      console.log('OptionSelectionScreen - 백엔드 context 전체:', JSON.stringify(backendResponse.context, null, 2));
    }

    if (!step) {
      console.log('OptionSelectionScreen - step이 없어서 종료');
      return;
    }

    // step이 "options"이거나 "menu_item" 또는 "add_more"이면 MenuListScreen으로 이동
    if (step === 'options' || step === 'option' || step === 'menu_item' || step === 'add_more') {
      console.log('OptionSelectionScreen - MenuListScreen으로 이동');
      
      // 파라미터 준비
      const params = {
        itemId: itemId ?? '',
        itemName: itemName ?? '',
        temperature: temperature ?? '',
        size: size ?? '',
        bean: selectedBean ?? 'regular',
        addOns: JSON.stringify(Object.keys(selectedAddOns)),
        previousMessages: JSON.stringify(messages),
        _timestamp: Date.now().toString(),
      };
      
      if (activeNavigation?.navigate) {
        activeNavigation.navigate('MenuListScreen', params);
      } else {
        router.push({
          pathname: '/MenuListScreen',
          params,
        });
      }
    }
  }, [itemId, itemName, temperature, size, selectedBean, selectedAddOns, messages, activeNavigation, router]);

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
  
  // previousMessagesParam이 변경될 때 메시지 업데이트 (중복 방지)
  useEffect(() => {
    if (previousMessagesParam && !hasProcessedPreviousMessages.current) {
      try {
        const parsed = JSON.parse(previousMessagesParam);
        if (Array.isArray(parsed)) {
          // 이미 "추가 옵션을 선택해주세요" 메시지가 있는지 확인
          setMessages((prevMessages) => {
            const hasOptionMessage = prevMessages.some(msg => msg.text === '추가 옵션을 선택해주세요.');
            if (!hasOptionMessage) {
              // 메시지 ID 중복 체크
              const existingIds = new Set(prevMessages.map(msg => msg.id));
              const newMessage = { id: generateUniqueId(), author: 'assistant', text: '추가 옵션을 선택해주세요.' };
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
  const [selectedBean, setSelectedBean] = useState('regular');
  const [selectedAddOns, setSelectedAddOns] = useState({});

  const layout = useMemo(() => {
    const baseWidth = Math.min(width, 960);
    const scale = baseWidth / 800;
    const isLandscape = width > height;

    // 텍스트 크기 배율 적용
    const baseHeadingSize = Math.max(32, 44 * scale);
    const baseSubHeadingSize = Math.max(20, 26 * scale);

    return {
      containerPadding: Math.max(24, 40 * scale),
      sectionGap: Math.max(24, 32 * scale),
      headingSize: baseHeadingSize * textSizeMultiplier,
      subHeadingSize: baseSubHeadingSize * textSizeMultiplier,
      cardRadius: Math.max(20, 30 * scale),
      optionHeight: Math.max(120, Math.min(150, height * 0.18)),
      optionGap: Math.max(16, 20 * scale),
      optionPadding: Math.max(16, 22 * scale),
      chatHeight: isLandscape ? height * 0.35 : height * 0.3,
      buttonHeight: Math.max(52, 60 * scale),
      chatSpacing: Math.max(12, 18 * scale),
    };
  }, [width, height, textSizeMultiplier]);

  const appendMessage = (text, author = 'assistant') => {
    setMessages((prev) => {
      // 중복 ID 방지를 위해 기존 ID 확인
      const existingIds = new Set(prev.map(msg => msg.id));
      let newId = `${author}-${generateUniqueId()}`;
      // ID가 중복되지 않도록 보장
      while (existingIds.has(newId)) {
        newId = `${author}-${generateUniqueId()}`;
      }
      return [
        ...prev,
        {
          id: newId,
          author,
          text,
        },
      ];
    });
  };

  // 최초 진입 시 이전 선택(온도/사이즈)을 사용자 메시지로 에코
  const hasEchoedRef = useRef(false);
  useEffect(() => {
    if (hasEchoedRef.current) return;
    const userMsgs = [];
    if (temperature) {
      userMsgs.push(temperature === 'cold' ? '차갑게 해줘.' : '따뜻하게 해줘.');
    }
    if (size) {
      const sizeEcho =
        {
          small: '작은 사이즈로 해줘.',
          medium: '중간 사이즈로 해줘.',
          large: '큰 사이즈로 해줘.',
        }[size];
      if (sizeEcho) userMsgs.push(sizeEcho);
    }
    if (userMsgs.length > 0) {
      setMessages((prev) => [
        ...prev,
        ...userMsgs.map((text) => ({ id: `user-${Date.now()}-${Math.random()}`, author: 'user', text })),
      ]);
      hasEchoedRef.current = true;
    }
  }, [temperature, size]);

  const toggleAddOn = (id) => {
    setSelectedAddOns((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
        appendMessage(`${addOnOptions.find((opt) => opt.id === id)?.label ?? id} 옵션을 제거했습니다.`, 'assistant');
      } else {
        next[id] = true;
        appendMessage(`${addOnOptions.find((opt) => opt.id === id)?.label ?? id} 옵션을 추가했습니다.`, 'assistant');
      }
      return next;
    });
  };

  const handleBeanSelect = (id) => {
    setSelectedBean(id);
    appendMessage(`${beanOptions.find((opt) => opt.id === id)?.label ?? id}을 선택하셨어요.`, 'assistant');
  };

  const handleDismiss = async () => {
    // 백엔드에 '이전' 메시지 전송 (백그라운드에서 처리)
    // 백엔드가 step을 "size"로 변경하고 "사이즈를 다시 선택해주세요." 응답 반환
    sendMessage('이전').catch((error) => {
      console.error('이전 메시지 전송 실패:', error);
    });
    
    // 즉시 사이즈 선택 화면으로 이동
    const params = {
      itemId: itemId ?? '',
      itemName: itemName ?? '',
      temperature: temperature ?? '',
      previousMessages: JSON.stringify(messages),
    };
    
    router.push({
      pathname: '/SizeSelectionScreen',
      params,
    });
  };

  const handleConfirm = async () => {
    // 백엔드에 옵션 선택 완료 메시지 전송
    // 백엔드가 옵션을 파싱하고 "결제를 진행하시려면 결제하기 버튼을 눌러주세요." 반환
    try {
      // handleAIResponse를 전달하여 백엔드 응답에 따라 자동 화면 전환
      await sendMessage('옵션 선택 완료', handleAIResponse);
      // 백엔드 응답을 기다리지 않고 바로 이동하지 않음 (handleAIResponse에서 처리)
    } catch (error) {
      console.error('옵션 선택 완료 메시지 전송 실패:', error);
      // 에러 발생 시에도 MenuListScreen으로 이동
      const params = {
        itemId: itemId ?? '',
        itemName: itemName ?? '',
        temperature: temperature ?? '',
        size: size ?? '',
        bean: selectedBean ?? 'regular',
        addOns: JSON.stringify(Object.keys(selectedAddOns)),
        previousMessages: JSON.stringify(messages),
        _timestamp: Date.now().toString(),
      };
      router.push({
        pathname: '/MenuListScreen',
        params,
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.wrapper, { paddingHorizontal: layout.containerPadding, paddingVertical: layout.containerPadding }]}>
        <View style={[styles.topSection, { paddingBottom: layout.containerPadding * 0.5 }]}>
          <AssistantChatBanner
            layout={layout}
            assistantText="옵션을 선택해주세요."
            assistantFontSize={layout.subHeadingSize}
          />
          <View
            style={[
              styles.optionSurface,
              {
                borderRadius: layout.cardRadius,
                padding: layout.optionPadding,
                marginTop: layout.sectionGap,
                gap: layout.sectionGap * 0.8,
              },
            ]}
          >
            
            <View>
              <Text style={[styles.subHeading, { fontSize: layout.subHeadingSize }]}>카페인</Text>

              <View style={[styles.optionRow, { gap: layout.optionGap }]}>
                {beanOptions.map((option) => {
                  const isSelected = selectedBean === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.optionCard,
                        {
                          borderRadius: layout.cardRadius,
                          borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
                          height: layout.optionHeight,
                          transform: [{ scale: pressed ? 0.95 : 1 }], // 누르는 모션
                        },
                      ]}
                      android_ripple={{ color: '#94a3b855' }}
                      onPress={() => handleBeanSelect(option.id)}
                    >
                      <Text style={[styles.optionLabel, { fontSize: layout.subHeadingSize, color: isSelected ? '#1f2937' : '#6b7280' }]}>
                        {option.label}
                      </Text>
                    <Text style={[styles.optionPrice, { color: '#3b82f6', fontSize: layout.subHeadingSize * 1.1 }]}>{`+ ${option.price.toLocaleString()}원`}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={[styles.subHeading, { fontSize: layout.subHeadingSize }]}>추가 옵션</Text>

              <View style={[styles.optionRow, { gap: layout.optionGap }]}>
                {addOnOptions.map((option) => {
                  const isSelected = !!selectedAddOns[option.id];
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.optionCard,
                        {
                          borderRadius: layout.cardRadius,
                          borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
                          height: layout.optionHeight,
                          transform: [{ scale: pressed ? 0.95 : 1 }], // 누르는 모션
                        },
                      ]}
                      android_ripple={{ color: '#94a3b855' }}
                      onPress={() => toggleAddOn(option.id)}
                    >
                      <Text style={[styles.optionLabel, { fontSize: layout.subHeadingSize, color: isSelected ? '#1f2937' : '#6b7280' }]}>
                        {option.label}
                      </Text>
                    <Text style={[styles.optionPrice, { color: '#3b82f6', fontSize: layout.subHeadingSize * 1.1 }]}>{`+ ${option.price.toLocaleString()}원`}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        <UserVoiceBubble
          layout={layout}
          lastUserMessage={lastUserMessage}
          isRecording={isRecording}
          onPress={handlePressIn}
          userFontSize={layout.subHeadingSize}
        />

        <View
          style={[
            styles.bottomButtonRow,
            {
              position: 'absolute',
              bottom: layout.containerPadding,
              left: layout.containerPadding,
              right: layout.containerPadding,
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
                borderWidth: highlightedButtonId === 'option_prev_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [2, 4],
                }) : 1,
                borderColor: highlightedButtonId === 'option_prev_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#ef4444', '#dc2626'],
                }) : '#cbd5f5',
                backgroundColor: highlightedButtonId === 'option_prev_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#fee2e2', '#fecaca'],
                }) : 'transparent',
              },
            ]}
            accessibilityRole="button"
            accessibilityHint="이전 화면으로 돌아갑니다"
            android_ripple={{ color: '#94a3b855' }}
            onPress={handleDismiss}
            testID="option_prev_button"
          >
            <Text style={[styles.secondaryLabel, { fontSize: layout.subHeadingSize }]}>이전으로</Text>
          </AnimatedPressable>

          <AnimatedPressable
          style={[
              styles.primaryButton,
            {
                flex: 1,
                width: '100%',
              height: layout.buttonHeight,
              borderRadius: layout.buttonHeight / 2,
                borderWidth: highlightedButtonId === 'option_next_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [2, 4],
                }) : 0,
                borderColor: highlightedButtonId === 'option_next_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#ef4444', '#dc2626'],
                }) : 'transparent',
            },
          ]}
          accessibilityRole="button"
            accessibilityHint="선택을 완료하고 다음 단계로 이동합니다"
            android_ripple={{ color: '#1d4ed866' }}
          onPress={handleConfirm}
            testID="option_next_button"
          >
            <Text style={[styles.primaryLabel, { fontSize: layout.subHeadingSize }]}>선택 완료</Text>
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
    width: '100%',
  },
  heading: {
    color: '#111827',
    fontWeight: '700',
    textAlign: 'left',
  },
  optionSurface: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  subHeading: {
    color: '#4d5359',
    fontWeight: '600',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  optionLabel: {
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionPrice: {
    fontWeight: '600',
    textAlign: 'center',
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
    maxWidth: 760,
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
    maxWidth: 760,
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
});

export default OptionSelectionScreen;


