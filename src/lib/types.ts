export interface EventSettings {
  event_title: string;
  venue: string;
  registration_deadline: string;
  currency: string;
  package_enabled: boolean;
  package_fee: number;
  jazzcash_number: string;
  jazzcash_title: string;
  organizer_contact: string;
}

export interface GameConfig {
  id: number;
  name: string;
  entry_type: 'Team' | 'Pair' | 'Individual';
  allowed_format: string;
  min_players: number;
  max_players: number;
  fee_basis: 'Per Entry' | 'Per Player';
  fee_amount: number;
  is_open: boolean;
  is_package_eligible: boolean;
  notes: string;
  sort_order: number;
}

export interface PlayerInput {
  name: string;
  studentId: string;
  department: string;
  phone?: string;
  email?: string;
  gender?: string;
  notes?: string;
}

export interface GameSelectionInput {
  gameName: string;
  format?: string;
  teamName?: string;
  players: PlayerInput[];
}

export interface RegistrantInput {
  name: string;
  studentId: string;
  department: string;
  phone: string;
  email?: string;
  institution?: string;
}

export interface FeeItemized {
  gameName: string;
  format: string;
  entryType: string;
  playerCount: number;
  fee: number;
  feeNote: string;
  isPackageCovered: boolean;
}

export interface FeeCalculationResult {
  itemized: FeeItemized[];
  totalFee: number;
  packageApplied: boolean;
  packageFee: number;
  currency: string;
}

export interface PlayerRecord {
  id: number;
  registration_id: string;
  game_name: string;
  format: string;
  team_name: string;
  player_no: number;
  full_name: string;
  student_id: string;
  department: string;
  phone: string;
  email: string;
  gender: string;
  eligibility_status: 'Pending' | 'Verified' | 'Not Eligible';
  notes: string;
}

export interface PaymentRecord {
  id: number;
  payment_id: string;
  created_at: string;
  registration_id: string;
  game_name: string;
  payer_name: string;
  amount: number;
  method: string;
  reference: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  verified_by: string;
  verified_at: string | null;
  notes: string;
}

export interface RegistrationRecord {
  id: number;
  registration_id: string;
  submitted_at: string;
  game_name: string;
  format: string;
  team_name: string;
  captain_name: string;
  captain_student_id: string;
  contact_phone: string;
  email: string;
  department: string;
  institution: string;
  player_count: number;
  fee_due: number;
  verified_paid: number;
  balance: number;
  payment_method: 'Cash' | 'JazzCash';
  payment_status: 'Unpaid' | 'Partial' | 'Paid';
  registration_status: 'Pending Review' | 'Approved' | 'Rejected' | 'Waitlisted';
  package_applied: boolean;
  transaction_ref: string;
  has_receipt: boolean;
  organizer_notes: string;
  players?: PlayerRecord[];
  payments?: PaymentRecord[];
}
