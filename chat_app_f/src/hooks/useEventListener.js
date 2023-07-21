import { useEffect, useRef, useLayoutEffect } from 'react';

// ----------------------------------------------------------------------

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function useEventListener(eventName, handler, element, options) {
  // 핸들러를 저장하는 참조 만들기
  const savedHandler = useRef(handler);

  useIsomorphicLayoutEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    // 청취 대상 정의
    const targetElement = element?.current || window;
    if (!(targetElement && targetElement.addEventListener)) {
      return;
    }

    // ref에 저장된 처리기 함수를 호출하는 이벤트 수신기 만들기
    const eventListener = (event) => savedHandler.current(event);

    targetElement.addEventListener(eventName, eventListener, options);

    // 정리 시 이벤트 수신기 제거
    return () => {
      targetElement.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element, options]);
}

export default useEventListener;
