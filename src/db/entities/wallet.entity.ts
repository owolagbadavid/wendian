import Decimal from 'decimal.js';
import { BaseEntity } from './base.entity';

export class Wallet extends BaseEntity {
  user_id: number;
  balance: Decimal;
  currency: string;
  is_active: boolean;
}
