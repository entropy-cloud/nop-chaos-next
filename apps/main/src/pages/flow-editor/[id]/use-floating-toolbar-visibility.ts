import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

export function useFloatingToolbarVisibility(
  id: string,
  selected: boolean,
  activeId: string | null,
  setActive: Dispatch<SetStateAction<string | null>>,
) {
  const [hovered, setHovered] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    clearHideTimer();
    setHovered(true);
    setActive(id);
  }, [clearHideTimer, id, setActive]);

  const hide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setHovered(false);
      setActive((current) => (current === id ? null : current));
    }, 160);
  }, [clearHideTimer, id, setActive]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  return {
    showToolbar: hovered || selected || activeId === id,
    show,
    hide,
  };
}
