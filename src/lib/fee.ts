import {
  EventSettings,
  FeeCalculationResult,
  FeeItemized,
  GameConfig,
  GameSelectionInput,
} from './types';

/**
 * Authoritative server-side fee calculation engine.
 * Supports Per Entry, Per Player, and the 1,000 PKR Individual All-Access Pass
 * (which covers eligible solo games while billing team/pair games separately).
 */
export function calculateRegistrationFees(
  selections: GameSelectionInput[],
  usePackage: boolean,
  games: GameConfig[],
  settings: EventSettings
): FeeCalculationResult {
  const gameMap = new Map<string, GameConfig>();
  for (const g of games) {
    gameMap.set(g.name, g);
  }

  const eligibleSelections = selections.filter((sel) => {
    const g = gameMap.get(sel.gameName);
    return Boolean(g && g.is_package_eligible);
  });

  const applyPackage = Boolean(
    usePackage && settings.package_enabled && eligibleSelections.length > 0
  );

  let packageCharged = false;
  let totalFee = 0;
  const itemized: FeeItemized[] = [];

  for (const sel of selections) {
    const game = gameMap.get(sel.gameName);
    if (!game) {
      throw new Error(`Unknown game selected: ${sel.gameName}`);
    }
    if (!game.is_open) {
      throw new Error(`Registration is currently closed for ${game.name}.`);
    }

    const playerCount = Math.max(1, sel.players?.length || game.min_players);
    let fee = 0;
    let feeNote = '';
    let isPackageCovered = false;

    if (applyPackage && game.is_package_eligible) {
      isPackageCovered = true;
      if (!packageCharged) {
        fee = settings.package_fee;
        feeNote = `Individual All-Access Pass (${settings.package_fee.toLocaleString()} ${settings.currency})`;
        packageCharged = true;
      } else {
        fee = 0;
        feeNote = 'Included in Individual All-Access Pass (0 PKR)';
      }
    } else {
      if (game.fee_basis === 'Per Player') {
        fee = game.fee_amount * playerCount;
        feeNote = `${game.fee_amount.toLocaleString()} ${settings.currency} × ${playerCount} player(s)`;
      } else {
        fee = game.fee_amount;
        feeNote = `${game.fee_amount.toLocaleString()} ${settings.currency} per team/entry`;
      }
    }

    totalFee += fee;
    itemized.push({
      gameName: game.name,
      format: sel.format || game.allowed_format,
      entryType: game.entry_type,
      playerCount,
      fee,
      feeNote,
      isPackageCovered,
    });
  }

  return {
    itemized,
    totalFee,
    packageApplied: applyPackage,
    packageFee: settings.package_fee,
    currency: settings.currency,
  };
}
