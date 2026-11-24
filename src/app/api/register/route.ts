import { NextRequest, NextResponse } from 'next/server';
import {
  ensureDbReady,
  getAllGames,
  getEventSettings,
  getSql,
  nextPaymentId,
  nextRegistrationId,
} from '@/lib/db';
import { calculateRegistrationFees } from '@/lib/fee';
import { GameSelectionInput, RegistrantInput } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady();
    const sql = getSql();

    const body = await req.json();
    const registrant: RegistrantInput = body.registrant;
    const selections: GameSelectionInput[] = Array.isArray(body.selections)
      ? body.selections
      : [];
    const usePackage = Boolean(body.usePackage);
    const paymentMethod: 'Cash' | 'JazzCash' =
      body.paymentMethod === 'Online' || body.paymentMethod === 'JazzCash'
        ? 'JazzCash'
        : 'Cash';
    const transactionRef = String(body.transactionRef || '').trim();
    const receiptData: string | null =
      paymentMethod === 'JazzCash' && body.receiptData
        ? String(body.receiptData)
        : null;

    // Validate primary registrant
    if (
      !registrant ||
      !registrant.name?.trim() ||
      !registrant.studentId?.trim() ||
      !registrant.department?.trim() ||
      !registrant.phone?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Primary student Name, Roll No / Student ID, Department / Class, and Phone are required.',
        },
        { status: 400 }
      );
    }

    if (selections.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Please select at least one sport to register.' },
        { status: 400 }
      );
    }

    if (paymentMethod === 'JazzCash' && !receiptData) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please upload a screenshot/photo of your JazzCash payment receipt.',
        },
        { status: 400 }
      );
    }

    if (receiptData && receiptData.length > 3_500_000) {
      return NextResponse.json(
        {
          success: false,
          message: 'Receipt image is too large. Please upload a smaller photo.',
        },
        { status: 400 }
      );
    }

    if (
      receiptData &&
      (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(receiptData) ||
        receiptData.toLowerCase().includes('svg'))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid receipt format. Please upload a JPG, PNG, or WebP screenshot.',
        },
        { status: 400 }
      );
    }

    const [settings, games] = await Promise.all([getEventSettings(), getAllGames()]);
    const gameMap = new Map(games.map((g) => [g.name, g]));

    // Validate every selection's squad size and required player fields
    for (const sel of selections) {
      const game = gameMap.get(sel.gameName);
      if (!game) {
        return NextResponse.json(
          { success: false, message: `Invalid sport: ${sel.gameName}` },
          { status: 400 }
        );
      }
      if (!game.is_open) {
        return NextResponse.json(
          { success: false, message: `Registration is closed for ${game.name}.` },
          { status: 400 }
        );
      }

      const playersList =
        sel.players && sel.players.length > 0
          ? sel.players
          : [
              {
                name: registrant.name.trim(),
                studentId: registrant.studentId.trim(),
                department: registrant.department.trim(),
                phone: registrant.phone.trim(),
                email: registrant.email?.trim() || '',
              },
            ];

      if (playersList.length < game.min_players || playersList.length > game.max_players) {
        return NextResponse.json(
          {
            success: false,
            message: `${game.name} requires between ${game.min_players} and ${game.max_players} player(s). You provided ${playersList.length}.`,
          },
          { status: 400 }
        );
      }

      for (let i = 0; i < playersList.length; i++) {
        const p = playersList[i];
        if (!p.name?.trim() || !p.studentId?.trim() || !p.department?.trim()) {
          return NextResponse.json(
            {
              success: false,
              message: `Player #${i + 1} in ${game.name} must have Full Name, Student ID, and Department / Class.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Authoritative server-side fee calculation
    const feeSummary = calculateRegistrationFees(selections, usePackage, games, settings);
    const submittedAt = new Date().toISOString();

    const generatedEntries: {
      registrationId: string;
      gameName: string;
      format: string;
      teamName: string;
      playerCount: number;
      feeDue: number;
      feeNote: string;
    }[] = [];

    for (let idx = 0; idx < selections.length; idx++) {
      const sel = selections[idx];
      const feeInfo = feeSummary.itemized[idx];
      const game = gameMap.get(sel.gameName)!;
      const regId = await nextRegistrationId();

      const playersList =
        sel.players && sel.players.length > 0
          ? sel.players
          : [
              {
                name: registrant.name.trim(),
                studentId: registrant.studentId.trim(),
                department: registrant.department.trim(),
                phone: registrant.phone.trim(),
                email: registrant.email?.trim() || '',
              },
            ];

      const teamOrEntryName =
        sel.teamName?.trim() ||
        (game.entry_type === 'Individual'
          ? registrant.name.trim()
          : `${registrant.name.trim()}'s ${game.entry_type}`);

      const feeDue = feeInfo.fee;
      const initialPaymentStatus = feeDue === 0 ? 'Paid' : 'Unpaid';
      const organizerNote =
        paymentMethod === 'JazzCash'
          ? `Method: JazzCash${transactionRef ? ` | TID: ${transactionRef}` : ''} | Receipt uploaded`
          : 'Method: Cash at Registration Desk';

      // Insert registration
      await sql`
        INSERT INTO registrations (
          registration_id, submitted_at, game_name, format, team_name,
          captain_name, captain_student_id, contact_phone, email, department,
          institution, player_count, fee_due, verified_paid, balance,
          payment_method, payment_status, registration_status, package_applied,
          transaction_ref, receipt_data, organizer_notes
        )
        VALUES (
          ${regId}, ${submittedAt}, ${game.name}, ${feeInfo.format}, ${teamOrEntryName},
          ${registrant.name.trim()}, ${registrant.studentId.trim()}, ${registrant.phone.trim()},
          ${registrant.email?.trim() || ''}, ${registrant.department.trim()},
          ${registrant.institution?.trim() || ''}, ${playersList.length}, ${feeDue}, 0, ${feeDue},
          ${paymentMethod}, ${initialPaymentStatus}, 'Pending Review', ${feeInfo.isPackageCovered},
          ${transactionRef}, ${idx === 0 ? receiptData : null}, ${organizerNote}
        )
      `;

      // If multiple games share the same JazzCash receipt, attach receipt_data to each entry with fee > 0
      if (idx > 0 && receiptData && feeDue > 0) {
        await sql`
          UPDATE registrations SET receipt_data = ${receiptData} WHERE registration_id = ${regId}
        `;
      }

      // Insert players
      for (let pIdx = 0; pIdx < playersList.length; pIdx++) {
        const p = playersList[pIdx];
        await sql`
          INSERT INTO players (
            registration_id, game_name, format, team_name, player_no,
            full_name, student_id, department, phone, email, gender, eligibility_status, notes
          )
          VALUES (
            ${regId}, ${game.name}, ${feeInfo.format}, ${teamOrEntryName}, ${pIdx + 1},
            ${p.name.trim()}, ${p.studentId.trim()}, ${p.department.trim()},
            ${p.phone?.trim() || registrant.phone.trim()},
            ${p.email?.trim() || registrant.email?.trim() || ''},
            ${p.gender?.trim() || ''}, 'Pending', ${p.notes?.trim() || ''}
          )
        `;
      }

      // Insert pending payment row if fee > 0
      if (feeDue > 0) {
        const payId = await nextPaymentId();
        await sql`
          INSERT INTO payments (
            payment_id, created_at, registration_id, game_name, payer_name,
            amount, method, reference, receipt_data, status, verified_by, notes
          )
          VALUES (
            ${payId}, ${submittedAt}, ${regId}, ${game.name}, ${registrant.name.trim()},
            ${feeDue}, ${paymentMethod},
            ${transactionRef || (paymentMethod === 'JazzCash' ? 'JazzCash screenshot attached' : 'Cash at registration desk')},
            ${receiptData}, 'Pending', '',
            ${paymentMethod === 'JazzCash' ? 'Pending organizer verification of JazzCash receipt' : 'Cash payable at registration desk'}
          )
        `;
      }

      generatedEntries.push({
        registrationId: regId,
        gameName: game.name,
        format: feeInfo.format,
        teamName: teamOrEntryName,
        playerCount: playersList.length,
        feeDue,
        feeNote: feeInfo.feeNote,
      });
    }

    return NextResponse.json({
      success: true,
      submissionTime: submittedAt,
      registrant: {
        name: registrant.name.trim(),
        studentId: registrant.studentId.trim(),
        department: registrant.department.trim(),
        phone: registrant.phone.trim(),
        email: registrant.email?.trim() || '',
      },
      paymentMethod,
      transactionRef,
      totalFeeDue: feeSummary.totalFee,
      currency: feeSummary.currency,
      packageApplied: feeSummary.packageApplied,
      entries: generatedEntries,
      paymentInstructions: {
        jazzcashNumber: settings.jazzcash_number,
        jazzcashTitle: settings.jazzcash_title,
      },
    });
  } catch (err) {
    console.error('POST /api/register error:', err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Registration submission failed.',
      },
      { status: 500 }
    );
  }
}
