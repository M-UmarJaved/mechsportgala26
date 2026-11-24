import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { ensureDbReady, getSql } from '@/lib/db';

const ALLOWED_ELIG = ['Pending', 'Verified', 'Not Eligible'];

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDbReady();
    const sql = getSql();
    const { id } = await context.params;
    const playerId = Number(id);
    const body = await req.json();
    const status = String(body.eligibilityStatus || '');

    if (!ALLOWED_ELIG.includes(status)) {
      return NextResponse.json({ error: 'Invalid eligibility status' }, { status: 400 });
    }

    await sql`
      UPDATE players
      SET eligibility_status = ${status}
      WHERE id = ${playerId}
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update eligibility' },
      { status: 500 }
    );
  }
}
