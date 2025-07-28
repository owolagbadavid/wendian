export class BaseEntity {
  constructor(
    public id: number,
    public created_at: Date,
    public updated_at: Date,
    public deleted_at: Date | null,
  ) {}
}
