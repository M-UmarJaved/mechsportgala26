import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { ensureDbReady, getAllGames, getSql } from '@/lib/db';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDbReady();
    const sql = getSql();

    const [games, regRows, plyRows, payRows] = await Promise.all([
      getAllGames(),
      sql`
        SELECT game_name, fee_due, verified_paid, balance, payment_method, payment_status, registration_status
        FROM registrations
      `,
      sql`
        SELECT game_name, eligibility_status FROM players
      `,
      sql`
        SELECT amount, method, status FROM payments
      `,
    ]);

    const gameStats: Record<
      string,
      {
        entries: number;
        players: number;
        feesDue: number;
        verifiedPaid: number;
        outstanding: number;
        approved: number;
        pending: number;
      }
    > = {};

    for (const g of games) {
      gameStats[g.name] = {
        entries: 0,
        players: 0,
        feesDue: 0,
        verifiedPaid: 0,
        outstanding: 0,
        approved: 0,
        pending: 0,
      };
    }

    let totalEntries = 0;
    let totalFeesDue = 0;
    let totalVerifiedPaid = 0;
    let pendingApproval = 0;
    let approvedEntries = 0;
    let waitlistedEntries = 0;
    let cashEntries = 0;
    let jazzcashEntries = 0;

    for (const r of regRows) {
      totalEntries++;
      const game = String(r.game_name);
      const feeDue = Number(r.fee_due || 0);
      const verifiedPaid = Number(r.verified_paid || 0);
      const regStatus = String(r.registration_status || '');
      const payMethod = String(r.payment_method || '');

      totalFeesDue += feeDue;
      totalVerifiedPaid += verifiedPaid;

      if (regStatus === 'Pending Review') pendingApproval++;
      if (regStatus === 'Approved') approvedEntries++;
      if (regStatus === 'Waitlisted') waitlistedEntries++;
      if (payMethod !== 'Cash') jazzcashEntries++;
      else cashEntries++;

      if (!gameStats[game]) {
        gameStats[game] = {
          entries: 0,
          players: 0,
          feesDue: 0,
          verifiedPaid: 0,
          outstanding: 0,
          approved: 0,
          pending: 0,
        };
      }
      gameStats[game].entries++;
      gameStats[game].feesDue += feeDue;
      gameStats[game].verifiedPaid += verifiedPaid;
      gameStats[game].outstanding = Math.max(
        0,
        gameStats[game].feesDue - gameStats[game].verifiedPaid
      );
      if (regStatus === 'Approved') gameStats[game].approved++;
      if (regStatus === 'Pending Review') gameStats[game].pending++;
    }

    let totalPlayers = 0;
    let playersVerified = 0;
    let playersPending = 0;
    let playersNotEligible = 0;

    for (const p of plyRows) {
      totalPlayers++;
      const game = String(p.game_name);
      const elig = String(p.eligibility_status || 'Pending');
      if (elig === 'Verified') playersVerified++;
      else if (elig === 'Not Eligible') playersNotEligible++;
      else playersPending++;

      if (gameStats[game]) {
        gameStats[game].players++;
      }
    }

    let cashVerified = 0;
    let jazzcashVerified = 0;
    let cashPending = 0;
    let jazzcashPending = 0;

    for (const pay of payRows) {
      const amount = Number(pay.amount || 0);
      const method = String(pay.method || 'Cash');
      const status = String(pay.status || 'Pending');

      if (status === 'Verified') {
        if (method !== 'Cash') jazzcashVerified += amount;
        else cashVerified += amount;
      } else if (status === 'Pending') {
        if (method !== 'Cash') jazzcashPending += amount;
        else cashPending += amount;
      }
    }

    return NextResponse.json({
      kpis: {
        totalEntries,
        totalPlayers,
        totalFeesDue,
        totalVerifiedPaid,
        totalOutstanding: Math.max(0, totalFeesDue - totalVerifiedPaid),
        pendingApproval,
        approvedEntries,
        waitlistedEntries,
        playersVerified,
        playersPending,
        playersNotEligible,
        cashEntries,
        jazzcashEntries,
        cashVerified,
        jazzcashVerified,
        cashPending,
        jazzcashPending,
      },
      gameStats,
    });
  } catch (err) {
    console.error('GET /api/admin/dashboard error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load dashboard' },
      { status: 500 }
    );
  }
}
