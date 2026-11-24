import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { ensureDbReady, getSql } from '@/lib/db';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }[];
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'lookup_student',
      description:
        'Look up a specific student, team, or registration by Roll Number / Student ID, Full Name, Phone, Team Name, or Registration ID (e.g. SG-2026-000001). Returns all their registered sports, fee due, verified paid, balance, payment method, payment status, and eligibility.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Student roll number, name, phone, team name, or registration ID',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_dashboard_summary',
      description:
        'Get overall Mechanical Sports Gala 2026 event summary: total registrations, total athletes, total fees due, verified revenue collected, outstanding balance, Cash vs JazzCash breakdown, approval counts, and top departments.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sport_breakdown',
      description:
        'Get detailed registration stats, team/entry counts, athlete counts, fees due, verified paid, and team names for all 10 sports or a specific sport.',
      parameters: {
        type: 'object',
        properties: {
          sport_name: {
            type: 'string',
            description:
              'Optional sport name to filter (e.g. Cricket, Football, Badminton, Ludo, Table Tennis, Basketball, Chess, Rubik, Arm Wrestling, Tug of War)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'filter_registrations',
      description:
        'List registrations filtered by payment status, payment method, registration status, sport, or department.',
      parameters: {
        type: 'object',
        properties: {
          payment_status: {
            type: 'string',
            enum: ['Unpaid', 'Partial', 'Paid'],
          },
          payment_method: {
            type: 'string',
            enum: ['Cash', 'JazzCash'],
          },
          registration_status: {
            type: 'string',
            enum: ['Pending Review', 'Approved', 'Rejected', 'Waitlisted'],
          },
          game_name: { type: 'string' },
          department: { type: 'string' },
        },
      },
    },
  },
];

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  await ensureDbReady();
  const sql = getSql();

  if (name === 'lookup_student') {
    const q = String(args.query || '').trim();
    if (!q) return JSON.stringify({ error: 'Empty search query' });
    const pattern = `%${q}%`;

    const regs = await sql`
      SELECT DISTINCT r.registration_id, r.submitted_at, r.game_name, r.format, r.team_name,
             r.captain_name, r.captain_student_id, r.contact_phone, r.department,
             r.player_count, r.fee_due, r.verified_paid, r.balance,
             r.payment_method, r.payment_status, r.registration_status,
             r.package_applied, r.transaction_ref, r.organizer_notes
      FROM registrations r
      LEFT JOIN players p ON p.registration_id = r.registration_id
      WHERE r.registration_id ILIKE ${pattern}
         OR r.captain_name ILIKE ${pattern}
         OR r.captain_student_id ILIKE ${pattern}
         OR r.team_name ILIKE ${pattern}
         OR r.contact_phone ILIKE ${pattern}
         OR p.full_name ILIKE ${pattern}
         OR p.student_id ILIKE ${pattern}
      ORDER BY r.registration_id DESC
      LIMIT 25
    `;

    const players = await sql`
      SELECT registration_id, game_name, player_no, full_name, student_id, department, eligibility_status
      FROM players
      WHERE full_name ILIKE ${pattern}
         OR student_id ILIKE ${pattern}
         OR registration_id ILIKE ${pattern}
      ORDER BY id DESC
      LIMIT 30
    `;

    return JSON.stringify({
      query: q,
      matching_registrations_count: regs.length,
      registrations: regs,
      matching_players: players,
    });
  }

  if (name === 'get_dashboard_summary') {
    const regTotals = await sql`
      SELECT
        COUNT(*)::int AS total_entries,
        COALESCE(SUM(fee_due), 0)::int AS total_fees_due,
        COALESCE(SUM(verified_paid), 0)::int AS total_verified_paid,
        COALESCE(SUM(balance), 0)::int AS total_outstanding,
        COUNT(*) FILTER (WHERE registration_status = 'Approved')::int AS approved_entries,
        COUNT(*) FILTER (WHERE registration_status = 'Pending Review')::int AS pending_entries,
        COUNT(*) FILTER (WHERE payment_status = 'Paid')::int AS paid_entries,
        COUNT(*) FILTER (WHERE payment_status = 'Unpaid')::int AS unpaid_entries,
        COUNT(*) FILTER (WHERE payment_method = 'Cash')::int AS cash_entries,
        COUNT(*) FILTER (WHERE payment_method = 'JazzCash')::int AS jazzcash_entries,
        COUNT(*) FILTER (WHERE package_applied = TRUE)::int AS package_entries
      FROM registrations
    `;

    const plyTotals = await sql`
      SELECT
        COUNT(*)::int AS total_players,
        COUNT(*) FILTER (WHERE eligibility_status = 'Verified')::int AS verified_players,
        COUNT(*) FILTER (WHERE eligibility_status = 'Pending')::int AS pending_players,
        COUNT(*) FILTER (WHERE eligibility_status = 'Not Eligible')::int AS not_eligible_players
      FROM players
    `;

    const payTotals = await sql`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'Verified' AND method = 'Cash'), 0)::int AS cash_verified_pkr,
        COALESCE(SUM(amount) FILTER (WHERE status = 'Verified' AND method = 'JazzCash'), 0)::int AS jazzcash_verified_pkr,
        COALESCE(SUM(amount) FILTER (WHERE status = 'Pending' AND method = 'Cash'), 0)::int AS cash_pending_pkr,
        COALESCE(SUM(amount) FILTER (WHERE status = 'Pending' AND method = 'JazzCash'), 0)::int AS jazzcash_pending_pkr
      FROM payments
    `;

    const topDepts = await sql`
      SELECT department, COUNT(*)::int AS entries
      FROM registrations
      GROUP BY department
      ORDER BY entries DESC
      LIMIT 10
    `;

    return JSON.stringify({
      registrations: regTotals[0],
      players: plyTotals[0],
      revenue_breakdown: payTotals[0],
      top_departments: topDepts,
    });
  }

  if (name === 'get_sport_breakdown') {
    const sportFilter = String(args.sport_name || '').trim();
    const stats = sportFilter
      ? await sql`
          SELECT game_name,
                 COUNT(*)::int AS entries,
                 COALESCE(SUM(player_count), 0)::int AS players,
                 COALESCE(SUM(fee_due), 0)::int AS fees_due,
                 COALESCE(SUM(verified_paid), 0)::int AS verified_paid,
                 COALESCE(SUM(balance), 0)::int AS outstanding,
                 COUNT(*) FILTER (WHERE registration_status = 'Approved')::int AS approved,
                 COUNT(*) FILTER (WHERE payment_status = 'Paid')::int AS paid
          FROM registrations
          WHERE game_name ILIKE ${`%${sportFilter}%`}
          GROUP BY game_name
          ORDER BY entries DESC
        `
      : await sql`
          SELECT g.name AS game_name,
                 g.fee_amount AS configured_fee_pkr,
                 g.is_open,
                 COUNT(r.id)::int AS entries,
                 COALESCE(SUM(r.player_count), 0)::int AS players,
                 COALESCE(SUM(r.fee_due), 0)::int AS fees_due,
                 COALESCE(SUM(r.verified_paid), 0)::int AS verified_paid,
                 COALESCE(SUM(r.balance), 0)::int AS outstanding,
                 COUNT(r.id) FILTER (WHERE r.registration_status = 'Approved')::int AS approved
          FROM games g
          LEFT JOIN registrations r ON r.game_name = g.name
          GROUP BY g.id, g.name, g.fee_amount, g.is_open, g.sort_order
          ORDER BY g.sort_order ASC
        `;

    let teams: unknown[] = [];
    if (sportFilter) {
      teams = await sql`
        SELECT registration_id, game_name, team_name, captain_name, captain_student_id,
               player_count, fee_due, payment_method, payment_status, registration_status
        FROM registrations
        WHERE game_name ILIKE ${`%${sportFilter}%`}
        ORDER BY id DESC
        LIMIT 30
      `;
    }

    return JSON.stringify({ stats, entries: teams });
  }

  if (name === 'filter_registrations') {
    const payStatus = args.payment_status ? String(args.payment_status) : null;
    const payMethod = args.payment_method ? String(args.payment_method) : null;
    const regStatus = args.registration_status ? String(args.registration_status) : null;
    const gameName = args.game_name ? `%${String(args.game_name)}%` : null;
    const dept = args.department ? `%${String(args.department)}%` : null;

    const rows = await sql`
      SELECT registration_id, game_name, team_name, captain_name, captain_student_id,
             department, contact_phone, fee_due, verified_paid, balance,
             payment_method, payment_status, registration_status, transaction_ref
      FROM registrations
      WHERE (${payStatus}::text IS NULL OR payment_status = ${payStatus})
        AND (${payMethod}::text IS NULL OR payment_method = ${payMethod})
        AND (${regStatus}::text IS NULL OR registration_status = ${regStatus})
        AND (${gameName}::text IS NULL OR game_name ILIKE ${gameName})
        AND (${dept}::text IS NULL OR department ILIKE ${dept})
      ORDER BY id DESC
      LIMIT 40
    `;

    return JSON.stringify({
      count: rows.length,
      registrations: rows,
    });
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json(
      {
        error:
          'GROQ_API_KEY is not configured. Add your free Groq API key (from console.groq.com) in Vercel Environment Variables to enable Gala AI.',
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const question = String(body.question || '').trim();
    const history: { role: 'user' | 'assistant'; content: string }[] = Array.isArray(
      body.history
    )
      ? body.history.slice(-6)
      : [];

    if (!question) {
      return NextResponse.json({ error: 'Please enter a question.' }, { status: 400 });
    }

    const messages: GroqMessage[] = [
      {
        role: 'system',
        content: `You are "Gala AI", the official database assistant for Mechanical Sports Gala 2026 organizers.
Always use your database tools to answer questions with exact, live numbers and records — NEVER guess or invent student names, payment statuses, or totals.
Be concise, clear, and well-structured using bullet points or short markdown tables when listing multiple records.
Currency is PKR. Official JazzCash account is 03281159050 (Abdul Ahad).
If the user writes in Roman Urdu or English, reply clearly in the same language.`,
      },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: question },
    ];

    const toolsUsed: string[] = [];
    const candidateModels = [
      process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
    ];
    let activeModel = candidateModels[0];

    for (let turn = 0; turn < 4; turn++) {
      let groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: activeModel,
          messages,
          tools: TOOLS,
          tool_choice: 'auto',
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });

      if (groqRes.status === 404 && activeModel !== candidateModels[1]) {
        activeModel = candidateModels[1];
        groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: activeModel,
            messages,
            tools: TOOLS,
            tool_choice: 'auto',
            temperature: 0.1,
            max_tokens: 1024,
          }),
        });
      }

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        throw new Error(`Groq API error (${groqRes.status}): ${errText}`);
      }

      const data = await groqRes.json();
      const assistantMsg = data.choices?.[0]?.message;
      if (!assistantMsg) {
        throw new Error('Empty response from Groq API');
      }

      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        messages.push({
          role: 'assistant',
          content: assistantMsg.content || null,
          tool_calls: assistantMsg.tool_calls,
        });

        for (const tc of assistantMsg.tool_calls) {
          const fnName = tc.function.name;
          toolsUsed.push(fnName);
          let parsedArgs: Record<string, unknown> = {};
          try {
            parsedArgs = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
          } catch {
            parsedArgs = {};
          }
          const toolResult = await executeTool(fnName, parsedArgs);
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: fnName,
            content: toolResult,
          });
        }
        continue;
      }

      return NextResponse.json({
        answer: assistantMsg.content || 'No answer generated.',
        toolsUsed: Array.from(new Set(toolsUsed)),
      });
    }

    return NextResponse.json({
      answer: 'I completed the database lookups but could not summarize them in time. Please try a more specific question.',
      toolsUsed: Array.from(new Set(toolsUsed)),
    });
  } catch (err) {
    console.error('POST /api/admin/ai-query error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI query failed' },
      { status: 500 }
    );
  }
}
