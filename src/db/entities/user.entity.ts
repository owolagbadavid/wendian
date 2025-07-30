import { Exclude } from 'class-transformer';
import { RoleEnum, StatusEnum } from 'src/common/enums';
import { BaseEntity } from './base.entity';

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
