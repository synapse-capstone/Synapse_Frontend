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
    View,
} from 'react-native';
import { AssistantChatBanner, UserVoiceBubble } from '../components/ChatBubbles';
import { useAIChat } from '../contexts/AIChatContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const sizeOptions = [
  {
    id: 'small',
    label: '작은 사이즈',
    subLabel: '355ml',
    image: require('../assets/images/s.png'),
  },
  {
    id: 'medium',
    label: '중간 사이즈',
    subLabel: '473ml',
    image: require('../assets/images/m.png'),
  },
  {
    id: 'large',
    label: '큰 사이즈',
    subLabel: '591ml',
    image: require('../assets/images/l.png'),
  },
];

const SizeSelectionScreen = ({ navigation, route }) => {
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
  const itemName = normalizeParam(activeRoute?.params?.itemName ?? localParams?.itemName);
  const itemId = normalizeParam(activeRoute?.params?.itemId ?? localParams?.itemId);
  const temperature = normalizeParam(activeRoute?.params?.temperature ?? localParams?.temperature);
  
  const { sendMessage, appendMessage, messages, sendVoiceMessage } = useAIChat();
  const [selectedSize, setSelectedSize] = useState(null);
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(1.0); // 텍스트 크기 배율 (기본값 1.0 = 100%)
  
  // 하이라이트 관련 state
  const [highlightedButtonId, setHighlightedButtonId] = useState(null);
  const highlightAnimation = useRef(new Animated.Value(0)).current;
  
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
    if (isRecording || recording) {
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
      recordingRef.current = newRecording;
      setIsRecording(true);
    } catch (error) {
      console.error('녹음을 시작할 수 없습니다:', error);
      setIsRecording(false);
      if (newRecording) {
        newRecording.stopAndUnloadAsync().catch(() => {});
      }
      setRecording(null);
      recordingRef.current = null;
    }
  }, [requestPermission, isRecording, recording]);

  // 녹음 중지 및 전송
  const stopRecording = useCallback(async () => {
    if (!recording) {
      return null;
    }
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      recordingRef.current = null;
      setIsRecording(false);
      return uri;
    } catch (error) {
      console.error('녹음을 중지할 수 없습니다:', error);
      setRecording(null);
      recordingRef.current = null;
      setIsRecording(false);
      return null;
    }
  }, [recording]);

  // AI 응답에 따른 자동 화면 전환 처리 (handlePressIn보다 먼저 정의)
  const handleAIResponse = useCallback((aiResponse, backendResponse) => {
    console.log('SizeSelectionScreen - handleAIResponse 호출됨:', { aiResponse, backendResponse });
    
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
      console.log('SizeSelectionScreen - 이전 질문 감지, 바로 이전 버튼 하이라이트');
      // 기존 애니메이션 중지 및 초기화
      highlightAnimation.stopAnimation();
      highlightAnimation.setValue(0);
      
      // 하이라이트 시작
      setHighlightedButtonId('size_prev_button');
      
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
      console.log('SizeSelectionScreen - target_element_id 받음:', targetElementId);
      
      // size_prev_button, size_next_button 확인
      if (targetElementId === 'size_prev_button' || targetElementId === 'size_next_button') {
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

    // 텍스트 크기 조절 요청 감지 (사용자 메시지 우선 확인)
    const lastUserMsg = messages.filter(msg => msg.author === 'user').pop();
    const userMessage = lastUserMsg?.text || '';
    
    // 텍스트 크기 키우기 패턴
    const textSizeIncreasePatterns = [
      /텍스트\s*크기?\s*(?:키워|크게|늘려|키워줘|키워달라|키워달라고)/,
      /글자\s*크기?\s*(?:키워|크게|늘려|키워줘|키워달라|키워달라고)/,
      /텍스트\s*(?:키워|크게|늘려|키워줘|키워달라|키워달라고)/,
      /글자\s*(?:키워|크게|늘려|키워줘|키워달라|키워달라고)/,
      /크기?\s*(?:키워|크게|늘려|키워줘|키워달라|키워달라고)/,
      /(?:20%|20퍼센트|이십퍼센트)\s*(?:키워|크게|늘려|키워줘|키워달라|키워달라고)/,
      /(?:키워|크게|늘려|키워줘|키워달라|키워달라고)\s*(?:20%|20퍼센트|이십퍼센트)/,
    ];
    
    // 텍스트 크기 리셋 패턴
    const textSizeResetPatterns = [
      /텍스트\s*크기?\s*(?:리셋|기본값|원래|원상태|되돌리|초기화)/,
      /글자\s*크기?\s*(?:리셋|기본값|원래|원상태|되돌리|초기화)/,
      /텍스트\s*(?:리셋|기본값|원래|원상태|되돌리|초기화)/,
      /글자\s*(?:리셋|기본값|원래|원상태|되돌리|초기화)/,
      /크기?\s*(?:리셋|기본값|원래|원상태|되돌리|초기화)/,
      /기본값\s*(?:적용|설정|되돌리)/,
      /원상태\s*(?:적용|설정|되돌리)/,
    ];
    
    // 사용자 메시지에서 먼저 확인 (더 정확함)
    const isUserTextSizeIncrease = userMessage && textSizeIncreasePatterns.some(pattern => pattern.test(userMessage));
    const isTextSizeIncrease = aiResponse && textSizeIncreasePatterns.some(pattern => pattern.test(aiResponse));
    const isUserTextSizeReset = userMessage && textSizeResetPatterns.some(pattern => pattern.test(userMessage));
    const isTextSizeReset = aiResponse && textSizeResetPatterns.some(pattern => pattern.test(aiResponse));
    
    // 텍스트 크기 리셋 요청
    if (isUserTextSizeReset || isTextSizeReset) {
      console.log('✅ 텍스트 크기 리셋 요청 감지:', { 
        userMessage, 
        aiResponse,
        isUserTextSizeReset,
        isTextSizeReset
      });
      setTextSizeMultiplier(1.0); // 기본값으로 리셋
      console.log('✅ 텍스트 크기 배율 리셋: 1.0 (100%)');
      appendMessage('텍스트 크기를 원래대로 되돌렸습니다.', 'assistant');
      // 텍스트 크기 요청일 때는 화면 전환하지 않고 현재 화면에 머물러있음
      console.log('✅ 텍스트 크기 리셋 - 화면 전환 건너뜀, 현재 화면에 머무름');
      return; // 화면 전환하지 않고 종료
    }
    
    // 텍스트 크기 키우기 요청
    if (isUserTextSizeIncrease || isTextSizeIncrease) {
      console.log('✅ 텍스트 크기 키우기 요청 감지:', { 
        userMessage, 
        aiResponse,
        isUserTextSizeIncrease,
        isTextSizeIncrease
      });
      setTextSizeMultiplier(prev => {
        const newMultiplier = prev * 1.2; // 20% 증가
        console.log('✅ 텍스트 크기 배율 변경:', prev, '->', newMultiplier);
        return newMultiplier;
      });
      appendMessage('텍스트 크기를 20% 키웠습니다.', 'assistant');
      // 텍스트 크기 요청일 때는 화면 전환하지 않고 현재 화면에 머물러있음
      console.log('✅ 텍스트 크기 키우기 - 화면 전환 건너뜀, 현재 화면에 머무름');
      return; // 화면 전환하지 않고 종료
    }

    // 백엔드 응답의 context.step을 확인
    let step = null;
    let context = null;
    
    if (backendResponse && backendResponse.context) {
      context = backendResponse.context;
      step = context.step;
      console.log('SizeSelectionScreen - 백엔드 context.step:', step);
      console.log('SizeSelectionScreen - 백엔드 context 전체:', JSON.stringify(context, null, 2));
    }

    if (!step) {
      console.log('SizeSelectionScreen - step이 없어서 종료');
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
      // context에서 온도 값 사용
      frontendTemperature = temperature === 'ice' ? 'cold' : temperature;
    } else {
      // context에 temperature가 없으면 파라미터에서 가져오기
      const paramTemp = normalizeParam(activeRoute?.params?.temperature ?? localParams?.temperature);
      if (paramTemp) {
        frontendTemperature = paramTemp === 'ice' ? 'cold' : paramTemp;
      }
    }

    // 사이즈 값을 프론트엔드 형식으로 변환 (tall/grande/venti -> small/medium/large)
    let frontendSize = null;
    if (size) {
      const sizeMap = {
        'tall': 'small',
        'grande': 'medium',
        'venti': 'large',
        'small': 'small',
        'medium': 'medium',
        'large': 'large',
      };
      frontendSize = sizeMap[size.toLowerCase()] || size.toLowerCase();
    } else if (selectedSize) {
      // context에 size가 없으면 선택된 값 사용
      frontendSize = selectedSize;
    }

    // step에 따라 화면 전환
    switch (step) {
      case 'size':
        // 사이즈 선택 단계 - 현재 화면에 머무름
        console.log('SizeSelectionScreen - 사이즈 선택 단계, 현재 화면 유지');
        break;
      case 'options':
      case 'option':
        // 옵션 선택 화면으로 이동
        if (frontendMenuId && menuName && frontendTemperature && frontendSize) {
          console.log('SizeSelectionScreen - 옵션 선택 화면으로 이동:', { 
            itemId: frontendMenuId, 
            itemName: menuName, 
            temperature: frontendTemperature,
            size: frontendSize,
          });
          router.push({
            pathname: '/OptionSelectionScreen',
            params: {
              itemId: frontendMenuId,
              itemName: menuName,
              temperature: frontendTemperature,
              size: frontendSize,
            },
          });
        } else {
          console.log('SizeSelectionScreen - 옵션 선택 화면 이동 실패:', { 
            frontendMenuId, 
            menuName, 
            frontendTemperature,
            frontendSize 
          });
          // 파라미터에서 정보 가져오기
          if (itemId && itemName && temperature && selectedSize) {
            console.log('SizeSelectionScreen - 파라미터로 옵션 선택 화면으로 이동');
      router.push({
        pathname: '/OptionSelectionScreen',
        params: {
          itemId,
          itemName,
          temperature,
                size: selectedSize,
        },
      });
    }
        }
        break;
      case 'menu_item':
      case 'add_more':
      case 'review':
      case 'confirm':
        // "이전" 질문인지 확인 (장바구니 추가 방지)
        const sttText = backendResponse?.stt_text || '';
        const responseText = backendResponse?.response_text || '';
        const isPreviousQuestion = 
          sttText.includes('이전') || 
          responseText.includes('이전') ||
          sttText.includes('돌아가') ||
          responseText.includes('돌아가');
        
        if (isPreviousQuestion) {
          // "이전" 질문이면 장바구니에 추가하지 않고 메뉴 화면으로만 이동
          console.log('SizeSelectionScreen - 이전 질문 감지, 장바구니 추가 없이 메뉴 화면으로 이동');
          if (activeNavigation?.navigate) {
            activeNavigation.navigate('MenuListScreen');
          } else {
            router.push({
              pathname: '/MenuListScreen',
            });
          }
          break;
        }
        
        // 사이즈 선택 완료 후 메뉴 화면으로 이동 (메뉴 정보를 파라미터로 전달)
        console.log('SizeSelectionScreen - 사이즈 선택 완료, MenuListScreen으로 이동');
        
        // context에서 메뉴 정보 가져오기
        const menuIdForCart = context?.menu_id || null;
        const menuNameForCart = context?.menu_name || null;
        const tempForCart = context?.temp || null;
        const sizeForCart = context?.size || null;
        
        // 메뉴 ID를 프론트엔드 형식으로 변환
        let frontendMenuIdForCart = itemId; // 기본값은 파라미터의 itemId
        if (menuIdForCart) {
          const parts = menuIdForCart.split('_');
          if (parts.length > 1) {
            frontendMenuIdForCart = parts.slice(1).join('-').toLowerCase();
          } else {
            frontendMenuIdForCart = menuIdForCart.toLowerCase();
          }
        }
        
        // 온도와 사이즈 변환
        let frontendTempForCart = frontendTemperature || (tempForCart === 'ice' ? 'cold' : tempForCart || temperature);
        let frontendSizeForCart = frontendSize || (sizeForCart ? (() => {
          const sizeMap = {
            'tall': 'small',
            'grande': 'medium',
            'venti': 'large',
            'small': 'small',
            'medium': 'medium',
            'large': 'large',
          };
          return sizeMap[sizeForCart.toLowerCase()] || sizeForCart.toLowerCase();
        })() : selectedSize);
        
        const finalMenuNameForCart = menuNameForCart || itemName;
        
        // MenuListScreen으로 이동하면서 메뉴 정보 전달
        const cartParams = {
          addToCart: 'true',
          itemId: frontendMenuIdForCart,
          itemName: finalMenuNameForCart,
          temperature: frontendTempForCart,
          size: frontendSizeForCart,
        };
        
        console.log('SizeSelectionScreen - 장바구니에 추가할 메뉴 정보:', cartParams);
        
        if (activeNavigation?.navigate) {
          activeNavigation.navigate('MenuListScreen', cartParams);
        } else {
          router.push({
            pathname: '/MenuListScreen',
            params: cartParams,
          });
        }
        break;
      default:
        console.log('SizeSelectionScreen - 알 수 없는 step:', step);
        // 기본적으로 메뉴 화면으로 이동
        console.log('SizeSelectionScreen - 기본 동작: MenuListScreen으로 이동');
        if (activeNavigation?.navigate) {
          activeNavigation.navigate('MenuListScreen');
        } else {
          router.push('/MenuListScreen');
        }
        break;
    }
   }, [selectedSize, router, itemId, itemName, temperature, activeRoute, localParams, messages, appendMessage]);

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

  const layout = useMemo(() => {
    const baseWidth = Math.min(width, 960);
    const scale = baseWidth / 800;
    const isLandscape = width > height;

    const containerPadding = Math.max(24, 40 * scale);
    const cardWidth = isLandscape
      ? Math.max(190, Math.min(220, baseWidth * 0.16))
      : Math.max(200, Math.min(240, baseWidth * 0.23));
    const cardHeight = isLandscape
      ? Math.max(200, Math.min(240, height * 0.32))
      : Math.max(220, Math.min(260, height * 0.24));
    const cardGap = Math.max(18, 24 * scale);
    const chatHeight = isLandscape ? height * 0.38 : height * 0.35;

    // 텍스트 크기 배율 적용
    const baseHeadingSize = Math.max(32, 44 * scale);
    const baseSubSize = Math.max(18, 24 * scale);
    const baseLabelSize = Math.max(22, 28 * scale);
    const baseSubHeadingSize = baseSubSize; // subHeadingSize는 subSize와 동일

    return {
      containerPadding,
      innerPadding: isLandscape ? containerPadding * 0.7 : containerPadding * 0.8,
      cardWidth,
      cardHeight,
      cardRadius: Math.max(24, 36 * scale),
      cardGap,
      headingSize: baseHeadingSize * textSizeMultiplier,
      subSize: baseSubSize * textSizeMultiplier,
      subHeadingSize: baseSubHeadingSize * textSizeMultiplier, // textSizeMultiplier 적용
      buttonHeight: Math.max(52, 60 * scale),
      imageSize: Math.max(90, Math.min(120, baseWidth * 0.14)),
      labelSize: baseLabelSize * textSizeMultiplier,
      chatHeight,
      chatSpacing: Math.max(12, 18 * scale),
    };
  }, [width, height, textSizeMultiplier]);

  const handleConfirmSelection = async () => {
    if (!selectedSize) {
      appendMessage?.('사이즈를 먼저 선택해주세요.', 'assistant');
      return;
    }

    const size = selectedSize;
    const label = sizeOptions.find((option) => option.id === size)?.label ?? size;
    
    try {
      // handleAIResponse를 전달하여 백엔드 응답에 따라 자동 화면 전환
      // 백엔드 응답에서 context.step이 "options"이면 자동으로 OptionSelectionScreen으로 이동
    await sendMessage(`${label} 선택할게.`, handleAIResponse);
      // 백엔드 응답을 기다리지 않고 바로 이동하지 않음 (handleAIResponse에서 처리)
    } catch (error) {
      console.error('사이즈 선택 메시지 전송 실패:', error);
      // 에러 발생 시에만 fallback으로 옵션 선택 화면으로 이동
    router.push({
      pathname: '/OptionSelectionScreen',
      params: {
        itemId: itemId ?? '',
        itemName: itemName ?? '',
        temperature: temperature ?? '',
        size,
      },
    });
    }
  };

  const handleDismiss = async () => {
    // 백엔드에 '이전' 메시지 전송
    // 백엔드가 step을 "temp" 또는 "menu_item"로 변경하고 적절한 응답 반환
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
              assistantText="사이즈를 선택해주세요."
              assistantFontSize={layout.subHeadingSize}
            />

            <View style={{ position: 'relative' }}>
              <View
                style={[
                  styles.cardRow,
                  {
                    gap: layout.cardGap,
                    paddingHorizontal: layout.innerPadding,
                    paddingVertical: layout.innerPadding * 0.9,
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}
              >
                {sizeOptions.map((option) => (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityHint={`${option.label} 옵션을 선택합니다`}
                    style={({ pressed }) => [
                      styles.card,
                      {
                        borderRadius: layout.cardRadius,
                        borderColor:
                          pressed || selectedSize === option.id ? '#3b82f6' : '#cbd5f5',
                        width: layout.cardWidth,
                        height: layout.cardHeight,
                        transform: [{ scale: pressed ? 0.95 : 1 }], // 누르는 모션
                      },
                    ]}
                    android_ripple={{ color: '#dbeafe55' }}
                    onPress={() => setSelectedSize(option.id)}
                  >
                    <View style={styles.cardContent}>
                      <View
                        style={[
                          styles.imageWrapper,
                          {
                            width: layout.imageSize,
                            height: layout.imageSize,
                          },
                        ]}
                      >
                        <Image
                          source={option.image}
                          style={[
                            styles.cardImage,
                            {
                              width:
                                option.id === 'large'
                                  ? layout.imageSize * 1.3
                                  : option.id === 'medium'
                                  ? layout.imageSize * 1.25
                                  : layout.imageSize,
                              height:
                                option.id === 'large'
                                  ? layout.imageSize * 1.3
                                  : option.id === 'medium'
                                  ? layout.imageSize * 1.25
                                  : layout.imageSize,
                            },
                          ]}
                          resizeMode="contain"
                        />
                      </View>
                      <Text
                        style={[
                          styles.cardLabel,
                          {
                            fontSize: layout.labelSize,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text style={[styles.cardSubLabel, { fontSize: layout.subSize }]}>{option.subLabel}</Text>
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
          userFontSize={layout.subHeadingSize}
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
                borderWidth: highlightedButtonId === 'size_prev_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [2, 4],
                }) : 1,
                borderColor: highlightedButtonId === 'size_prev_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#ef4444', '#dc2626'],
                }) : '#cbd5f5',
                backgroundColor: highlightedButtonId === 'size_prev_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#fee2e2', '#fecaca'],
                }) : 'transparent',
            },
          ]}
          accessibilityRole="button"
          accessibilityHint="이전 화면으로 돌아갑니다"
          android_ripple={{ color: '#94a3b855' }}
          onPress={handleDismiss}
            testID="size_prev_button"
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
                borderWidth: highlightedButtonId === 'size_next_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [2, 4],
                }) : 0,
                borderColor: highlightedButtonId === 'size_next_button' ? highlightAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#ef4444', '#dc2626'],
                }) : 'transparent',
              },
            ]}
            accessibilityRole="button"
            accessibilityHint="선택한 옵션으로 다음 단계로 이동합니다"
            android_ripple={{ color: '#1d4ed866' }}
            onPress={handleConfirmSelection}
            testID="size_next_button"
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
  header: {
    width: '100%',
  },
  heading: {
    color: '#111827',
    fontWeight: '700',
    textAlign: 'left',
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
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  sizeBadge: {},
  cardImage: {
    marginBottom: 0,
  },
  imageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  cardLabel: {
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  cardSubLabel: {
    color: '#404040',
    fontWeight: '500',
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

export default SizeSelectionScreen;


