import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { ensureDbReady, getSql } from '@/lib/db';

const ALLOWED_STATUSES = ['Pending Review', 'Approved', 'Rejected', 'Waitlisted'];

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ regId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDbReady();
    const sql = getSql();
    const { regId } = await context.params;
    const body = await req.json();

    if (body.registrationStatus !== undefined) {
      const status = String(body.registrationStatus);
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      await sql`
        UPDATE registrations
        SET registration_status = ${status}
        WHERE registration_id = ${regId}
      `;
    }

    if (body.organizerNotes !== undefined) {
      await sql`
        UPDATE registrations
        SET organizer_notes = ${String(body.organizerNotes)}
        WHERE registration_id = ${regId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ regId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDbReady();
    const sql = getSql();
    const { regId } = await context.params;

    await sql`DELETE FROM registrations WHERE registration_id = ${regId}`;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
