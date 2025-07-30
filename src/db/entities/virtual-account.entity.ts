import { BaseEntity } from './base.entity';

export class VirtualAccount extends BaseEntity {
  bank_code?: string;
  account_number: string;
  reference: string;
  expiry_date: Date | null;
  wallet_id: number;
  bvn: string;
  phone_number: string;
  bank_name?: string | null;
}
