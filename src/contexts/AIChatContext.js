import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getBaseUrl, sendText, sendVoice, startSession } from '../api/ai';

const AIChatContext = createContext();

export const useAIChat = () => {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error('useAIChat must be used within AIChatProvider');
  }
  
  // 안전하게 기본값 제공
  return {
    sessionId: context?.sessionId || null,
    messages: Array.isArray(context?.messages) ? context.messages : [],
    isAILoading: Boolean(context?.isAILoading),
    inputText: context?.inputText || '',
    setInputText: context?.setInputText || (() => {}),
    appendMessage: context?.appendMessage || (() => {}),
    updateMessageText: context?.updateMessageText || (() => {}),
    sendMessage: context?.sendMessage || (async () => null),
    sendVoiceMessage: context?.sendVoiceMessage || (async () => null),
    clearMessages: context?.clearMessages || (() => {}),
    speakAssistantMessage: context?.speakAssistantMessage || (async () => {}),
    playTtsFromResponse: context?.playTtsFromResponse || (async () => {}),
    setAddToCartCallback: context?.setAddToCartCallback || (() => {}),
    addCartItem: context?.addCartItem || (() => {}),
    setRemoveFromCartCallback: context?.setRemoveFromCartCallback || (() => {}),
    removeCartItem: context?.removeCartItem || (() => {}),
  };
};

export const AIChatProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const ttsSoundRef = useRef(null);
  const baseUrlRef = useRef(getBaseUrl());
  
  // 장바구니 추가 콜백 (각 화면에서 등록)
  const addToCartCallbackRef = useRef(null);
  // 장바구니 제거 콜백 (각 화면에서 등록)
  const removeFromCartCallbackRef = useRef(null);

  // 고유 ID 생성 함수
  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // 메시지 추가
  const appendMessage = (text, author = 'assistant') => {
    let insertedId = null;
    setMessages((prev) => {
      const existingIds = new Set(prev.map(msg => msg.id));
      let newId = `${author}-${generateUniqueId()}`;
      while (existingIds.has(newId)) {
        newId = `${author}-${generateUniqueId()}`;
      }
      insertedId = newId;
      return [
        ...prev,
        {
          id: newId,
          author,
          text,
        },
      ];
    });
    return insertedId;
  };

  const updateMessageText = (messageId, newText) => {
    if (!messageId) return;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              text: newText,
            }
          : msg
      )
    );
  };

  const cleanupTtsSound = useCallback(async () => {
    if (!ttsSoundRef.current) return;
    const sound = ttsSoundRef.current;
    ttsSoundRef.current = null;
    try {
      sound.setOnPlaybackStatusUpdate(null);
      await sound.stopAsync();
    } catch (e) {
      // ignore
    }
    try {
      await sound.unloadAsync();
    } catch (e) {
      // ignore
    }
  }, []);

  const resolveTtsUrl = useCallback((response) => {
    if (!response) return null;

    const pickUrl = (urlCandidate) => {
      if (!urlCandidate) return null;

      const ensureBasePrefix = (path) => {
        const trimmed = path.replace(/^\/+/, '');
        return `${baseUrlRef.current.replace(/\/+$/, '')}/${trimmed}`;
      };

      if (/^https?:\/\//i.test(urlCandidate)) {
        try {
          const parsedUrl = new URL(urlCandidate);
          const baseParsed = new URL(baseUrlRef.current);
          const loopbackHosts = ['127.0.0.1', 'localhost', '::1'];
          if (loopbackHosts.includes(parsedUrl.hostname)) {
            parsedUrl.protocol = baseParsed.protocol;
            parsedUrl.hostname = baseParsed.hostname;
            parsedUrl.port = baseParsed.port;
            return parsedUrl.toString();
          }
          return urlCandidate;
        } catch (error) {
          return urlCandidate;
        }
      }

      return ensureBasePrefix(urlCandidate);
    };

    const directUrl = response.tts_url || response.ttsUrl;
    if (directUrl) {
      return pickUrl(directUrl);
    }

    const directPath = response.tts_path || response.ttsPath;
    if (directPath) {
      const normalized = directPath.replace(/^\/+/, '');
      if (normalized.startsWith('tts/')) {
        return `${baseUrlRef.current.replace(/\/+$/, '')}/${normalized}`;
      }
      return `${baseUrlRef.current.replace(/\/+$/, '')}/tts/${normalized}`;
    }

    if (response.data && typeof response.data === 'object') {
      return resolveTtsUrl(response.data);
    }

    return null;
  }, []);

  const playTtsFromResponse = useCallback(async (response) => {
    const ttsUrl = resolveTtsUrl(response);
    if (!ttsUrl) {
      return;
    }

    try {
      await cleanupTtsSound();
      const { sound } = await Audio.Sound.createAsync(
        { uri: ttsUrl },
        { shouldPlay: true }
      );
      ttsSoundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status || status.isLoaded === false) {
          return;
        }
        if (status.didJustFinish) {
          sound.setOnPlaybackStatusUpdate(null);
          sound.unloadAsync().catch(() => {}).finally(() => {
            if (ttsSoundRef.current === sound) {
              ttsSoundRef.current = null;
            }
          });
        }
      });
    } catch (error) {
      console.error('TTS 재생 실패:', error);
    }
  }, [cleanupTtsSound, resolveTtsUrl]);

  // AI 세션 시작
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const response = await startSession();
        if (response.session_id) {
          setSessionId(response.session_id);
          console.log('AI 세션이 시작되었습니다:', response.session_id);
          
          // 백엔드 /session/start에서 이미 greeting 단계 응답을 받았으므로
          // 추가로 /session/text를 호출할 필요 없음
          // 백엔드 /session/start가 _handle_turn(ctx, "")를 호출하여
          // greeting 단계 응답("안녕하세요. AI음성 키오스크 말로입니다. 주문을 도와드릴게요.") 반환
          if (response.response_text) {
            appendMessage(response.response_text, 'assistant');
            // 백엔드에서 생성한 TTS 재생
            await playTtsFromResponse(response);
          }
        }
      } catch (error) {
        console.error('AI 세션 시작 실패:', error);
        appendMessage('AI 서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', 'assistant');
      }
    };

    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extractAiResponse = (response) => {
    if (!response) {
      return null;
    }

    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object') {
      if (response.response_text) return response.response_text;
      if (response.response) return response.response;
      if (response.message) return response.message;
      if (response.text) return response.text;
      if (response.answer) return response.answer;
      if (response.reply) return response.reply;
      if (response.content) return response.content;
      if (response.data) return response.data;

      const values = Object.values(response);
      if (values.length > 0 && typeof values[0] === 'string') {
        return values[0];
      }
    }

    return null;
  };

  const extractUserSpeech = (response) => {
    if (!response) {
      return null;
    }

    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object') {
      if (typeof response.stt_text === 'string' && response.stt_text.trim()) {
        return response.stt_text;
      }

      const candidateKeys = [
        'user_text',
        'userText',
        'user_message',
        'userMessage',
        'user',
        'user_input',
        'userInput',
        'transcript',
        'transcription',
        'recognized_text',
        'recognizedText',
        'speech_text',
        'speechText',
        'spoken_text',
        'spokenText',
        'utterance',
      ];

      for (const key of candidateKeys) {
        if (typeof response[key] === 'string' && response[key].trim()) {
          return response[key];
        }
      }

      // 중첩된 data 구조에서도 찾아보기
      if (response.data && typeof response.data === 'object') {
        return extractUserSpeech(response.data);
      }
    }

    return null;
  };

  // 백엔드 payload에서 장바구니에 항목 추가하는 함수
  const addCartItem = useCallback((backendPayload) => {
    console.log('addCartItem 호출됨 (AIChatContext):', backendPayload);
    
    if (!backendPayload) {
      console.log('backendPayload가 없어서 종료');
      return;
    }

    // addToCartCallback이 등록되어 있으면 호출
    if (addToCartCallbackRef.current) {
      console.log('addToCartCallback 호출');
      addToCartCallbackRef.current(backendPayload);
    } else {
      console.warn('addToCartCallback이 등록되지 않았습니다.');
    }
  }, []);

  const removeCartItem = useCallback((backendPayload) => {
    console.log('removeCartItem 호출됨 (AIChatContext):', backendPayload);
    
    if (!backendPayload) {
      console.log('backendPayload가 없어서 종료');
      return;
    }

    // removeFromCartCallback이 등록되어 있으면 호출
    if (removeFromCartCallbackRef.current) {
      console.log('removeFromCartCallback 호출');
      removeFromCartCallbackRef.current(backendPayload);
    } else {
      console.warn('removeFromCartCallback이 등록되지 않았습니다.');
    }
  }, []);

  // addToCartCallback 등록 함수
  const setAddToCartCallback = useCallback((callback) => {
    addToCartCallbackRef.current = callback;
  }, []);

  // removeFromCartCallback 등록 함수
  const setRemoveFromCartCallback = useCallback((callback) => {
    removeFromCartCallbackRef.current = callback;
  }, []);

  // 텍스트 전송 및 AI 응답 받기
  const sendMessage = async (text, onResponse) => {
    if (!text.trim() || !sessionId) {
      return null;
    }

    const userMessage = text.trim();
    setInputText('');

    appendMessage(userMessage, 'user');
    setIsAILoading(true);

    try {
      const response = await sendText(sessionId, userMessage);
      
      // 백엔드 응답의 remove_from_cart 필드 확인 (제거 요청 우선 처리)
      if (response?.backend_payload?.remove_from_cart) {
        console.log('백엔드 remove_from_cart 필드 감지 (sendMessage), 장바구니에서 제거');
        removeCartItem(response);
      }
      // 백엔드 응답의 add_to_cart 필드 확인 또는 backend_payload 확인
      else if (response?.add_to_cart || response?.backend_payload) {
        // target_element_id가 있으면 위치 질문 응답이므로 장바구니 추가 안 함
        const hasTargetElement = !!response?.target_element_id;
        
        // 위치 질문이나 결제 요청이 아닌 경우에만 장바구니 추가
        const isLocationQuestion = userMessage && (
          /(?:어디|위치|어디에|어디서)/.test(userMessage) ||
          (/(?:장바구니|장바구니가|장바구니는)/.test(userMessage) && /(?:어디|위치|어디에|어디서)/.test(userMessage))
        );
        const isPaymentRequest = userMessage && /(?:결제|결제하기|결제할게|결제하겠)/.test(userMessage);
        
        if (!hasTargetElement && !isLocationQuestion && !isPaymentRequest) {
          console.log('백엔드 add_to_cart 또는 backend_payload 필드 감지 (sendMessage), 장바구니에 추가');
          addCartItem(response);
        } else {
          console.log('target_element_id 있음 또는 위치 질문 또는 결제 요청 - 장바구니 추가 안 함');
        }
      } else if (response?.context?.menu_id && response?.context?.menu_name) {
        // target_element_id가 있으면 위치 질문 응답이므로 장바구니 추가 안 함
        const hasTargetElement = !!response?.target_element_id;
        
        // 위치 질문이나 결제 요청이 아닌 경우에만 장바구니 추가
        const isLocationQuestion = userMessage && (
          /(?:어디|위치|어디에|어디서)/.test(userMessage) ||
          (/(?:장바구니|장바구니가|장바구니는)/.test(userMessage) && /(?:어디|위치|어디에|어디서)/.test(userMessage))
        );
        const isPaymentRequest = userMessage && /(?:결제|결제하기|결제할게|결제하겠)/.test(userMessage);
        
        if (!hasTargetElement && !isLocationQuestion && !isPaymentRequest) {
          console.log('백엔드 context에 메뉴 정보 있음 (sendMessage), 장바구니에 추가');
          addCartItem(response);
        } else {
          console.log('target_element_id 있음 또는 위치 질문 또는 결제 요청 - 장바구니 추가 안 함');
        }
      }
      
      // 백엔드 응답의 context.step 확인 (디버깅용)
      if (response && response.context) {
        console.log('백엔드 응답 - context.step:', response.context.step);
        console.log('백엔드 응답 - 전체 context:', response.context);
        console.log('백엔드 응답 - response_text:', response.response_text);
        console.log('전송한 메시지:', userMessage);
      }
      
      const aiResponse = extractAiResponse(response);

      if (aiResponse) {
        appendMessage(aiResponse, 'assistant');
        await playTtsFromResponse(response);
        if (onResponse) {
          // 백엔드 응답 전체를 전달 (context 정보 포함)
          onResponse(aiResponse, response);
        }
        return aiResponse;
      } else {
        console.warn('응답을 파싱할 수 없습니다. 원본 응답:', response);
        appendMessage('응답을 받았습니다.', 'assistant');
        return null;
      }
    } catch (error) {
      console.error('텍스트 전송 실패:', error);
      appendMessage('메시지 전송에 실패했습니다. 다시 시도해주세요.', 'assistant');
      return null;
    } finally {
      setIsAILoading(false);
    }
  };

  // 음성 전송 및 AI 응답 받기
  const sendVoiceMessage = async (audioUri, onResponse) => {
    console.log('sendVoiceMessage 호출됨 - audioUri:', audioUri, 'sessionId:', sessionId);
    
    if (!audioUri || !sessionId) {
      console.error('음성 전송 실패 - audioUri 또는 sessionId가 없음:', { audioUri, sessionId });
      appendMessage('음성 메시지를 전송할 수 없습니다. 세션을 확인해주세요.', 'assistant');
      return null;
    }

    const placeholderId = appendMessage('음성 메시지를 전송했어요.', 'user');
    setIsAILoading(true);

    try {
      console.log('[VOICE] 백엔드로 음성 파일 전송 시작...');
      const response = await sendVoice(sessionId, audioUri);
      console.log('[VOICE] 백엔드 음성 응답 받음:', response);
      
      // 백엔드 응답의 remove_from_cart 필드 확인 (제거 요청 우선 처리)
      if (response?.backend_payload?.remove_from_cart) {
        console.log('백엔드 remove_from_cart 필드 감지 (sendVoiceMessage), 장바구니에서 제거');
        removeCartItem(response);
      }
      // 백엔드 응답의 add_to_cart 필드 확인 또는 backend_payload 확인
      else if (response?.add_to_cart || response?.backend_payload) {
        // target_element_id가 있으면 위치 질문 응답이므로 장바구니 추가 안 함
        const hasTargetElement = !!response?.target_element_id;
        
        // 위치 질문이나 결제 요청이 아닌 경우에만 장바구니 추가
        // 음성 메시지의 경우 stt_text를 사용하여 확인
        const userSpeech = response?.stt_text || '';
        const isLocationQuestion = userSpeech && (
          /(?:어디|위치|어디에|어디서)/.test(userSpeech) ||
          (/(?:장바구니|장바구니가|장바구니는)/.test(userSpeech) && /(?:어디|위치|어디에|어디서)/.test(userSpeech))
        );
        const isPaymentRequest = userSpeech && /(?:결제|결제하기|결제할게|결제하겠)/.test(userSpeech);
        
        if (!hasTargetElement && !isLocationQuestion && !isPaymentRequest) {
          console.log('백엔드 add_to_cart 또는 backend_payload 필드 감지 (sendVoiceMessage), 장바구니에 추가');
          addCartItem(response);
        } else {
          console.log('target_element_id 있음 또는 위치 질문 또는 결제 요청 - 장바구니 추가 안 함');
        }
      } else if (response?.context?.menu_id && response?.context?.menu_name) {
        // target_element_id가 있으면 위치 질문 응답이므로 장바구니 추가 안 함
        const hasTargetElement = !!response?.target_element_id;
        
        // 위치 질문이나 결제 요청이 아닌 경우에만 장바구니 추가
        // 음성 메시지의 경우 stt_text를 사용하여 확인
        const userSpeech = response?.stt_text || '';
        const isLocationQuestion = userSpeech && (
          /(?:어디|위치|어디에|어디서)/.test(userSpeech) ||
          (/(?:장바구니|장바구니가|장바구니는)/.test(userSpeech) && /(?:어디|위치|어디에|어디서)/.test(userSpeech))
        );
        const isPaymentRequest = userSpeech && /(?:결제|결제하기|결제할게|결제하겠)/.test(userSpeech);
        
        if (!hasTargetElement && !isLocationQuestion && !isPaymentRequest) {
          console.log('백엔드 context에 메뉴 정보 있음 (sendVoiceMessage), 장바구니에 추가');
          addCartItem(response);
        } else {
          console.log('target_element_id 있음 또는 위치 질문 또는 결제 요청 - 장바구니 추가 안 함');
        }
      }
      
      // 백엔드 응답의 context.step 확인 (디버깅용)
      if (response && response.context) {
        console.log('백엔드 응답 - context.step:', response.context.step);
        console.log('백엔드 응답 - 전체 context:', response.context);
        console.log('백엔드 응답 - response_text:', response.response_text);
      }
      
      const userSpeech = extractUserSpeech(response);
      console.log('STT 결과 (사용자 발화):', userSpeech);
      
      if (userSpeech) {
        updateMessageText(placeholderId, userSpeech);
      }
      
      const aiResponse = extractAiResponse(response);
      console.log('AI 응답 텍스트:', aiResponse);

      if (aiResponse) {
        appendMessage(aiResponse, 'assistant');
        await playTtsFromResponse(response);
        if (onResponse) {
          // 백엔드 응답 전체를 전달 (context 정보 포함)
          onResponse(aiResponse, response);
        }
        // 전체 백엔드 응답 반환
        return response;
      } else {
        if (!userSpeech) {
          updateMessageText(placeholderId, '음성 메시지를 전송했어요. (텍스트 인식 실패)');
        }
        appendMessage('음성 응답을 파싱하지 못했습니다.', 'assistant');
        return null;
      }
    } catch (error) {
      console.error('[VOICE] 음성 전송/응답 처리 중 에러', error);
      console.error('[VOICE] 에러 상세:', error.message, error.stack);
      updateMessageText(placeholderId, '음성 메시지 전송에 실패했습니다.');
      appendMessage('음성 메시지 전송에 실패했습니다. 다시 시도해주세요.', 'assistant');
      return null;
    } finally {
      setIsAILoading(false);
    }
  };

  // 메시지 초기화
  const clearMessages = () => {
    setMessages([]);
  };

  // Assistant 메시지와 TTS를 함께 처리하는 헬퍼 함수
  const speakAssistantMessage = useCallback(async (text) => {
    // ✅ 수정 구조: TTS 먼저, 메시지 렌더는 나중
    try {
      // 1) 기존 TTS 중지
      await Speech.stop();
      
      // 2) TTS 바로 재생 (화면 리렌더 전에 실행)
      Speech.speak(text, { language: 'ko' });
      
      // 3) 메시지 렌더는 나중에 (TTS 재생 후)
      appendMessage(text, 'assistant');
    } catch (e) {
      console.log('TTS 오류:', e);
      // 오류 발생 시에도 메시지는 표시
      appendMessage(text, 'assistant');
    }
  }, [appendMessage]);

  const value = useMemo(() => ({
    sessionId: sessionId || null,
    messages: Array.isArray(messages) ? messages : [],
    isAILoading: Boolean(isAILoading),
    inputText: inputText || '',
    setInputText,
    appendMessage,
    updateMessageText,
    sendMessage,
    sendVoiceMessage,
    clearMessages,
    speakAssistantMessage,
    playTtsFromResponse,
    setAddToCartCallback,
    addCartItem,
    setRemoveFromCartCallback,
    removeCartItem,
  }), [sessionId, messages, isAILoading, inputText, speakAssistantMessage, playTtsFromResponse, setAddToCartCallback, addCartItem, setRemoveFromCartCallback, removeCartItem]);

  useEffect(() => {
    return () => {
      cleanupTtsSound();
    };
  }, [cleanupTtsSound]);

  return <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>;
};

