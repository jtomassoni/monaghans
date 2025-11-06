'use client';

import { useState, useEffect } from 'react';

interface HydrationError {
  message: string;
  timestamp: number;
  type: 'hydration' | 'error' | 'warning' | 'interaction' | 'render';
  details?: {
    target?: string;
    eventType?: string;
    coordinates?: { x: number; y: number };
    component?: string;
    state?: any;
    button?: number;
    touches?: number;
    key?: string;
    code?: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  };
}

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState<HydrationError[]>([]);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());
  const [componentState, setComponentState] = useState({
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    windowHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    theme: typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    timestamp: new Date().toISOString(),
  });

  const toggleError = (idx: number) => {
    setExpandedErrors(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  // Truncate length - shorter on mobile
  const isMobile = componentState.windowWidth < 768;
  const TRUNCATE_LENGTH = isMobile ? 100 : 200;

  useEffect(() => {
    // Capture console errors
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    const errorHandler = (...args: any[]) => {
      const message = args.map(arg => {
        if (typeof arg === 'string') {
          return arg;
        }
        if (typeof arg === 'object' && arg !== null) {
          // Prefer stack trace for Error objects
          if (arg instanceof Error) {
            return arg.stack || arg.message || String(arg);
          }
          // Try to stringify objects, preserving all properties
          try {
            return JSON.stringify(arg, Object.getOwnPropertyNames(arg), 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ').trim();
      
      const isHydrationError = message.toLowerCase().includes('hydration') || 
                               message.toLowerCase().includes('mismatch') ||
                               message.toLowerCase().includes('did not match') ||
                               message.toLowerCase().includes('server html') ||
                               message.toLowerCase().includes('client html') ||
                               message.toLowerCase().includes('server rendered') ||
                               message.toLowerCase().includes('client rendered');

      if (isHydrationError || message.includes('Warning:') || message.includes('Error:')) {
        setErrors(prev => [{
          message,
          timestamp: Date.now(),
          type: isHydrationError ? 'hydration' : 'error',
        }, ...prev.slice(0, 49)]); // Keep last 50 errors
      }

      originalError.apply(console, args);
    };

    const warnHandler = (...args: any[]) => {
      const message = args.map(arg => {
        if (typeof arg === 'string') {
          return arg;
        }
        if (typeof arg === 'object' && arg !== null) {
          if (arg instanceof Error) {
            return arg.stack || arg.message || String(arg);
          }
          try {
            return JSON.stringify(arg, Object.getOwnPropertyNames(arg), 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ').trim();
      
      const isHydrationError = message.toLowerCase().includes('hydration') || 
                               message.toLowerCase().includes('mismatch') ||
                               message.toLowerCase().includes('did not match') ||
                               message.toLowerCase().includes('server html') ||
                               message.toLowerCase().includes('client html') ||
                               message.toLowerCase().includes('server rendered') ||
                               message.toLowerCase().includes('client rendered');
      
      if (isHydrationError || message.includes('Warning:')) {
        setErrors(prev => [{
          message,
          timestamp: Date.now(),
          type: isHydrationError ? 'hydration' : 'warning',
        }, ...prev.slice(0, 49)]);
      }

      originalWarn.apply(console, args);
    };

    // Also capture React DevTools warnings and handler execution
    const logHandler = (...args: any[]) => {
      const message = args.map(arg => String(arg)).join(' ');
      
      // Track handler execution
      if (message.toLowerCase().includes('hamburger') || 
          message.toLowerCase().includes('clicked') ||
          message.toLowerCase().includes('touched') ||
          message.toLowerCase().includes('menu')) {
        setErrors(prev => [{
          message: `[HANDLER] ${message}`,
          timestamp: Date.now(),
          type: 'interaction',
          details: { component: 'mobile-nav' },
        }, ...prev.slice(0, 99)]);
      }
      
      if (message.toLowerCase().includes('hydration') || 
          message.toLowerCase().includes('mismatch')) {
        setErrors(prev => [{
          message: `[LOG] ${message}`,
          timestamp: Date.now(),
          type: 'warning',
        }, ...prev.slice(0, 49)]);
      }
      
      originalLog.apply(console, args);
    };

    console.error = errorHandler;
    console.warn = warnHandler;
    console.log = logHandler;

    // Capture React hydration errors from the DOM
    const observer = new MutationObserver(() => {
      // Check for React hydration markers
      const reactRoots = document.querySelectorAll('[data-reactroot], [data-react-helmet]');
      if (reactRoots.length > 0) {
        // Check for mismatches
        const mismatches = document.querySelectorAll('[data-react-hydration-mismatch]');
        if (mismatches.length > 0) {
          setErrors(prev => [{
            message: `Found ${mismatches.length} hydration mismatch(es) in DOM`,
            timestamp: Date.now(),
            type: 'hydration',
          }, ...prev.slice(0, 49)]);
        }
      }
    });

    // Track DOM mutations to see if menu appears
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target as HTMLElement;
          // Check if mobile menu is opening/closing
          if (target.classList.contains('translate-x-0') || target.classList.contains('-translate-x-full')) {
            const isOpen = target.classList.contains('translate-x-0');
            const isMobileMenu = target.classList.contains('md:hidden') && target.tagName === 'ASIDE';
            if (isMobileMenu) {
              // Check computed styles
              const computed = window.getComputedStyle(target);
              const rect = target.getBoundingClientRect();
              const visibilityDetails = `z-index:${computed.zIndex} | opacity:${computed.opacity} | transform:${computed.transform.substring(0, 40)} | visible:${rect.width > 0 && rect.height > 0} | left:${Math.round(rect.left)}`;
              
              setErrors(prev => [{
                message: `[STATE] Mobile menu ${isOpen ? 'OPENED' : 'CLOSED'} | ${visibilityDetails}`,
                timestamp: Date.now(),
                type: 'render',
                details: { component: 'mobile-sidebar', state: isOpen ? 'open' : 'closed' },
              }, ...prev.slice(0, 99)]);
            }
          }
        }
        
        if (mutation.type === 'childList') {
          // Check for mobile menu overlay
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              const el = node as HTMLElement;
              if (el.classList.contains('md:hidden') && el.classList.contains('bg-black')) {
                const computed = window.getComputedStyle(el);
                setErrors(prev => [{
                  message: `[DOM] Mobile menu overlay added | z-index:${computed.zIndex} | opacity:${computed.opacity}`,
                  timestamp: Date.now(),
                  type: 'render',
                }, ...prev.slice(0, 99)]);
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-react-hydration-mismatch'],
    });
    
    // Also observe sidebar elements specifically
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    // Capture all DOM interactions
    const captureInteraction = (event: Event, type: string) => {
      const target = event.target as HTMLElement;
      const currentTarget = event.currentTarget as HTMLElement;
      
      // Check if this is a React handler
      const reactFiber = (target as any)?._reactInternalFiber || (target as any)?._reactInternalInstance;
      const hasReactHandlers = target?.getAttribute('onclick') || 
                               target?.onclick !== null ||
                               (target as any).__reactInternalInstance !== undefined;
      
      let details: any = {
        target: target?.tagName ? `${target.tagName}${target.className ? `.${target.className.split(' ').slice(0, 2).join('.').substring(0, 50)}` : ''}${target.id ? `#${target.id}` : ''}` : 'unknown',
        eventType: type,
      };

      if (event instanceof MouseEvent) {
        details.coordinates = { x: event.clientX, y: event.clientY };
        details.button = event.button;
        details.buttons = event.buttons;
        details.ctrlKey = event.ctrlKey;
        details.shiftKey = event.shiftKey;
        details.altKey = event.altKey;
      }

      if (event instanceof TouchEvent) {
        if (event.touches.length > 0) {
          details.coordinates = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }
        details.touches = event.touches.length;
      }

      if (event instanceof KeyboardEvent) {
        details.key = event.key;
        details.code = event.code;
        details.ctrlKey = event.ctrlKey;
        details.shiftKey = event.shiftKey;
        details.altKey = event.altKey;
      }

      // Check if it's a mobile nav element
      const isMobileNav = target?.closest('[aria-label="Open menu"]') || 
                         target?.closest('[aria-label="Close sidebar"]') ||
                         target?.closest('[data-mobile-nav]') ||
                         target?.getAttribute('aria-label')?.includes('menu') ||
                         target?.getAttribute('aria-label')?.includes('sidebar');
      
      // Capture all clicks, touches, and mobile nav interactions
      const shouldLog = isMobileNav || 
                       type === 'click' || 
                       type === 'mousedown' || 
                       type === 'mouseup' ||
                       type.includes('touch') ||
                       type.includes('pointer');
      
      if (shouldLog) {
        const navIndicator = isMobileNav ? ' [MOBILE NAV]' : '';
        
        // Check z-index and pointer-events
        let zIndexInfo = '';
        let pointerEventsInfo = '';
        if (target) {
          const computedStyle = window.getComputedStyle(target);
          const zIndex = computedStyle.zIndex;
          const pointerEvents = computedStyle.pointerEvents;
          if (zIndex && parseInt(zIndex) > 0) {
            zIndexInfo = ` z-index:${zIndex}`;
          }
          if (pointerEvents && pointerEvents !== 'auto') {
            pointerEventsInfo = ` pointer-events:${pointerEvents}`;
          }
        }
        
        const message = `[${type.toUpperCase()}]${navIndicator} ${details.target}${details.coordinates ? ` @ (${details.coordinates.x}, ${details.coordinates.y})` : ''}${details.button !== undefined ? ` button:${details.button}` : ''}${details.touches !== undefined ? ` touches:${details.touches}` : ''}${event.defaultPrevented ? ' [PREVENTED]' : ''}${zIndexInfo}${pointerEventsInfo}`;
        
        setErrors(prev => [{
          message,
          timestamp: Date.now(),
          type: 'interaction',
          details,
        }, ...prev.slice(0, 99)]); // Keep last 100 events
        
        // If it's a mobile nav click, check if menu exists after a short delay
        if (isMobileNav && (type === 'click' || type === 'touchstart')) {
          setTimeout(() => {
            // Find mobile sidebar by checking for aside elements with md:hidden class
            const allAsides = Array.from(document.querySelectorAll('aside'));
            const mobileMenu = allAsides.find(el => 
              el.classList.contains('md:hidden') && 
              (el.classList.contains('translate-x-0') || el.classList.contains('-translate-x-full'))
            );
            const overlay = Array.from(document.querySelectorAll('div')).find(el =>
              el.classList.contains('md:hidden') && 
              el.classList.contains('bg-black')
            );
            const menuState = mobileMenu?.classList.contains('translate-x-0') ? 'OPEN' : 'CLOSED';
            
            // Check computed styles for visibility issues
            let visibilityInfo = '';
            if (mobileMenu) {
              const computed = window.getComputedStyle(mobileMenu);
              const rect = mobileMenu.getBoundingClientRect();
              
              // Check for elements that might be covering it
              const elementsAtPoint = [];
              if (rect.width > 0 && rect.height > 0) {
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const topElement = document.elementFromPoint(centerX, centerY);
                if (topElement && topElement !== mobileMenu) {
                  const topComputed = window.getComputedStyle(topElement as HTMLElement);
                  elementsAtPoint.push(`${topElement.tagName} z-index:${topComputed.zIndex}`);
                }
              }
              
              visibilityInfo = ` | z-index:${computed.zIndex} | opacity:${computed.opacity} | visibility:${computed.visibility} | display:${computed.display} | transform:${computed.transform.substring(0, 30)} | rect:(${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.width)}x${Math.round(rect.height)}) | inViewport:${rect.left >= -100 && rect.left < window.innerWidth}${elementsAtPoint.length > 0 ? ` | BLOCKED BY: ${elementsAtPoint.join(', ')}` : ''}`;
            }
            
            setErrors(prev => [{
              message: `[CHECK] Menu state after click: ${menuState} | Menu exists: ${!!mobileMenu} | Overlay exists: ${!!overlay}${visibilityInfo}`,
              timestamp: Date.now(),
              type: 'interaction',
              details: { component: 'mobile-nav-check' },
            }, ...prev.slice(0, 99)]);
          }, 100);
        }
      }
    };

    // Capture all pointer events
    const eventTypes = [
      'click', 'mousedown', 'mouseup', 'mousemove',
      'touchstart', 'touchend', 'touchmove', 'touchcancel',
      'pointerdown', 'pointerup', 'pointermove',
      'keydown', 'keyup', 'keypress'
    ];

    const eventHandlers: Array<{ type: string; handler: (e: Event) => void }> = [];
    eventTypes.forEach(eventType => {
      const handler = (e: Event) => captureInteraction(e, eventType);
      eventHandlers.push({ type: eventType, handler });
      document.addEventListener(eventType, handler, true); // Use capture phase
    });

    // Track React renders by intercepting console.log from React DevTools
    let renderCount = 0;
    const originalInfo = console.info;
    console.info = (...args: any[]) => {
      const message = args.map(arg => String(arg)).join(' ');
      if (message.includes('Rendered') || message.includes('render') || message.includes('React')) {
        renderCount++;
        if (renderCount % 10 === 0 || message.toLowerCase().includes('warning')) {
          setErrors(prev => [{
            message: `[RENDER] ${message.substring(0, 100)}`,
            timestamp: Date.now(),
            type: 'render',
          }, ...prev.slice(0, 99)]);
        }
      }
      originalInfo.apply(console, args);
    };

    // Update component state periodically
    const updateState = () => {
      setComponentState({
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        userAgent: navigator.userAgent,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        timestamp: new Date().toISOString(),
      });
    };

    const resizeHandler = () => updateState();
    window.addEventListener('resize', resizeHandler);
    updateState();

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
      console.info = originalInfo;
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', resizeHandler);
      eventHandlers.forEach(({ type, handler }) => {
        document.removeEventListener(type, handler, true);
      });
    };
  }, []);

  const copyDebugInfo = () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      errors: errors,
      componentState: componentState,
      windowInfo: {
        width: componentState.windowWidth,
        height: componentState.windowHeight,
        userAgent: componentState.userAgent,
        theme: componentState.theme,
      },
      reactInfo: {
        version: (window as any).React?.version || 'unknown',
      },
    };

    const text = JSON.stringify(debugInfo, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      alert('Debug info copied to clipboard!');
    });
  };

  const copyErrorsOnly = () => {
    const errorsText = errors.map((e, idx) => 
      `[${e.type.toUpperCase()}] ${new Date(e.timestamp).toISOString()}\n${e.message}\n${'='.repeat(80)}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(errorsText || 'No errors to copy').then(() => {
      alert('Errors copied to clipboard!');
    });
  };

  const clearErrors = () => {
    setErrors([]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[99999] bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium"
        title="Open Debug Panel"
      >
        🐛 {errors.length > 0 && `(${errors.length})`}
      </button>
    );
  }

  return (
    <div className="fixed inset-2 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-80 sm:max-w-none z-[99999] h-[calc(100vh-1rem)] sm:h-auto sm:max-h-[calc(100vh-2rem)] bg-white dark:bg-gray-800 border-2 border-red-500 rounded-lg shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-red-500 text-white px-3 py-1.5 flex items-center justify-between flex-shrink-0">
        <h3 className="font-bold text-xs">Debug Panel</h3>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={copyDebugInfo}
            className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px]"
            title="Copy all debug info"
          >
            Copy
          </button>
          {errors.length > 0 && (
            <>
              <button
                onClick={copyErrorsOnly}
                className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px]"
                title="Copy errors only"
              >
                Errors
              </button>
              <button
                onClick={clearErrors}
                className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px]"
                title="Clear errors"
              >
                Clear
              </button>
            </>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px]"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-1.5 sm:p-3 space-y-1.5 sm:space-y-3 text-xs min-h-0">
        {/* Component State - Collapsible on mobile */}
        <details className="group">
          <summary className="font-semibold text-gray-900 dark:text-white text-[11px] cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-1">
              <span>Component State</span>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 group-open:hidden">▼</span>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 hidden group-open:inline">▲</span>
            </span>
          </summary>
          <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded font-mono text-[9px] overflow-x-auto mt-1">
            <div>Window: {componentState.windowWidth} × {componentState.windowHeight}</div>
            <div>Theme: {componentState.theme}</div>
            <div className="truncate max-w-full" title={componentState.userAgent}>
              UA: {componentState.userAgent.substring(0, 30)}...
            </div>
          </div>
        </details>

        {/* Errors */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 dark:text-white text-[11px]">
              Events/Errors ({errors.length})
            </h4>
            <div className="flex gap-1 text-[8px]">
              <span className="bg-red-100 dark:bg-red-900/30 px-1 rounded">
                🚨 {errors.filter(e => e.type === 'hydration').length}
              </span>
              <span className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">
                ⚠️ {errors.filter(e => e.type === 'error' || e.type === 'warning').length}
              </span>
              <span className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">
                🖱️ {errors.filter(e => e.type === 'interaction').length}
              </span>
              <span className="bg-purple-100 dark:bg-purple-900/30 px-1 rounded">
                🔄 {errors.filter(e => e.type === 'render').length}
              </span>
            </div>
          </div>
          {errors.length === 0 ? (
            <div className="bg-green-50 dark:bg-green-900/20 p-1 rounded text-green-700 dark:text-green-400 text-[9px]">
              No events detected
            </div>
          ) : (
            <div className="space-y-0.5 max-h-[45vh] sm:max-h-64 overflow-y-auto">
              {errors.map((error, idx) => {
                const isExpanded = expandedErrors.has(idx);
                const isLong = error.message.length > TRUNCATE_LENGTH;
                const displayMessage = isLong && !isExpanded 
                  ? error.message.substring(0, TRUNCATE_LENGTH) + '...' 
                  : error.message;
                
                let bgColor = 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800';
                let icon = '⚠️';
                let textColor = 'text-yellow-600 dark:text-yellow-400';
                
                if (error.type === 'hydration') {
                  bgColor = 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800';
                  icon = '🚨';
                  textColor = 'text-red-600 dark:text-red-400';
                } else if (error.type === 'error') {
                  bgColor = 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800';
                  icon = '❌';
                  textColor = 'text-red-600 dark:text-red-400';
                } else if (error.type === 'interaction') {
                  bgColor = 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800';
                  icon = '🖱️';
                  textColor = 'text-blue-600 dark:text-blue-400';
                } else if (error.type === 'render') {
                  bgColor = 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800';
                  icon = '🔄';
                  textColor = 'text-purple-600 dark:text-purple-400';
                }
                
                return (
                  <div
                    key={idx}
                    className={`p-1 rounded ${bgColor}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                      <span className={`text-[8px] font-semibold ${textColor}`}>
                        {icon}
                      </span>
                      <span className="text-[8px] text-gray-500 dark:text-gray-400">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </span>
                      {error.details?.eventType && (
                        <span className="text-[8px] text-gray-600 dark:text-gray-400 font-mono">
                          {error.details.eventType}
                        </span>
                      )}
                    </div>
                    <pre className="text-[8px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono leading-tight">
                      {displayMessage}
                    </pre>
                    {error.details && (error.details.coordinates || error.details.component) && (
                      <div className="text-[7px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {error.details.coordinates && `Pos: (${error.details.coordinates.x}, ${error.details.coordinates.y})`}
                        {error.details.component && ` | Component: ${error.details.component}`}
                        {error.details.button !== undefined && ` | Button: ${error.details.button}`}
                        {error.details.touches !== undefined && ` | Touches: ${error.details.touches}`}
                      </div>
                    )}
                    {isLong && (
                      <button
                        onClick={() => toggleError(idx)}
                        className="mt-0.5 text-[8px] text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {isExpanded ? 'Show less' : 'Show full message'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Info - Collapsible on mobile */}
        <details className="group">
          <summary className="font-semibold text-gray-900 dark:text-white text-[11px] cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-1">
              <span>Quick Info</span>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 group-open:hidden">▼</span>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 hidden group-open:inline">▲</span>
            </span>
          </summary>
          <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded font-mono text-[9px] space-y-0.5 mt-1">
            <div>Interactions: {errors.filter(e => e.type === 'interaction').length}</div>
            <div>React: {(() => {
              try {
                if (typeof window === 'undefined') return 'unknown';
                
                // Try React DevTools hook first (most reliable)
                const reactDevTools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
                if (reactDevTools?.renderers?.size > 0) {
                  const renderer = reactDevTools.renderers.get(reactDevTools.renderers.keys().next().value);
                  if (renderer?.version) {
                    return renderer.version;
                  }
                }
                
                // Check for React version exposed on window (rare but possible)
                if ((window as any).React?.version) {
                  return (window as any).React.version;
                }
                
                // Check for React DOM version
                if ((window as any).ReactDOM?.version) {
                  return (window as any).ReactDOM.version;
                }
                
                // Fallback: detect React presence
                if (document.querySelector('[data-reactroot], [data-react-helmet]')) {
                  return 'detected';
                }
                
                return 'unknown';
              } catch {
                return 'unknown';
              }
            })()}</div>
            <div>Next.js: {(() => {
              try {
                if (typeof window === 'undefined') return 'unknown';
                
                const nextData = (window as any).__NEXT_DATA__;
                if (nextData) {
                  // Next.js 13+ includes version info in some cases
                  if (nextData.nextVersion) {
                    return `v${nextData.nextVersion}`;
                  }
                  // Use buildId as identifier
                  if (nextData.buildId) {
                    return `build: ${nextData.buildId.substring(0, 8)}`;
                  }
                  return 'detected';
                }
                
                // Check for Next.js script tag
                if (document.querySelector('script[id="__NEXT_DATA__"]')) {
                  return 'detected';
                }
                
                return 'unknown';
              } catch {
                return 'unknown';
              }
            })()}</div>
            <div>Mobile: {typeof window !== 'undefined' && window.innerWidth < 768 ? 'Yes' : 'No'}</div>
            <div>Hydration: {errors.filter(e => e.type === 'hydration').length}</div>
            <div>Dark mode: {typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'Yes' : 'No'}</div>
          </div>
        </details>
      </div>
    </div>
  );
}

