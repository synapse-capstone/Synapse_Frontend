import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { sendText } from '../api/ai';
import { AssistantChatBanner, UserVoiceBubble } from '../components/ChatBubbles';
import { useAIChat } from '../contexts/AIChatContext';
import { parseAIResponse } from '../utils/aiResponseParser';

const categories = [
  { id: 'coffee', label: '커피', isPrimary: true },
  { id: 'ade', label: '음료' },
  { id: 'tea', label: '차' },
  { id: 'dessert', label: '디저트' },
];

const menuItems = [
  // 커피
  {
    id: 'americano',
    name: '아메리카노',
    price: 3000,
    image: require('../assets/images/menu_things/americano.png'),
    category: 'coffee',
  },
  {
    id: 'espresso',
    name: '에스프레소',
    price: 3200,
    image: require('../assets/images/menu_things/esspress.png'),
    category: 'coffee',
  },
  {
    id: 'cafe-latte',
    name: '카페 라떼',
    price: 3800,
    image: require('../assets/images/menu_things/cafelatte.png'),
    category: 'coffee',
  },
  {
    id: 'frappuccino',
    name: '프라푸치노',
    price: 4500,
    image: require('../assets/images/menu_things/cafelatte.png'),
    category: 'coffee',
  },
  {
    id: 'cappuccino',
    name: '카푸치노',
    price: 4000,
    image: require('../assets/images/menu_things/capuccino.png'),
    category: 'coffee',
  },
  {
    id: 'vanilla-latte',
    name: '바닐라라떼',
    price: 4200,
    image: require('../assets/images/menu_things/banila.png'),
    category: 'coffee',
  },

  // 음료(에이드)
  {
    id: 'lemon-ade',
    name: '레몬에이드',
    price: 4500,
    image: require('../assets/images/menu_things/lemon.png'),
    category: 'ade',
  },
  {
    id: 'grapefruit-ade',
    name: '자몽에이드',
    price: 4800,
    image: require('../assets/images/menu_things/jjamong.png'),
    category: 'ade',
  },
  {
    id: 'green-grape-ade',
    name: '청포도 에이드',
    price: 4800,
    image: require('../assets/images/menu_things/grape.png'),
    category: 'ade',
  },
  {
    id: 'orange-ade',
    name: '딸기 에이드',
    price: 4800,
    image: require('../assets/images/menu_things/straw.png'),
    category: 'ade',
  },

  // 차(Tea)
  {
    id: 'chamomile-tea',
    name: '캐모마일 티',
    price: 3800,
    image: require('../assets/images/menu_things/camo.png'),
    category: 'tea',
  },
  {
    id: 'earl-grey-tea',
    name: '얼그레이 티',
    price: 3800,
    image: require('../assets/images/menu_things/rgray.png'),
    category: 'tea',
  },
  {
    id: 'yuja-tea',
    name: '유자차',
    price: 3800,
    image: require('../assets/images/menu_things/uja.png'),
    category: 'tea',
  },
  {
    id: 'green-tea',
    name: '녹차',
    price: 3500,
    image: require('../assets/images/menu_things/nokcha.png'),
    category: 'tea',
  },

  // 디저트
  {
    id: 'cheesecake',
    name: '치즈케이크',
    price: 4800,
    image: require('../assets/images/menu_things/cheese.png'),
    category: 'dessert',
  },
  {
    id: 'tiramisu',
    name: '티라미수',
    price: 5200,
    image: require('../assets/images/menu_things/t_misu.png'),
    category: 'dessert',
  },
  {
    id: 'choco-brownie',
    name: '마카롱',
    price: 4500,
    image: require('../assets/images/menu_things/macarong.png'),
    category: 'dessert',
  },
  {
    id: 'croissant',
    name: '크루아상',
    price: 4200,
    image: require('../assets/images/menu_things/cruasang.png'),
    category: 'dessert',
  },
];

const sizeMap = {
  small: '작은 사이즈',
  medium: '중간 사이즈',
  large: '큰 사이즈',
};

const sizeOptions = (key) => sizeMap[key] ?? key;

const withParticle = (word, consonantParticle, vowelParticle) => {
  if (!word || typeof word !== 'string') return word;
  const lastChar = word[word.length - 1];
  const code = lastChar.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) {
    return `${word}${vowelParticle}`;
  }
  const hasJong = code % 28 !== 0;
  return `${word}${hasJong ? consonantParticle : vowelParticle}`;
};

const MenuListScreen = ({ navigation, route }) => {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const localParams = useLocalSearchParams();
  
  // 파라미터 정규화 함수
  const normalizeParam = (value) => (Array.isArray(value) ? value[0] : value);
  
  const activeRoute = useMemo(() => {
    if (route) return route;
    return { params: { ...localParams } };
  }, [route, localParams]);

  const activeNavigation = useMemo(() => {
    if (navigation) return navigation;

    return {
      navigate: (screen, params) => {
        switch (screen) {
          case 'TemperatureSelectionScreen':
            router.push({ pathname: '/TemperatureSelectionScreen', params });
            break;
          case 'SizeSelectionScreen':
            router.push({ pathname: '/SizeSelectionScreen', params });
            break;
          case 'OptionSelectionScreen':
            router.push({ pathname: '/OptionSelectionScreen', params });
            break;
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
          console.warn('돌아갈 수 있는 이전 화면이 없습니다.');
        }
      },
      canGoBack: () => router.canGoBack(),
      setParams: (params) => {
        router.setParams?.(params);
      },
    };
  }, [navigation, router]);

  const { sendMessage, appendMessage, messages, sendVoiceMessage, playTtsFromResponse, sessionId, setAddToCartCallback, setRemoveFromCartCallback } = useAIChat();
  
  // 마지막 사용자 메시지 찾기
  const lastUserMessage = useMemo(() => {
    const userMessages = messages.filter(msg => msg.author === 'user');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  }, [messages]);
  

  // 음성 녹음 관련 state
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const recordingRef = useRef(null);
  const isPressingRef = useRef(false);

  // 마이크 권한 요청
  const requestPermission = useCallback(async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('마이크 권한이 필요합니다.');
    }
  }, []);


  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // 녹음 정리
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  // 기존 복잡한 startRecording (제거됨 - startSimpleRecording 사용)
  /*
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
    
    // WebSocket 연결 확인
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      if (sessionId) {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED || wsRef.current.readyState === WebSocket.CLOSING) {
          connectWebSocket();
        }
        
        // WebSocket 연결 대기 (최대 2초)
        let waitCount = 0;
        while (waitCount < 4 && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
          await new Promise(resolve => setTimeout(resolve, 500));
          waitCount++;
          if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
            continue;
          }
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED || wsRef.current.readyState === WebSocket.CLOSING) {
            if (sessionId) {
              connectWebSocket();
            }
          }
        }
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          useWebSocketRef.current = true;
          console.log('WebSocket 연결 성공 - 실시간 스트리밍 모드');
        } else {
          useWebSocketRef.current = false;
          console.log('WebSocket 연결 대기 중...');
        }
      }
    } else {
      useWebSocketRef.current = true;
      console.log('WebSocket 재사용 - 이미 연결되어 있음');
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
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
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
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };
      
      await newRecording.prepareToRecordAsync(recordingOptions);
      await newRecording.startAsync();
      setRecording(newRecording);
      recordingRef.current = newRecording;
      setIsRecording(true);
      console.log('✅ 녹음 시작됨');

      // WebSocket 스트리밍 시작
      if (useWebSocketRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('WebSocket 스트리밍 시작 - 오디오 청크 전송 인터벌 설정');
        let lastFileSize = 0;
        let recordingStartTime = Date.now();
        let lastDurationMillis = 0;
        let hasSentAnyChunk = false;
        
        audioChunkIntervalRef.current = setInterval(async () => {
          if (!newRecording || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            return;
          }

          try {
            const recordingStatus = await newRecording.getStatusAsync();
            const timeSinceStart = Date.now() - recordingStartTime;
            const isRecentlyStarted = timeSinceStart < 1000;
            
            if (recordingStatus.durationMillis > lastDurationMillis) {
              lastDurationMillis = recordingStatus.durationMillis;
            }
            
            // 5초 무음 감지 - 자동 종료
            if (timeSinceStart > 5000 && hasSentAnyChunk) {
              console.log('⚠️ 5초 무음 감지 - 자동 종료');
              stopAutoRecording();
              return;
            }
            
            // 녹음이 끝났을 때 처리
            if (!recordingStatus.isRecording && recordingStatus.isDoneRecording && !isRecentlyStarted && recordingStatus.durationMillis > 0) {
              console.log('녹음 끝남 → 한 발화 완료, END_OF_STREAM 전송');
              
              if (audioChunkIntervalRef.current) {
                clearInterval(audioChunkIntervalRef.current);
                audioChunkIntervalRef.current = null;
              }
              
              if (hasSentAnyChunk && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                try {
                  const endMessage = JSON.stringify({ type: 'END_OF_STREAM' });
                  wsRef.current.send(endMessage);
                  console.log('✅ END_OF_STREAM 전송:', endMessage);
                } catch (error) {
                  console.error('❌ END_OF_STREAM 전송 실패:', error);
                }
              }
              
              try {
                if (newRecording) {
                  await newRecording.unloadAsync();
                }
              } catch (e) {
                // 무시
              }
              
              setRecording(null);
              recordingRef.current = null;
              setIsRecording(false);
              return;
            }
            
            const uri = newRecording.getURI();
            if (!uri) return;

            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (!fileInfo.exists || !fileInfo.size) return;

            const sizeDiff = fileInfo.size - lastFileSize;
            const shouldSend = lastFileSize === 0 || (sizeDiff > 0 && sizeDiff >= 128);
            
            if (shouldSend) {
              const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
              const audioData = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
              });

              const binaryString = atob(audioData);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                try {
                  wsRef.current.send(bytes.buffer);
                  hasSentAnyChunk = true;
                  console.log('✅ 오디오 청크 전송:', bytes.length, 'bytes');
                } catch (error) {
                  console.error('❌ WebSocket 전송 실패:', error);
                }
              }

              lastFileSize = fileInfo.size;
            }
          } catch (error) {
            console.error('❌ 오디오 청크 처리 실패:', error);
          }
        }, 200);
        
        console.log('오디오 청크 전송 인터벌 설정 완료');
      }
    } catch (error) {
      console.error('녹음을 시작할 수 없습니다:', error);
      setIsRecording(false);
      if (newRecording) {
        try {
          await newRecording.stopAndUnloadAsync();
        } catch (e) {
          // 에러 무시
        }
      }
      setRecording(null);
      recordingRef.current = null;
    }
  }, [requestPermission, isRecording, recording, connectWebSocket, sessionId]);

  // 기존 복잡한 startRecording 코드 (주석 처리 - startSimpleRecording 사용)
  /*
  const startRecording = useCallback(async () => {
    // 녹음 상태 및 객체 확인
    if (isRecording) {
      console.log('이미 녹음 중입니다');
      return;
    }
    
    // recording 객체가 있으면 정리
    if (recording || recordingRef.current) {
      console.log('기존 recording 객체 정리 중...');
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
        // 정리 후 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.log('기존 recording 객체 정리 실패 (무시):', e);
        setRecording(null);
        recordingRef.current = null;
      }
    }
    
    // WebSocket 연결 확인 및 재연결 시도
    // WebSocket이 이미 열려있으면 재사용, 아니면 새로 연결
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      if (sessionId) {
        // WebSocket이 연결되지 않았으면 연결 시도
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED || wsRef.current.readyState === WebSocket.CLOSING) {
          console.log('WebSocket이 없거나 닫혀있음 - 새로 연결 시도');
          connectWebSocket();
        } else if (wsRef.current.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket 연결 중... 대기');
        }
        
        // WebSocket 연결 대기 (최대 2초, 더 빠른 응답)
        let waitCount = 0;
        while (waitCount < 4 && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
          await new Promise(resolve => setTimeout(resolve, 500));
          waitCount++;
          
          // 연결 중이면 계속 대기
          if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
            continue;
          }
          
          // 닫혔거나 없으면 다시 연결 시도
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED || wsRef.current.readyState === WebSocket.CLOSING) {
            if (sessionId) {
              connectWebSocket();
            }
          }
        }
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          useWebSocketRef.current = true;
          console.log('WebSocket 연결 성공 - 실시간 스트리밍 모드 (재사용 또는 새 연결)');
        } else {
          // 연결 실패해도 계속 재시도 (녹음은 시작)
          useWebSocketRef.current = false;
          console.log('WebSocket 연결 대기 중... (백그라운드에서 계속 재시도)');
        }
      }
    } else {
      // WebSocket이 이미 열려있으면 재사용
      useWebSocketRef.current = true;
      console.log('WebSocket 재사용 - 이미 연결되어 있음');
    }
    
    // 이전 녹음 객체가 완전히 정리되었는지 확인
    try {
      // 기존 녹음 객체가 있다면 정리
      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording) {
            await recordingRef.current.stopAndUnloadAsync();
          } else {
            await recordingRef.current.unloadAsync();
          }
        } catch (e) {
          // 이미 언로드된 경우 무시
        }
        recordingRef.current = null;
        setRecording(null);
        setIsRecording(false);
        // 정리 후 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (e) {
      // 정리 실패해도 계속 진행
      recordingRef.current = null;
      setRecording(null);
      setIsRecording(false);
    }
    
    let newRecording = null;
    try {
      console.log('마이크 권한 요청 중...');
      await requestPermission();
      console.log('마이크 권한 획득');
      // 오디오 모드 설정 강화
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false, // 다른 오디오를 낮추지 않음
      });
      
      // 새로운 Recording 객체 생성 전에 충분히 대기
      await new Promise(resolve => setTimeout(resolve, 300));
      
      newRecording = new Audio.Recording();
      console.log('녹음 준비 중...');
      
      // 명시적인 녹음 옵션 설정 (백엔드 호환성을 위해)
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
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };
      
      await newRecording.prepareToRecordAsync(recordingOptions);
      await newRecording.startAsync();
      setRecording(newRecording);
      recordingRef.current = newRecording;
      setIsRecording(true);
      console.log('녹음 시작됨');
      
      // 녹음 상태 확인 (시작 직후, 여러 번 확인)
      let statusCheckCount = 0;
      const maxStatusChecks = 5;
      while (statusCheckCount < maxStatusChecks) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 대기
        const status = await newRecording.getStatusAsync();
        console.log(`녹음 상태 확인 (${statusCheckCount + 1}/${maxStatusChecks}):`, {
          isRecording: status.isRecording,
          durationMillis: status.durationMillis,
          canRecord: status.canRecord,
          isDoneRecording: status.isDoneRecording,
        });
        
        // 녹음이 진행 중이면 확인 종료
        if (status.isRecording && status.durationMillis > 0) {
          console.log('✅ 녹음이 정상적으로 진행 중');
          break;
        }
        
        // 녹음이 중지되었으면 재시도
        if (!status.isRecording && status.isDoneRecording) {
          console.log('⚠️ 녹음이 자동으로 중지됨 - 재시도');
          try {
            // 기존 녹음 정리
            try {
              await newRecording.unloadAsync();
            } catch (e) {
              // 무시
            }
            
            // 새 녹음 객체 생성
            const retryRecording = new Audio.Recording();
            await retryRecording.prepareToRecordAsync(recordingOptions);
            await retryRecording.startAsync();
            newRecording = retryRecording;
            recordingRef.current = retryRecording;
            setRecording(retryRecording);
            console.log('✅ 녹음 재시도 완료');
          } catch (retryError) {
            console.error('❌ 녹음 재시도 실패:', retryError);
          }
        }
        
        statusCheckCount++;
      }

      // WebSocket이 연결되어 있으면 주기적으로 오디오 데이터를 읽어서 전송
      console.log('WebSocket 스트리밍 체크:', {
        useWebSocket: useWebSocketRef.current,
        wsExists: !!wsRef.current,
        wsState: wsRef.current ? wsRef.current.readyState : 'null',
        wsOpen: wsRef.current ? wsRef.current.readyState === WebSocket.OPEN : false
      });

      if (useWebSocketRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('WebSocket 스트리밍 시작 - 오디오 청크 전송 인터벌 설정');
        let lastFileSize = 0;
        let recordingStartTime = Date.now(); // 녹음 시작 시간 기록
        let lastDurationMillis = 0; // 마지막 녹음 시간 기록
        let hasSentAnyChunk = false; // 실제로 오디오 청크를 전송했는지 추적
        audioChunkIntervalRef.current = setInterval(async () => {
          console.log('오디오 청크 체크 시작');
          
          if (!newRecording) {
            console.log('오디오 청크 체크 실패: newRecording이 없음');
            return;
          }
          
          if (!wsRef.current) {
            console.log('오디오 청크 체크 실패: wsRef.current가 없음');
            return;
          }
          
          if (wsRef.current.readyState !== WebSocket.OPEN) {
            console.log('오디오 청크 체크 실패: WebSocket 상태가 OPEN이 아님', wsRef.current.readyState);
            return;
          }

          try {
            // 녹음 상태 확인 - 녹음이 중지되었는지 체크
            let recordingStatus;
            try {
              recordingStatus = await newRecording.getStatusAsync();
            } catch (e) {
              console.log('녹음 상태 확인 실패 - 녹음 객체가 유효하지 않음:', e);
              return;
            }
            
            // 녹음 시작 후 최소 1초는 녹음이 진행 중인 것으로 간주 (너무 빨리 종료되는 것 방지)
            const timeSinceStart = Date.now() - recordingStartTime;
            const isRecentlyStarted = timeSinceStart < 1000;
            
            // 녹음이 실제로 진행되고 있는지 확인 (durationMillis가 증가하는지)
            const isRecordingProgressing = recordingStatus.durationMillis > lastDurationMillis;
            if (isRecordingProgressing) {
              lastDurationMillis = recordingStatus.durationMillis;
            }
            
            // 녹음이 자동으로 중지되었으면 즉시 재시작 (버튼이 눌려있을 때만)
            if (!recordingStatus.isRecording && recordingStatus.isDoneRecording && isPressingRef.current) {
              console.log('⚠️ 녹음이 자동으로 중지됨 (버튼은 눌려있음) - 즉시 재시작 시도');
              try {
                // 기존 녹음 정리
                try {
                  if (newRecording) {
                    await newRecording.unloadAsync();
                  }
                } catch (e) {
                  // 이미 언로드된 경우 무시
                }
                
                // 충분히 대기 (리소스 해제 시간)
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // 오디오 모드 다시 설정
                await Audio.setAudioModeAsync({
                  allowsRecordingIOS: true,
                  playsInSilentModeIOS: true,
                  staysActiveInBackground: false,
                  shouldDuckAndroid: false,
                  interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
                  interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
                });
                
                // 새 녹음 시작
                const newRec = new Audio.Recording();
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
                  web: {
                    mimeType: 'audio/webm',
                    bitsPerSecond: 128000,
                  },
                };
                
                await newRec.prepareToRecordAsync(recordingOptions);
                await new Promise(resolve => setTimeout(resolve, 100)); // 준비 후 대기
                await newRec.startAsync();
                
                // 녹음 상태 확인 (재시작 후, 여러 번 확인)
                let restartCheckCount = 0;
                while (restartCheckCount < 3) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                  const restartStatus = await newRec.getStatusAsync();
                  console.log(`재시작 후 녹음 상태 확인 (${restartCheckCount + 1}/3):`, {
                    isRecording: restartStatus.isRecording,
                    durationMillis: restartStatus.durationMillis,
                  });
                  
                  if (restartStatus.isRecording && restartStatus.durationMillis > 0) {
                    console.log('✅ 녹음 재시작 성공 - 정상 진행 중');
                    break;
                  }
                  
                  if (!restartStatus.isRecording && restartStatus.isDoneRecording) {
                    console.log('⚠️ 재시작 후에도 녹음이 중지됨 - 다시 시작');
                    try {
                      await newRec.startAsync();
                    } catch (e) {
                      console.error('재시작 실패:', e);
                    }
                  }
                  
                  restartCheckCount++;
                }
                
                newRecording = newRec;
                recordingRef.current = newRec;
                setRecording(newRec);
                setIsRecording(true);
                recordingStartTime = Date.now(); // 시작 시간 리셋
                lastDurationMillis = 0; // durationMillis 리셋
                console.log('✅ 녹음 재시작 완료');
                return; // 이번 사이클은 스킵
              } catch (restartError) {
                console.error('❌ 녹음 재시작 실패:', restartError);
                return;
              }
            }
            
            // 녹음이 진행 중이 아니지만 버튼이 눌려있고, 아직 1초가 지나지 않았으면 재시작 시도
            if (!recordingStatus.isRecording && isPressingRef.current && isRecentlyStarted) {
              console.log('⚠️ 녹음이 진행되지 않음 (버튼은 눌려있음) - 재시작 시도');
              // 위의 재시작 로직과 동일하게 처리
              // (코드 중복을 피하기 위해 함수로 분리할 수도 있지만, 일단 이렇게 처리)
            }
            
            // 녹음이 끝났을 때 한 발화 완료 처리 (WebSocket은 계속 열어둠)
            // 단, 녹음 시작 후 최소 1초가 지났을 때만 종료 처리
            // 그리고 durationMillis가 0이 아닐 때만 (실제로 녹음이 진행되었는지 확인)
            const minRecordingDuration = 1000; // 최소 1초
            const hasRecordedAudio = recordingStatus.durationMillis && recordingStatus.durationMillis > 0;
            
            if (!recordingStatus.isRecording && recordingStatus.isDoneRecording && !isRecentlyStarted && hasRecordedAudio) {
              console.log('녹음 끝남 → 한 발화 완료, END_OF_STREAM 전송 (녹음 시간:', recordingStatus.durationMillis, 'ms, 전송한 청크:', hasSentAnyChunk, ')');
              
              // 1. 청크 체크 인터벌 정리
              if (audioChunkIntervalRef.current) {
                clearInterval(audioChunkIntervalRef.current);
                audioChunkIntervalRef.current = null;
                console.log('오디오 청크 전송 인터벌 정리 완료');
              }
              
              // 2. WebSocket에 스트림 종료 메시지 전송 (한 발화 완료 알림)
              // 실제로 오디오 청크를 전송한 경우에만 END_OF_STREAM 전송
              if (hasSentAnyChunk && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                try {
                  const endMessage = JSON.stringify({ type: 'END_OF_STREAM' });
                  wsRef.current.send(endMessage);
                  console.log('✅ 한 발화 완료 - END_OF_STREAM 전송 (오디오 청크 전송됨):', endMessage);
                } catch (error) {
                  console.error('❌ END_OF_STREAM 메시지 전송 실패:', error);
                }
              } else if (!hasSentAnyChunk) {
                console.log('⚠️ 오디오 청크를 전송하지 않아 END_OF_STREAM 전송하지 않음');
              } else {
                console.log('⚠️ WebSocket이 열려있지 않아 END_OF_STREAM 전송 불가');
              }
              
              // 3. 녹음 객체 정리 (다음 녹음을 위해)
              try {
                if (newRecording) {
                  try {
                    await newRecording.unloadAsync();
                  } catch (e) {
                    // 이미 언로드된 경우 무시
                  }
                }
              } catch (e) {
                console.log('녹음 객체 정리 중 에러 (무시):', e);
              }
              
              // 4. 녹음 상태 및 객체 리셋 (다음 녹음을 위해 준비)
              setRecording(null);
              recordingRef.current = null;
              setIsRecording(false);
              
              console.log('녹음 객체 정리 완료 - 다음 녹음 준비됨');
              
              return; // 인터벌 종료
            } else if (!recordingStatus.isRecording && recordingStatus.isDoneRecording) {
              // 녹음이 시작된 지 1초 이내에 종료되었거나, 실제로 녹음이 진행되지 않은 경우
              // 3초 이상 경과했는데도 녹음이 진행되지 않으면 인터벌 정리하고 종료
              if (timeSinceStart > 3000 && !hasRecordedAudio) {
                console.log('⚠️ 녹음이 3초 이상 진행되지 않음 - 인터벌 정리 및 종료');
                if (audioChunkIntervalRef.current) {
                  clearInterval(audioChunkIntervalRef.current);
                  audioChunkIntervalRef.current = null;
                }
                try {
                  if (newRecording) {
                    try {
                      await newRecording.unloadAsync();
                    } catch (e) {
                      // 이미 언로드된 경우 무시
                    }
                  }
                } catch (e) {
                  // 무시
                }
                setRecording(null);
                recordingRef.current = null;
                setIsRecording(false);
                return;
              }
              
              // 그 외의 경우는 로그를 간소화 (너무 많은 로그 방지)
              // 첫 번째와 두 번째만 로그 출력
              if (timeSinceStart < 2000) {
                if (isRecentlyStarted) {
                  // 첫 번째만 로그
                  if (timeSinceStart < 1500) {
                    console.log('⚠️ 녹음이 너무 빨리 종료됨 (무시), 경과 시간:', timeSinceStart, 'ms');
                  }
                } else if (!hasRecordedAudio) {
                  // 첫 번째만 로그
                  if (timeSinceStart < 1500) {
                    console.log('⚠️ 녹음이 실제로 진행되지 않음 (무시), durationMillis:', recordingStatus.durationMillis);
                  }
                }
              }
              return;
            }
            
            // 녹음 중인 파일의 URI 가져오기
            const uri = newRecording.getURI();
            if (!uri) {
              console.log('오디오 청크 체크 실패: URI가 없음');
              return;
            }

            // 파일 정보 확인
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (!fileInfo.exists) {
              console.log('오디오 청크 체크 실패: 파일이 존재하지 않음');
              return;
            }
            
            if (!fileInfo.size) {
              console.log('오디오 청크 체크 실패: 파일 크기가 0');
              return;
            }

            // 파일 크기가 증가했는지 확인
            const sizeDiff = fileInfo.size - lastFileSize;
            
            // 첫 전송이거나 파일 크기가 128 bytes 이상 증가했을 때 전송
            // (실시간 스트리밍을 위해 최소 크기를 낮춤)
            const shouldSend = lastFileSize === 0 || (sizeDiff > 0 && sizeDiff >= 128);
            
            if (sizeDiff > 0) {
              console.log(`파일 크기 증가 감지: ${sizeDiff} bytes (최소 128 bytes 필요, 첫 전송: ${lastFileSize === 0})`);
            } else if (sizeDiff === 0 && lastFileSize > 0) {
              // 파일 크기가 증가하지 않는 경우 간단히 로그만 출력 (너무 많은 로그 방지)
              // console.log('파일 크기 증가 없음');
            }
            
            if (shouldSend) {
              console.log('오디오 청크 전송 시작 - 파일 읽기');
              
              // 전체 파일을 읽어서 전송 (expo-file-system은 부분 읽기 미지원)
              const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
              const audioData = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
              });

              console.log('파일 읽기 완료 - Base64 길이:', audioData.length);

              // Base64를 ArrayBuffer로 변환
              const binaryString = atob(audioData);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              console.log('ArrayBuffer 변환 완료 - 바이트 길이:', bytes.length);

              // WebSocket으로 전송
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                try {
                  console.log('WebSocket으로 오디오 청크 전송 시도:', bytes.length, 'bytes');
                  wsRef.current.send(bytes.buffer);
                  hasSentAnyChunk = true; // 오디오 청크 전송 플래그 설정
                  console.log('✅ 오디오 청크 전송 성공:', bytes.length, 'bytes (총 전송 횟수: 1회 이상)');
                } catch (error) {
                  console.error('❌ WebSocket 전송 실패:', error);
                  useWebSocketRef.current = false;
                }
              } else {
                console.log('WebSocket 상태 확인 실패:', {
                  wsExists: !!wsRef.current,
                  wsState: wsRef.current ? wsRef.current.readyState : 'null'
                });
                useWebSocketRef.current = false;
              }

              lastFileSize = fileInfo.size;
              console.log('lastFileSize 업데이트:', lastFileSize);
            } else if (lastFileSize > 0) {
              // 파일 크기 증가 조건 미충족 로그는 간소화 (너무 많은 로그 방지)
              // console.log('파일 크기 증가 조건 미충족');
            }
          } catch (error) {
            console.error('❌ 오디오 청크 처리 실패:', error);
            console.error('에러 스택:', error.stack);
            useWebSocketRef.current = false;
          }
        }, 200); // 0.2초마다 체크 (더 빠른 감지)
        
        console.log('오디오 청크 전송 인터벌 설정 완료');
      } else {
        // WebSocket 폴백 로그는 한 번만 표시
        if (!hasLoggedWebSocketFallback.current) {
          console.log('WebSocket 미사용 - HTTP POST 방식으로 음성 전송합니다.');
          hasLoggedWebSocketFallback.current = true;
        }
      }
    } catch (error) {
      console.error('녹음을 시작할 수 없습니다:', error);
      setIsRecording(false);
      if (newRecording) {
        try {
          await newRecording.stopAndUnloadAsync();
        } catch (e) {
          // 에러 무시
        }
      }
      setRecording(null);
      recordingRef.current = null;
    }
  }, [requestPermission, isRecording, recording, connectWebSocket]);
  */

  // 간단한 녹음 시작 함수
  const startSimpleRecording = useCallback(async () => {
    if (isRecording) {
      console.log('이미 녹음 중입니다');
      return;
    }
    
    // 기존 녹음 객체 완전히 정리
    if (recording || recordingRef.current) {
      try {
        const recToClean = recording || recordingRef.current;
        if (recToClean) {
          try {
            const status = await recToClean.getStatusAsync();
            if (status.isRecording) {
              await recToClean.stopAndUnloadAsync();
            } else if (status.canRecord) {
              await recToClean.unloadAsync();
            } else {
              // 이미 언로드된 경우에도 명시적으로 정리
              try {
                await recToClean.unloadAsync();
              } catch (e) {
                // 언로드 실패는 무시
              }
            }
          } catch (e) {
            // 상태 확인 실패 시에도 언로드 시도
            try {
              await recToClean.unloadAsync();
            } catch (unloadError) {
              // 언로드 실패는 무시
            }
          }
        }
        setRecording(null);
        recordingRef.current = null;
        // 녹음 객체가 완전히 정리될 때까지 충분한 시간 대기
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        console.log('기존 녹음 객체 정리 중 오류 (무시):', e);
        setRecording(null);
        recordingRef.current = null;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    try {
      console.log('마이크 권한 요청 중...');
      await requestPermission();
      console.log('마이크 권한 획득');
      
      // 오디오 모드 설정
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });
      
      // 오디오 모드 설정 후 대기
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 새로운 녹음 객체 생성
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
      
      // 녹음 준비
      await newRecording.prepareToRecordAsync(recordingOptions);
      
      // 녹음 시작
      await newRecording.startAsync();
      
      setRecording(newRecording);
      recordingRef.current = newRecording;
      setIsRecording(true);
      console.log('✅ 녹음 시작됨');
    } catch (error) {
      console.error('녹음을 시작할 수 없습니다:', error);
      setIsRecording(false);
      // 에러 발생 시 녹음 객체 정리
      if (recording || recordingRef.current) {
        try {
          const recToClean = recording || recordingRef.current;
          if (recToClean) {
            try {
              await recToClean.unloadAsync();
            } catch (e) {
              // 언로드 실패는 무시
            }
          }
        } catch (e) {
          // 정리 실패는 무시
        }
      }
      setRecording(null);
      recordingRef.current = null;
    }
  }, [requestPermission, isRecording, recording]);

  // 간단한 녹음 종료 함수
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

  // 기존 복잡한 handlePressIn 코드 (주석 처리)
  /*
  const handlePressIn = useCallback(async () => {
    console.log('마이크 버튼 눌림 - handlePressIn 호출됨');
    if (isRecording) {
      // 이미 녹음 중이면 중지
      console.log('이미 녹음 중 - 녹음 중지');
      stopRecording().then((audioUri) => {
        if (audioUri && sendVoiceMessage) {
          console.log('녹음 완료, 음성 전송:', audioUri);
          sendVoiceMessage(audioUri);
        }
      });
      return;
    }
    
    isPressingRef.current = true;
    console.log('즉시 녹음 시작');
    // 바로 녹음 시작
    await startRecording();
  }, [isRecording, stopRecording, startRecording, sendVoiceMessage]);
  */

  // 버튼 핸들러 - 버튼 뗐을 때는 아무 동작 없음 (토글 방식이므로)
  const handlePressOut = useCallback(() => {
    // 토글 방식이므로 버튼을 떼는 것은 무시
    // handlePressIn에서 이미 처리됨
  }, []);

  // 기존 복잡한 handlePressOut 코드 (주석 처리)
  /*
  const handlePressOut = useCallback(() => {
    console.log('마이크 버튼 떼기 - handlePressOut 호출됨');
    isPressingRef.current = false;
    
    // 녹음 중이면 중지
    if (isRecording) {
      console.log('녹음 중지 및 전송');
      stopRecording().then((audioUri) => {
        if (audioUri && sendVoiceMessage) {
          console.log('녹음 완료, 음성 전송:', audioUri);
          sendVoiceMessage(audioUri);
        } else {
          console.log('녹음 파일이 없거나 sendVoiceMessage가 없음');
        }
      });
    } else {
      console.log('녹음 중이 아님 - 아무 동작 없음');
    }
  }, [isRecording, stopRecording, sendVoiceMessage]);
  */
  
  const [selectedCategory, setSelectedCategory] = useState('coffee');
  const [quantities, setQuantities] = useState({});
  const [itemOptions, setItemOptions] = useState({});
  
  // 백엔드 target_element_id 기반 하이라이트 상태
  const [highlightedMenuId, setHighlightedMenuId] = useState(null);
  const [highlightedElementId, setHighlightedElementId] = useState(null);
  const [highlightedElementType, setHighlightedElementType] = useState(null); // 'menu', 'cart', 'home', 'pay', 'back', 'next'
  const highlightAnimation = useRef(new Animated.Value(0)).current;
  
  // 텍스트 크기 배율 상태
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(1.0); // 텍스트 크기 배율 (기본값 1.0 = 100%)
  
  // 장바구니 추가 처리 추적 (중복 실행 방지)
  const processedParamsRef = useRef(new Set());
  
  const [isPaymentVisible, setPaymentVisible] = useState(false);
  const [isQuickPayVisible, setQuickPayVisible] = useState(false);
  const [isCardInsertVisible, setCardInsertVisible] = useState(false);
  const [isBarcodeScanVisible, setBarcodeScanVisible] = useState(false);
  const [isProcessingVisible, setProcessingVisible] = useState(false);
  const [isCouponPayment, setIsCouponPayment] = useState(false);
  const [isOrderSummaryVisible, setOrderSummaryVisible] = useState(false);
  const [isPaymentCompleteVisible, setPaymentCompleteVisible] = useState(false);
  const [isPhoneInputVisible, setPhoneInputVisible] = useState(false);
  const [isQrSentVisible, setQrSentVisible] = useState(false);
  const [pendingPaymentAfterQr, setPendingPaymentAfterQr] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentCompleteMessage, setPaymentCompleteMessage] = useState(null);
  const [paymentCompleteResponse, setPaymentCompleteResponse] = useState(null);
  const [phoneError, setPhoneError] = useState('');

  const cartItems = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([id, quantity]) => {
          // ID 매칭 시도: 정확한 일치, 하이픈 변환, 부분 일치
          let menu = menuItems.find((item) => item.id === id);
          if (!menu) {
            // 하이픈을 제거하거나 추가해서 찾기
            const idWithoutHyphen = id.replace(/-/g, '');
            const idWithHyphen = id.includes('-') ? id : id.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
            menu = menuItems.find((item) => 
              item.id === idWithoutHyphen || 
              item.id === idWithHyphen ||
              item.id.replace(/-/g, '') === idWithoutHyphen ||
              item.id.toLowerCase() === id.toLowerCase()
            );
          }
          const options = itemOptions[id] || {};
          return {
            id,
            name: menu?.name ?? id,
            unitPrice: menu?.price ?? 0,
            quantity,
            options,
            image: menu?.image ?? null,
          };
        }),
    [quantities, itemOptions, menuItems]
  );

  const cartSummary = useMemo(() => {
    const totalQuantity = cartItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    const subtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice ?? 0) * (item.quantity ?? 0), 0);
    const vat = Math.round(subtotal * 0.1);
    return {
      totalQuantity,
      subtotal,
      vat,
      total: subtotal + vat,
    };
  }, [cartItems]);

  const renderCartSlots = () => {
    const slotCount = Math.max(cartItems.length, 4);
    return Array.from({ length: slotCount }).map((_, index) => {
      const item = cartItems[index];
      if (!item) {
        return <View key={`slot-empty-${index}`} style={styles.cartSlotEmpty} />;
      }

      return (
        <View key={item.id} style={styles.cartSlot}>
          <Pressable
            style={({ pressed }) => [
              styles.cartSlotDeleteButton,
              { transform: [{ scale: pressed ? 0.95 : 1 }] }, // 누르는 모션
            ]}
            onPress={() => {
              // 수량을 0으로 설정하여 장바구니에서 제거
              handleQuantityChange(item.id, -item.quantity, item.name);
            }}
            accessibilityLabel={`${item.name} 삭제`}
            accessibilityRole="button"
          >
            <Text style={styles.cartSlotDeleteText}>✕</Text>
          </Pressable>
          <View style={styles.cartSlotImageWrapper}>
            {item.image ? (
              <Image source={item.image} style={styles.cartSlotImage} resizeMode="cover" />
            ) : (
              <View style={styles.cartSlotImagePlaceholder} />
            )}
          </View>
          <Text style={styles.cartSlotName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.cartSlotControls}>
            <Pressable
              style={({ pressed }) => [
                styles.cartSlotButton,
                { transform: [{ scale: pressed ? 0.95 : 1 }] }, // 누르는 모션
              ]}
              onPress={() => handleQuantityChange(item.id, -1, item.name)}
            >
              <Text style={styles.cartSlotButtonText}>−</Text>
            </Pressable>
            <Text style={styles.cartSlotQuantity}>{item.quantity}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.cartSlotButton,
                { transform: [{ scale: pressed ? 0.95 : 1 }] }, // 누르는 모션
              ]}
              onPress={() => handleQuantityChange(item.id, 1, item.name)}
            >
              <Text style={styles.cartSlotButtonText}>＋</Text>
            </Pressable>
          </View>
        </View>
      );
    });
  };

  const renderItemOptionText = (item) => {
    const options = item.options || {};
    const optionTexts = [];
    if (options.temperature) {
      optionTexts.push(options.temperature === 'cold' ? '차갑게' : '따뜻하게');
    }
    if (options.size) {
      optionTexts.push(
        options.size === 'small' ? '톨' : options.size === 'medium' ? '그란데' : '벤티'
      );
    }
    if (options.bean && options.bean !== 'regular') {
      optionTexts.push(options.bean === 'decaf' ? '디카페인' : options.bean);
    }
    if (options.addOns && Array.isArray(options.addOns) && options.addOns.length > 0) {
      optionTexts.push(options.addOns.join(', '));
    }
    return optionTexts.length > 0 ? ` (${optionTexts.join(' / ')})` : '';
  };

  const layout = useMemo(() => {
    const baseWidth = Math.min(width, 960);
    const scale = baseWidth / 800;

    // 기본 스케일 요소 계산
    const containerPadding = Math.max(20, 36 * scale);
    const chipGap = Math.max(10, 14 * scale);
    const chipHorizontalPadding = Math.max(10, 18 * scale);
    const chipVerticalPadding = Math.max(6, 9 * scale);
    const chipFontSize = Math.max(16, 22 * scale);
    const listGap = Math.max(10, 14 * scale);
    const itemHeight = Math.max(90, Math.min(130, height * 0.1));
    const itemRadius = Math.max(16, 24 * scale);
    const itemPadding = Math.max(6, 10 * scale); // 패딩 더 줄임
    const titleFontSize = Math.max(26, 34 * scale);
    const actionFontSize = Math.max(18, 24 * scale);
    const imageSize = Math.max(60, Math.min(85, width * 0.11)); // 이미지 크기 더 줄임
    const sectionGap = Math.max(20, 28 * scale);
    const sectionPadding = Math.max(14, 20 * scale);
    const chatSpacing = Math.max(14, 18 * scale);
    const chatBubblePadding = Math.max(14, 18 * scale);
    const chatBubbleFontSize = Math.max(15, 18 * scale);
    const addButtonHeight = Math.max(46, 54 * scale);
    const cardRadius = Math.max(16, 24 * scale);
    const baseHeadingSize = Math.max(26, 34 * scale);
    const baseSubHeadingSize = Math.max(18, 24 * scale);
    const baseTitleFontSize = Math.max(26, 34 * scale);
    const baseActionFontSize = Math.max(18, 24 * scale);
    const baseChipFontSize = Math.max(16, 22 * scale);
    const baseChatBubbleFontSize = Math.max(15, 18 * scale);
    
    const optionGap = Math.max(12, 16 * scale);
    const buttonHeight = Math.max(46, 54 * scale);
    const cartBarHeight = Math.max(200, height * 0.22);

    // 4줄 고정 높이 계산 (대략적인 버블 높이 * 4 + 내부 여백)
    const approxBubbleLineHeight = 22; // styles.chatText의 lineHeight 기준
    const approxBubbleHeight = chatBubblePadding * 2 + approxBubbleLineHeight;
    const chatWindowHeight = Math.max(approxBubbleHeight * 4 + chatSpacing * 2, 180);

    return {
      containerPadding,
      chipGap,
      chipHorizontalPadding,
      chipVerticalPadding,
      chipFontSize: baseChipFontSize * textSizeMultiplier,
      listGap,
      itemHeight,
      itemRadius,
      itemPadding,
      titleFontSize: baseTitleFontSize * textSizeMultiplier,
      actionFontSize: baseActionFontSize * textSizeMultiplier,
      imageSize,
      sectionGap,
      sectionPadding,
      chatSpacing,
      chatBubblePadding,
      chatBubbleFontSize: baseChatBubbleFontSize * textSizeMultiplier,
      chatWindowHeight,
      addButtonHeight,
      cardRadius,
      headingSize: baseHeadingSize * textSizeMultiplier,
      subHeadingSize: baseSubHeadingSize * textSizeMultiplier,
      optionGap,
      buttonHeight,
      cartBarHeight,
    };
  }, [width, height, textSizeMultiplier]);

  const filteredMenu = menuItems.filter((item) => item.category === selectedCategory);

  // AI 응답에 따른 자동 화면 전환 처리
  // 백엔드 payload에서 장바구니에 항목 추가하는 함수 (AIChatContext에서 호출됨)
  const addCartItem = useCallback((backendPayload) => {
    console.log('addCartItem 호출됨 (MenuListScreen):', backendPayload);
    
    if (!backendPayload) {
      console.log('backendPayload가 없어서 종료');
      return;
    }

    // backendPayload에서 메뉴 정보 추출 (context 우선, 최상위 레벨 fallback)
    const context = backendPayload.context || {};
    const menuId = context.menu_id || backendPayload.menu_id || backendPayload.menuId || null;
    const menuName = context.menu_name || backendPayload.menu_name || backendPayload.menuName || null;
    const temperature = context.temp || backendPayload.temp || backendPayload.temperature || null;
    const size = context.size || backendPayload.size || null;
    const bean = context.bean || backendPayload.bean || null;
    const addOns = context.add_ons || backendPayload.add_ons || backendPayload.addOns || null;

    if (!menuId || !menuName) {
      console.log('menuId 또는 menuName이 없어서 장바구니 추가 실패:', { 
        menuId, 
        menuName,
        context: backendPayload.context,
        fullPayload: backendPayload
      });
      return;
    }

    // 메뉴 ID를 프론트엔드 형식으로 변환 (예: COFFEE_AMERICANO -> americano)
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
    }

    console.log('장바구니에 추가할 항목:', { 
      frontendMenuId, 
      menuName, 
      frontendTemperature, 
      frontendSize, 
      bean, 
      addOns 
    });

    // 현재 장바구니 상태 확인 (업데이트 전)
    setQuantities((prev) => {
      console.log('장바구니 수량 업데이트 전 상태:', JSON.stringify(prev));
      console.log('추가할 항목 ID:', frontendMenuId);
      console.log('현재 장바구니에 있는 모든 항목:', Object.keys(prev));
      
      // 깊은 복사로 기존 항목 모두 복사 (중첩 객체가 있어도 안전하게)
      const next = JSON.parse(JSON.stringify(prev));
      const current = next[frontendMenuId] ?? 0;
      next[frontendMenuId] = current + 1;
      
      console.log('장바구니 수량 업데이트 후 상태:', JSON.stringify(next));
      console.log('장바구니 수량 업데이트 (addCartItem):', { 
        itemId: frontendMenuId, 
        current, 
        newValue: next[frontendMenuId], 
        allItems: Object.keys(next),
        allQuantities: JSON.stringify(next),
        prevItemsCount: Object.keys(prev).length,
        nextItemsCount: Object.keys(next).length,
        prevItems: Object.keys(prev),
        nextItems: Object.keys(next)
      });
      
      // 기존 항목이 사라졌는지 확인
      const prevItems = Object.keys(prev);
      const nextItems = Object.keys(next);
      const missingItems = prevItems.filter(item => !nextItems.includes(item));
      if (missingItems.length > 0) {
        console.error('경고: 장바구니에서 사라진 항목이 있습니다!', missingItems);
        console.error('이전 상태:', prev);
        console.error('다음 상태:', next);
      }
      
      // 모든 기존 항목의 수량이 유지되는지 확인
      for (const itemId of prevItems) {
        if (itemId !== frontendMenuId && prev[itemId] !== next[itemId]) {
          console.error(`경고: ${itemId}의 수량이 변경되었습니다!`, {
            prev: prev[itemId],
            next: next[itemId]
          });
        }
      }
      
      return next;
    });

    // 옵션 정보 저장 (기존 옵션 유지)
    if (frontendTemperature || frontendSize || bean || addOns) {
      let parsedAddOns = [];
      if (addOns) {
        if (typeof addOns === 'string') {
          try {
            parsedAddOns = JSON.parse(addOns);
          } catch (e) {
            parsedAddOns = Array.isArray(addOns) ? addOns : [addOns];
          }
        } else if (Array.isArray(addOns)) {
          parsedAddOns = addOns;
        }
      }

      setItemOptions((prev) => {
        console.log('장바구니 옵션 업데이트 전 상태:', JSON.stringify(prev));
        
        // 깊은 복사로 기존 옵션 모두 복사 (중첩 객체가 있어도 안전하게)
        const next = JSON.parse(JSON.stringify(prev));
        next[frontendMenuId] = {
          ...(prev[frontendMenuId] || {}), // 기존 옵션 유지
          ...(frontendTemperature && { temperature: frontendTemperature }),
          ...(frontendSize && { size: frontendSize }),
          ...(bean && { bean: bean || 'regular' }),
          ...(parsedAddOns.length > 0 && { addOns: parsedAddOns }),
        };
        
        console.log('장바구니 옵션 업데이트 후 상태:', JSON.stringify(next));
        console.log('장바구니 옵션 업데이트 (addCartItem):', { 
          itemId: frontendMenuId, 
          options: next[frontendMenuId], 
          allItems: Object.keys(next),
          allOptions: JSON.stringify(next),
          prevItemsCount: Object.keys(prev).length,
          nextItemsCount: Object.keys(next).length,
          prevItems: Object.keys(prev),
          nextItems: Object.keys(next)
        });
        
        // 기존 옵션이 사라졌는지 확인
        const prevItems = Object.keys(prev);
        const nextItems = Object.keys(next);
        const missingItems = prevItems.filter(item => !nextItems.includes(item));
        if (missingItems.length > 0) {
          console.error('경고: 장바구니 옵션에서 사라진 항목이 있습니다!', missingItems);
          console.error('이전 상태:', prev);
          console.error('다음 상태:', next);
        }
        
        // 모든 기존 항목의 옵션이 유지되는지 확인
        for (const itemId of prevItems) {
          if (itemId !== frontendMenuId) {
            const prevOpts = JSON.stringify(prev[itemId]);
            const nextOpts = JSON.stringify(next[itemId]);
            if (prevOpts !== nextOpts) {
              console.error(`경고: ${itemId}의 옵션이 변경되었습니다!`, {
                prev: prev[itemId],
                next: next[itemId]
              });
            }
          }
        }
        
        return next;
      });
    }

    // 메시지 추가
    appendMessage(`${withParticle(menuName, '이', '가')} 담겼습니다.`, 'assistant');

    // 옵션 텍스트 생성
    const optionTexts = [];
    if (frontendTemperature) {
      optionTexts.push(frontendTemperature === 'cold' ? '차갑게' : '따뜻하게');
    }
    if (frontendSize) {
      optionTexts.push(sizeOptions(frontendSize));
    }
    if (bean && bean !== 'regular') {
      optionTexts.push(bean === 'decaf' ? '디카페인' : bean);
    }
    if (addOns) {
      let parsedAddOns = [];
      if (typeof addOns === 'string') {
        try {
          parsedAddOns = JSON.parse(addOns);
        } catch (e) {
          parsedAddOns = Array.isArray(addOns) ? addOns : [addOns];
        }
      } else if (Array.isArray(addOns)) {
        parsedAddOns = addOns;
      }
      if (parsedAddOns && Array.isArray(parsedAddOns) && parsedAddOns.length > 0) {
        const addOnLabels = {
          syrup: '시럽',
          whipping: '휘핑',
          shot: '샷',
        };
        const addOnTexts = parsedAddOns.map((id) => addOnLabels[id] || id).join(', ');
        optionTexts.push(`추가: ${addOnTexts}`);
      }
    }

    if (optionTexts.length > 0) {
      appendMessage(
        `${withParticle(menuName, '을', '를')} ${optionTexts.join(', ')}로 준비할게요.`,
        'assistant'
      );
    }
  }, [appendMessage]);

  // 장바구니에서 제거하는 함수
  const removeCartItem = useCallback((backendPayload) => {
    console.log('removeCartItem 호출됨 (MenuListScreen):', backendPayload);
    
    if (!backendPayload) {
      console.log('backendPayload가 없어서 종료');
      return;
    }

    // backendPayload에서 제거할 메뉴 정보 추출
    const removeMenu = backendPayload?.backend_payload?.remove_menu || null;
    const context = backendPayload?.context || {};
    
    // remove_menu 우선, 없으면 context에서 추출
    const menuId = removeMenu?.menu_id || context.menu_id || backendPayload.menu_id || null;
    const menuName = removeMenu?.menu_name || context.menu_name || backendPayload.menu_name || null;

    if (!menuId || !menuName) {
      console.log('menuId 또는 menuName이 없어서 장바구니 제거 실패:', { 
        menuId, 
        menuName,
        removeMenu,
        context: backendPayload.context,
        fullPayload: backendPayload
      });
      return;
    }

    // 메뉴 ID를 프론트엔드 형식으로 변환 (예: DESSERT_TIRAMISU -> tiramisu)
    let frontendMenuId = null;
    if (menuId) {
      const parts = menuId.split('_');
      if (parts.length > 1) {
        frontendMenuId = parts.slice(1).join('-').toLowerCase();
      } else {
        frontendMenuId = menuId.toLowerCase();
      }
    }

    console.log('장바구니에서 제거할 항목:', { 
      frontendMenuId, 
      menuName
    });

    // 메뉴 아이템 찾기
    const matchedItem = menuItems.find(item => item.id === frontendMenuId);
    
    if (matchedItem) {
      // 현재 장바구니에 있는 수량 확인 후 모두 제거
      const currentQuantity = quantities[frontendMenuId] || 0;
      if (currentQuantity > 0) {
        console.log('장바구니에서 제거할 메뉴 찾음:', matchedItem.id, matchedItem.name, '수량:', currentQuantity);
        handleQuantityChange(matchedItem.id, -currentQuantity, matchedItem.name);
      } else {
        console.log('장바구니에 해당 메뉴가 없음:', matchedItem.name);
      }
    } else {
      console.log('메뉴 아이템을 찾을 수 없음:', frontendMenuId, menuName);
    }
  }, [menuItems, quantities, handleQuantityChange]);

  // AIChatContext에 addCartItem 콜백 등록
  useEffect(() => {
    if (setAddToCartCallback) {
      setAddToCartCallback(addCartItem);
      console.log('addCartItem 콜백이 AIChatContext에 등록되었습니다.');
    }
    return () => {
      if (setAddToCartCallback) {
        setAddToCartCallback(null);
      }
    };
  }, [setAddToCartCallback, addCartItem]);

  // AIChatContext에 removeCartItem 콜백 등록
  useEffect(() => {
    if (setRemoveFromCartCallback) {
      setRemoveFromCartCallback(removeCartItem);
      console.log('removeCartItem 콜백이 AIChatContext에 등록되었습니다.');
    }
    return () => {
      if (setRemoveFromCartCallback) {
        setRemoveFromCartCallback(null);
      }
    };
  }, [setRemoveFromCartCallback, removeCartItem]);

  // 네트워크 연결 테스트 (일회성)
  useEffect(() => {
    const test = async () => {
      try {
        console.log('[TEST] /docs GET 시작');
        const res = await fetch('http://192.168.0.15:8000/docs');
        console.log('[TEST] /docs status:', res.status);
        const text = await res.text();
        console.log('[TEST] /docs body length:', text.length);
      } catch (e) {
        console.error('[TEST] /docs 호출 에러:', e);
      }
    };

    test();
  }, []);

  const handleAIResponse = useCallback((aiResponse, backendResponse) => {
    console.log('=== handleAIResponse 호출됨 ===');
    console.log('aiResponse:', aiResponse);
    console.log('backendResponse:', JSON.stringify(backendResponse, null, 2));
    console.log('backendResponse?.target_element_id:', backendResponse?.target_element_id);
    
    if (!aiResponse) {
      console.log('aiResponse가 없어서 종료');
      return;
    }

    // 백엔드 payload의 add_to_cart 필드는 AIChatContext에서 자동 처리됨

    // 마지막 사용자 메시지 확인 (하이라이트 체크 전에 필요)
    const lastUserMessage = messages.filter(msg => msg.author === 'user').pop();
    
    // "이전으로 가려면 어떻게해?" 같은 질문 감지 - 백엔드 응답과 상관없이 바로 하이라이트
    const prevQuestionUserText = lastUserMessage?.text || '';
    // 백엔드 응답의 stt_text도 확인
    const prevQuestionSttText = backendResponse?.stt_text || '';
    const previousQuestionPatterns = [
      /이전.*가려면.*어떻게/,
      /이전.*어떻게.*가/,
      /이전.*돌아가.*어떻게/,
      /이전.*어떻게.*돌아가/,
      /이전.*방법/,
      /이전.*어떡해/,
    ];
    
    const isPreviousQuestion = previousQuestionPatterns.some(pattern => 
      pattern.test(prevQuestionUserText) || pattern.test(prevQuestionSttText)
    );
    
    if (isPreviousQuestion) {
      console.log('MenuListScreen - 이전 질문 감지, 바로 이전 버튼 하이라이트');
      // 기존 애니메이션 중지 및 초기화
      highlightAnimation.stopAnimation();
      highlightAnimation.setValue(0);
      
      // 하이라이트 시작
      setHighlightedElementType('back');
      setHighlightedElementId('back_button');
      
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
            setHighlightedElementType(null);
            setHighlightedElementId(null);
            highlightAnimation.setValue(0);
          }
        });
      });
      return; // 백엔드 응답 처리 중단
    }

    // 장바구니 제거 요청인 경우 하이라이트 하지 않음
    const isRemoveFromCartRequest = 
      backendResponse?.backend_payload?.remove_from_cart ||
      (lastUserMessage?.text && /장바구니.*(?:에서|에서.*)?(?:빼|제거|삭제)/.test(lastUserMessage.text)) ||
      (aiResponse && /제거.*했습니다/.test(aiResponse));

    // 백엔드에서 target_element_id 확인 및 하이라이트 처리
    // 단, 장바구니 제거 요청인 경우는 하이라이트 하지 않음
    if (backendResponse?.target_element_id && !isRemoveFromCartRequest) {
      console.log('✅ target_element_id 발견:', backendResponse.target_element_id);
      const targetElementId = backendResponse.target_element_id;
      console.log('백엔드 target_element_id 감지:', targetElementId);
      
      // target_element_id 파싱 및 타입 분류
      let elementType = null;
      let elementId = null;
      let menuItemId = null;
      
      // 예시: "menu_item_coffee_americano" -> type: 'menu', id: 'americano'
      if (targetElementId.startsWith('menu_item_')) {
        elementType = 'menu';
        const parts = targetElementId.split('_');
        menuItemId = parts[parts.length - 1];
        elementId = menuItemId;
      }
      // 예시: "cart_area" 또는 "cart" -> type: 'cart', id: 'cart_area'
      else if (targetElementId.includes('cart')) {
        elementType = 'cart';
        elementId = 'cart_area';
      }
      // 예시: "home_button" 또는 "home" -> type: 'home', id: 'home_button'
      else if (targetElementId.includes('home')) {
        elementType = 'home';
        elementId = 'home_button';
      }
      // 예시: "pay_button" 또는 "checkout_button" 또는 "결제" -> type: 'pay', id: 'pay_button'
      else if (targetElementId.includes('pay') || targetElementId.includes('checkout') || targetElementId.includes('결제')) {
        elementType = 'pay';
        elementId = 'pay_button';
      }
      // 예시: "back_button" 또는 "previous_button" 또는 "이전" -> type: 'back', id: 'back_button'
      else if (targetElementId.includes('back') || targetElementId.includes('previous') || targetElementId.includes('이전')) {
        elementType = 'back';
        elementId = 'back_button';
      }
      // 예시: "next_button" 또는 "다음" -> type: 'next', id: 'next_button'
      else if (targetElementId.includes('next') || targetElementId.includes('다음')) {
        elementType = 'next';
        elementId = 'next_button';
      }
      // 예시: "coffee_americano" 형식 (메뉴로 추정)
      else if (targetElementId.includes('_')) {
        const parts = targetElementId.split('_');
        elementType = 'menu';
        menuItemId = parts[parts.length - 1];
        elementId = menuItemId;
      }
      // 예시: 이미 프론트엔드 형식인 경우 (americano 등)
      else {
        // 메뉴 아이템인지 확인
        const isMenuId = menuItems.some(item => item.id === targetElementId || item.id.includes(targetElementId));
        if (isMenuId) {
          elementType = 'menu';
          menuItemId = targetElementId;
          elementId = targetElementId;
        }
      }
      
      if (elementType && elementId) {
        console.log('하이라이트할 요소:', elementType, elementId);
        
        // 기존 애니메이션 중지 및 초기화
        highlightAnimation.stopAnimation();
        highlightAnimation.setValue(0);
        
        // 하이라이트 시작
        setHighlightedElementType(elementType);
        setHighlightedElementId(elementId);
        
        // 메뉴 아이템인 경우 기존 로직 사용
        if (elementType === 'menu' && menuItemId) {
          console.log('파싱된 menuItemId:', menuItemId);
          console.log('사용 가능한 메뉴 ID 목록:', menuItems.map(item => item.id));
          
          const matchedItem = menuItems.find(item => {
            // ID가 정확히 일치하는지 확인
            if (item.id === menuItemId) {
              return true;
            }
            // 하이픈이 있는 경우 처리 (americano vs americano-tea)
            const itemIdParts = item.id.split('-');
            const menuIdParts = menuItemId.split('-');
            if (itemIdParts.includes(menuItemId) || menuIdParts.includes(item.id)) {
              return true;
            }
            // 부분 일치 확인
            if (item.id.includes(menuItemId) || menuItemId.includes(item.id)) {
              return true;
            }
            return false;
          });
          
          if (matchedItem) {
            console.log('target_element_id로 메뉴 하이라이트 성공:', matchedItem.id, matchedItem.name);
            setHighlightedMenuId(matchedItem.id);
          } else {
            console.warn('target_element_id에 해당하는 메뉴를 찾을 수 없음:', menuItemId);
            console.warn('사용 가능한 메뉴:', menuItems.map(item => ({ id: item.id, name: item.name })));
          }
        }
        
        // 깜빡임 애니메이션 시작 (다음 프레임에서 시작하여 state 업데이트 보장)
        requestAnimationFrame(() => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(highlightAnimation, {
                toValue: 1,
                duration: 500, // 0.5초 동안 나타남
                useNativeDriver: false,
              }),
              Animated.timing(highlightAnimation, {
                toValue: 0,
                duration: 500, // 0.5초 동안 사라짐 (총 1초 주기)
                useNativeDriver: false,
              }),
            ]),
            { iterations: 10 } // 10번 반복 (약 10초간)
          ).start((finished) => {
            console.log('하이라이트 애니메이션 완료:', finished);
            // 애니메이션 완료 후 하이라이트 제거
            if (finished) {
              setHighlightedElementType(null);
              setHighlightedElementId(null);
              setHighlightedMenuId(null);
              highlightAnimation.setValue(0);
            }
          });
        });
      } else {
        console.warn('target_element_id를 파싱할 수 없음:', targetElementId);
      }
    } else if (backendResponse?.target_element_id && isRemoveFromCartRequest) {
      console.log('장바구니 제거 요청 - target_element_id가 있어도 하이라이트 하지 않음');
    }
    const isPreviousMessage = lastUserMessage?.text?.includes('이전') || aiResponse?.includes('이전');

    // 위치 질문 감지 (메뉴 어딨어?, 장바구니 영역 어딨어? 등)
    const locationQuestionPatterns = [
      /어딨어/,
      /어디\s*(?:있어|있나|있니|있습니다|있어요)?/,
      /위치/,
      /어디에/,
      /어디서/,
      /메뉴.*어디/,
      /장바구니.*어디/,
      /장바구니.*영역/,
      /영역.*어디/,
    ];
    const isLocationQuestion = 
      (lastUserMessage?.text && 
       locationQuestionPatterns.some(pattern => pattern.test(lastUserMessage.text))) ||
      (aiResponse && /(화면|영역|위치).*(에|에서|에.*있)/.test(aiResponse));
    
    // 디저트 메뉴에 대한 "있어?" 질문 감지 (티라미수 있어? 등)
    const dessertMenuNames = ['티라미수', '치즈케이크', '마카롱', '크루아상'];
    const lastUserMessageText = lastUserMessage?.text || '';
    // 백엔드 응답의 stt_text도 확인
    const sttText = backendResponse?.stt_text || '';
    const combinedText = `${lastUserMessageText} ${sttText}`.trim();
    
    const isDessertExistenceQuestion = dessertMenuNames.some(menuName => {
      // 메뉴 이름 뒤에 공백이나 다른 문자가 올 수 있고, "있어", "있나", "있니" 등이 오는 패턴
      const escapedMenuName = menuName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`${escapedMenuName}\\s*(?:있어|있나|있니|있습니다|있어요|있어\\?|있나\\?|있니\\?)`, 'i');
      // lastUserMessage와 stt_text 모두 확인
      const matches = pattern.test(lastUserMessageText) || pattern.test(sttText) || pattern.test(combinedText);
      if (matches) {
        console.log(`디저트 존재 질문 감지 - 메뉴: ${menuName}, lastUserMessage: "${lastUserMessageText}", stt_text: "${sttText}"`);
      }
      return matches;
    });

    // 백엔드 payload의 remove_from_cart 필드 확인 (우선 처리)
    // 이 경우 AIChatContext에서 이미 removeCartItem이 호출되므로 여기서는 화면 전환만 막음
    if (backendResponse?.backend_payload?.remove_from_cart) {
      console.log('백엔드 remove_from_cart 필드 감지 - AIChatContext에서 제거 처리됨, 화면 전환 안 함');
      // 제거 요청은 화면 전환하지 않음
      return;
    }

    // 장바구니 제거 요청 감지 (패턴 매칭 - fallback, 위에서 이미 선언된 변수 재사용)
    // isRemoveFromCartRequest는 위에서 이미 선언됨

    // 장바구니 제거 요청 처리 (fallback - backend_payload.remove_from_cart가 없는 경우)
    if (isRemoveFromCartRequest && !backendResponse?.backend_payload?.remove_from_cart) {
      console.log('장바구니 제거 요청 감지 (패턴 매칭)');
      
      // 백엔드 context에서 메뉴 정보 추출
      const context = backendResponse?.context || {};
      const menuId = context.menu_id || null;
      const menuName = context.menu_name || null;
      
      // AI 응답에서 메뉴 이름 추출 (예: "티라미수를 장바구니에서 제거했습니다.")
      const menuNameMatch = aiResponse.match(/([가-힣]+)를 장바구니에서 제거했습니다/);
      const extractedMenuName = menuNameMatch ? menuNameMatch[1] : (menuName || null);
      
      if (extractedMenuName) {
        // 메뉴 이름으로 메뉴 아이템 찾기
        const matchedItem = menuItems.find(item => {
          const normalizedItemName = item.name.replace(/\s+/g, '');
          const normalizedMatch = extractedMenuName.replace(/\s+/g, '');
          return normalizedItemName === normalizedMatch || 
                 normalizedItemName.includes(normalizedMatch) ||
                 normalizedMatch.includes(normalizedItemName);
        });
        
        if (matchedItem) {
          console.log('장바구니에서 제거할 메뉴 찾음:', matchedItem.id, matchedItem.name);
          // 현재 장바구니에 있는 수량 확인 후 모두 제거
          const currentQuantity = quantities[matchedItem.id] || 0;
          if (currentQuantity > 0) {
            handleQuantityChange(matchedItem.id, -currentQuantity, matchedItem.name);
          }
        } else if (menuId) {
          // 메뉴 ID로 직접 제거 시도
          let frontendMenuId = null;
          const parts = menuId.split('_');
          if (parts.length > 1) {
            frontendMenuId = parts.slice(1).join('-').toLowerCase();
          } else {
            frontendMenuId = menuId.toLowerCase();
          }
          
          const matchedItemById = menuItems.find(item => item.id === frontendMenuId);
          if (matchedItemById) {
            console.log('장바구니에서 제거할 메뉴 찾음 (ID):', matchedItemById.id, matchedItemById.name);
            // 현재 장바구니에 있는 수량 확인 후 모두 제거
            const currentQuantity = quantities[matchedItemById.id] || 0;
            if (currentQuantity > 0) {
              handleQuantityChange(matchedItemById.id, -currentQuantity, matchedItemById.name);
            }
          }
        }
      }
      
      // 제거 요청은 화면 전환하지 않음
      return;
    }

    // 위치 질문이면 하이라이트만 하고 화면 전환하지 않음 (step 처리 전에 체크)
    if (isLocationQuestion) {
      console.log('위치 질문 감지 - 하이라이트만 수행, 화면 전환 안 함');
      // 하이라이트는 위에서 이미 처리됨 (target_element_id 기반)
      return;
    }
    
    // 디저트 메뉴에 대한 "있어?" 질문이면 화면 전환하지 않음 (step 처리 전에 체크)
    if (isDessertExistenceQuestion) {
      console.log('디저트 메뉴 존재 질문 감지 - step 처리 전에 화면 전환 안 함');
      return;
    }

    // 백엔드 payload의 장바구니 추가 요청 확인 (화면 전환 막기)
    // 사용자 메시지에 "담아줘", "담기" 같은 키워드가 있고, backend_payload에 add_to_cart 플래그가 있거나
    // backend_payload가 있고 remove_from_cart가 아니면 장바구니 추가 요청
    // 단, 위치 질문이나 결제 요청이 아닌 경우에만
    const userMessageText = lastUserMessage?.text || '';
    const isLocationQuestionForCart = userMessageText && (
      /(?:어디|위치|어디에|어디서)/.test(userMessageText) ||
      (/(?:장바구니|장바구니가|장바구니는)/.test(userMessageText) && /(?:어디|위치|어디에|어디서)/.test(userMessageText))
    );
    const isPaymentRequestForCart = userMessageText && /(?:결제|결제하기|결제할게|결제하겠)/.test(userMessageText);
    
    const isAddToCartRequest = 
      !isLocationQuestionForCart &&
      !isPaymentRequestForCart &&
      (lastUserMessage?.text && /(?:담아|담기|담아줘|담아주세요|추가)/.test(lastUserMessage.text)) &&
      (backendResponse?.add_to_cart || 
       (backendResponse?.backend_payload && !backendResponse?.backend_payload?.remove_from_cart));
    
    if (isAddToCartRequest) {
      const payload = backendResponse?.backend_payload;
      const context = backendResponse?.context || {};
      const menuId = payload?.menu_id || context?.menu_id || null;
      const menuName = payload?.menu_name || context?.menu_name || null;
      
      // 메뉴 정보가 있으면 카테고리 확인
      if (menuId || menuName) {
        // 메뉴 ID를 프론트엔드 형식으로 변환하여 카테고리 확인
        let frontendMenuId = null;
        if (menuId) {
          const parts = menuId.split('_');
          if (parts.length > 1) {
            frontendMenuId = parts.slice(1).join('-').toLowerCase();
          } else {
            frontendMenuId = menuId.toLowerCase();
          }
        }
        
        // 메뉴 아이템 찾기
        const matchedItem = menuItems.find(item => {
          if (frontendMenuId && item.id === frontendMenuId) return true;
          if (menuName && item.name === menuName) return true;
          return false;
        });
        
        // 디저트 카테고리인 경우에만 화면 전환하지 않음 (커피는 옵션 선택 화면까지 이동)
        if (matchedItem && matchedItem.category === 'dessert') {
          console.log('디저트 메뉴 장바구니 추가 요청 감지 - AIChatContext에서 추가 처리됨, 화면 전환 안 함');
          // 디저트는 화면 전환하지 않음
          return;
        }
        // 커피, 음료, 차 등은 옵션 선택 화면까지 이동하도록 계속 진행
        console.log('커피/음료/차 메뉴 선택 - 옵션 선택 화면까지 이동');
      }
    }

    // 백엔드 응답의 context.step을 우선 확인
    let step = null;
    let context = null;
    
    if (backendResponse && backendResponse.context) {
      context = backendResponse.context;
      step = context.step;
      console.log('백엔드 context.step으로 화면 전환:', step);
      console.log('백엔드 context 전체:', JSON.stringify(context, null, 2));
      
      // 위치 질문인 경우 step이 있어도 화면 전환하지 않음 (추가 체크)
      if (isLocationQuestion) {
        console.log('위치 질문 감지 - step이 있어도 화면 전환 안 함');
        return;
      }
    } else {
      console.log('backendResponse 또는 context가 없음, 텍스트 기반 파싱 사용');
      // 백엔드 응답이 없으면 텍스트 기반 파싱 사용
    const nextStep = parseAIResponse(aiResponse);
      if (nextStep) {
        step = nextStep.step;
        console.log('텍스트 기반 파싱 결과:', step);
      }
    }

    // step이 없어도 쿠폰 결제 요청이 있으면 처리
    if (!step) {
      // 쿠폰 결제 요청 확인
      const isCouponPaymentRequest = 
        aiResponse?.includes('쿠폰') || 
        aiResponse?.includes('바코드') ||
        backendResponse?.context?.payment_method === 'coupon' ||
        lastUserMessage?.text?.includes('쿠폰') ||
        lastUserMessage?.text?.includes('쿠폰 사용');
      
      if (isCouponPaymentRequest) {
        console.log('쿠폰 결제 요청 감지 (step 없음) - coupon step으로 처리');
        // coupon step으로 처리
        step = 'coupon';
      } else {
        console.log('step이 없어서 종료');
        return;
      }
    }

    // '이전' 메시지 처리
    if (isPreviousMessage) {
      console.log('이전 메시지 감지, step:', step);
      switch (step) {
        case 'temp':
        case 'temperature':
          // temp 단계에서 이전 -> MenuListScreen으로 이동
          console.log('이전 - temp 단계에서 MenuListScreen으로 이동');
          if (activeNavigation?.navigate) {
            activeNavigation.navigate('MenuListScreen');
          }
          return;
        case 'size':
          // size 단계에서 이전 -> TemperatureSelectionScreen으로 이동
          console.log('이전 - size 단계에서 TemperatureSelectionScreen으로 이동');
          // context에서 메뉴 정보 가져오기
          const menuIdForSize = context?.menu_id || null;
          const menuNameForSize = context?.menu_name || null;
          const tempForSize = context?.temp || null;
          
          if (menuIdForSize && menuNameForSize) {
            let frontendMenuIdForSize = null;
            const parts = menuIdForSize.split('_');
            if (parts.length > 1) {
              frontendMenuIdForSize = parts.slice(1).join('-').toLowerCase();
            } else {
              frontendMenuIdForSize = menuIdForSize.toLowerCase();
            }
            
            let frontendTempForSize = tempForSize === 'ice' ? 'cold' : tempForSize;
            
            if (activeNavigation?.navigate) {
              activeNavigation.navigate('TemperatureSelectionScreen', {
                itemId: frontendMenuIdForSize,
                itemName: menuNameForSize,
                temperature: frontendTempForSize,
              });
            }
          }
          return;
        case 'options':
        case 'option':
          // options 단계에서 이전 -> SizeSelectionScreen으로 이동
          console.log('이전 - options 단계에서 SizeSelectionScreen으로 이동');
          // context에서 메뉴 정보 가져오기
          const menuIdForOptions = context?.menu_id || null;
          const menuNameForOptions = context?.menu_name || null;
          const tempForOptions = context?.temp || null;
          const sizeForOptions = context?.size || null;
          
          if (menuIdForOptions && menuNameForOptions && tempForOptions && sizeForOptions) {
            let frontendMenuIdForOptions = null;
            const parts = menuIdForOptions.split('_');
            if (parts.length > 1) {
              frontendMenuIdForOptions = parts.slice(1).join('-').toLowerCase();
            } else {
              frontendMenuIdForOptions = menuIdForOptions.toLowerCase();
            }
            
            let frontendTempForOptions = tempForOptions === 'ice' ? 'cold' : tempForOptions;
            
            const sizeMap = {
              'tall': 'small',
              'grande': 'medium',
              'venti': 'large',
              'small': 'small',
              'medium': 'medium',
              'large': 'large',
            };
            let frontendSizeForOptions = sizeMap[sizeForOptions.toLowerCase()] || sizeForOptions.toLowerCase();
            
            if (activeNavigation?.navigate) {
              activeNavigation.navigate('SizeSelectionScreen', {
                itemId: frontendMenuIdForOptions,
                itemName: menuNameForOptions,
                temperature: frontendTempForOptions,
                size: frontendSizeForOptions,
              });
            }
          }
          return;
        default:
          // 다른 step에서는 일반 처리 계속
        break;
      }
    }

    // 백엔드 context에서 메뉴 정보 추출
    const menuId = context?.menu_id || null;
    const menuName = context?.menu_name || null;
    const temperature = context?.temp || null;
    const size = context?.size || null;
    
    console.log('추출된 메뉴 정보:', { menuId, menuName, temperature, size });

    // 메뉴 ID를 프론트엔드 형식으로 변환 (예: COFFEE_AMERICANO -> americano)
    let frontendMenuId = null;
    if (menuId) {
      // COFFEE_AMERICANO -> americano 형식으로 변환
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
    }

    // step에 따라 화면 전환
    switch (step) {
      case 'temp':
      case 'temperature':
        // 위치 질문이면 화면 전환하지 않음
        if (isLocationQuestion) {
          console.log('위치 질문 감지 - temp step이어도 화면 전환 안 함');
          return;
        }
        
        // 디저트 메뉴에 대한 "있어?" 질문이면 화면 전환하지 않음
        if (isDessertExistenceQuestion) {
          console.log('디저트 메뉴 존재 질문 감지 - temp step이어도 화면 전환 안 함');
          return;
        }
        
        // 디저트 메뉴인 경우 화면 전환하지 않음
        if (frontendMenuId || menuName) {
          const matchedItem = menuItems.find(item => {
            if (frontendMenuId && item.id === frontendMenuId) return true;
            if (menuName && item.name === menuName) return true;
            return false;
          });
          
          if (matchedItem && matchedItem.category === 'dessert') {
            console.log('디저트 메뉴 - temp step이어도 화면 전환 안 함');
            return;
          }
        }
        
        // 온도 선택 화면으로 이동
        if (frontendMenuId && menuName) {
          console.log('온도 선택 화면으로 이동:', { itemId: frontendMenuId, itemName: menuName });
          activeNavigation.navigate?.('TemperatureSelectionScreen', {
            itemId: frontendMenuId,
            itemName: menuName,
          });
        } else {
          console.log('온도 선택 화면 이동 실패 - menuId 또는 menuName이 없음:', { frontendMenuId, menuName });
          // menu_id나 menu_name이 없어도 텍스트 기반으로 시도
          // 차 메뉴 이름 매칭 개선 (띄어쓰기 처리)
          const tempMatch = aiResponse.match(/(아메리카노|에스프레소|카페라떼|카푸치노|레몬에이드|자몽에이드|청포도에이드|딸기에이드|캐모마일티|캐모마일 티|얼그레이티|얼그레이 티|유자차|녹차|치즈케이크|티라미수|마카롱|크루아상)/);
          if (tempMatch) {
            const matchedName = tempMatch[1];
            // 차 메뉴 이름 정규화 (띄어쓰기 제거)
            const normalizedMatch = matchedName.replace(/\s+/g, '');
            const matchedItem = menuItems.find(item => {
              const normalizedItemName = item.name.replace(/\s+/g, '');
              return normalizedItemName.includes(normalizedMatch) || normalizedMatch.includes(normalizedItemName) ||
                     item.name.includes(matchedName) || matchedName.includes(item.name);
            });
            if (matchedItem) {
              // 디저트 메뉴인 경우 화면 전환하지 않음
              if (matchedItem.category === 'dessert') {
                console.log('디저트 메뉴 - 텍스트 기반 매칭에서도 화면 전환 안 함:', matchedItem.name);
                return;
              }
              console.log('텍스트 기반으로 온도 선택 화면으로 이동:', { itemId: matchedItem.id, itemName: matchedItem.name });
              activeNavigation.navigate?.('TemperatureSelectionScreen', {
                itemId: matchedItem.id,
                itemName: matchedItem.name,
              });
            }
          }
        }
        break;
      case 'size':
        // 사이즈 선택 화면으로 이동
        if (frontendMenuId && menuName && frontendTemperature) {
          console.log('사이즈 선택 화면으로 이동:', { 
            itemId: frontendMenuId, 
            itemName: menuName, 
            temperature: frontendTemperature 
          });
          activeNavigation.navigate?.('SizeSelectionScreen', {
            itemId: frontendMenuId,
            itemName: menuName,
            temperature: frontendTemperature,
          });
        }
        break;
      case 'options':
      case 'option':
        // 옵션 선택 화면으로 이동
        if (frontendMenuId && menuName && frontendTemperature && frontendSize) {
          console.log('옵션 선택 화면으로 이동:', { 
            itemId: frontendMenuId, 
            itemName: menuName, 
            temperature: frontendTemperature,
            size: frontendSize,
          });
          activeNavigation.navigate?.('OptionSelectionScreen', {
            itemId: frontendMenuId,
            itemName: menuName,
            temperature: frontendTemperature,
            size: frontendSize,
          });
        }
        break;
      case 'add_more':
        // 추가 주문 단계 - MenuListScreen에 머무르며 메뉴 선택 대기
        console.log('추가 주문 단계 - MenuListScreen에 머무름');
        // MenuListScreen에 머무르므로 별도 처리 불필요
        break;
      case 'review':
      case 'confirm':
        // 주문 확인 단계 - 자동으로 모달 표시하지 않음 (결제하기 버튼 클릭 시에만 표시)
        console.log('주문 확인 단계 - 자동 모달 표시 안 함 (결제하기 버튼 클릭 필요)');
        // setOrderSummaryVisible(true); // 제거: 자동으로 주문내역 확인 창을 띄우지 않음
        break;
      case 'phone':
        // 전화번호 입력 단계 - 전화번호 입력 모달 표시
        console.log('전화번호 입력 단계 - 전화번호 입력 모달 표시');
        setPhoneInputVisible(true);
        break;
      case 'payment':
        // 결제 수단 선택 단계 - 결제 수단 선택 모달 표시
        console.log('결제 수단 선택 단계 - 결제 모달 표시');
        
        // 쿠폰 결제인지 확인 (AI 응답 또는 context에서 확인)
        const isCouponPaymentRequest = 
          aiResponse?.includes('쿠폰') || 
          aiResponse?.includes('바코드') ||
          context?.payment_method === 'coupon' ||
          lastUserMessage?.text?.includes('쿠폰');
        
        if (isCouponPaymentRequest) {
          console.log('쿠폰 결제 감지 - coupon step으로 처리');
          // coupon step 로직 실행
          setPaymentVisible(false);
          setBarcodeScanVisible(true);
          setIsCouponPayment(true);
          
          // 10초 후 자동으로 결제중 화면 표시
          setTimeout(() => {
            setBarcodeScanVisible(false);
            setProcessingVisible(true);
            
            // 결제중 화면에서 2초 후 결제 완료 화면 표시 및 done step 처리
            setTimeout(() => {
              setProcessingVisible(false);
              setPaymentCompleteVisible(true);
              
              // done step으로 전환 (백엔드에 알림)
              console.log('쿠폰 결제 완료 - done step으로 전환');
              // 백엔드가 자동으로 done step을 반환하거나, 여기서 명시적으로 처리
              // done step은 별도로 처리됨
            }, 2000);
          }, 10000);
        } else {
          // 쿠폰 결제가 아닌 경우 결제 수단 선택 모달 표시
          setPaymentVisible(true);
        }
        break;
      case 'coupon':
        // 쿠폰 결제 단계 - 바코드 인식 화면 표시
        console.log('쿠폰 결제 단계 - 바코드 인식 화면 표시');
        setPaymentVisible(false);
        setBarcodeScanVisible(true);
        setIsCouponPayment(true);
        
        // 10초 후 자동으로 결제중 화면 표시
        setTimeout(() => {
          setBarcodeScanVisible(false);
          setProcessingVisible(true);
          
          // 결제중 화면에서 2초 후 결제 완료 화면 표시 및 done step 처리
          setTimeout(() => {
            setProcessingVisible(false);
            setPaymentCompleteVisible(true);
            
            // done step으로 전환 (백엔드에 알림)
            console.log('쿠폰 결제 완료 - done step으로 전환');
            // 백엔드가 자동으로 done step을 반환하거나, 여기서 명시적으로 처리
            // done step은 별도로 처리됨
          }, 2000);
        }, 10000);
        break;
      case 'card':
        // 카드 삽입 단계 - 카드 삽입 모달 표시
        console.log('카드 삽입 단계 - 카드 삽입 모달 표시');
        setCardInsertVisible(true);
        break;
      case 'done':
        // 주문 완료 단계 - 주문 완료 모달 표시
        console.log('주문 완료 단계 - 주문 완료 모달 표시');
        setPaymentCompleteVisible(true);
        break;
      case 'menu_item':
        // 메뉴 선택 단계 - 메뉴 정보가 있으면 온도 선택 화면으로 이동
        console.log('메뉴 선택 단계 - 메뉴 정보 확인:', { menuId, menuName });
        
        // 디저트 메뉴에 대한 "있어?" 질문이면 화면 전환하지 않음
        if (isDessertExistenceQuestion) {
          console.log('디저트 메뉴 존재 질문 감지 - menu_item step이어도 화면 전환 안 함');
          return;
        }
        
        // 디저트 메뉴인 경우 화면 전환하지 않음
        if (frontendMenuId || menuName) {
          const matchedItem = menuItems.find(item => {
            if (frontendMenuId && item.id === frontendMenuId) return true;
            if (menuName && item.name === menuName) return true;
            return false;
          });
          
          if (matchedItem && matchedItem.category === 'dessert') {
            console.log('디저트 메뉴 - menu_item step이어도 화면 전환 안 함');
            return;
          }
        }
        
        if (frontendMenuId && menuName) {
          // 메뉴 정보가 있으면 온도 선택 화면으로 이동
          console.log('메뉴 정보 있음 - 온도 선택 화면으로 이동:', { itemId: frontendMenuId, itemName: menuName });
          activeNavigation.navigate?.('TemperatureSelectionScreen', {
            itemId: frontendMenuId,
            itemName: menuName,
          });
        } else {
          // 메뉴 정보가 없으면 MenuListScreen에 머무름
          console.log('메뉴 선택 단계 - 메뉴 정보 없음, MenuListScreen에 머무름');
        }
        break;
      case 'dine_type':
        // 매장/포장 선택 단계 - EatOrTakeScreen으로 이동 (이미 EatOrTakeScreen에서 처리됨)
        console.log('매장/포장 선택 단계 - EatOrTakeScreen에서 처리');
        // EatOrTakeScreen에서 이미 처리되므로 별도 처리 불필요
        break;
      case 'greeting':
        // 인사 단계 - StartVoiceOrderScreen 또는 MenuListScreen에 머무름
        console.log('인사 단계 - 현재 화면에 머무름');
        // 현재 화면에 머무르므로 별도 처리 불필요
        break;
      default:
        // 기타 단계는 텍스트 기반 파싱 결과 사용
        console.log('알 수 없는 step, 텍스트 기반 파싱 시도:', step);
        const nextStep = parseAIResponse(aiResponse);
        if (nextStep) {
          switch (nextStep.step) {
      case 'cart':
              if (cartItems.length === 0) {
                appendMessage('장바구니가 비어 있어요. 메뉴를 담아주세요.', 'assistant');
        }
        break;
      case 'payment':
        setPaymentVisible(true);
        break;
    }
        }
        break;
    }
  }, [activeNavigation, menuItems, appendMessage, setOrderSummaryVisible, setPaymentVisible, setPhoneInputVisible, setCardInsertVisible, setPaymentCompleteVisible, cartItems, messages, quantities, handleQuantityChange, removeCartItem]);

  const handleQuantityChange = useCallback((itemId, delta, itemName) => {
    setQuantities((prev) => {
      const next = { ...prev };
      const current = next[itemId] ?? 0;
      const newValue = Math.max(0, current + delta);
      if (newValue === 0) {
        delete next[itemId];
        // 수량이 0이 되면 옵션 정보도 삭제
        setItemOptions((prevOpts) => {
          const nextOpts = { ...prevOpts };
          delete nextOpts[itemId];
          return nextOpts;
        });
      } else {
        next[itemId] = newValue;
      }
      return next;
    });

    if (delta > 0 && itemName && itemId) {
      // 메뉴 아이템 찾기
      const menuItem = menuItems.find(item => item.id === itemId);
      
      // 디저트 메뉴는 백엔드로 메시지 전송하지 않고 바로 장바구니에만 추가
      if (menuItem && menuItem.category === 'dessert') {
        console.log('디저트 메뉴 - 백엔드 전송 없이 장바구니에만 추가:', { itemId, itemName });
        return; // 장바구니 추가는 이미 위에서 처리됨
      }
      
      // 사용자가 담기 버튼을 눌렀을 때, 백엔드에 메시지 전송
      // 음성 인식과 동일하게 메뉴 이름만 전송 (백엔드가 인식하기 쉬운 형식)
      // 예: "아메리카노" (음성으로 말할 때와 동일)
      const userMessage = itemName;
      
      console.log('버튼 클릭 - 백엔드에 전송할 메시지:', { userMessage, itemId, itemName });
      
      // 백엔드 응답을 기다리는 콜백 함수
      const handleButtonClickResponse = (aiResponse, backendResponse) => {
        console.log('버튼 클릭 - 백엔드 응답:', { aiResponse, backendResponse });
        console.log('버튼 클릭 - 전송한 메시지:', userMessage);
        console.log('버튼 클릭 - 프론트엔드 메뉴 정보:', { itemId, itemName });
        
        // 백엔드 응답의 context에서 메뉴 정보 확인
        let menuId = null;
        let menuName = null;
        let step = null;
        
        if (backendResponse && backendResponse.context) {
          const context = backendResponse.context;
          step = context.step;
          menuId = context.menu_id;
          menuName = context.menu_name;
          console.log('버튼 클릭 - 백엔드 메뉴 정보:', { step, menuId, menuName });
          console.log('버튼 클릭 - 백엔드 context 전체:', JSON.stringify(context, null, 2));
          
          // 백엔드가 메뉴를 인식하지 못한 경우 디버깅 정보 출력
          if (!menuId && !menuName) {
            console.warn('⚠️ 백엔드가 메뉴를 인식하지 못했습니다!');
            console.warn('전송한 메시지:', userMessage);
            console.warn('프론트엔드 메뉴 이름:', itemName);
            console.warn('백엔드 응답 텍스트:', aiResponse);
            console.warn('백엔드 step:', step);
          }
        } else {
          console.warn('⚠️ 백엔드 응답에 context가 없습니다!');
        }
        
        // 백엔드가 메뉴를 인식했고 (menu_id 또는 menu_name이 있음) step이 temp/temperature이면 화면 전환
        if ((menuId || menuName) && (step === 'temp' || step === 'temperature')) {
          // 디저트 메뉴인 경우 화면 전환하지 않음
          const matchedItem = menuItems.find(item => {
            if (menuId) {
              const parts = menuId.split('_');
              if (parts.length > 1) {
                const backendMenuId = parts.slice(1).join('-').toLowerCase();
                if (item.id === backendMenuId) return true;
              }
            }
            if (menuName && item.name === menuName) return true;
            if (itemName && item.name === itemName) return true;
            return false;
          });
          
          if (matchedItem && matchedItem.category === 'dessert') {
            console.log('버튼 클릭 - 디저트 메뉴 감지, 화면 전환 안 함:', matchedItem.name);
            return;
          }
          
          // 메뉴 ID를 프론트엔드 형식으로 변환
          let frontendMenuId = itemId; // 기본값은 프론트엔드 itemId
          if (menuId) {
            const parts = menuId.split('_');
            if (parts.length > 1) {
              frontendMenuId = parts.slice(1).join('-').toLowerCase();
            } else {
              frontendMenuId = menuId.toLowerCase();
            }
          }
          
          const finalMenuName = menuName || itemName;
          
          console.log('버튼 클릭 - 백엔드 메뉴 인식 성공, 온도 선택 화면으로 이동:', { 
            itemId: frontendMenuId, 
            itemName: finalMenuName 
          });
          
          if (activeNavigation?.navigate) {
            activeNavigation.navigate('TemperatureSelectionScreen', {
              itemId: frontendMenuId,
              itemName: finalMenuName,
            });
          }
          // 메뉴 인식 성공 시 handleAIResponse 호출하지 않음 (이미 화면 전환 완료)
          return;
        } else if (!menuId && !menuName) {
          // 백엔드가 메뉴를 인식하지 못한 경우, 프론트엔드 정보로 화면 전환
          console.log('버튼 클릭 - 백엔드 메뉴 인식 실패, 프론트엔드 정보로 화면 전환:', { itemId, itemName });
          if (activeNavigation?.navigate) {
            activeNavigation.navigate('TemperatureSelectionScreen', {
              itemId: itemId,
              itemName: itemName,
            });
          }
          // 메뉴 인식 실패 시에도 handleAIResponse 호출하지 않음 (이미 화면 전환 완료)
          return;
        }
        
        // step이 temp/temperature가 아니거나 다른 경우에만 handleAIResponse 호출
        handleAIResponse(aiResponse, backendResponse);
      };
      
      // 백엔드에 메시지 전송하고 응답을 기다림
      sendMessage(userMessage, handleButtonClickResponse).catch((error) => {
        console.error('메뉴 주문 메시지 전송 실패:', error);
        // 에러 발생 시 프론트엔드 정보로 화면 전환
        if (activeNavigation?.navigate) {
          activeNavigation.navigate('TemperatureSelectionScreen', {
            itemId: itemId,
            itemName: itemName,
          });
        }
      });
    }
  }, [sendMessage, handleAIResponse, activeNavigation]);

  useEffect(() => {
    const params = { ...(activeRoute?.params ?? {}), ...localParams };
    // 빈 문자열이 아닌지 확인
    const addToCart = normalizeParam(params.addToCart);
    const itemId = normalizeParam(params.itemId);
    const itemName = normalizeParam(params.itemName);
    const temperature = normalizeParam(params.temperature);
    const size = normalizeParam(params.size);
    const bean = normalizeParam(params.bean);
    const addOns = normalizeParam(params.addOns);
    const timestamp = normalizeParam(params._timestamp);
    
    const hasRequiredParams = 
      params.temperature && params.temperature !== '' &&
      params.size && params.size !== '' &&
      params.itemId && params.itemId !== '' &&
      params.itemName && params.itemName !== '';
    
    // addToCart 파라미터가 있으면 temperature와 size가 없어도 장바구니에 추가
    if (addToCart === 'true' || addToCart === true) {
      if (itemId && itemName) {
        // 중복 실행 방지: 이미 처리한 파라미터 조합인지 확인
        const paramKey = `${itemId || ''}-${itemName || ''}-${temperature || ''}-${size || ''}-${bean || ''}-${JSON.stringify(addOns || [])}-${timestamp || ''}`;
        if (processedParamsRef.current.has(paramKey)) {
          console.log('이미 처리된 파라미터 (addToCart), 무시:', paramKey);
          return;
        }
        
        // 처리된 파라미터로 표시
        processedParamsRef.current.add(paramKey);
        
        // 프론트엔드 itemId를 백엔드 형식으로 변환
        // 예: 'americano' -> 'COFFEE_AMERICANO', 'green-tea' -> 'TEA_GREEN'
        const menuItem = menuItems.find(item => item.id === itemId);
        let backendMenuId = null;
        if (menuItem) {
          const categoryMap = {
            'coffee': 'COFFEE',
            'ade': 'ADE',
            'tea': 'TEA',
            'dessert': 'DESSERT',
          };
          const categoryPrefix = categoryMap[menuItem.category] || 'COFFEE';
          // itemId를 대문자로 변환하고 하이픈을 언더스코어로 변경
          const itemIdUpper = itemId.toUpperCase().replace(/-/g, '_');
          backendMenuId = `${categoryPrefix}_${itemIdUpper}`;
        } else {
          // menuItem을 찾지 못한 경우 itemId를 그대로 사용 (이미 백엔드 형식일 수도 있음)
          backendMenuId = itemId.toUpperCase().replace(/-/g, '_');
        }
        
        // addCartItem 호출 (모든 장바구니 로직을 addCartItem에 통합)
        addCartItem({
          menu_id: backendMenuId,
          menu_name: itemName,
          temp: temperature,
          size: size,
          bean: bean,
          add_ons: addOns,
        });
        
        // 파라미터 제거 (타임스탬프 추가하여 다음번에 다시 처리되도록)
        const finalParamKey = paramKey; // 클로저를 위해 변수 저장
        setTimeout(() => {
          router.setParams?.({
            addToCart: undefined,
            temperature: undefined,
            itemId: undefined,
            itemName: undefined,
            size: undefined,
            bean: undefined,
            addOns: undefined,
            previousMessages: undefined,
            _timestamp: undefined,
          });
          // 처리된 파라미터 추적에서 제거 (5초 후)
          setTimeout(() => {
            processedParamsRef.current.delete(finalParamKey);
          }, 5000);
        }, 100);
        
        return;
      }
    }
    
    if (hasRequiredParams && itemId && itemName && temperature && size) {
      // 중복 실행 방지: 이미 처리한 파라미터 조합인지 확인
      const paramKey = `${itemId || ''}-${itemName || ''}-${temperature || ''}-${size || ''}-${bean || ''}-${JSON.stringify(addOns || [])}-${timestamp || ''}`;
      if (processedParamsRef.current.has(paramKey)) {
        console.log('이미 처리된 파라미터 (hasRequiredParams), 무시:', paramKey);
        return;
      }
      
      // 처리된 파라미터로 표시
      processedParamsRef.current.add(paramKey);
      
      // 프론트엔드 itemId를 백엔드 형식으로 변환
      // 예: 'americano' -> 'COFFEE_AMERICANO', 'green-tea' -> 'TEA_GREEN'
      const menuItem = menuItems.find(item => item.id === itemId);
      let backendMenuId = null;
      if (menuItem) {
        const categoryMap = {
          'coffee': 'COFFEE',
          'ade': 'ADE',
          'tea': 'TEA',
          'dessert': 'DESSERT',
        };
        const categoryPrefix = categoryMap[menuItem.category] || 'COFFEE';
        // itemId를 대문자로 변환하고 하이픈을 언더스코어로 변경
        const itemIdUpper = itemId.toUpperCase().replace(/-/g, '_');
        backendMenuId = `${categoryPrefix}_${itemIdUpper}`;
      } else {
        // menuItem을 찾지 못한 경우 itemId를 그대로 사용 (이미 백엔드 형식일 수도 있음)
        backendMenuId = itemId.toUpperCase().replace(/-/g, '_');
      }
      
      // addCartItem 호출 (모든 장바구니 로직을 addCartItem에 통합)
      addCartItem({
        menu_id: backendMenuId,
        menu_name: itemName,
        temp: temperature,
        size: size,
        bean: bean,
        add_ons: addOns,
      });
      
      // 파라미터 제거 (다음번에 같은 파라미터가 들어와도 처리되도록)
      const finalParamKeyForHasRequired = paramKey; // 클로저를 위해 변수 저장
      setTimeout(() => {
        router.setParams?.({ 
          temperature: undefined, 
          itemId: undefined, 
          itemName: undefined, 
          size: undefined,
          bean: undefined,
          addOns: undefined,
          previousMessages: undefined,
          _timestamp: undefined,
        });
        // 처리된 파라미터 추적에서 제거 (5초 후)
        setTimeout(() => {
          processedParamsRef.current.delete(finalParamKeyForHasRequired);
        }, 5000);
      }, 100);
    }
  }, [
    activeRoute?.params?.temperature, 
    activeRoute?.params?.itemId, 
    activeRoute?.params?.itemName, 
    activeRoute?.params?.size, 
    activeRoute?.params?.bean, 
    activeRoute?.params?.addOns, 
    activeRoute?.params?.addToCart,
    activeRoute?.params?._timestamp,
    localParams?.temperature,
    localParams?.itemId,
    localParams?.itemName,
    localParams?.size,
    localParams?.bean,
    localParams?.addOns,
    localParams?.addToCart,
    localParams?._timestamp,
    router,
    addCartItem,
    menuItems,
  ]);

  const handleAddPress = async (item) => {
    // 디저트 메뉴는 백엔드 전송 없이 바로 장바구니에만 추가
    if (item.category === 'dessert') {
      console.log('디저트 메뉴 담기 버튼 클릭 - 백엔드 전송 없이 장바구니에만 추가:', { itemId: item.id, itemName: item.name });
      handleQuantityChange(item.id, 1, item.name);
      return;
    }
    
    const userMessage = `${withParticle(item.name, '을', '를')} 장바구니에 담아줘.`;
    
    // AI API 호출 및 응답 처리
    await sendMessage(userMessage, handleAIResponse);

    // AI 응답 후 메뉴 처리
    if (item.category === 'coffee') {
      // 커피 메뉴는 옵션 선택 화면으로 이동
      activeNavigation.navigate?.('TemperatureSelectionScreen', {
        itemId: item.id,
        itemName: item.name,
      });
    } else {
      // 다른 메뉴는 바로 장바구니에 추가
      handleQuantityChange(item.id, 1, item.name);
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      appendMessage('장바구니가 비어 있어요. 메뉴를 담아주세요.', 'assistant');
      return;
    }
    
    // 백엔드에 '결제하기' 텍스트 전송
    // 백엔드가 "주문내역을 확인하고 결제를 진행해주세요." 반환
    try {
      await sendMessage('결제하기');
    } catch (error) {
      console.error('결제하기 메시지 전송 실패:', error);
    }
    
    // 주문 내역 확인 모달 표시
    setOrderSummaryVisible(true);
  };

  const handleOrderSummaryClose = async () => {
    // 백엔드에 '이전' 메시지 전송
    // 백엔드가 "주문을 계속 진행해주세요." 응답 반환하고 step을 "menu_item"로 변경
    try {
      await sendMessage('이전');
    } catch (error) {
      console.error('이전 메시지 전송 실패:', error);
    }
    
    setOrderSummaryVisible(false);
  };

  const handleOrderSummaryProceed = async () => {
    // 백엔드에 '결제하기' 텍스트 전송
    // 백엔드 코드에 따르면 "결제하기", "결제", "결제할게요", "결제하겠어요", "결제하겠습니다" 중 하나를 인식
    try {
      await sendMessage('결제하기');
    } catch (error) {
      console.error('결제하기 메시지 전송 실패:', error);
    }
    
    setOrderSummaryVisible(false);
    // 전화번호 입력 모달 제거 - 바로 결제 수단 선택 모달로 이동
    setPaymentVisible(true);
  };

  const handlePaymentClose = () => {
    setPaymentVisible(false);
  };

  const handlePaymentSelect = async (method) => {
    // 백엔드에 결제 수단 메시지 전송
    let paymentMessage = '';
    if (method === 'card') {
      paymentMessage = '카드결제';
    } else if (method === 'mobile') {
      paymentMessage = '간편결제';
    } else if (method === 'coupon') {
      paymentMessage = '쿠폰 결제';
    } else {
      paymentMessage = '결제';
    }

    try {
      await sendMessage(paymentMessage);
    } catch (error) {
      console.error('결제 수단 메시지 전송 실패:', error);
    }

    // 백엔드 응답에 따라 처리
    // 백엔드가 step을 "card"로 설정하면 카드 삽입 모달 표시
    // 백엔드가 step을 "done"으로 설정하면 결제 완료 모달 표시
    if (method === 'card') {
      // 백엔드가 "카드를 삽입해주세요." 응답을 반환하고 TTS 재생
      // 카드 삽입 모달 표시
      setPaymentVisible(false);
      setCardInsertVisible(true);
      return;
    }

    if (method === 'mobile') {
      // 백엔드가 "간편결제로 결제 도와드릴게요. 주문이 완료되었습니다. 감사합니다." 응답 반환
      // 간편결제 서비스 선택 모달 표시 (또는 바로 결제 완료 모달)
      setPaymentVisible(false);
      setQuickPayVisible(true);
      return;
    }

    if (method === 'coupon') {
      // 바코드 인식 팝업 표시
      setPaymentVisible(false);
      setBarcodeScanVisible(true);
      setIsCouponPayment(true); // 쿠폰 결제 플래그 설정
      
      // 10초 후 자동으로 결제중 화면 표시
      setTimeout(() => {
        setBarcodeScanVisible(false);
        setProcessingVisible(true);
        
        // 결제중 화면에서 2초 후 결제 완료 화면 표시
        setTimeout(() => {
          setProcessingVisible(false);
          setPaymentCompleteVisible(true);
        }, 2000);
      }, 10000);
      return;
    }

    const methodLabel =
      {
        cash: '현금 결제',
      }[method] ?? method;

    appendMessage(`${methodLabel}를 진행할게요. 카운터를 확인해 주세요.`, 'assistant');
    setPaymentVisible(false);
  };

  const handleQuickPayClose = () => {
    setQuickPayVisible(false);
  };

  const handleQuickPaySelect = async (service) => {
    // 간편결제 서비스 선택 시 백엔드에 메시지 전송
    let serviceMessage = '';
    if (service === 'kakao') {
      serviceMessage = '카카오페이';
    } else if (service === 'naver') {
      serviceMessage = '네이버페이';
    } else if (service === 'toss') {
      serviceMessage = '토스페이';
    } else {
      serviceMessage = '간편결제';
    }

    try {
      await sendMessage(serviceMessage);
    } catch (error) {
      console.error('간편결제 서비스 메시지 전송 실패:', error);
    }

    // 백엔드가 "간편결제로 결제 도와드릴게요. 주문이 완료되었습니다. 감사합니다." 응답 반환
    // 결제 완료 모달 표시
    setQuickPayVisible(false);
    setPaymentCompleteVisible(true);
  };

  const handleCardInsertClose = () => {
    setCardInsertVisible(false);
  };

  // 카드 삽입 완료 확인 (백엔드 연동)
  const handleCardInsertComplete = useCallback(async () => {
    // 백엔드에 카드 삽입 완료 메시지 전송
    // 백엔드가 "결제가 완료되었습니다. 카드를 제거해주세요." 응답 반환
    try {
      // sendText를 직접 호출하여 TTS 재생 없이 응답만 받기
      if (!sessionId) {
        console.error('세션 ID가 없습니다.');
        return;
      }
      
      const response = await sendText(sessionId, '카드 넣었어요');
      
      // 백엔드 응답 저장 (결제 완료 모달에 표시 및 TTS 재생하기 위해)
      if (response) {
        const aiResponse = response.response_text || response.response || response.message || '결제가 완료되었습니다.';
        setPaymentCompleteMessage(aiResponse);
        setPaymentCompleteResponse(response); // 전체 응답 저장 (TTS 재생용)
        
        // 메시지만 추가 (TTS는 재생하지 않음)
        appendMessage('카드 넣었어요', 'user');
        appendMessage(aiResponse, 'assistant');
      }
    } catch (error) {
      console.error('카드 삽입 완료 메시지 전송 실패:', error);
    }
    
    // 카드 삽입 모달 닫고 처리 모달 표시
    setCardInsertVisible(false);
    setProcessingVisible(true);
  }, [sessionId, appendMessage]);

  useEffect(() => {
    let timer;
    if (isCardInsertVisible) {
      // 자동으로 3초 후 카드 삽입 완료 처리 (또는 사용자가 버튼 클릭)
      timer = setTimeout(() => {
        handleCardInsertComplete();
      }, 3000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isCardInsertVisible, handleCardInsertComplete]);

  useEffect(() => {
    let timer;
    if (isProcessingVisible) {
      timer = setTimeout(() => {
        setProcessingVisible(false);
        setPaymentCompleteVisible(true);
        // 백엔드 응답 메시지가 있으면 사용, 없으면 기본 메시지 사용
        if (!paymentCompleteMessage) {
        appendMessage('결제가 완료되었어요. 주문 번호 104번을 확인해 주세요.', 'assistant');
        }
      }, 2000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isProcessingVisible, paymentCompleteMessage, appendMessage]);

  // 결제 완료 모달이 열릴 때 TTS 재생 및 쿠폰 결제 시 step을 done으로 설정
  useEffect(() => {
    if (isPaymentCompleteVisible) {
      // 쿠폰 결제인 경우 백엔드에 step을 'done'으로 설정하는 메시지 전송
      if (isCouponPayment) {
        sendMessage('결제 완료').catch((error) => {
          console.error('결제 완료 메시지 전송 실패:', error);
        });
        setIsCouponPayment(false); // 플래그 리셋
      }
      
      // 백엔드 응답이 있으면 TTS 재생
      if (paymentCompleteResponse) {
        playTtsFromResponse(paymentCompleteResponse);
      }
    }
  }, [isPaymentCompleteVisible, isCouponPayment, paymentCompleteResponse, playTtsFromResponse, sendMessage]);

  const handleGenerateQrCode = () => {
    setPaymentCompleteVisible(false);
    setPhoneInputVisible(true);
    setPhoneError('');
    appendMessage('QR코드를 생성하고 있어요. 잠시만 기다려 주세요.', 'assistant');
  };

  const handlePaymentCompleteClose = () => {
    setPaymentCompleteVisible(false);
  };

  const handlePrintReceipt = () => {
    console.log('영수증 출력 버튼 클릭');
    
    // 백엔드에 "영수증 출력" 메시지 전송
    sendMessage('영수증 출력', (aiResponse, backendResponse) => {
      console.log('영수증 출력 - 백엔드 응답:', { aiResponse, backendResponse });
      
      // 백엔드 응답 처리
      if (aiResponse) {
        appendMessage(aiResponse, 'assistant');
      }
      
      // 주문완료 모달 닫기
      setPaymentCompleteVisible(false);
      setPaymentCompleteMessage(null);
      setPaymentCompleteResponse(null);
      
      // greeting step으로 시작하도록 StartVoiceOrderScreen으로 이동
      // 백엔드가 greeting step을 반환하면 handleAIResponse에서 자동 처리됨
      if (backendResponse?.context?.step === 'greeting') {
        router.replace('/');
      } else {
        router.replace('/');
      }
    }).catch((error) => {
      console.error('영수증 출력 메시지 전송 실패:', error);
      appendMessage('영수증을 출력하고 있어요. 잠시만 기다려 주세요.', 'assistant');
      setPaymentCompleteVisible(false);
      setPaymentCompleteMessage(null);
      setPaymentCompleteResponse(null);
      router.replace('/');
    });
  };

  const handlePrintOrderNumber = () => {
    console.log('주문번호 출력 버튼 클릭');
    
    // 백엔드에 "주문번호 출력" 메시지 전송
    sendMessage('주문번호 출력', (aiResponse, backendResponse) => {
      console.log('주문번호 출력 - 백엔드 응답:', { aiResponse, backendResponse });
      
      // 백엔드 응답 처리
      if (aiResponse) {
        appendMessage(aiResponse, 'assistant');
      }
      
      // 주문완료 모달 닫기
      setPaymentCompleteVisible(false);
      setPaymentCompleteMessage(null);
      setPaymentCompleteResponse(null);
      
      // greeting step으로 시작하도록 StartVoiceOrderScreen으로 이동
      // 백엔드가 greeting step을 반환하면 handleAIResponse에서 자동 처리됨
      if (backendResponse?.context?.step === 'greeting') {
        router.replace('/');
      } else {
        router.replace('/');
      }
    }).catch((error) => {
      console.error('주문번호 출력 메시지 전송 실패:', error);
      appendMessage('주문번호를 출력하고 있어요. 잠시만 기다려 주세요.', 'assistant');
      setPaymentCompleteVisible(false);
      setPaymentCompleteMessage(null);
      setPaymentCompleteResponse(null);
      router.replace('/');
    });
  };

  const handlePhoneInputClose = () => {
    const shouldOpenPayment = pendingPaymentAfterQr;
    setPhoneInputVisible(false);
    setPhoneNumber('');
    setPhoneError('');
    if (shouldOpenPayment) {
      setPaymentVisible(true);
      setPendingPaymentAfterQr(false);
    }
  };

  const handleQrSentClose = () => {
    const shouldOpenPayment = pendingPaymentAfterQr;
    setQrSentVisible(false);
    if (shouldOpenPayment) {
      setPaymentVisible(true);
      setPendingPaymentAfterQr(false);
    }
  };

  const handlePhoneSend = () => {
    const trimmed = phoneNumber.trim();
    const onlyDigits = trimmed.replace(/[^0-9]/g, '');
    if (onlyDigits.length < 10) {
      setPhoneError('유효한 전화번호를 입력해 주세요.');
      return;
    }
    appendMessage(`주문 번호 104번의 QR코드를 ${onlyDigits} 번호로 전송했어요.`, 'assistant');
    setPhoneInputVisible(false);
    setPhoneNumber('');
    setPhoneError('');
    setQrSentVisible(true);
  };

  const handleKeypadPress = (value) => {
    console.log('키패드 버튼 눌림:', value);
    if (value === 'CLEAR') {
      setPhoneNumber('');
      setPhoneError('');
      return;
    }
    if (value === 'BACK') {
      setPhoneNumber((prev) => {
        const next = prev.slice(0, -1);
        if (phoneError && next.length >= 10) {
          setPhoneError('');
        }
        return next;
      });
      return;
    }
    if (value === '010') {
      setPhoneNumber((prev) => {
        const next = `${prev}010`;
        if (next.length > 11) {
          return prev;
        }
        if (phoneError && next.length >= 10) {
          setPhoneError('');
        }
        return next;
      });
      return;
    }
    if (!/^[0-9]$/.test(value)) {
      return;
    }
    setPhoneNumber((prev) => {
      if (prev.length >= 11) {
        return prev;
      }
      const next = `${prev}${value}`;
      if (phoneError && next.length >= 10) {
        setPhoneError('');
      }
      return next;
    });
  };

  const formatCurrency = (value) => `${Math.max(0, value).toLocaleString()}원`;

  // 깜빡임 효과를 위한 테두리 색상 (전역)
  const animatedBorderColor = highlightAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ff0000', '#ff3333'], // 더 밝은 빨간색 깜빡임
  });
  

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.scrollContainer,
            {
              paddingHorizontal: layout.containerPadding,
              paddingTop: layout.containerPadding * 0.3,
              paddingBottom: layout.cartBarHeight + layout.containerPadding * 2,
            },
          ]}
        >
          <View style={styles.wrapper}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <AssistantChatBanner
                  layout={layout}
                  assistantText="원하시는 메뉴를 말씀해주세요"
                  assistantFontSize={layout.subHeadingSize}
                />
              </View>
              <Animated.View
                style={{
                  borderWidth: highlightedElementType === 'home' ? 3 : 0,
                  borderColor: highlightedElementType === 'home' ? animatedBorderColor : 'transparent',
                  borderRadius: layout.buttonHeight * 1.3 / 2,
                }}
              >
                <Pressable
                  style={[
                    styles.homeButton,
                    {
                      height: layout.buttonHeight * 1.3,
                      width: layout.buttonHeight * 1.3,
                    },
                  ]}
                  android_ripple={{ color: '#bae6fd' }}
                  onPress={() => {
                    appendMessage('처음 화면으로 돌아갈게요.', 'assistant');
                    router.replace('/');
                  }}
                  testID="menu_home_button"
                >
                  <Text style={styles.homeButtonIcon}>⌂</Text>
                </Pressable>
              </Animated.View>
            </View>

            <View
              style={[
                styles.sectionSurface,
                {
                  paddingHorizontal: layout.sectionPadding,
                  paddingVertical: layout.sectionPadding,
                  gap: layout.sectionGap,
                },
              ]}
            >
              
              <View style={[styles.categoryRow, { columnGap: layout.chipGap * 0.4 }]}>
                {categories.map((category) => {
                  const isActive = category.id === selectedCategory;
                  return (
                    <Pressable
                      key={category.id}
                      style={({ pressed }) => [
                        styles.categoryChip,
                        {
                          paddingHorizontal: 0,
                          paddingVertical: 0,
                          flex: 1,
                          marginHorizontal: layout.chipGap * 0.25,
                          transform: [{ scale: pressed ? 0.95 : 1 }], // 누르는 모션
                        },
                      ]}
                      android_ripple={{ color: '#2563eb22' }}
                      onPress={() => setSelectedCategory(category.id)}
                    >
                      <View
                        style={{
                          backgroundColor: isActive ? '#3b82f6' : '#ffffff',
                          borderColor: isActive ? '#3b82f6' : '#dcdfe3',
                          borderWidth: 1,
                          borderRadius: 24,
                          paddingHorizontal: layout.chipHorizontalPadding,
                          paddingVertical: layout.chipVerticalPadding,
                        }}
                      >
                        <Text
                          style={[
                            styles.categoryLabel,
                            {
                              color: isActive ? '#ffffff' : '#6b7280',
                              fontSize: layout.chipFontSize,
                              fontWeight: isActive ? '600' : '500',
                            },
                          ]}
                        >
                          {category.label}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View
                style={[
                  styles.list,
                  {
                    columnGap: layout.listGap,
                    rowGap: layout.listGap * 1.1,
                    paddingBottom: layout.sectionGap * 4, // 하단 여백 더 추가
                  },
                ]}
              >
                {filteredMenu.map((item) => {
                  const quantity = quantities[item.id] ?? 0;
                  const isHighlighted = highlightedMenuId === item.id;
                  
                  // 디버깅: 하이라이트 상태 확인
                  if (isHighlighted) {
                    console.log('🎯 렌더링 - 하이라이트 적용됨:', item.id, item.name);
                  }
                  
                  const borderWidth = isHighlighted ? 3 : 1;

                  return (
                    <Animated.View
                      key={item.id}
                      style={[
                        styles.menuItem,
                        {
                          borderRadius: layout.itemRadius,
                          padding: layout.itemPadding,
                          minHeight: layout.itemHeight * 0.6, // 세로 너비 40% 줄임
                          width: '31%', // 2행 3열로 변경 (48% -> 31%)
                          borderColor: isHighlighted ? animatedBorderColor : '#cbd5f5',
                          borderWidth: borderWidth,
                          backgroundColor: isHighlighted ? highlightAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['#fff5f5', '#ffe5e5'], // 연한 빨간색 배경 깜빡임
                          }) : '#ffffff',
                          shadowColor: isHighlighted ? '#ff0000' : '#000',
                          shadowOffset: isHighlighted ? { width: 0, height: 0 } : { width: 0, height: 2 },
                          shadowOpacity: isHighlighted ? highlightAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 0.6],
                          }) : 0.1,
                          shadowRadius: isHighlighted ? 8 : 4,
                          elevation: isHighlighted ? 8 : 2,
                        },
                      ]}
                    >
                      <Image
                        source={item.image}
                        style={[
                          styles.itemImage,
                          {
                            width: layout.imageSize,
                            height: layout.imageSize,
                            borderRadius: layout.imageSize / 3,
                          marginBottom: layout.itemPadding * 0.6,
                          },
                        ]}
                        resizeMode="cover"
                        accessibilityRole="image"
                        accessibilityLabel={`${item.name} 이미지`}
                      />
                      <View style={[styles.itemBody, { flex: 1, justifyContent: 'space-between' }]}>
                        <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Text style={[styles.itemName, { fontSize: layout.actionFontSize }]}>{item.name}</Text>
                          <Text style={[styles.itemPrice, { fontSize: layout.actionFontSize * 0.9, color: '#6b7280' }]}>
                            {formatCurrency(item.price)}
                          </Text>
                        </View>

                        <Pressable
                          accessibilityLabel={`${item.name} 장바구니 담기`}
                          style={({ pressed }) => [
                            styles.addButton,
                            {
                              borderRadius: layout.addButtonHeight / 2,
                              marginTop: 0, // flex 레이아웃으로 하단 정렬
                              height: layout.addButtonHeight * 0.9, // 버튼 높이 줄임
                              width: '70%', // 가로 너비 줄임
                              alignSelf: 'center',
                              backgroundColor: pressed ? '#e5e7eb' : '#3b82f6', // 터치 시 회색, 기본 파란색
                              transform: [{ scale: pressed ? 0.95 : 1 }], // 누르는 모션
                            },
                          ]}
                          android_ripple={{ color: '#2563eb22' }}
                          onPress={() => handleAddPress(item)}
                        >
                          {({ pressed }) => (
                          <Text
                            style={[
                              styles.addLabel,
                              {
                                  color: pressed ? '#6b7280' : '#ffffff', // 터치 시 회색 텍스트, 기본 흰색
                                fontSize: layout.actionFontSize,
                              },
                            ]}
                          >
                            담기
                          </Text>
                          )}
                        </Pressable>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>

             
            </View>
          </View>
        </ScrollView>

        <View pointerEvents="box-none" style={{ 
          paddingHorizontal: layout.containerPadding,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: layout.sectionGap * 0.5,
        }}>
          <UserVoiceBubble
            layout={layout}
            lastUserMessage={lastUserMessage}
            isRecording={isRecording}
            onPress={handlePressIn}
            userFontSize={layout.subHeadingSize}
            containerStyle={{
              marginTop: layout.sectionGap * 0.8,
              marginBottom: layout.sectionGap * 0.6,
            }}
          />
          
      </View>

        <Animated.View
            style={[
            styles.cartBarWrapper,
            {
              paddingHorizontal: layout.containerPadding,
              borderWidth: highlightedElementType === 'cart' ? 3 : 1,
              borderColor: highlightedElementType === 'cart' ? animatedBorderColor : '#000000',
              borderRadius: highlightedElementType === 'cart' ? 12 : 0,
              backgroundColor: highlightedElementType === 'cart' ? highlightAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: ['#e5e7eb', '#ffe5e5'], // 기본 회색에서 연한 빨간색으로 깜빡임
              }) : '#e5e7eb',
              shadowColor: highlightedElementType === 'cart' ? '#ff0000' : '#000',
              shadowOffset: highlightedElementType === 'cart' ? { width: 0, height: 0 } : { width: 0, height: 2 },
              shadowOpacity: highlightedElementType === 'cart' ? highlightAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.6],
              }) : 0.1,
              shadowRadius: highlightedElementType === 'cart' ? 8 : 4,
              elevation: highlightedElementType === 'cart' ? 8 : 2,
            }
          ]}
          testID="menu_cart_area"
        >
          <View style={styles.cartBarContent}>
            <View style={styles.cartItemsRow}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: layout.sectionGap * 0.4 }}
              >
                {renderCartSlots()}
              </ScrollView>
                </View>
          <View style={[styles.cartBarSummary, { marginTop: 12 }]}>
          <Animated.View
            style={{
              borderWidth: highlightedElementType === 'pay' ? 3 : 0,
              borderColor: highlightedElementType === 'pay' ? animatedBorderColor : 'transparent',
              borderRadius: 8,
            }}
          >
            <Pressable
              style={({ pressed }) => [
                    styles.cartCheckoutButton,
                    { transform: [{ scale: pressed ? 0.95 : 1 }] }, // 누르는 모션
                  ]}
                  android_ripple={{ color: '#ffffff33' }}
                  onPress={handleCheckout}
                  testID="menu_pay_button"
                >
                  <Text style={styles.cartCheckoutText}>결제하기</Text>
                </Pressable>
          </Animated.View>
              <View style={styles.cartBarSummaryText}>
                <Text style={styles.cartBarSummaryLabel}>총 {cartSummary.totalQuantity}개</Text>
                <Text style={styles.cartBarSummaryTotal}>{formatCurrency(cartSummary.total)}</Text>
        </View>
            </View>
          </View>
        </Animated.View>
              </View>

      <Modal
        visible={isOrderSummaryVisible}
        transparent
        animationType="fade"
        onRequestClose={handleOrderSummaryClose}
      >
        <SafeAreaView style={styles.cartOverlay}>
          <Pressable style={styles.cartBackdrop} onPress={handleOrderSummaryClose} />
              <View
                style={[
              styles.cartModal,
                  {
                borderRadius: layout.cardRadius,
                padding: layout.containerPadding,
                minHeight: Math.min(height * 0.85, 640),
                justifyContent: 'space-between',
                  },
                ]}
              >
            <View style={{ flex: 1 }}>
              <View style={styles.orderSummaryHeader}>
                <View>
                  <Text style={[styles.orderSummaryTitle, { fontSize: layout.headingSize }]}>
                    주문내역을 확인하고 결제하기
                  </Text>
                  <Text style={[styles.orderSummarySubtitle, { fontSize: layout.subHeadingSize * 0.9 }]}>
                    결제 전에 주문 내역을 다시 한 번 확인해 주세요.
                  </Text>
                </View>
                <Pressable
                  onPress={handleOrderSummaryClose}
                  style={styles.orderSummaryCloseButton}
                  android_ripple={{ color: '#e5e7eb' }}
                >
                  <Text style={[styles.orderSummaryClose, { fontSize: layout.subHeadingSize }]}>✕</Text>
                </Pressable>
              </View>

              <View style={styles.orderSummaryDivider} />

              <View style={[styles.orderSummaryTableWrapper, { flex: 1, minHeight: 0 }]}>
                <View style={styles.orderSummaryTableHeader}>
                  <Text style={[styles.orderSummaryHeaderCell, { flex: 2, fontSize: layout.subHeadingSize * 0.9 }]}>
                    메뉴명
                  </Text>
                  <Text style={[styles.orderSummaryHeaderCell, { width: 72, textAlign: 'center', fontSize: layout.subHeadingSize * 0.9 }]}>
                    수량
                  </Text>
                  <Text style={[styles.orderSummaryHeaderCell, { width: 120, textAlign: 'right', fontSize: layout.subHeadingSize * 0.9 }]}>
                    금액
                  </Text>
                </View>
                <ScrollView
                  style={{ flex: 1 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: layout.sectionGap * 0.35 }}
                >
                  {cartItems.length === 0 ? (
                    <View style={[styles.orderSummaryEmpty, { minHeight: height * 0.25 }]}>
                      <Text style={[styles.orderSummaryEmptyText, { fontSize: layout.subHeadingSize }]}>
                        장바구니가 비어 있어요.
                      </Text>
                      <Text style={[styles.orderSummaryEmptyHint, { fontSize: layout.subHeadingSize * 0.9 }]}>
                        메뉴를 먼저 담아 주세요.
                      </Text>
                    </View>
                  ) : (
                    cartItems.map((item) => (
                        <View
                        key={`${item.id}-${renderItemOptionText(item)}`}
                          style={[
                          styles.orderSummaryRow,
                            {
                            borderRadius: layout.cardRadius * 0.35,
                              paddingVertical: layout.containerPadding * 0.35,
                              paddingHorizontal: layout.containerPadding * 0.4,
                            },
                          ]}
                        >
                        <Text style={[styles.orderSummaryCell, { flex: 2, fontSize: layout.subHeadingSize }]}>
                          {item.name}
                          {renderItemOptionText(item)}
                        </Text>
                        <Text
                style={[
                            styles.orderSummaryCell,
                            { width: 72, textAlign: 'center', fontSize: layout.subHeadingSize },
                          ]}
                        >
                          {item.quantity}
                        </Text>
                <Text
                  style={[
                            styles.orderSummaryCell,
                            { width: 120, textAlign: 'right', fontSize: layout.subHeadingSize },
                          ]}
                        >
                          {formatCurrency(item.unitPrice * item.quantity)}
                </Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>

            <View>
              <View style={{ marginTop: layout.sectionGap * 0.5 }}>
                <UserVoiceBubble
                  layout={layout}
                  lastUserMessage={lastUserMessage}
                  isRecording={isRecording}
                  onPress={handlePressIn}
                  userFontSize={layout.subHeadingSize * 0.9}
                  containerStyle={{
                    marginBottom: layout.sectionGap * 0.5,
                  }}
                  align="flex-end"
                />
              </View>

              <View style={[styles.orderSummaryTotals, { marginTop: layout.sectionGap }]}>
                <View style={styles.orderSummaryTotalBlock}>
                  <Text style={[styles.orderSummaryTotalLabel, { fontSize: layout.subHeadingSize * 0.9 }]}>총 수량</Text>
                  <Text style={[styles.orderSummaryTotalValue, { fontSize: layout.headingSize * 0.75 }]}>{cartSummary.totalQuantity}개</Text>
                </View>
                <View style={styles.orderSummaryTotalBlock}>
                  <Text style={[styles.orderSummaryTotalLabel, { fontSize: layout.subHeadingSize * 0.9 }]}>총 금액</Text>
                  <Text style={[styles.orderSummaryTotalValue, { fontSize: layout.headingSize * 0.75 }]}>
                  {formatCurrency(cartSummary.total)}
                </Text>
              </View>
              </View>

              <View style={[styles.orderSummaryFooter, { marginTop: layout.sectionGap, gap: layout.optionGap }]}>
              <Pressable
                  style={({ pressed }) => [
                    styles.orderSummaryButton, 
                    styles.orderSummarySecondaryButton, 
                    { 
                      borderRadius: layout.buttonHeight / 2, 
                      height: layout.buttonHeight,
                      transform: [{ scale: pressed ? 0.95 : 1 }], // 누르는 모션
                    }
                  ]}
                  android_ripple={{ color: '#e5e7eb' }}
                  onPress={handleOrderSummaryClose}
                  testID="payment_prev_button"
                >
                  <Text style={[styles.orderSummarySecondaryLabel, { fontSize: layout.subHeadingSize }]}>이전</Text>
              </Pressable>
              <Pressable
                  style={({ pressed }) => [
                    styles.orderSummaryButton, 
                    styles.orderSummaryPrimaryButton, 
                    { 
                      borderRadius: layout.buttonHeight / 2, 
                      height: layout.buttonHeight,
                      transform: [{ scale: pressed ? 0.95 : 1 }], // 누르는 모션
                    }
                  ]}
                android_ripple={{ color: '#1d4ed880' }}
                  onPress={handleOrderSummaryProceed}
                  testID="payment_pay_button"
              >
                  <Text style={[styles.orderSummaryPrimaryLabel, { fontSize: layout.subHeadingSize }]}>결제하기</Text>
              </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={isPaymentVisible}
        transparent
        animationType="fade"
        onRequestClose={handlePaymentClose}
      >
        <SafeAreaView style={styles.cartOverlay}>
          <Pressable style={styles.cartBackdrop} onPress={handlePaymentClose} />
          <View
            style={[
              styles.cartModal,
              {
                borderRadius: layout.cardRadius,
                padding: layout.containerPadding,
                minHeight: Math.min(height * 0.8, 640),
              },
            ]}
          >
            <View style={styles.paymentHeader}>
              <View>
                <Text style={[styles.paymentTitle, { fontSize: layout.headingSize }]}>결제수단을 선택해 주세요</Text>
              </View>
              <Pressable
                onPress={handlePaymentClose}
                style={styles.paymentCloseButton}
                android_ripple={{ color: '#e5e7eb' }}
              >
                <Text style={[styles.paymentClose, { fontSize: layout.subHeadingSize }]}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.paymentDivider} />

            <View
              style={[
                styles.paymentOptions,
                {
                  gap: layout.sectionGap,
                  marginTop: layout.sectionGap,
                },
              ]}
            >
              <Pressable
                style={[
                  styles.paymentOption,
                  {
                    borderRadius: layout.cardRadius * 0.5,
                    paddingVertical: layout.containerPadding * 0.85,
                    paddingHorizontal: layout.containerPadding * 0.6,
                  },
                ]}
                android_ripple={{ color: '#dbeafe' }}
                onPress={() => handlePaymentSelect('card')}
              >
                <Text style={[styles.paymentOptionLabel, { fontSize: layout.subHeadingSize * 1.1 }]}>카드 결제</Text>
                <Text style={[styles.paymentOptionHint, { fontSize: layout.subHeadingSize * 0.95 }]}>신용카드, 삼성카드 등 </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.paymentOption,
                  {
                    borderRadius: layout.cardRadius * 0.5,
                    paddingVertical: layout.containerPadding * 0.85,
                    paddingHorizontal: layout.containerPadding * 0.6,
                  },
                ]}
                android_ripple={{ color: '#fee2e2' }}
                onPress={() => handlePaymentSelect('mobile')}
              >
                <Text style={[styles.paymentOptionLabel, { fontSize: layout.subHeadingSize * 1.1 }]}>간편결제</Text>
                <Text style={[styles.paymentOptionHint, { fontSize: layout.subHeadingSize * 0.95 }]}>네이버페이, 카카오페이 등</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.paymentOption,
                  {
                    borderRadius: layout.cardRadius * 0.5,
                    paddingVertical: layout.containerPadding * 0.85,
                    paddingHorizontal: layout.containerPadding * 0.6,
                  },
                ]}
                android_ripple={{ color: '#ddd6fe' }}
                onPress={() => handlePaymentSelect('coupon')}
              >
                <Text style={[styles.paymentOptionLabel, { fontSize: layout.subHeadingSize * 1.1 }]}>쿠폰 결제</Text>
                <Text style={[styles.paymentOptionHint, { fontSize: layout.subHeadingSize * 0.95 }]}>모바일 쿠폰, 멤버십 바코드 등</Text>
              </Pressable>
            </View>

            <View style={{ marginTop: layout.sectionGap * 1.2 }}>
              <UserVoiceBubble
                layout={layout}
                lastUserMessage={lastUserMessage}
                isRecording={isRecording}
                onPress={handlePressIn}
                userFontSize={layout.subHeadingSize * 0.9}
                containerStyle={{
                  marginBottom: layout.sectionGap * 0.5,
                }}
                align="flex-end"
              />
            </View>

            <View style={[styles.paymentFooter, { marginTop: layout.sectionGap * 1.6 }]}> 
              <Pressable 
                style={[styles.paymentCancelButton, { borderRadius: layout.buttonHeight / 2, height: layout.buttonHeight }]} 
                android_ripple={{ color: '#fecaca' }} 
                onPress={() => {
                  appendMessage('주문을 취소했어요. 처음 화면으로 돌아갈까요?', 'assistant');
                  setPaymentVisible(false);
                }}
              >
                <Text style={[styles.paymentCancelLabel, { fontSize: layout.subHeadingSize }]}>주문 취소</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={isQuickPayVisible}
        transparent
        animationType="fade"
        onRequestClose={handleQuickPayClose}
      >
        <SafeAreaView style={styles.cartOverlay}>
          <Pressable style={styles.cartBackdrop} onPress={handleQuickPayClose} />
          <View
            style={[
              styles.cartModal,
              {
                borderRadius: layout.cardRadius,
                padding: layout.containerPadding,
                minHeight: Math.min(height * 0.8, 640),
              },
            ]}
          >
            <View style={styles.quickPayHeader}>
              <View>
                <Text style={[styles.quickPayTitle, { fontSize: layout.headingSize }]}>간편결제 서비스를 선택해 주세요</Text>
                <Text style={[styles.quickPaySubtitle, { fontSize: layout.subHeadingSize * 0.9 }]}>사용하실 간편결제 브랜드를 선택하면 결제를 진행해 드릴게요.</Text>
              </View>
              <Pressable
                onPress={handleQuickPayClose}
                style={styles.quickPayCloseButton}
                android_ripple={{ color: '#e5e7eb' }}
              >
                <Text style={[styles.quickPayClose, { fontSize: layout.subHeadingSize }]}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.quickPayDivider} />

            <View
              style={[
                styles.quickPayOptions,
                {
                  gap: layout.sectionGap,
                  marginTop: layout.sectionGap,
                },
              ]}
            >
              <Pressable
                style={[
                  styles.quickPayOption,
                  {
                    borderRadius: layout.cardRadius * 0.5,
                    paddingVertical: layout.containerPadding * 0.75,
                    paddingHorizontal: layout.containerPadding * 0.6,
                  },
                ]}
                android_ripple={{ color: '#bfdbfe' }}
                onPress={() => handleQuickPaySelect('naver')}
              >
                <Text style={[styles.quickPayLabel, { fontSize: layout.subHeadingSize * 1.1 }]}>네이버페이</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.quickPayOption,
                  {
                    borderRadius: layout.cardRadius * 0.5,
                    paddingVertical: layout.containerPadding * 0.75,
                    paddingHorizontal: layout.containerPadding * 0.6,
                  },
                ]}
                android_ripple={{ color: '#fde68a' }}
                onPress={() => handleQuickPaySelect('kakao')}
              >
                <Text style={[styles.quickPayLabel, { fontSize: layout.subHeadingSize * 1.1 }]}>카카오페이</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.quickPayOption,
                  {
                    borderRadius: layout.cardRadius * 0.5,
                    paddingVertical: layout.containerPadding * 0.75,
                    paddingHorizontal: layout.containerPadding * 0.6,
                  },
                ]}
                android_ripple={{ color: '#bbf7d0' }}
                onPress={() => handleQuickPaySelect('toss')}
              >
                <Text style={[styles.quickPayLabel, { fontSize: layout.subHeadingSize * 1.1 }]}>토스페이</Text>
              </Pressable>
            </View>

            <View style={[styles.quickPayFooter, { marginTop: layout.sectionGap * 1.4 }]}>
              <Pressable
                style={[styles.quickPayBackButton, { borderRadius: layout.buttonHeight / 2, height: layout.buttonHeight }]}
                android_ripple={{ color: '#dbeafe' }}
                onPress={() => {
                  setQuickPayVisible(false);
                  setPaymentVisible(true);
                }}
              >
                <Text style={[styles.quickPayBackLabel, { fontSize: layout.subHeadingSize }]}>결제수단 다시 선택</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={isCardInsertVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCardInsertClose}
      >
        <SafeAreaView style={styles.cartOverlay}>
          <Pressable style={styles.cartBackdrop} onPress={handleCardInsertClose} />
          <View
            style={[
              styles.cartModal,
              {
                borderRadius: layout.cardRadius,
                padding: layout.containerPadding,
                minHeight: Math.min(height * 0.8, 640),
              },
            ]}
          >
            <View style={styles.cardInsertHeader}>
              <View>
                <Text style={[styles.cardInsertTitle, { fontSize: layout.headingSize }]}>카드를 삽입해 주세요</Text>
              </View>
              <Pressable
                onPress={handleCardInsertClose}
                style={styles.cardInsertCloseButton}
                android_ripple={{ color: '#e5e7eb' }}
              >
                <Text style={[styles.cardInsertClose, { fontSize: layout.subHeadingSize }]}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.cardInsertDivider} />

            <View
              style={[
                styles.cardInsertBody,
                {
                  paddingVertical: layout.sectionGap,
                  gap: layout.sectionGap,
                },
              ]}
            >
              <View style={styles.cardIllustrationWrapper}>
                <View style={[styles.cardIllustration, { borderRadius: layout.cardRadius * 0.6 }]}> 
                  <View style={styles.cardSlot} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardChip} />
                  </View>
                </View>
              </View>
            </View>
 
            <View style={[styles.cardInsertFooter, { marginTop: layout.sectionGap * 0.6 }]}> 
              <Text
                style={[
                  styles.cardStep,
                  {
                    fontSize: layout.subHeadingSize,
                    textAlign: 'center',
                    marginBottom: layout.sectionGap * 0.5,
                  },
                ]}
              >
                카드를 단말기 하단 삽입구에 끝까지 꽂고, 결제 완료 안내가 나올 때까지 제거하지 마세요.
              </Text>
              
              <View style={{ marginTop: layout.sectionGap * 0.5 }}>
                <UserVoiceBubble
                  layout={layout}
                  lastUserMessage={lastUserMessage}
                  isRecording={isRecording}
                  onPress={handlePressIn}
                  userFontSize={layout.subHeadingSize * 0.9}
                  containerStyle={{
                    marginBottom: layout.sectionGap * 0.5,
                  }}
                  align="flex-end"
                />
              </View>
              
              <Pressable
                style={[styles.cardInsertCancelButton, { borderRadius: layout.buttonHeight / 2, height: layout.buttonHeight }]}
                android_ripple={{ color: '#fee2e2' }}
                onPress={() => {
                  appendMessage('카드 결제를 취소했어요. 다른 결제수단을 선택할까요?', 'assistant');
                  setCardInsertVisible(false);
                  setPaymentVisible(true);
                }}
              >
                <Text style={[styles.cardInsertCancelLabel, { fontSize: layout.subHeadingSize }]}>결제 취소</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* 바코드 인식 팝업 */}
      <Modal
        visible={isBarcodeScanVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <SafeAreaView style={styles.cartOverlay}>
          <View
            style={[
              styles.cartModal,
              {
                borderRadius: layout.cardRadius,
                padding: layout.containerPadding,
                minHeight: Math.min(height * 0.8, 640),
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
          >
            <View style={styles.barcodeScanContent}>
              <Text style={[styles.barcodeScanTitle, { fontSize: layout.headingSize }]}>
                바코드를 인식시켜주세요
              </Text>
              
              <View style={styles.barcodeIllustration}>
                {/* 손과 스마트폰 일러스트레이션 영역 */}
                <View style={styles.phoneContainer}>
                  <View style={styles.phoneScreen}>
                    <View style={styles.phoneStatusBar}>
                      <View style={styles.statusBarIcons}>
                        <View style={styles.signalIcon} />
                        <View style={styles.wifiIcon} />
                        <Text style={styles.statusBarTime}>12:00</Text>
                        <View style={styles.batteryIcon} />
                      </View>
                    </View>
                    <View style={styles.barcodeBox}>
                      {/* 바코드 패턴 */}
                      <View style={styles.barcodePattern}>
                        {[1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2].map((width, index) => (
                          <View
                            key={index}
                            style={[
                              styles.barcodeLine,
                              { width: width * 2, height: 40 },
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={styles.barcodeText}>바코드를 읽어 주세요</Text>
                  </View>
                </View>
              </View>
              
              <View style={{ marginTop: layout.sectionGap * 1.5 }}>
                <UserVoiceBubble
                  layout={layout}
                  lastUserMessage={lastUserMessage}
                  isRecording={isRecording}
                  onPress={handlePressIn}
                  userFontSize={layout.subHeadingSize * 0.9}
                  containerStyle={{
                    marginBottom: layout.sectionGap * 0.5,
                  }}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={isProcessingVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <SafeAreaView style={styles.cartOverlay}>
          <View
            style={[
              styles.cartModal,
              styles.processingModal,
              {
                borderRadius: layout.cardRadius,
                padding: layout.containerPadding,
                minHeight: Math.min(height * 0.8, 640),
              },
            ]}
          >
            <View style={styles.processingContent}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={[styles.processingLabel, { fontSize: layout.headingSize * 0.9 }]}>결제 중입니다…</Text>
              <Text style={[styles.processingHint, { fontSize: layout.subHeadingSize * 0.9 }]}>잠시만 기다려 주세요.</Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={isPaymentCompleteVisible}
        transparent
        animationType="fade"
        onRequestClose={handlePaymentCompleteClose}
      >
        <View style={styles.cartOverlay} pointerEvents="box-none">
          <Pressable 
            style={[styles.cartBackdrop, { zIndex: 0 }]} 
            onPress={handlePaymentCompleteClose}
            pointerEvents="auto"
          />
          <View
            style={[
              styles.cartModal,
              {
                borderRadius: layout.cardRadius,
                padding: layout.containerPadding,
                minHeight: Math.min(height * 0.8, 640),
                zIndex: 1,
                elevation: 10,
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.paymentCompleteHeader} pointerEvents="auto">
              <View style={{ flex: 1, flexShrink: 1, marginRight: 12 }}>
                <Text style={[styles.paymentCompleteTitle, { fontSize: layout.headingSize }]}>
                  {paymentCompleteMessage || '결제가 완료되었습니다'}
                </Text>
              </View>
              <Pressable
                onPress={handlePaymentCompleteClose}
                style={[styles.paymentCompleteCloseButton, { flexShrink: 0 }]}
                android_ripple={{ color: '#e5e7eb' }}
              >
                <Text style={[styles.paymentCompleteClose, { fontSize: layout.subHeadingSize }]}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.paymentCompleteDivider} pointerEvents="none" />

            <View style={styles.paymentCompleteBody} pointerEvents="auto">
              <View style={[styles.paymentCompleteBadge, { borderRadius: layout.cardRadius * 0.6 }]}> 
                <Text style={[styles.paymentCompleteBadgeIcon, { fontSize: layout.headingSize }]}>✓</Text>
              </View>
              <Text
                style={[styles.paymentCompleteMessage, { fontSize: layout.subHeadingSize, marginTop: layout.sectionGap * 0.6 }]}
              >
                주문 번호 104번을 확인해 주세요.
              </Text>
            </View>

            <View style={[styles.paymentCompleteFooter, { marginTop: layout.sectionGap * 1.2, flexDirection: 'row', gap: layout.optionGap }]} pointerEvents="auto">
              <Pressable
                style={[styles.paymentCompleteSecondaryButton, { borderRadius: layout.buttonHeight / 2, height: layout.buttonHeight }]}
                android_ripple={{ color: '#dbeafe' }}
                onPress={() => {
                  console.log('영수증 출력 버튼 눌림');
                  handlePrintReceipt();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.paymentCompleteSecondaryLabel, { fontSize: layout.subHeadingSize }]}>영수증 출력</Text>
              </Pressable>
              <Pressable
                style={[styles.paymentCompleteButton, { borderRadius: layout.buttonHeight / 2, height: layout.buttonHeight }]}
                android_ripple={{ color: '#1d4ed880' }}
                onPress={() => {
                  console.log('주문번호 출력 버튼 눌림');
                  handlePrintOrderNumber();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.paymentCompleteButtonLabel, { fontSize: layout.subHeadingSize }]}>주문번호 출력</Text>
              </Pressable>
            </View>
          </View>
               </View>
      </Modal>

      <Modal
        visible={isPhoneInputVisible}
        transparent
        animationType="fade"
        onRequestClose={handlePhoneInputClose}
      >
        <View style={styles.cartOverlay} pointerEvents="box-none">
          <Pressable 
            style={[styles.cartBackdrop, { zIndex: 0 }]} 
            onPress={handlePhoneInputClose}
            pointerEvents="auto"
          />
          <View
            style={[
              styles.cartModal,
              {
                borderRadius: layout.cardRadius,
                padding: layout.containerPadding,
                minHeight: Math.min(height * 0.8, 640),
                zIndex: 1,
                elevation: 10,
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.phoneInputHeader} pointerEvents="auto">
              <View>
                <Text style={[styles.phoneInputTitle, { fontSize: layout.headingSize }]}>QR 생성을 위해 전화번호를 입력해 주세요</Text>
              </View>
              <Pressable
                onPress={handlePhoneInputClose}
                style={styles.phoneInputCloseButton}
                android_ripple={{ color: '#e5e7eb' }}
              >
                <Text style={[styles.phoneInputClose, { fontSize: layout.subHeadingSize }]}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.phoneInputDivider} pointerEvents="none" />

            <View
              style={[styles.phoneInputBody, { gap: layout.sectionGap * 0.8 }]}
              pointerEvents="auto"
              >
                <View
                  style={[
                    styles.phoneInputDisplay,
                    {
                      paddingVertical: layout.containerPadding * 0.6,
                      paddingHorizontal: layout.containerPadding * 0.8,
                      borderRadius: layout.cardRadius * 0.5,
                    },
                  ]}
                >
                  <Text
                    style={[styles.phoneInputDisplayText, { fontSize: layout.subHeadingSize * 1.1 }]}
                  >
                    {phoneNumber.length > 0 ? phoneNumber : '전화번호를 입력하세요'}
                  </Text>
              </View>

              <View
                style={[
                  styles.phoneInputKeypad,
                  {
                    gap: layout.optionGap * 0.9,
                  },
                ]}
                pointerEvents="auto"
              >
                {[
                  ['1', '2', '3'],
                  ['4', '5', '6'],
                  ['7', '8', '9'],
                  ['010', '0', 'BACK'],
                ].map((row, rowIndex) => (
                  <View
                    key={`row-${rowIndex}`}
                    style={[styles.phoneKeypadRow, { gap: layout.optionGap * 0.9 }]}
                  >
                    {row.map((key) => (
                      <Pressable
                        key={key}
                        style={[
                          styles.phoneKeypadButton,
                          key === 'BACK' && styles.phoneKeypadBackButton,
                          {
                            borderRadius: layout.cardRadius * 0.5,
                            height: layout.buttonHeight * 1.05,
                          },
                        ]}
                        android_ripple={{ color: '#e5e7eb' }}
                        onPress={(e) => {
                          e.stopPropagation();
                          console.log('키패드 버튼 onPress 호출:', key);
                          if (key === 'BACK') {
                            setPhoneNumber((prev) => prev.slice(0, -1));
                          } else if (key === '010') {
                            setPhoneNumber((prev) => {
                              const next = `${prev}010`;
                              return next.length > 11 ? prev : next;
                            });
                          } else {
                            setPhoneNumber((prev) => {
                              if (prev.length >= 11) return prev;
                              return `${prev}${key}`;
                            });
                          }
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        pointerEvents="auto"
                      >
                        {key === 'BACK' ? (
                          <View style={styles.phoneKeypadBackIcon} pointerEvents="none">
                            <Text style={styles.phoneKeypadBackIconText}>⌫</Text>
                          </View>
                        ) : (
                          <Text style={[styles.phoneKeypadNumber, { fontSize: layout.headingSize * 0.8 }]} pointerEvents="none">
                            {key}
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                ))}
              </View>
              {phoneError ? (
                <Text style={[styles.phoneInputError, { fontSize: layout.subHeadingSize * 0.85 }]}>{phoneError}</Text>
              ) : null}
            </View>

            <View style={[styles.phoneInputFooter, { marginTop: layout.sectionGap * 1.2, flexDirection: 'row', gap: layout.optionGap }]} pointerEvents="auto"> 
              <Pressable
                style={[styles.phoneInputSecondaryButton, { borderRadius: layout.buttonHeight / 2, height: layout.buttonHeight }]}
                android_ripple={{ color: '#e5e7eb' }}
                onPress={handlePhoneInputClose}
                testID="qr_cancel_button"
              >
                <Text style={[styles.phoneInputSecondaryLabel, { fontSize: layout.subHeadingSize }]}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.phoneInputPrimaryButton, { borderRadius: layout.buttonHeight / 2, height: layout.buttonHeight }]}
                android_ripple={{ color: '#1d4ed880' }}
                onPress={handlePhoneSend}
                testID="qr_send_button"
              >
                <Text style={[styles.phoneInputPrimaryLabel, { fontSize: layout.subHeadingSize }]}>전송</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isQrSentVisible}
        transparent
        animationType="fade"
        onRequestClose={handleQrSentClose}
      >
        <SafeAreaView style={styles.cartOverlay}>
          <Pressable style={styles.cartBackdrop} onPress={handleQrSentClose} />
          <View
            style={[
              styles.cartModal,
              {
                borderRadius: layout.cardRadius,
                padding: layout.containerPadding,
                minHeight: Math.min(height * 0.7, 520),
              },
            ]}
          >
            <View style={styles.qrSentHeader}>
              <View>
                <Text style={[styles.qrSentTitle, { fontSize: layout.headingSize }]}>QR이 전송되었습니다</Text>
              </View>
              <Pressable
                onPress={handleQrSentClose}
                style={styles.qrSentCloseButton}
                android_ripple={{ color: '#e5e7eb' }}
              >
                <Text style={[styles.qrSentClose, { fontSize: layout.subHeadingSize }]}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.qrSentDivider} />

            <View style={styles.qrSentBody}>
              <View style={[styles.qrSentBadge, { borderRadius: layout.cardRadius * 0.6 }]}> 
                <Text style={[styles.qrSentBadgeIcon, { fontSize: layout.headingSize }]}>✓</Text>
              </View>
              <Text
                style={[styles.qrSentMessage, { fontSize: layout.subHeadingSize, marginTop: layout.sectionGap * 0.6 }]}
              >
                휴대폰에서 QR코드를 확인하고 결제를 진행해 주세요.
              </Text>
            </View>

            <View style={[styles.qrSentFooter, { marginTop: layout.sectionGap * 1.2 }]}> 
              <Pressable
                style={[styles.qrSentButton, { borderRadius: layout.buttonHeight / 2, height: layout.buttonHeight }]}
                android_ripple={{ color: '#1d4ed880' }}
                onPress={handleQrSentClose}
              >
                <Text style={[styles.qrSentButtonLabel, { fontSize: layout.subHeadingSize }]}>확인</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screen: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  wrapper: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  homeButton: {
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  homeButtonIcon: {
    color: '#ffffff',
    fontSize: 38,
    lineHeight: 42,
  },
  textSizeButton: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSizeButtonText: {
    color: '#4b5563',
    fontWeight: '600',
  },
  sectionSurface: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderStyle: 'solid',
    borderRadius: 28,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  title: {
    color: '#4d5359',
    fontWeight: '700',
    textAlign: 'left',
    marginBottom: 24,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 24,
    marginBottom: 12,
  },
  categoryLabel: {
    textAlign: 'center',
  },
  list: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderStyle: 'solid',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  itemImage: {
    marginRight: 0,
  },
  itemBody: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  itemName: {
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center',
  },
  itemPrice: {
    fontWeight: '500',
    textAlign: 'center',
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  addLabel: {
    fontWeight: '600',
  },
  chatSurface: {
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
  cartBarWrapper: {
    width: '100%',
    gap: 20,
    paddingVertical: 20,
    backgroundColor: '#e5e7eb', // 담기 버튼과 동일한 회색
    borderWidth: 1,
    borderColor: '#000000', // 검정색 테두리
  },
  cartBarContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 24,
  },
  cartItemsRow: {
    paddingVertical: 12,
    minHeight: 150,
    flex: 1,
  },
  cartBarSummary: {
    alignSelf: 'flex-start',
    alignItems: 'flex-end',
    gap: 12,
  },
  cartBarSummaryControls: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  cartBarSummaryText: {
    alignItems: 'flex-end',
  },
  cartBarSummaryLabel: {
    color: '#000000',
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 18,
  },
  cartBarSummaryTotal: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 28,
  },
  cartCheckoutButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 999,
  },
  cartCheckoutText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 20,
  },
  cartSlot: {
    width: 120,
    height: 150,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 12,
    justifyContent: 'space-between',
    position: 'relative',
  },
  cartSlotDeleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cartSlotDeleteText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cartSlotEmpty: {
    width: 120,
    height: 150,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#000000', // 검정색 테두리
    backgroundColor: '#ffffff15',
  },
  cartSlotImageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
  },
  cartSlotImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
  },
  cartSlotImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
  },
  cartSlotName: {
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
  cartSlotControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartSlotButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  cartSlotButtonText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 18,
  },
  cartSlotQuantity: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
    minWidth: 24,
  },
  orderSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderSummaryTitle: {
    color: '#111827',
    fontWeight: '700',
  },
  orderSummarySubtitle: {
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 6,
  },
  orderSummaryCloseButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  orderSummaryClose: {
    color: '#4b5563',
    fontWeight: '600',
  },
  orderSummaryDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 16,
    marginBottom: 20,
  },
  orderSummaryTableWrapper: {
    width: '100%',
  },
  orderSummaryTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 12,
  },
  orderSummaryHeaderCell: {
    color: '#6b7280',
    fontWeight: '600',
  },
  orderSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderSummaryCell: {
    color: '#1f2937',
    fontWeight: '600',
  },
  orderSummaryEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderSummaryEmptyText: {
    color: '#4b5563',
    fontWeight: '600',
  },
  orderSummaryEmptyHint: {
    color: '#9ca3af',
    fontWeight: '500',
    marginTop: 8,
  },
  orderSummaryTotals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderSummaryTotalBlock: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  orderSummaryTotalLabel: {
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 6,
  },
  orderSummaryTotalValue: {
    color: '#111827',
    fontWeight: '700',
  },
  orderSummaryFooter: {
    flexDirection: 'row',
    width: '100%',
  },
  orderSummaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderSummarySecondaryButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  orderSummaryPrimaryButton: {
    backgroundColor: '#2563eb',
  },
  orderSummarySecondaryLabel: {
    color: '#1f2937',
    fontWeight: '600',
  },
  orderSummaryPrimaryLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  cartOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.45)',
  },
  cartBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  cartModal: {
    width: '88%',
    maxWidth: '88%',
    height: '80%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderStyle: 'solid',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    flexDirection: 'column',
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cartTitle: {
    color: '#111827',
    fontWeight: '700',
  },
  cartSubtitle: {
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 6,
  },
  cartHeaderSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartSummaryPill: {
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  cartSummaryPillLabel: {
    color: '#4c51bf',
    fontWeight: '600',
  },
  cartSummaryPillValue: {
    color: '#1a194d',
    fontWeight: '700',
  },
  cartCloseButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  cartClose: {
    color: '#4b5563',
    fontWeight: '600',
  },
  cartDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 16,
  },
  cartTableWrapper: {
    width: '100%',
  },
  cartTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 12,
  },
  cartHeaderCell: {
    color: '#6b7280',
    fontWeight: '600',
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cartRowCell: {
    color: '#1f2937',
    fontWeight: '600',
  },
  cartSummaryRow: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  cartSummaryLabel: {
    color: '#4b5563',
    fontWeight: '500',
  },
  cartSummaryValue: {
    color: '#1f2937',
    fontWeight: '600',
  },
  cartSummary: {
    marginTop: 24,
  },
  cartSummaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartSummaryLabelEmphasis: {
    color: '#111827',
    fontWeight: '700',
  },
  cartSummaryValueEmphasis: {
    color: '#2563eb',
    fontWeight: '700',
  },
  cartGuide: {
    marginTop: 20,
    color: '#6b7280',
    fontWeight: '500',
  },
  cartFooterButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cartSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartSecondaryLabel: {
    color: '#1f2937',
    fontWeight: '600',
  },
  cartPrimaryButton: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartPrimaryLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  paymentTitle: {
    color: '#111827',
    fontWeight: '700',
  },
  paymentSubtitle: {
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 8,
  },
  paymentCloseButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  paymentClose: {
    color: '#4b5563',
    fontWeight: '600',
  },
  paymentDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 16,
  },
  paymentOptions: {
    flex: 1,
  },
  paymentOption: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#ffffff',
    gap: 12,
    alignItems: 'center',
  },
  paymentOptionHeader: {
    alignItems: 'center',
  },
  paymentBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  paymentBadgeLabel: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  paymentOptionLabel: {
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center',
  },
  paymentOptionHint: {
    color: '#6b7280',
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
  },
  paymentFooter: {
    alignItems: 'center',
  },
  paymentCancelButton: {
    width: '100%',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentCancelLabel: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyText: {
    color: '#6b7280',
    fontWeight: '500',
  },
  emptySubText: {
    color: '#9ca3af',
    fontWeight: '400',
    marginTop: 4,
  },
  cartSummaryPanel: {
    marginTop: 24,
  },
  quickPayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickPayTitle: {
    color: '#111827',
    fontWeight: '700',
  },
  quickPaySubtitle: {
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 8,
  },
  quickPayCloseButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  quickPayClose: {
    color: '#4b5563',
    fontWeight: '600',
  },
  quickPayDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 16,
  },
  quickPayOptions: {
    flex: 1,
  },
  quickPayOption: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    gap: 12,
    alignItems: 'center',
  },
  quickPayLabel: {
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center',
  },
  quickPayHint: {
    color: '#6b7280',
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
  },
  quickPayFooter: {
    alignItems: 'center',
  },
  quickPayBackButton: {
    width: '100%',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickPayBackLabel: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  cardInsertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardInsertTitle: {
    color: '#111827',
    fontWeight: '700',
  },
  cardInsertSubtitle: {
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 8,
  },
  cardInsertCloseButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  cardInsertClose: {
    color: '#4b5563',
    fontWeight: '600',
  },
  cardInsertDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 16,
  },
  cardInsertBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cardIllustrationWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIllustration: {
    width: '60%',
    maxWidth: 280,
    aspectRatio: 0.95,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardSlot: {
    width: '70%',
    height: 18,
    borderRadius: 999,
    backgroundColor: '#9ca3af',
    marginBottom: 20,
  },
  cardBody: {
    width: '72%',
    aspectRatio: 1.1,
    backgroundColor: '#2563eb',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardChip: {
    width: 52,
    height: 40,
    backgroundColor: '#fbbf24',
    borderRadius: 10,
  },
  cardStep: {
    color: '#1f2937',
    fontWeight: '500',
  },
  cardInsertFooter: {
    alignItems: 'center',
  },
  cardInsertCancelButton: {
    width: '100%',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInsertCancelLabel: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  processingModal: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  processingLabel: {
    color: '#111827',
    fontWeight: '700',
    textAlign: 'center',
  },
  processingHint: {
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  paymentCompleteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  paymentCompleteTitle: {
    color: '#111827',
    fontWeight: '700',
  },
  paymentCompleteSubtitle: {
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 8,
  },
  paymentCompleteCloseButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  paymentCompleteClose: {
    color: '#4b5563',
    fontWeight: '600',
  },
  paymentCompleteDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 16,
  },
  paymentCompleteBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  paymentCompleteBadge: {
    width: 120,
    height: 120,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentCompleteBadgeIcon: {
    color: '#16a34a',
    fontWeight: '700',
  },
  paymentCompleteMessage: {
    color: '#1f2937',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
  paymentCompleteFooter: {
    alignItems: 'center',
    width: '100%',
  },
  paymentCompleteButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentCompleteButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  barcodeScanContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  barcodeScanTitle: {
    color: '#111827',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  barcodeIllustration: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  phoneContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneScreen: {
    width: 200,
    height: 360,
    backgroundColor: '#ff6b35',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  phoneStatusBar: {
    width: '100%',
    height: 24,
    backgroundColor: '#ff6b35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  signalIcon: {
    width: 16,
    height: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#ffffff',
    borderTopWidth: 2,
    borderTopColor: '#ffffff',
  },
  wifiIcon: {
    width: 14,
    height: 10,
    borderTopWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftWidth: 2,
    borderLeftColor: '#ffffff',
  },
  statusBarTime: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  batteryIcon: {
    width: 20,
    height: 10,
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 2,
  },
  barcodeBox: {
    width: '90%',
    height: 80,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  barcodePattern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  barcodeLine: {
    backgroundColor: '#000000',
  },
  barcodeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  qrCode: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 4,
  },
  qrRow: {
    flexDirection: 'row',
    flex: 1,
  },
  qrCell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  paymentCompleteSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentCompleteSecondaryLabel: {
    color: '#2563eb',
    fontWeight: '600',
  },
  phoneInputHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  phoneInputTitle: {
    color: '#111827',
    fontWeight: '700',
  },
  phoneInputCloseButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  phoneInputClose: {
    color: '#4b5563',
    fontWeight: '600',
  },
  phoneInputDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 16,
  },
  phoneInputBody: {
    marginTop: 24,
  },
  phoneInputDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneInputDisplay: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
  },
  phoneInputDisplayText: {
    color: '#111827',
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  phoneInputDeleteButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneInputDeleteIcon: {
    color: '#1f2937',
    fontWeight: '600',
  },
  phoneInputKeypad: {
    marginTop: 16,
  },
  phoneKeypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  phoneKeypadButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  phoneKeypadNumber: {
    color: '#111827',
    fontWeight: '600',
  },
  phoneKeypadBackButton: {
    backgroundColor: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  phoneKeypadBackIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneKeypadBackIconText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  phoneInputError: {
    color: '#b91c1c',
    fontWeight: '500',
  },
  phoneInputFooter: {
    alignItems: 'center',
    width: '100%',
  },
  phoneInputPrimaryButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneInputPrimaryLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  phoneInputSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneInputSecondaryLabel: {
    color: '#4b5563',
    fontWeight: '600',
  },
  qrSentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  qrSentTitle: {
    color: '#111827',
    fontWeight: '700',
  },
  qrSentCloseButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  qrSentClose: {
    color: '#4b5563',
    fontWeight: '600',
  },
  qrSentDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 16,
  },
  qrSentBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  qrSentBadge: {
    width: 120,
    height: 120,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrSentBadgeIcon: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  qrSentMessage: {
    color: '#1f2937',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
  qrSentFooter: {
    alignItems: 'center',
    width: '100%',
  },
  qrSentButton: {
    width: '100%',
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrSentButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    color: '#111827',
  },
  chatSendButton: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  chatSendButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default MenuListScreen;

