import Decimal from 'decimal.js';
import { BaseEntity } from './base.entity';

export class Transfer extends BaseEntity {
  from_wallet_id: number;
  to_wallet_id: number;
  amount: Decimal;
  currency: string;
  description: string | null;
  from_transaction_id: number | null;
  to_transaction_id: number | null;
}
