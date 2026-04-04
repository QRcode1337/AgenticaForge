/**
 * useResponsiveSidebar — collapsible sidebar for screens < 768px
 *
 * Provides:
 *  - isCollapsed / toggle / open / close
 *  - isMobile  (true when viewport < 768px)
 *  - Touch-friendly: swipe-right to open, swipe-left to close
 *  - Overlay backdrop on mobile when sidebar is open
 *
 * Tailwind utility classes used:
 *   Container:  "fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out"
 *   Collapsed:  "-translate-x-full"
 *   Expanded:   "translate-x-0"
 *   Backdrop:   "fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
 *   Toggle btn: "md:hidden fixed top-4 left-4 z-50"
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const MOBILE_BREAKPOINT = 768;
const SWIPE_THRESHOLD = 50; // px

export function useResponsiveSidebar(defaultCollapsed = false) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,
  );
  const [isCollapsed, setIsCollapsed] = useState(
    typeof window !== 'undefined'
      ? window.innerWidth < MOBILE_BREAKPOINT
        ? true
        : defaultCollapsed
      : defaultCollapsed,
  );

  // Track touch for swipe gestures
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Respond to viewport changes
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const mobile = e.matches;
      setIsMobile(mobile);
      if (mobile) setIsCollapsed(true); // auto-collapse on shrink
    };
    handler(mql); // initial
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Swipe gestures (edge swipe to open, anywhere to close)
  useEffect(() => {
    if (!isMobile) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;

      // Only count horizontal swipes (ignore vertical scroll)
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0 && touchStartX.current < 30) {
          // Swipe right from left edge → open
          setIsCollapsed(false);
        } else if (dx < 0 && !isCollapsed) {
          // Swipe left anywhere → close
          setIsCollapsed(true);
        }
      }
      touchStartX.current = null;
      touchStartY.current = null;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobile, isCollapsed]);

  const toggle = useCallback(() => setIsCollapsed((c) => !c), []);
  const open = useCallback(() => setIsCollapsed(false), []);
  const close = useCallback(() => setIsCollapsed(true), []);

  // Close sidebar when clicking backdrop
  const onBackdropClick = useCallback(() => {
    if (isMobile && !isCollapsed) setIsCollapsed(true);
  }, [isMobile, isCollapsed]);

  /** Tailwind class helpers */
  const sidebarClasses = [
    'fixed inset-y-0 left-0 z-40 w-64',
    'transform transition-transform duration-200 ease-in-out',
    'bg-gray-900 border-r border-gray-800',
    // On desktop: static positioning
    !isMobile && 'md:relative md:translate-x-0',
    // Collapse/expand
    isCollapsed ? '-translate-x-full' : 'translate-x-0',
  ]
    .filter(Boolean)
    .join(' ');

  const backdropClasses =
    isMobile && !isCollapsed
      ? 'fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-200'
      : 'hidden';

  const toggleButtonClasses =
    'md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors touch-manipulation';

  /** Main content wrapper: shifts right on desktop when sidebar visible */
  const contentClasses = [
    'flex-1 min-w-0 transition-all duration-200',
    !isMobile && !isCollapsed && 'md:ml-64',
    // Full-width panels on mobile
    isMobile && 'w-full',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    isMobile,
    isCollapsed,
    toggle,
    open,
    close,
    onBackdropClick,
    sidebarClasses,
    backdropClasses,
    toggleButtonClasses,
    contentClasses,
  };
}
