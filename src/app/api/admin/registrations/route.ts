import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import {
  ensureDbReady,
  getAllGames,
  getSql,
  nextPaymentId,
  nextRegistrationId,
} from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDbReady();
    const sql = getSql();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const gameFilter = (searchParams.get('game') || '').trim();
    const payStatusFilter = (searchParams.get('paymentStatus') || '').trim();
    const methodFilter = (searchParams.get('method') || '').trim();

    const [regRows, plyRows, payRows] = await Promise.all([
      sql`
        SELECT
          id, registration_id, submitted_at, game_name, format, team_name,
          captain_name, captain_student_id, contact_phone, email, department,
          institution, player_count, fee_due, verified_paid, balance,
          payment_method, payment_status, registration_status, package_applied,
          transaction_ref, (receipt_data IS NOT NULL AND receipt_data <> '') AS has_receipt,
          organizer_notes
        FROM registrations
        ORDER BY id DESC
      `,
      sql`
        SELECT id, registration_id, game_name, format, team_name, player_no,
               full_name, student_id, department, phone, email, gender, eligibility_status, notes
        FROM players
        ORDER BY player_no ASC, id ASC
      `,
      sql`
        SELECT id, payment_id, created_at, registration_id, game_name, payer_name,
               amount, method, reference, status, verified_by, verified_at, notes
        FROM payments
        ORDER BY id DESC
      `,
    ]);

    const playersByReg = new Map<string, typeof plyRows>();
    for (const p of plyRows) {
      const regId = String(p.registration_id);
      if (!playersByReg.has(regId)) playersByReg.set(regId, []);
      playersByReg.get(regId)!.push(p);
    }

    const paymentsByReg = new Map<string, typeof payRows>();
    for (const pay of payRows) {
      const regId = String(pay.registration_id);
      if (!paymentsByReg.has(regId)) paymentsByReg.set(regId, []);
      paymentsByReg.get(regId)!.push(pay);
    }

    const filtered = regRows
      .map((r) => {
        const row = r as Record<string, unknown>;
        const regId = String(row.registration_id);
        return {
          ...row,
          players: playersByReg.get(regId) || [],
          payments: paymentsByReg.get(regId) || [],
        } as Record<string, unknown> & {
          players: Record<string, unknown>[];
          payments: Record<string, unknown>[];
        };
      })
      .filter((r) => {
        if (gameFilter && String(r.game_name) !== gameFilter) return false;
        if (payStatusFilter && String(r.payment_status) !== payStatusFilter) return false;
        if (methodFilter) {
          const pm = String(r.payment_method || '');
          if (methodFilter === 'Online') {
            if (pm === 'Cash') return false;
          } else if (pm !== methodFilter) {
            return false;
          }
        }

        if (!q) return true;
        const playerMatch = r.players.some(
          (p) =>
            String(p.full_name || '').toLowerCase().includes(q) ||
            String(p.student_id || '').toLowerCase().includes(q)
        );
        return (
          playerMatch ||
          String(r.registration_id || '').toLowerCase().includes(q) ||
          String(r.captain_name || '').toLowerCase().includes(q) ||
          String(r.captain_student_id || '').toLowerCase().includes(q) ||
          String(r.team_name || '').toLowerCase().includes(q) ||
          String(r.contact_phone || '').toLowerCase().includes(q) ||
          String(r.department || '').toLowerCase().includes(q) ||
          String(r.transaction_ref || '').toLowerCase().includes(q)
        );
      });

    return NextResponse.json({ records: filtered });
  } catch (err) {
    console.error('GET /api/admin/registrations error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load registrations' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDbReady();
    const sql = getSql();
    const body = await req.json();

    const gameName = String(body.gameName || '').trim();
    const captainName = String(body.captainName || '').trim();
    const studentId = String(body.studentId || '').trim();
    const department = String(body.department || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim();
    const section = String(body.section || '').trim();
    const teamNameInput = String(body.teamName || '').trim();
    const paymentMethod =
      body.paymentMethod === 'Bank Transfer (UBL)' || body.paymentMethod === 'JazzCash'
        ? 'Bank Transfer (UBL)'
        : 'Cash';
    const transactionRef = String(body.transactionRef || '').trim();
    const markPaidAndApproved = Boolean(body.markPaidAndApproved);
    const notes = String(body.notes || '').trim();

    if (!gameName || !captainName || !studentId || !department || !phone) {
      return NextResponse.json(
        { error: 'Game, Full Name, Roll No / Student ID, Department, and Phone are required.' },
        { status: 400 }
      );
    }

    const games = await getAllGames();
    const game = games.find((g) => g.name === gameName);
    if (!game) {
      return NextResponse.json({ error: 'Invalid sport selected.' }, { status: 400 });
    }

    const regId = await nextRegistrationId();
    const submittedAt = new Date().toISOString();
    const teamName =
      teamNameInput ||
      (game.entry_type === 'Individual' ? captainName : `${captainName}'s ${game.entry_type}`);

    const feeDue =
      body.customFee !== undefined && body.customFee !== ''
        ? Math.max(0, Number(body.customFee))
        : game.fee_amount;

    const verifiedPaid = feeDue;
    const balance = 0;
    const paymentStatus = 'Paid';
    const registrationStatus = 'Approved';
    const eligibilityStatus = 'Verified';

    await sql`
      INSERT INTO registrations (
        registration_id, submitted_at, game_name, format, team_name,
        captain_name, captain_student_id, contact_phone, email, department,
        institution, player_count, fee_due, verified_paid, balance,
        payment_method, payment_status, registration_status, package_applied,
        transaction_ref, organizer_notes
      )
      VALUES (
        ${regId}, ${submittedAt}, ${game.name}, ${game.allowed_format}, ${teamName},
        ${captainName}, ${studentId}, ${phone}, ${email}, ${department},
        ${section}, 1, ${feeDue}, ${verifiedPaid}, ${balance},
        ${paymentMethod}, ${paymentStatus}, ${registrationStatus}, FALSE,
        ${transactionRef}, ${notes || 'Added directly via Organizer Desk (Cash/Classroom)'}
      )
    `;

    await sql`
      INSERT INTO players (
        registration_id, game_name, format, team_name, player_no,
        full_name, student_id, department, phone, email, eligibility_status, notes
      )
      VALUES (
        ${regId}, ${game.name}, ${game.allowed_format}, ${teamName}, 1,
        ${captainName}, ${studentId}, ${department}, ${phone}, ${email},
        ${eligibilityStatus}, 'Added via Organizer Desk'
      )
    `;

    if (feeDue > 0) {
      const payId = await nextPaymentId();
      await sql`
        INSERT INTO payments (
          payment_id, created_at, registration_id, game_name, payer_name,
          amount, method, reference, status, verified_by, verified_at, notes
        )
        VALUES (
          ${payId}, ${submittedAt}, ${regId}, ${game.name}, ${captainName},
          ${feeDue}, ${paymentMethod},
          ${transactionRef || 'Classroom Cash Collection'},
          'Verified',
          'Organizer Desk',
          ${submittedAt},
          ${notes || 'Added directly via Organizer Desk'}
        )
      `;
    }

    return NextResponse.json({ success: true, registrationId: regId });
  } catch (err) {
    console.error('POST /api/admin/registrations error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add entry' },
      { status: 500 }
    );
  }
}
