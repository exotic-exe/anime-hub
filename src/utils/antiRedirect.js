/**
 * Anti-Redirect and Anti-Popup Protection Shield for ExoticHub
 * 
 * Prevents third-party cross-origin iframe ad networks (e.g., abscloud, popunders)
 * from hijacking the top-level window (window.top.location = ...), spamming back buttons,
 * or pulling focus away from ExoticHub.
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
  }, 3500);
}

/**
 * Record an intentional interaction with the player area
 */
export function recordPlayerInteraction() {
  lastIframeTouchTime = Date.now();
}

/**
 * Initialize global security traps against iframe top-navigation hijacking and popups
 */
export function initAntiRedirectShield() {
  if (typeof window === 'undefined') return () => {};

  // 1. Capture genuine user interactions across the application
  const handleUserClick = (e) => {
    // If the click originated inside our React application on interactive elements
    const interactiveTarget = e.target?.closest?.(
      'a, button, input, select, textarea, [role="button"], [data-nav], [tabindex]'
    );
    if (interactiveTarget) {
      markInternalNavigation();
    }
  };

  // 2. Intercept unauthorized top-window redirects from cross-origin ad scripts
  const handleBeforeUnload = (e) => {
    if (!isInternalNavigation) {
      // An unauthorized ad script inside an iframe is attempting to hijack window.top.location
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  };

  // 3. Anti-Popup Focus Recovery:
  // When an ad script attempts window.open(), window loses focus.
  // Immediately refocus ExoticHub so the user is not pulled into third-party spam.
  const handleWindowBlur = () => {
    const elapsed = Date.now() - lastIframeTouchTime;
    if (elapsed < 1500) {
      // Ad script just opened a popup window/tab
      setTimeout(() => {
        try {
          window.focus();
        } catch (_) {}
      }, 60);
    }
  };

  // 4. Trap back-button hijacking / history poisoning
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
