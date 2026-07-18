// Detect network conditions and adapt loading strategy

export type ConnectionType = '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';

export interface NetworkInfo {
  type: ConnectionType;
  downlink?: number; // Mbps
  rtt?: number; // Round-trip time in ms
  saveData?: boolean;
  online: boolean;
}

/**
 * Detect current network conditions
 */
export function getNetworkInfo(): NetworkInfo {
  // Check if browser supports Network Information API
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

  return {
    type: (connection?.effectiveType as ConnectionType) || 'unknown',
    downlink: connection?.downlink,
    rtt: connection?.rtt,
    saveData: (navigator as any).connection?.saveData || false,
    online: navigator.onLine,
  };
}

/**
 * Check if connection is slow
 */
export function isSlowConnection(): boolean {
  const info = getNetworkInfo();
  return info.type === '2g' || info.type === 'slow-2g' || info.saveData;
}

/**
 * Adapt image quality based on connection speed
 */
export function getImageQuality(): 'low' | 'medium' | 'high' {
  const info = getNetworkInfo();
  if (info.type === 'slow-2g' || info.type === '2g') return 'low';
  if (info.type === '3g') return 'medium';
  return 'high';
}

/**
 * Get recommended image size based on connection
 */
export function getRecommendedImageSize(): number {
  const info = getNetworkInfo();
  if (info.type === 'slow-2g' || info.type === '2g') return 320;
  if (info.type === '3g') return 640;
  return 1280; // Full size for 4g
}

/**
 * Listen to network changes
 */
export function onNetworkChange(callback: (info: NetworkInfo) => void): () => void {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

  if (!connection) {
    console.warn('Network Information API not supported');
    return () => {};
  }

  const handleChange = () => callback(getNetworkInfo());
  connection.addEventListener('change', handleChange);

  return () => connection.removeEventListener('change', handleChange);
}

/**
 * Check if should preload data (not on slow connection)
 */
export function shouldPreload(): boolean {
  const info = getNetworkInfo();
  return info.type === '4g' && info.online && !info.saveData;
}

/**
 * Get adaptive fetch timeout based on connection
 */
export function getAdaptiveTimeout(): number {
  const info = getNetworkInfo();
  if (info.type === 'slow-2g') return 30000; // 30s
  if (info.type === '2g') return 20000; // 20s
  if (info.type === '3g') return 10000; // 10s
  return 5000; // 5s for 4g
}
