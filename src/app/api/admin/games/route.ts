import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { ensureDbReady, getAllGames, getSql } from '@/lib/db';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const games = await getAllGames();
    return NextResponse.json({ games });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch games' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await ensureDbReady();
    const sql = getSql();
    const body = await req.json();
    const id = Number(body.id);

    if (!id) {
      return NextResponse.json({ error: 'Game id is required' }, { status: 400 });
    }

    await sql`
      UPDATE games
      SET fee_amount = COALESCE(${body.fee_amount !== undefined ? Number(body.fee_amount) : null}, fee_amount),
          min_players = COALESCE(${body.min_players !== undefined ? Number(body.min_players) : null}, min_players),
          max_players = COALESCE(${body.max_players !== undefined ? Number(body.max_players) : null}, max_players),
          is_open = COALESCE(${body.is_open !== undefined ? Boolean(body.is_open) : null}, is_open),
          is_package_eligible = COALESCE(${body.is_package_eligible !== undefined ? Boolean(body.is_package_eligible) : null}, is_package_eligible),
          notes = COALESCE(${body.notes !== undefined ? String(body.notes) : null}, notes)
      WHERE id = ${id}
    `;

    const games = await getAllGames();
    return NextResponse.json({ success: true, games });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update game' },
      { status: 500 }
    );
  }
}
