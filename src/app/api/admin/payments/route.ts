import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import {
  ensureDbReady,
  getSql,
  nextPaymentId,
  reconcileRegistrationPayment,
} from '@/lib/db';

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDbReady();
    const sql = getSql();
    const body = await req.json();

    const registrationId = String(body.registrationId || '').trim();
    const amount = Number(body.amount || 0);
    const method = body.method === 'JazzCash' ? 'JazzCash' : 'Cash';
    const reference = String(body.reference || '').trim();
    const status =
      body.status === 'Pending' || body.status === 'Rejected'
        ? body.status
        : 'Verified';
    const verifiedBy = String(body.verifiedBy || 'Organizer Desk').trim();
    const notes = String(body.notes || '').trim();

    if (!registrationId || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid registrationId and positive amount are required.' },
        { status: 400 }
      );
    }

    const regRows = await sql`
      SELECT game_name, captain_name FROM registrations WHERE registration_id = ${registrationId} LIMIT 1
    `;
    if (regRows.length === 0) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    const payId = await nextPaymentId();
    await sql`
      INSERT INTO payments (
        payment_id, registration_id, game_name, payer_name, amount, method,
        reference, status, verified_by, verified_at, notes
      )
      VALUES (
        ${payId}, ${registrationId}, ${regRows[0].game_name}, ${regRows[0].captain_name},
        ${amount}, ${method}, ${reference || 'Recorded at desk'}, ${status},
        ${status === 'Verified' ? verifiedBy : ''},
        ${status === 'Verified' ? new Date().toISOString() : null},
        ${notes || 'Manual payment entry'}
      )
    `;

    await reconcileRegistrationPayment(registrationId);

    return NextResponse.json({ success: true, paymentId: payId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to record payment' },
      { status: 500 }
    );
  }
}
