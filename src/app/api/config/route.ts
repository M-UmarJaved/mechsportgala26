import { connection, NextResponse } from 'next/server';
import { getAllGames, getEventSettings, hasDatabaseConfigured } from '@/lib/db';
import { DEFAULT_GAMES, DEFAULT_SETTINGS } from '@/lib/defaults';

export async function GET() {
  await connection();
  try {
    if (!hasDatabaseConfigured()) {
      return NextResponse.json({
        settings: DEFAULT_SETTINGS,
        games: DEFAULT_GAMES.map((g, i) => ({ ...g, id: i + 1 })),
        dbConnected: false,
      });
    }

    const [settings, games] = await Promise.all([
      getEventSettings(),
      getAllGames(),
    ]);

    return NextResponse.json({
      settings,
      games,
      dbConnected: true,
    });
  } catch (err) {
    console.error('GET /api/config error:', err);
    return NextResponse.json({
      settings: DEFAULT_SETTINGS,
      games: DEFAULT_GAMES.map((g, i) => ({ ...g, id: i + 1 })),
      dbConnected: false,
      warning: err instanceof Error ? err.message : 'Database connection error',
    });
  }
}
