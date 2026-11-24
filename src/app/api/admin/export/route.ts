import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { ensureDbReady, getSql } from '@/lib/db';

function csvEscape(val: unknown): string {
  let s = val === null || val === undefined ? '' : String(val);
  // Prevent Excel CSV formula injection
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDbReady();
    const sql = getSql();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'registrations';
    const gameFilter = (searchParams.get('game') || '').trim();

    let headers: string[] = [];
    let rows: Record<string, unknown>[] = [];
    let filename = 'sports-gala-export.csv';

    if (type === 'players') {
      const safeGameSlug = gameFilter
        ? `-${gameFilter.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        : '';
      filename = `sports-gala-players${safeGameSlug}.csv`;
      headers = [
        'Registration ID',
        'Game',
        'Format',
        'Team / Entry',
        'Player No',
        'Full Name',
        'Roll No / Student ID',
        'Session',
        'Phone',
        'Email',
        'Notes',
      ];
      const data = gameFilter
        ? await sql`
            SELECT registration_id, game_name, format, team_name, player_no,
                   full_name, student_id, department, phone, email, notes
            FROM players
            WHERE game_name = ${gameFilter}
            ORDER BY registration_id ASC, player_no ASC
          `
        : await sql`
            SELECT registration_id, game_name, format, team_name, player_no,
                   full_name, student_id, department, phone, email, notes
            FROM players ORDER BY id ASC
          `;
      rows = data as Record<string, unknown>[];
    } else if (type === 'payments') {
      filename = 'sports-gala-payments-ledger.csv';
      headers = [
        'Payment ID',
        'Date / Time',
        'Registration ID',
        'Game',
        'Payer Name',
        'Amount Paid (PKR)',
        'Payment Method',
        'Transaction Ref / TID',
        'Recorded By',
        'Notes',
      ];
      const data = await sql`
        SELECT payment_id, created_at, registration_id, game_name, payer_name,
               amount, method, reference, verified_by, notes
        FROM payments ORDER BY id ASC
      `;
      rows = data as Record<string, unknown>[];
    } else if (type === 'summary') {
      filename = 'sports-gala-sport-summary-report.csv';
      headers = [
        'Sport',
        'Category',
        'Configured Fee (PKR)',
        'Registration Open?',
        'Total Entries',
        'Total Athletes',
        'Total Revenue Collected (PKR)',
      ];
      const data = await sql`
        SELECT g.name,
               g.entry_type,
               g.fee_amount,
               CASE WHEN g.is_open THEN 'Open' ELSE 'Closed' END AS is_open,
               COUNT(r.id)::int AS entries,
               COALESCE(SUM(r.player_count), 0)::int AS athletes,
               COALESCE(SUM(r.fee_due), 0)::int AS total_collected
        FROM games g
        LEFT JOIN registrations r ON r.game_name = g.name
        GROUP BY g.id, g.name, g.entry_type, g.fee_amount, g.is_open, g.sort_order
        ORDER BY g.sort_order ASC
      `;
      rows = data as Record<string, unknown>[];
    } else {
      filename = 'sports-gala-all-registrations.csv';
      headers = [
        'Registration ID',
        'Submitted At',
        'Game',
        'Format',
        'Team / Entry Name',
        'Student / Captain',
        'Roll No / Student ID',
        'Contact Phone',
        'Email',
        'Session',
        'Section',
        'Player Count',
        'Fee Paid (PKR)',
        'Payment Method',
        'Package Applied',
        'Transaction Ref / TID',
        'Notes',
      ];
      const data = await sql`
        SELECT registration_id, submitted_at, game_name, format, team_name,
               captain_name, captain_student_id, contact_phone, email, department,
               institution, player_count, fee_due, payment_method,
               package_applied, transaction_ref, organizer_notes
        FROM registrations ORDER BY id ASC
      `;
      rows = data as Record<string, unknown>[];
    }

    const csvLines = [
      headers.map(csvEscape).join(','),
      ...rows.map((row) => Object.values(row).map(csvEscape).join(',')),
    ];
    const csvContent = '\uFEFF' + csvLines.join('\r\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 }
    );
  }
}
