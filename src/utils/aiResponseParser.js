// AI 응답을 분석하여 다음 단계를 결정하는 유틸리티

/**
 * AI 응답에서 다음 단계를 파악
 * @param {string} response - AI 응답 텍스트
 * @returns {object} - 다음 단계 정보 { step, params }
 */
export const parseAIResponse = (response) => {
  if (!response || typeof response !== 'string') {
    return null;
  }

  const lowerResponse = response.toLowerCase();

  // 1. 먹고가기/들고가기 단계
  if (lowerResponse.includes('매장') || lowerResponse.includes('먹고') || lowerResponse.includes('포장') || lowerResponse.includes('들고')) {
    return {
      step: 'eatOrTake',
      params: {},
    };
  }

  // 2. 메뉴 종류 선택 단계
  if (lowerResponse.includes('메뉴') || lowerResponse.includes('커피') || lowerResponse.includes('차') || lowerResponse.includes('음료') || lowerResponse.includes('간식')) {
    return {
      step: 'menuList',
      params: {},
    };
  }

  // 3. 온도 선택 단계
  if (lowerResponse.includes('따뜻') || lowerResponse.includes('핫') || lowerResponse.includes('아이스') || lowerResponse.includes('차갑') || lowerResponse.includes('온도')) {
    return {
      step: 'temperature',
      params: {},
    };
  }

  // 4. 사이즈 선택 단계
  if (lowerResponse.includes('사이즈') || lowerResponse.includes('크기') || lowerResponse.includes('톨') || lowerResponse.includes('그란데') || lowerResponse.includes('벤티') || lowerResponse.includes('작은') || lowerResponse.includes('중간') || lowerResponse.includes('큰')) {
    return {
      step: 'size',
      params: {},
    };
  }

  // 5. 옵션 선택 단계
  if (lowerResponse.includes('옵션') || lowerResponse.includes('디카페인') || lowerResponse.includes('시럽') || lowerResponse.includes('샷') || lowerResponse.includes('휘핑')) {
    return {
      step: 'option',
      params: {},
    };
  }

  // 6. 주문 확인 단계
  if (lowerResponse.includes('확인') || lowerResponse.includes('장바구니') || lowerResponse.includes('주문') || lowerResponse.includes('담겼')) {
    return {
      step: 'cart',
      params: {},
    };
  }

  // 7. 결제 단계
  if (lowerResponse.includes('결제') || lowerResponse.includes('카드') || lowerResponse.includes('현금') || lowerResponse.includes('페이')) {
    return {
      step: 'payment',
      params: {},
    };
  }

  return null;
};

/**
 * 메뉴 이름에서 메뉴 ID 찾기
 */
export const findMenuIdByName = (menuName, menuItems) => {
  const normalizedName = menuName.toLowerCase().replace(/\s+/g, '');
  return menuItems.find(item => {
    const normalizedItemName = item.name.toLowerCase().replace(/\s+/g, '');
    return normalizedItemName.includes(normalizedName) || normalizedName.includes(normalizedItemName);
  });
};




