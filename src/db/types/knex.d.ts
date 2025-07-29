import { Knex } from 'knex';
import type { BaseEntity } from '../entities';
import { RoleEnum, StatusEnum } from 'src/common/enums';
import Decimal from 'decimal.js';
import { Exclude } from 'class-transformer';

// Define transaction types and statuses as string literals to mimic ENUMs
type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'REFUND';
type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

declare module 'knex/types/tables' {
  interface User extends BaseEntity {
    email: string;
    password_hash: string;
    is_email_verified: boolean;
    email_verified_at: Date | null;
    status: StatusEnum;
    role: RoleEnum;
    username?: string | null;
  }

  interface Wallet extends BaseEntity {
    user_id: number;
    balance: Decimal;
    currency: string;
    is_active: boolean;
  }

  interface Transaction extends BaseEntity {
    wallet_id: number;
    transaction_type: TransactionType;
    amount: Decimal;
    currency: string;
    status: TransactionStatus;
    external_reference: string | null;
    internal_reference: string | null;
  }

  interface Transfer extends BaseEntity {
    from_wallet_id: number;
    to_wallet_id: number;
    amount: Decimal;
    currency: string;
    description: string | null;
    from_transaction_id: number | null;
    to_transaction_id: number | null;
  }

  interface Tables {
    users: Knex.CompositeTableType<
      User,
      Pick<
        User,
        | 'email'
        | 'password_hash'
        | 'status'
        | 'role'
        | 'email_verified_at'
        | 'is_email_verified'
      > &
        Partial<Pick<User, 'created_at' | 'updated_at' | 'deleted_at'>>,
      Partial<Omit<User, 'id'>>
    >;
    wallets: Knex.CompositeTableType<
      Wallet,
      Pick<Wallet, 'user_id' | 'currency' | 'is_active'> &
        Partial<Pick<Wallet, 'created_at' | 'updated_at' | 'deleted_at'>> & {
          balance: number;
        },
      Partial<Omit<Wallet, 'id' | 'balance'>> & Partial<{ balance: number }>
    >;
    transactions: Knex.CompositeTableType<
      Transaction,
      Pick<
        Transaction,
        | 'wallet_id'
        | 'transaction_type'
        | 'currency'
        | 'status'
        | 'external_reference'
        | 'internal_reference'
      > &
        Partial<
          Pick<Transaction, 'created_at' | 'updated_at' | 'deleted_at'>
        > & { amount: number },
      Partial<Omit<Transaction, 'id' | 'amount'>> &
        Partial<{
          amount: number;
        }>
    >;
    transfers: Knex.CompositeTableType<
      Transfer,
      Pick<
        Transfer,
        | 'from_wallet_id'
        | 'to_wallet_id'
        | 'currency'
        | 'description'
        | 'from_transaction_id'
        | 'to_transaction_id'
      > &
        Partial<Pick<Transfer, 'created_at' | 'updated_at' | 'deleted_at'>> & {
          amount: number;
        },
      Partial<Omit<Transfer, 'id' | 'amount'>> &
        Partial<{
          amount: number;
        }>
    >;
  }
}
