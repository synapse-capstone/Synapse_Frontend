
// React Native에서 localhost 접근 설정
// Android 에뮬레이터: 10.0.2.2 사용
// iOS 시뮬레이터: localhost 사용
// 실제 기기: 개발 서버의 실제 IP 주소 사용 필요
export const getBaseUrl = () => 'http://192.168.0.15:8000';

const BASE_URL = getBaseUrl();

// 세션 시작
export async function startSession() {
  try {
    const res = await fetch(`${BASE_URL}/session/start`, {
      method: "POST",
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error("세션 시작 실패:", error);
    throw error;
  }
}

// 텍스트 전송
export async function sendText(sessionId, text) {
  try {
    const res = await fetch(`${BASE_URL}/session/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        text: text,
      }),
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error("텍스트 전송 실패:", error);
    throw error;
  }
}

// 음성 파일 전송
export async function sendVoice(sessionId, audioUri) {
  console.log('[VOICE] sendVoice 호출됨 - audioUri:', audioUri, 'sessionId:', sessionId);

  try {
    console.log('[VOICE] 백엔드로 음성 파일 전송 시작...');

    if (!audioUri) {
      console.error('[VOICE] audioUri가 없습니다.');
      return null;
    }

    if (!sessionId) {
      console.error('[VOICE] sessionId가 없습니다.');
      return null;
    }

    // 변경: 100ms 대기 후 전송
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 1) FormData 만들기
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/3gpp',
      name: 'voice.m4a',
    });

    const url = `${BASE_URL}/session/voice?session_id=${sessionId}`;
    console.log('[VOICE] fetch 시작 - URL:', url);

    // 2) fetch 호출 (❗ headers에 Content-Type 넣지 말 것)
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    console.log('[VOICE] fetch 응답 status:', res.status);

    const text = await res.text();
    console.log('[VOICE] 응답 raw:', text);

    if (!res.ok) {
      console.error('[VOICE] 응답 status가 정상범위가 아닙니다:', res.status);
      console.error('[VOICE] 에러 응답 본문:', text);
      return null;
    }

    let data = null;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[VOICE] JSON 파싱 에러:', e);
      return null;
    }

    console.log('[VOICE] 파싱된 응답 JSON:', data);
    return data;
  } catch (e) {
    console.error('[VOICE] 음성 전송/응답 처리 중 에러', e);
    throw e;
  }
}
