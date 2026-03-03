import React, { useRef, useEffect, useState, useCallback, memo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  className?: string;
}

export const VirtualList = <T,>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
  className = ''
}: VirtualListProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  // Visible items
  const visibleItems = items.slice(startIndex, endIndex);

  // Total height
  const totalHeight = items.length * itemHeight;

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Auto-scroll to bottom for chat
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  // Expose scrollToBottom via ref if needed
  useEffect(() => {
    if (items.length > 0) {
      scrollToBottom();
    }
  }, [items.length, scrollToBottom]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto overflow-x-hidden ${className}`}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
              left: 0,
              right: 0
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
};

// Memoized list item for performance
export const MemoizedListItem = memo(function ListItem({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
});

// Optimized chat message list
interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

interface VirtualChatListProps {
  messages: Message[];
  renderMessage: (msg: Message, index: number) => React.ReactNode;
  className?: string;
}

export const VirtualChatList: React.FC<VirtualChatListProps> = ({
  messages,
  renderMessage,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const containerHeight = containerRef.current?.clientHeight || 600;

  // Estimate heights (dynamic sizing)
  const getItemHeight = useCallback((index: number) => {
    const msg = messages[index];
    if (!msg) return 80;
    // Estimate based on text length
    const lines = Math.ceil(msg.text.length / 80);
    return Math.max(80, lines * 24 + 60);
  }, [messages]);

  // Calculate positions
  const calculatePositions = useCallback(() => {
    const positions: number[] = [0];
    for (let i = 1; i < messages.length; i++) {
      positions[i] = positions[i - 1] + getItemHeight(i - 1);
    }
    return positions;
  }, [messages, getItemHeight]);

  const positions = calculatePositions();
  const totalHeight = positions[messages.length - 1] + getItemHeight(messages.length - 1);

  // Find start index based on scroll position
  const findStartIndex = useCallback((scrollPos: number) => {
    let start = 0;
    let end = positions.length;
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if (positions[mid] < scrollPos) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    return Math.max(0, start - 3);
  }, [positions]);

  const startIndex = findStartIndex(scrollTop);
  const endIndex = Math.min(
    messages.length,
    findStartIndex(scrollTop + containerHeight) + 5
  );

  const visibleMessages = messages.slice(startIndex, endIndex);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto ${className}`}
      style={{ height: '100%' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleMessages.map((msg, idx) => {
          const actualIndex = startIndex + idx;
          return (
            <div
              key={msg.id}
              style={{
                position: 'absolute',
                top: positions[actualIndex],
                left: 0,
                right: 0,
                minHeight: getItemHeight(actualIndex)
              }}
            >
              {renderMessage(msg, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(callback, options);
    return () => observerRef.current?.disconnect();
  }, [callback, options]);

  const observe = useCallback((element: Element) => {
    observerRef.current?.observe(element);
  }, []);

  const unobserve = useCallback((element: Element) => {
    observerRef.current?.unobserve(element);
  }, []);

  return { observe, unobserve };
};

// Debounce hook
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
};

// Throttle hook
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  const inThrottleRef = useRef(false);

  return useCallback((...args: Parameters<T>) => {
    if (!inThrottleRef.current) {
      callback(...args);
      inThrottleRef.current = true;
      setTimeout(() => {
        inThrottleRef.current = false;
      }, limit);
    }
  }, [callback, limit]);
};

// Window size hook for responsive virtualization
export const useWindowSize = () => {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
};

export default {
  VirtualList,
  VirtualChatList,
  MemoizedListItem,
  useIntersectionObserver,
  useDebounce,
  useThrottle,
  useWindowSize
};
