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
type TransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

declare module 'knex/types/tables' {
  interface User extends BaseEntity {
    email: string;
    password_hash: string;
    is_email_verified: boolean;
    email_verified_at: Date | null;
    status: StatusEnum;
    role: RoleEnum;
    username?: string | null;
    first_name: string;
    last_name: string;
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

  interface VirtualAccount extends BaseEntity {
    bank_code?: string | null;
    bank_name?: string | null;
    account_number: string;
    reference: string;
    expiry_date: Date | null;
    wallet_id: number;
    bvn: string;
    phone_number: string;
  }

  interface Bank extends BaseEntity {
    bank_code: string;
    bank_name: string;
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
        | 'first_name'
        | 'last_name'
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

    virtual_accounts: Knex.CompositeTableType<
      VirtualAccount,
      Pick<
        VirtualAccount,
        | 'bank_code'
        | 'account_number'
        | 'reference'
        | 'wallet_id'
        | 'expiry_date'
        | 'bvn'
        | 'phone_number'
        | 'bank_name'
      > &
        Partial<
          Pick<
            VirtualAccount,
            'expiry_date' | 'created_at' | 'updated_at' | 'deleted_at'
          >
        >,
      Partial<Omit<VirtualAccount, 'id'>> &
        Partial<{ expiry_date: Date | null }>
    >;

    banks: Knex.CompositeTableType<
      Bank,
      Pick<Bank, 'bank_code' | 'bank_name'> &
        Partial<Pick<Bank, 'created_at' | 'updated_at' | 'deleted_at'>>,
      Partial<Omit<Bank, 'id'>> &
        Partial<{ bank_code: string; bank_name: string }>
    >;

    // test
    mock_table: Knex.CompositeTableType<any, any, Partial<any>>;
  }
}
