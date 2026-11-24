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
        'Department / Class',
        'Phone',
        'Email',
        'Eligibility Status',
        'Notes',
      ];
      const data = gameFilter
        ? await sql`
            SELECT registration_id, game_name, format, team_name, player_no,
                   full_name, student_id, department, phone, email, eligibility_status, notes
            FROM players
            WHERE game_name = ${gameFilter}
            ORDER BY registration_id ASC, player_no ASC
          `
        : await sql`
            SELECT registration_id, game_name, format, team_name, player_no,
                   full_name, student_id, department, phone, email, eligibility_status, notes
            FROM players ORDER BY id ASC
          `;
      rows = data as Record<string, unknown>[];
    } else if (type === 'payments') {
      filename = 'sports-gala-payments-ledger.csv';
      headers = [
        'Payment ID',
        'Created At',
        'Registration ID',
        'Game',
        'Payer Name',
        'Amount (PKR)',
        'Method',
        'Reference',
        'Status',
        'Verified By',
        'Verified At',
        'Notes',
      ];
      const data = await sql`
        SELECT payment_id, created_at, registration_id, game_name, payer_name,
               amount, method, reference, status, verified_by, verified_at, notes
        FROM payments ORDER BY id ASC
      `;
      rows = data as Record<string, unknown>[];
    } else if (type === 'unpaid') {
      filename = 'sports-gala-unpaid-pending-dues.csv';
      headers = [
        'Registration ID',
        'Submitted At',
        'Game',
        'Team / Entry',
        'Student / Captain',
        'Roll No / Student ID',
        'Department',
        'Phone',
        'Payment Method',
        'Fee Due (PKR)',
        'Verified Paid (PKR)',
        'Balance Remaining (PKR)',
        'Payment Status',
        'Transaction Ref',
      ];
      const data = await sql`
        SELECT registration_id, submitted_at, game_name, team_name, captain_name,
               captain_student_id, department, contact_phone, payment_method,
               fee_due, verified_paid, balance, payment_status, transaction_ref
        FROM registrations
        WHERE payment_status <> 'Paid' OR balance > 0
        ORDER BY id DESC
      `;
      rows = data as Record<string, unknown>[];
    } else if (type === 'summary') {
      filename = 'sports-gala-sport-summary-report.csv';
      headers = [
        'Sport',
        'Category',
        'Configured Fee (PKR)',
        'Open?',
        'Total Entries',
        'Total Athletes',
        'Total Fees Due (PKR)',
        'Verified Paid (PKR)',
        'Outstanding Balance (PKR)',
        'Approved Entries',
        'Pending Review',
      ];
      const data = await sql`
        SELECT g.name,
               g.entry_type,
               g.fee_amount,
               CASE WHEN g.is_open THEN 'Open' ELSE 'Closed' END AS is_open,
               COUNT(r.id)::int AS entries,
               COALESCE(SUM(r.player_count), 0)::int AS athletes,
               COALESCE(SUM(r.fee_due), 0)::int AS fees_due,
               COALESCE(SUM(r.verified_paid), 0)::int AS verified_paid,
               COALESCE(SUM(r.balance), 0)::int AS outstanding,
               COUNT(r.id) FILTER (WHERE r.registration_status = 'Approved')::int AS approved,
               COUNT(r.id) FILTER (WHERE r.registration_status = 'Pending Review')::int AS pending
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
        'Captain / Registrant',
        'Roll No / Student ID',
        'Contact Phone',
        'Email',
        'Department / Class',
        'Player Count',
        'Fee Due (PKR)',
        'Verified Paid (PKR)',
        'Balance (PKR)',
        'Payment Method',
        'Payment Status',
        'Registration Status',
        'Package Applied',
        'Transaction Ref',
        'Organizer Notes',
      ];
      const data = await sql`
        SELECT registration_id, submitted_at, game_name, format, team_name,
               captain_name, captain_student_id, contact_phone, email, department,
               player_count, fee_due, verified_paid, balance, payment_method,
               payment_status, registration_status, package_applied, transaction_ref, organizer_notes
        FROM registrations ORDER BY id ASC
      `;
      rows = data as Record<string, unknown>[];
    }

    const csvLines = [
      headers.map(csvEscape).join(','),
      ...rows.map((row) => Object.values(row).map(csvEscape).join(',')),
    ];
    // UTF-8 BOM so Microsoft Excel opens cleanly with zero garbled characters
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
