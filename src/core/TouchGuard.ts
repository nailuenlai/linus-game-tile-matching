/**
 * Layer 3 & Layer 4 mobile touch & anti-accidental-zoom protection.
 * Follows the 4-layer defense specification:
 * - Document-level passive:false blocking of Safari gesture* events, dblclick,
 *   multi-touch touchstart (>1 finger), and multi-touch/pinch-scaled touchmove.
 * - Preserves single-finger clicks & vertical/horizontal scrolling inside `.scroll-y` / `.scroll-x`.
 * - Element-level guard helper for canvas & real-time HUD buttons.
 */
export function installDocumentTouchGuard(onFirstPointerDown?: () => void): () => void {
  const prevent = (e: Event): void => {
    e.preventDefault();
  };

  const onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };

  const onTouchMove = (e: TouchEvent): void => {
    const scale = (e as TouchEvent & { scale?: number }).scale;
    if (e.touches.length > 1 || (typeof scale === 'number' && scale !== 1)) {
      e.preventDefault();
    }
  };

  let unlocked = false;
  const onPointerDownUnlock = (): void => {
    if (!unlocked) {
      unlocked = true;
      onFirstPointerDown?.();
    }
  };

  document.addEventListener('gesturestart', prevent, { passive: false });
  document.addEventListener('gesturechange', prevent, { passive: false });
  document.addEventListener('gestureend', prevent, { passive: false });
  document.addEventListener('dblclick', prevent, { passive: false });
  document.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('pointerdown', onPointerDownUnlock, { passive: true });

  return () => {
    document.removeEventListener('gesturestart', prevent);
    document.removeEventListener('gesturechange', prevent);
    document.removeEventListener('gestureend', prevent);
    document.removeEventListener('dblclick', prevent);
    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('pointerdown', onPointerDownUnlock);
  };
}

/**
 * Protects a real-time interactive surface (canvas or instant HUD button)
 * against iOS/Android double-tap zoom and delayed ghost clicks.
 */
export function bindInstantTouchElement(
  el: HTMLElement,
  onPress: (e: PointerEvent) => void,
): () => void {
  const stopTouch = (e: Event): void => {
    e.preventDefault();
  };
  const onPointerDown = (e: PointerEvent): void => {
    e.stopPropagation();
    onPress(e);
  };

  el.addEventListener('touchstart', stopTouch, { passive: false });
  el.addEventListener('touchend', stopTouch, { passive: false });
  el.addEventListener('dblclick', stopTouch, { passive: false });
  el.addEventListener('pointerdown', onPointerDown);

  return () => {
    el.removeEventListener('touchstart', stopTouch);
    el.removeEventListener('touchend', stopTouch);
    el.removeEventListener('dblclick', stopTouch);
    el.removeEventListener('pointerdown', onPointerDown);
  };
}

export function isCoarsePointerDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}
