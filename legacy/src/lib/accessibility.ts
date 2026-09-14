// Accessibility utilities for enhanced user experience

// Keyboard navigation helpers
export const keyboardNavigation = {
  // Handle keyboard events for custom components
  handleKeyDown: (event: KeyboardEvent, handlers: {
    onEnter?: () => void;
    onEscape?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onSpace?: () => void;
    onTab?: () => void;
  }) => {
    switch (event.key) {
      case 'Enter':
        handlers.onEnter?.();
        break;
      case 'Escape':
        handlers.onEscape?.();
        break;
      case 'ArrowUp':
        event.preventDefault();
        handlers.onArrowUp?.();
        break;
      case 'ArrowDown':
        event.preventDefault();
        handlers.onArrowDown?.();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        handlers.onArrowLeft?.();
        break;
      case 'ArrowRight':
        event.preventDefault();
        handlers.onArrowRight?.();
        break;
      case ' ':
        event.preventDefault();
        handlers.onSpace?.();
        break;
      case 'Tab':
        handlers.onTab?.();
        break;
    }
  },

  // Focus management
  focusFirstFocusableElement: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    if (firstElement) {
      firstElement.focus();
    }
  },

  focusLastFocusableElement: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    if (lastElement) {
      lastElement.focus();
    }
  },

  trapFocus: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }
};

// Screen reader announcements
export class ScreenReaderAnnouncer {
  private static announcer: HTMLElement | null = null;

  static initialize() {
    if (this.announcer) return;

    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.style.position = 'absolute';
    this.announcer.style.left = '-10000px';
    this.announcer.style.width = '1px';
    this.announcer.style.height = '1px';
    this.announcer.style.overflow = 'hidden';

    document.body.appendChild(this.announcer);
  }

  static announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.announcer) this.initialize();

    if (this.announcer) {
      this.announcer.setAttribute('aria-live', priority);
      this.announcer.textContent = message;

      // Clear after a short delay to allow re-announcement of same message
      setTimeout(() => {
        if (this.announcer) {
          this.announcer.textContent = '';
        }
      }, 1000);
    }
  }
}

// ARIA utilities
export const ariaUtils = {
  // Generate unique IDs for ARIA relationships
  generateId: (prefix: string = 'aria') => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Set up ARIA relationships
  setAriaRelationship: (element: HTMLElement, relationship: string, targetId: string) => {
    element.setAttribute(`aria-${relationship}`, targetId);
  },

  // Manage ARIA expanded state
  setAriaExpanded: (element: HTMLElement, expanded: boolean) => {
    element.setAttribute('aria-expanded', expanded.toString());
  },

  // Manage ARIA hidden state
  setAriaHidden: (element: HTMLElement, hidden: boolean) => {
    element.setAttribute('aria-hidden', hidden.toString());
  },

  // Update live region
  updateLiveRegion: (regionId: string, message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const region = document.getElementById(regionId);
    if (region) {
      region.setAttribute('aria-live', priority);
      region.textContent = message;
    }
  }
};

// Color contrast utilities
export const colorContrast = {
  // Calculate relative luminance
  getRelativeLuminance: (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  },

  // Calculate contrast ratio
  getContrastRatio: function(color1: string, color2: string): number {
    const lum1 = this.getRelativeLuminance(color1);
    const lum2 = this.getRelativeLuminance(color2);

    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    return (lighter + 0.05) / (darker + 0.05);
  },

  // Check if contrast meets WCAG standards
  meetsWCAGStandard: function(color1: string, color2: string, level: 'AA' | 'AAA' = 'AA', size: 'normal' | 'large' = 'normal'): boolean {
    const ratio = this.getContrastRatio(color1, color2);

    if (level === 'AAA') {
      return size === 'large' ? ratio >= 4.5 : ratio >= 7;
    } else {
      return size === 'large' ? ratio >= 3 : ratio >= 4.5;
    }
  }
};

// Skip links for keyboard navigation
export class SkipLinks {
  private static initialized = false;

  static initialize() {
    if (this.initialized) return;

    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded';

    document.body.insertBefore(skipLink, document.body.firstChild);
    this.initialized = true;
  }
}

// High contrast mode detection
export const highContrastMode = {
  isEnabled: (): boolean => {
    // Check for high contrast mode
    const testElement = document.createElement('div');
    testElement.style.color = 'rgb(31, 41, 55)'; // Tailwind gray-800
    testElement.style.backgroundColor = 'rgb(255, 255, 255)';
    document.body.appendChild(testElement);

    const computedStyle = window.getComputedStyle(testElement);
    const isHighContrast = computedStyle.color === computedStyle.backgroundColor;

    document.body.removeChild(testElement);
    return isHighContrast;
  },

  // Apply high contrast adjustments
  applyAdjustments: () => {
    if (highContrastMode.isEnabled()) {
      document.documentElement.classList.add('high-contrast');
    }
  }
};

// Motion preference detection
export const motionPreference = {
  prefersReducedMotion: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Respect user's motion preference
  respectMotionPreference: (element: HTMLElement) => {
    if (motionPreference.prefersReducedMotion()) {
      element.style.animation = 'none';
      element.style.transition = 'none';
    }
  }
};

// Focus management for modals and dialogs
export class FocusManager {
  private static previousFocus: HTMLElement | null = null;

  static saveFocus() {
    this.previousFocus = document.activeElement as HTMLElement;
  }

  static restoreFocus() {
    if (this.previousFocus && this.previousFocus.focus) {
      this.previousFocus.focus();
    }
  }

  static focusFirstElement(container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    if (firstElement) {
      firstElement.focus();
    }
  }
}

// Initialize accessibility features
export const initializeAccessibility = () => {
  // Initialize screen reader announcer
  ScreenReaderAnnouncer.initialize();

  // Initialize skip links
  SkipLinks.initialize();

  // Apply high contrast adjustments
  highContrastMode.applyAdjustments();

  // Listen for motion preference changes
  const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionMediaQuery.addEventListener('change', () => {
    // Re-apply motion preferences
    document.querySelectorAll('[data-motion]').forEach(element => {
      motionPreference.respectMotionPreference(element as HTMLElement);
    });
  });
};