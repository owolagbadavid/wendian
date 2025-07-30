import Decimal from 'decimal.js';
import { BaseEntity } from './base.entity';
import { TransactionStatus, TransactionType } from '../types/knex';

export class Transaction extends BaseEntity {
  wallet_id: number;
  transaction_type: TransactionType;
  amount: Decimal;
  currency: string;
  status: TransactionStatus;
  external_reference: string | null;
  internal_reference: string | null;
}
