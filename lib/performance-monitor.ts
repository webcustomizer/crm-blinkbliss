// Real-time performance monitoring

export interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  cls?: number; // Cumulative Layout Shift
  fid?: number; // First Input Delay
  ttfb?: number; // Time to First Byte
  renderTime?: number;
}

const metricsHistory: WebVital[] = [];

/**
 * Get rating for Core Web Vitals
 */
function getRating(
  name: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    fcp: [1800, 3000],
    lcp: [2500, 4000],
    cls: [0.1, 0.25],
    fid: [100, 300],
    ttfb: [600, 1800],
  };

  const [good, poor] = thresholds[name] || [1000, 3000];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Monitor Web Vitals
 */
export function monitorWebVitals(callback?: (vital: WebVital) => void): void {
  // Check if PerformanceObserver is available
  if (!('PerformanceObserver' in window)) {
    console.warn('PerformanceObserver not supported');
    return;
  }

  // Monitor Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      const vital: WebVital = {
        name: 'lcp',
        value: Math.round(lastEntry.renderTime || lastEntry.loadTime),
        rating: getRating('lcp', lastEntry.renderTime || lastEntry.loadTime),
        timestamp: Date.now(),
      };
      metricsHistory.push(vital);
      callback?.(vital);
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    console.warn('LCP monitoring failed:', e);
  }

  // Monitor Cumulative Layout Shift
  try {
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const cls = entries.reduce((acc, entry: any) => acc + entry.hadRecentInput ? 0 : entry.value, 0);
      const vital: WebVital = {
        name: 'cls',
        value: Math.round(cls * 1000) / 1000,
        rating: getRating('cls', cls),
        timestamp: Date.now(),
      };
      metricsHistory.push(vital);
      callback?.(vital);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    console.warn('CLS monitoring failed:', e);
  }

  // Monitor First Input Delay
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fidEntry = entries[0] as any;
      const vital: WebVital = {
        name: 'fid',
        value: Math.round(fidEntry.processingStart - fidEntry.startTime),
        rating: getRating('fid', fidEntry.processingStart - fidEntry.startTime),
        timestamp: Date.now(),
      };
      metricsHistory.push(vital);
      callback?.(vital);
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
  } catch (e) {
    console.warn('FID monitoring failed:', e);
  }
}

/**
 * Get current page load metrics
 */
export function getPageMetrics(): PerformanceMetrics {
  if (!window.performance) return {};

  const perfData = window.performance.timing;
  const perfNav = window.performance.navigation;

  return {
    ttfb: perfData.responseStart - perfData.fetchStart,
    renderTime: perfData.domComplete - perfData.domLoading,
  };
}

/**
 * Get all collected metrics
 */
export function getAllMetrics(): WebVital[] {
  return metricsHistory;
}

/**
 * Clear metrics history
 */
export function clearMetrics(): void {
  metricsHistory.length = 0;
}

/**
 * Send metrics to analytics
 */
export async function sendMetricsToAnalytics(metrics: WebVital[]): Promise<void> {
  try {
    await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics, timestamp: Date.now() }),
    });
  } catch (error) {
    console.error('Failed to send metrics:', error);
  }
}
