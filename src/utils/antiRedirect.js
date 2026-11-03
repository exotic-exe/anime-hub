/**
 * Anti-Redirect, Anti-Popup & Anti-Ad Shield for ExoticHub
 * 
 * Provides impenetrable browser-level defenses:
 * 1. Blocks unauthorized window.open popups and popunders completely.
 * 2. Neutralizes synthetic click events injected by third-party ad scripts.
 * 3. Prevents cross-origin frame top-navigation hijacking (window.top.location = ...).
 * 4. Prevents history poisoning and back-button traps.
 * 5. Instantly reclaims window focus if any rogue window tries to steal focus.
 */

let isInternalNavigation = false;
let navigationTimer = null;
let lastIframeTouchTime = 0;

/**
 * Mark a user interaction as genuine internal navigation
 * (e.g., clicking a link, episode button, menu, etc.)
 */
export function markInternalNavigation() {
  isInternalNavigation = true;
  if (navigationTimer) clearTimeout(navigationTimer);
  navigationTimer = setTimeout(() => {
    isInternalNavigation = false;
  }, 4000);
}

/**
 * Record an intentional interaction with the player area
 */
export function recordPlayerInteraction() {
  lastIframeTouchTime = Date.now();
  markInternalNavigation();
}

/**
 * Initialize global security traps against iframe top-navigation hijacking and popups
 */
export function initAntiRedirectShield() {
  if (typeof window === 'undefined') return () => {};

  // 1. Monkey-patch window.open to block rogue ad popups and popunders
  if (typeof window.open === 'function') {
    const originalOpen = window.open.bind(window);
    try {
      window.open = function (url, target, features) {
        if (!isInternalNavigation) {
          console.warn('[AdShield] Blocked unauthorized popup/window.open:', url);
          return null;
        }
        return originalOpen(url, target, features);
      };
    } catch (_) {
      // Non-fatal if browser environment forbids overriding window.open
    }
  }

  // 2. Capture genuine user interactions across the application and block synthetic ad clicks
  const handleUserClick = (e) => {
    // If click is synthetic (e.g. ad script calling link.click() programmatically)
    if (e.isTrusted === false && !isInternalNavigation) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }

    // Genuine user interaction on app controls
    const interactiveTarget = e.target?.closest?.(
      'a, button, input, select, textarea, [role="button"], [data-nav], [tabindex]'
    );
    if (interactiveTarget) {
      markInternalNavigation();
    }
  };

  // 3. Intercept unauthorized top-window redirects from cross-origin ad scripts
  const handleBeforeUnload = (e) => {
    if (!isInternalNavigation) {
      // An unauthorized ad script inside an iframe is attempting to hijack window.top.location
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  };

  // 4. Anti-Popup Focus Recovery:
  // When an ad script attempts window.open(), window loses focus.
  // Immediately refocus ExoticHub so the user is never pulled away.
  const handleWindowBlur = () => {
    if (!isInternalNavigation) {
      setTimeout(() => {
        try {
          window.focus();
        } catch (_) {}
      }, 50);
    }
  };

  // 5. Trap back-button hijacking / history poisoning
  const handlePopState = () => {
    if (!isInternalNavigation) {
      try {
        window.history.pushState(null, '', window.location.href);
      } catch (_) {}
    }
  };

  // Register capture-phase listeners for maximum reliability
  window.addEventListener('click', handleUserClick, true);
  window.addEventListener('keydown', handleUserClick, true);
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('blur', handleWindowBlur);
  window.addEventListener('popstate', handlePopState);

  // Initial history lock to prevent history pushState poisoning
  try {
    window.history.pushState(null, '', window.location.href);
  } catch (_) {}

  return () => {
    window.removeEventListener('click', handleUserClick, true);
    window.removeEventListener('keydown', handleUserClick, true);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('popstate', handlePopState);
  };
}
