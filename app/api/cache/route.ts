import { NextRequest, NextResponse } from 'next/server';
import { getCacheStats, clearCache } from '@/lib/cache-strategy';

// Cache management endpoint

export async function GET() {
  try {
    const stats = getCacheStats();
    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      clearCache(key);
      return NextResponse.json(
        { success: true, message: `Cache cleared for key: ${key}` },
        { status: 200 }
      );
    } else {
      clearCache();
      return NextResponse.json(
        { success: true, message: 'All cache cleared' },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
