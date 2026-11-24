import { NextRequest, NextResponse } from 'next/server';
import { getAllGames, getEventSettings, hasDatabaseConfigured } from '@/lib/db';
import { DEFAULT_GAMES, DEFAULT_SETTINGS } from '@/lib/defaults';
import { calculateRegistrationFees } from '@/lib/fee';
import { GameSelectionInput } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const selections: GameSelectionInput[] = Array.isArray(body.selections)
      ? body.selections
      : [];
    const usePackage = Boolean(body.usePackage);

    if (selections.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one sport.' },
        { status: 400 }
      );
    }

    let settings = DEFAULT_SETTINGS;
    let games = DEFAULT_GAMES.map((g, i) => ({ ...g, id: i + 1 }));

    if (hasDatabaseConfigured()) {
      [settings, games] = await Promise.all([getEventSettings(), getAllGames()]);
    }

    const result = calculateRegistrationFees(selections, usePackage, games, settings);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Fee calculation failed' },
      { status: 400 }
    );
  }
}
