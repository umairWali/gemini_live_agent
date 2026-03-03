import React, { createContext, useContext, useEffect } from 'react';

// Accessibility Context
interface AccessibilityContextType {
  highContrast: boolean;
  reduceMotion: boolean;
  screenReaderOptimized: boolean;
  fontSize: 'small' | 'medium' | 'large';
  toggleHighContrast: () => void;
  toggleReduceMotion: () => void;
  toggleScreenReaderOptimized: () => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [highContrast, setHighContrast] = React.useState(false);
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [screenReaderOptimized, setScreenReaderOptimized] = React.useState(false);
  const [fontSize, setFontSize] = React.useState<'small' | 'medium' | 'large'>('medium');

  useEffect(() => {
    // Check system preferences
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReduceMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply high contrast styles
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  // Apply reduce motion
  useEffect(() => {
    if (reduceMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [reduceMotion]);

  // Apply font size
  useEffect(() => {
    document.documentElement.style.fontSize = {
      small: '14px',
      medium: '16px',
      large: '18px'
    }[fontSize];
  }, [fontSize]);

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        reduceMotion,
        screenReaderOptimized,
        fontSize,
        toggleHighContrast: () => setHighContrast(prev => !prev),
        toggleReduceMotion: () => setReduceMotion(prev => !prev),
        toggleScreenReaderOptimized: () => setScreenReaderOptimized(prev => !prev),
        setFontSize
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

// Focus management hook
export const useFocusManager = () => {
  const focusRef = React.useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    focusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (focusRef.current && document.contains(focusRef.current)) {
      focusRef.current.focus();
    }
  };

  return { saveFocus, restoreFocus };
};

// Screen reader announcements
export const useAnnounce = () => {
  const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return announce;
};

// Skip link component
export const SkipLink: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-emerald-500 focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold"
    >
      Skip to main content
    </a>
  );
};

// Accessible button component
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  isLoading,
  loadingText,
  disabled,
  'aria-label': ariaLabel,
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      aria-label={isLoading ? loadingText : ariaLabel}
      aria-busy={isLoading}
    >
      {isLoading && <span className="sr-only">{loadingText || 'Loading...'}</span>}
      {children}
    </button>
  );
};

// Keyboard navigation hook
export const useKeyboardNavigation = (
  itemCount: number,
  onSelect: (index: number) => void,
  onEscape?: () => void
) => {
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(itemCount - 1, prev + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(0, prev - 1));
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(itemCount - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(focusedIndex);
        break;
      case 'Escape':
        e.preventDefault();
        onEscape?.();
        break;
    }
  }, [itemCount, focusedIndex, onSelect, onEscape]);

  return { focusedIndex, setFocusedIndex, handleKeyDown };
};

// ARIA live region component
export const LiveRegion: React.FC<{ 
  message: string; 
  priority?: 'polite' | 'assertive' 
}> = ({ message, priority = 'polite' }) => {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};

// Screen reader only styles (add to CSS)
export const srOnlyStyles = `
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
  
  .high-contrast * {
    border-color: currentColor !important;
  }
  
  .high-contrast .bg-slate-900 {
    background: #000 !important;
  }
  
  .high-contrast .text-slate-200 {
    color: #fff !important;
  }
  
  .reduce-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
`;

export default {
  AccessibilityProvider,
  useAccessibility,
  useFocusManager,
  useAnnounce,
  SkipLink,
  AccessibleButton,
  useKeyboardNavigation,
  LiveRegion
};
