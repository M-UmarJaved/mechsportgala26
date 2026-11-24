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
    const verifiedBy = String(body.verifiedBy || 'Organizer Desk').trim();

    if (!registrationId) {
      return NextResponse.json({ error: 'registrationId is required' }, { status: 400 });
    }

    const regRows = await sql`
      SELECT registration_id, game_name, captain_name, fee_due, verified_paid, payment_method, transaction_ref
      FROM registrations
      WHERE registration_id = ${registrationId}
      LIMIT 1
    `;

    if (regRows.length === 0) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    const reg = regRows[0];
    const feeDue = Number(reg.fee_due || 0);

    // Verify any existing pending payments for this registration
    const pendingPays = await sql`
      SELECT id FROM payments
      WHERE registration_id = ${registrationId} AND status = 'Pending'
    `;

    if (pendingPays.length > 0) {
      await sql`
        UPDATE payments
        SET status = 'Verified',
            verified_by = ${verifiedBy},
            verified_at = NOW(),
            notes = CONCAT(notes, ' | Verified at desk')
        WHERE registration_id = ${registrationId} AND status = 'Pending'
      `;
    } else if (feeDue > 0 && Number(reg.verified_paid || 0) < feeDue) {
      const remaining = feeDue - Number(reg.verified_paid || 0);
      const payId = await nextPaymentId();
      await sql`
        INSERT INTO payments (
          payment_id, registration_id, game_name, payer_name, amount, method,
          reference, status, verified_by, verified_at, notes
        )
        VALUES (
          ${payId}, ${registrationId}, ${reg.game_name}, ${reg.captain_name},
          ${remaining}, ${reg.payment_method || 'Cash'},
          ${reg.transaction_ref || 'Verified at registration desk'},
          'Verified', ${verifiedBy}, NOW(), 'Quick Desk Approval'
        )
      `;
    }

    // Reconcile balance & payment status
    await reconcileRegistrationPayment(registrationId);

    // Mark registration Approved and all its players Verified
    await sql`
      UPDATE registrations
      SET registration_status = 'Approved'
      WHERE registration_id = ${registrationId}
    `;

    await sql`
      UPDATE players
      SET eligibility_status = 'Verified'
      WHERE registration_id = ${registrationId} AND eligibility_status = 'Pending'
    `;

    return NextResponse.json({ success: true, registrationId });
  } catch (err) {
    console.error('POST /api/admin/approve error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Approval failed' },
      { status: 500 }
    );
  }
}
