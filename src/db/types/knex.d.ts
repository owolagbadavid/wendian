import { Knex } from 'knex';
import type { BaseEntity } from '../entities';
import { RoleEnum, StatusEnum } from 'src/common/enums';

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
  }

  interface Wallet extends BaseEntity {
    user_id: number;
    balance: number;
    currency: string;
    is_active: boolean;
  }

  interface Transaction extends BaseEntity {
    wallet_id: number;
    transaction_type: TransactionType;
    amount: number;
    currency: string;
    status: TransactionStatus;
    external_reference: string | null;
    internal_reference: string | null;
  }

  interface Transfer extends BaseEntity {
    from_wallet_id: number;
    to_wallet_id: number;
    amount: number;
    currency: string;
    status: TransactionStatus;
    description: string | null;
    fee: number;
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
      Pick<Wallet, 'user_id' | 'balance' | 'currency' | 'is_active'> &
        Partial<Pick<Wallet, 'created_at' | 'updated_at' | 'deleted_at'>>,
      Partial<Omit<Wallet, 'id'>>
    >;
    transactions: Knex.CompositeTableType<
      Transaction,
      Pick<
        Transaction,
        | 'wallet_id'
        | 'transaction_type'
        | 'amount'
        | 'currency'
        | 'status'
        | 'external_reference'
        | 'internal_reference'
      > &
        Partial<Pick<Transaction, 'created_at' | 'updated_at' | 'deleted_at'>>,
      Partial<Omit<Transaction, 'id'>>
    >;
    transfers: Knex.CompositeTableType<
      Transfer,
      Pick<
        Transfer,
        | 'from_wallet_id'
        | 'to_wallet_id'
        | 'amount'
        | 'currency'
        | 'status'
        | 'description'
        | 'fee'
        | 'from_transaction_id'
        | 'to_transaction_id'
      > &
        Partial<Pick<Transfer, 'created_at' | 'updated_at' | 'deleted_at'>>,
      Partial<Omit<Transfer, 'id'>>
    >;
  }
}
