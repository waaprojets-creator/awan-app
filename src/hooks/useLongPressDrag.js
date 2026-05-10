import { useState, useRef, useEffect } from 'react';

export function useLongPressDrag(controls, containerRef, delay = 500) {
  const timeoutRef = useRef(null);
  const startPos = useRef(null);
  const isDragging = useRef(false);

  // Refs miroir pour éviter les stale closures dans les handlers
  const isPressedRef = useRef(false);
  const isConfirmedRef = useRef(false);

  // State uniquement pour le rendu visuel
  const [isPressed, setIsPressed] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Helpers pour synchroniser ref + state
  const setPressed = (v) => { isPressedRef.current = v; setIsPressed(v); };
  const setConfirmed = (v) => { isConfirmedRef.current = v; setIsConfirmed(v); };

  // Reset complet (factorisé)
  const reset = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPressed(false);
    setConfirmed(false);
    isDragging.current = false;
    startPos.current = null;
  };

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handlePointerDown = (e) => {
    // Capture du pointer pour garantir la réception des events suivants
    if (e.currentTarget && e.pointerId !== undefined) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    }

    startPos.current = { x: e.clientX, y: e.clientY };
    setPressed(true);
    setConfirmed(false);
    isDragging.current = false;

    timeoutRef.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
      setConfirmed(true);
    }, delay);
  };

  const handlePointerMove = (e) => {
    if (!isPressedRef.current || !startPos.current) return;

    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const THRESHOLD = 10;

    if (isConfirmedRef.current) {
      // Démarrage du drag après confirmation
      if (!isDragging.current && (absDx > THRESHOLD || absDy > THRESHOLD)) {
        isDragging.current = true;
        controls.start(e);
      }
    } else {
      // Mouvement avant confirmation → annulation
      if (absDx > THRESHOLD || absDy > THRESHOLD) {
        reset();
      }
    }
  };

  const handlePointerUp = () => {
    reset();
  };

  const onDragEnd = () => {
    reset();
  };

  return {
    isPressed,
    isConfirmed,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    onDragEnd,
  };
}
