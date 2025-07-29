import { Exclude } from 'class-transformer';
import { BaseEntity } from './base.entity';
import { RoleEnum, StatusEnum } from 'src/common/enums';
import Decimal from 'decimal.js';
// Define transaction types and statuses as string literals to mimic ENUMs
type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'REFUND';
type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export * from './base.entity';

export class User extends BaseEntity {
  email: string;
  @Exclude()
  password_hash: string;
  is_email_verified: boolean;
  email_verified_at: Date | null;
  status: StatusEnum;
  role: RoleEnum;
  username?: string | null;
}

export class Wallet extends BaseEntity {
  user_id: number;
  balance: Decimal;
  currency: string;
  is_active: boolean;
}

export class Transaction extends BaseEntity {
  wallet_id: number;
  transaction_type: TransactionType;
  amount: Decimal;
  currency: string;
  status: TransactionStatus;
  external_reference: string | null;
  internal_reference: string | null;
}
