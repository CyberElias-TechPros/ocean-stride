// Performance optimization utilities for production deployment

// Bundle size optimization
export const bundleOptimization = {
  // Dynamic imports for code splitting
  loadComponent: async <T>(importFn: () => Promise<T>): Promise<T> => {
    try {
      const startTime = performance.now();
      const component = await importFn();
      const endTime = performance.now();

      return component;
    } catch (error) {
      console.error('Failed to load component:', error);
      throw error;
    }
  },

  // Preload critical resources
  preloadCriticalResources: () => {
    // Preload critical fonts
    const fontLink = document.createElement('link');
    fontLink.rel = 'preload';
    fontLink.href = '/fonts/main.woff2';
    fontLink.as = 'font';
    fontLink.type = 'font/woff2';
    fontLink.crossOrigin = 'anonymous';
    document.head.appendChild(fontLink);

    // Preload critical CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'preload';
    cssLink.href = '/src/index.css';
    cssLink.as = 'style';
    document.head.appendChild(cssLink);
  },

  // Resource hints
  addResourceHints: () => {
    // DNS prefetch for external domains
    const domains = ['fonts.googleapis.com', 'fonts.gstatic.com'];
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
    });

    // Preconnect to critical origins
    const origins = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
    origins.forEach(origin => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }
};

// Loading performance monitoring
export class LoadingPerformanceMonitor {
  private static marks: Map<string, number> = new Map();
  private static measures: PerformanceMeasure[] = [];

  static mark(name: string): void {
    if ('performance' in window && performance.mark) {
      performance.mark(name);
      this.marks.set(name, performance.now());
    }
  }

  static measure(name: string, startMark?: string, endMark?: string): void {
    if ('performance' in window && performance.measure) {
      try {
        if (startMark && endMark) {
          performance.measure(name, startMark, endMark);
        } else if (startMark) {
          performance.measure(name, startMark);
        }

        const measures = performance.getEntriesByName(name, 'measure');
        this.measures.push(...(measures as PerformanceMeasure[]));
      } catch (error) {
        // Performance measure failed - silently ignore
      }
    }
  }

  static getMetrics(): {
    marks: Record<string, number>;
    measures: PerformanceMeasure[];
    timing: PerformanceTiming | null;
  } {
    return {
      marks: Object.fromEntries(this.marks),
      measures: this.measures,
      timing: performance.timing || null,
    };
  }

  static clearMarks(): void {
    if ('performance' in window && performance.clearMarks) {
      performance.clearMarks();
    }
    this.marks.clear();
  }

  static clearMeasures(): void {
    if ('performance' in window && performance.clearMeasures) {
      performance.clearMeasures();
    }
    this.measures = [];
  }
}

// Web Vitals monitoring
export const webVitals = {
  // Core Web Vitals
  observeCLS: (callback: (metric: any) => void) => {
    if ('web-vitals' in window) {
      // Note: This would require the web-vitals package
      // import { onCLS } from 'web-vitals';
      // onCLS(callback);
    }
  },

  observeFID: (callback: (metric: any) => void) => {
    if ('web-vitals' in window) {
      // import { onFID } from 'web-vitals';
      // onFID(callback);
    }
  },

  observeFCP: (callback: (metric: any) => void) => {
    if ('web-vitals' in window) {
      // import { onFCP } from 'web-vitals';
      // onFCP(callback);
    }
  },

  observeLCP: (callback: (metric: any) => void) => {
    if ('web-vitals' in window) {
      // import { onLCP } from 'web-vitals';
      // onLCP(callback);
    }
  },

  observeTTFB: (callback: (metric: any) => void) => {
    if ('web-vitals' in window) {
      // import { onTTFB } from 'web-vitals';
      // onTTFB(callback);
    }
  }
};

// Memory management
export class MemoryManager {
  private static gcInterval: NodeJS.Timeout | null = null;

  static startMemoryMonitoring(): void {
    if ('memory' in performance) {
      this.gcInterval = setInterval(() => {
        const memory = (performance as any).memory;
        const usedPercent = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;

        if (usedPercent > 80) {
          // Trigger garbage collection if available
          if ('gc' in window) {
            (window as any).gc();
          }

          // Clear caches if memory is critical
          if (usedPercent > 90) {
            this.performMemoryCleanup();
          }
        }
      }, 30000); // Check every 30 seconds
    }
  }

  static stopMemoryMonitoring(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
  }

  static performMemoryCleanup(): void {
    // Clear unused caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('temp') || name.includes('old')) {
            caches.delete(name);
          }
        });
      });
    }

    // Clear old localStorage items
    const keys = Object.keys(localStorage);
    const now = Date.now();
    keys.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed.expiry && parsed.expiry < now) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // Ignore parsing errors
      }
    });
  }

  static getMemoryUsage(): { used: number; total: number; percent: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percent: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
      };
    }
    return null;
  }
}

// Image optimization
export const imageOptimization = {
  // Lazy load images
  lazyLoadImages: () => {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src!;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  },

  // Generate responsive image sources
  generateResponsiveSources: (baseUrl: string, widths: number[] = [480, 768, 1024, 1280, 1920]) => {
    return widths.map(width => `${baseUrl}?w=${width} ${width}w`).join(', ');
  },

  // WebP support detection
  supportsWebP: async (): Promise<boolean> => {
    return new Promise(resolve => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }
};

// Network optimization
export const networkOptimization = {
  // Connection quality detection
  getConnectionQuality(): 'slow' | 'fast' | 'unknown' {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          return 'slow';
        }
        return 'fast';
      }
    }
    return 'unknown';
  },

  // Adaptive loading based on connection
  adaptiveLoad: function(fastCallback: () => void, slowCallback: () => void) {
    const quality = this.getConnectionQuality();
    if (quality === 'slow') {
      slowCallback();
    } else {
      fastCallback();
    }
  },

  // Service worker update handling
  handleServiceWorkerUpdates: () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }
};

// Initialize performance optimizations
export const initializePerformanceOptimizations = () => {
  // Mark app start
  LoadingPerformanceMonitor.mark('app-start');

  // Preload critical resources
  bundleOptimization.preloadCriticalResources();
  bundleOptimization.addResourceHints();

  // Start memory monitoring
  MemoryManager.startMemoryMonitoring();

  // Handle service worker updates
  networkOptimization.handleServiceWorkerUpdates();

  // Lazy load images
  imageOptimization.lazyLoadImages();
};