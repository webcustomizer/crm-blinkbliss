import { NextRequest, NextResponse } from 'next/server';

interface MetricsPayload {
  metrics: Array<{
    name: string;
    value: number;
    rating: string;
    timestamp: number;
  }>;
  timestamp: number;
}

// Store metrics in memory (in production, use a database)
const metricsStore: MetricsPayload[] = [];

export async function POST(request: NextRequest) {
  try {
    const payload: MetricsPayload = await request.json();

    // Store metrics
    metricsStore.push(payload);

    // Keep only last 1000 entries
    if (metricsStore.length > 1000) {
      metricsStore.shift();
    }

    console.log('📊 Performance metrics recorded:', payload.metrics.map(m => `${m.name}: ${m.value}ms (${m.rating})`));

    return NextResponse.json(
      { success: true, stored: metricsStore.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error storing metrics:', error);
    return NextResponse.json(
      { error: 'Failed to store metrics' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    total: metricsStore.length,
    latest: metricsStore.slice(-10),
    average: {
      lcp: calculateAverage(metricsStore, 'lcp'),
      cls: calculateAverage(metricsStore, 'cls'),
      fid: calculateAverage(metricsStore, 'fid'),
    },
  });
}

function calculateAverage(store: MetricsPayload[], metricName: string): number | null {
  const values = store
    .flatMap(p => p.metrics)
    .filter(m => m.name === metricName)
    .map(m => m.value);

  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b) / values.length);
}
