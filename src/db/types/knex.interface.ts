import { Knex } from 'knex';
import type { BaseEntity } from '../entities';
import { RoleEnum, StatusEnum } from 'src/common/enums';

declare module 'knex/types/tables' {
  interface User extends BaseEntity {
    email: string;
    password_hash: string;
    is_email_verified: boolean;
    email_verified_at: Date | null;
    status: StatusEnum;
    role: RoleEnum;
  }

  interface Transaction extends BaseEntity {
    user_id: number;
    amount: number;
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
        Partial<Pick<User, 'created_at' | 'updated_at'>>,
      Partial<Omit<User, 'id'>>
    >;
    transactions: Knex.CompositeTableType<
      Transaction,
      Pick<Transaction, 'user_id' | 'amount'> &
        Partial<Pick<Transaction, 'created_at' | 'updated_at'>>,
      Partial<Omit<Transaction, 'id'>>
    >;
  }
}
