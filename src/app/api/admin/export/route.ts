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

    let headers: string[] = [];
    let rows: Record<string, unknown>[] = [];
    let filename = 'sports-gala-export.csv';

    if (type === 'players') {
      filename = 'mechanical-sports-gala-players.csv';
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
      const data = await sql`
        SELECT registration_id, game_name, format, team_name, player_no,
               full_name, student_id, department, phone, email, eligibility_status, notes
        FROM players ORDER BY id ASC
      `;
      rows = data as Record<string, unknown>[];
    } else if (type === 'payments') {
      filename = 'mechanical-sports-gala-payments.csv';
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
    } else {
      filename = 'mechanical-sports-gala-registrations.csv';
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
