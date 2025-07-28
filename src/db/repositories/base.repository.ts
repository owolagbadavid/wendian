// src/shared/base.repository.ts
import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import {
  FilterRequestDto,
  PagedResult,
  SearchRequestDto,
  SortRequestDto,
} from 'src/common/dtos';
import { Operator } from 'src/common/enums';
import { Tables } from 'knex/types/tables';

type TableEntity = Tables[keyof Tables];

@Injectable()
export class BaseRepository<T extends TableEntity> {
  constructor(
    protected readonly knex: Knex<T>,
    protected readonly tableName: keyof Tables,
  ) {}

  async findPaged(searchRequest: SearchRequestDto): Promise<PagedResult<T>> {
    const { filters = [], sorts = [], page = 1, size = 10 } = searchRequest;

    const query = this.knex(this.tableName)
      .whereNull('deleted_at')
      .whereRaw('1=1');

    this.applyFilters(query, filters);
    this.applySorts(query, sorts);

    const totalQuery = query
      .clone()
      .clearSelect()
      .clearOrder()
      .count({ count: '*' })
      .first();

    const itemsQuery = query
      .clone()
      .offset((page - 1) * size)
      .limit(size)
      .select('*');

    const [totalResult, items] = await Promise.all([totalQuery, itemsQuery]);

    // const items = rawItems as T[];
    const total = Number(totalResult?.count ?? 0);

    return {
      items: items as unknown as T[],
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async findAll(): Promise<T[]> {
    const rows = await this.knex(this.tableName)
      .whereNull('deleted_at')
      .select('*');

    return rows as unknown as T[];
  }

  async findOne(filter: Partial<T>): Promise<T | null> {
    const row = await this.knex(this.tableName)
      .where(filter)
      .whereNull('deleted_at')
      .first();

    return (row ?? null) as unknown as T | null;
  }

  async findById(id: number): Promise<T | null> {
    const row = await this.knex(this.tableName)
      .where({ id })
      .whereNull('deleted_at')
      .first();

    return (row ?? null) as unknown as T | null;
  }

  async insert(data: Knex.ResolveTableType<T, 'insert'>): Promise<T> {
    const [created] = await this.knex(this.tableName).insert(data);

    return created as unknown as T;
  }

  async update(
    id: number,
    data: Knex.ResolveTableType<T, 'update'>,
  ): Promise<number> {
    const updated = await this.knex(this.tableName)
      .where({ id })
      .whereNull('deleted_at')
      .update({ ...data, updated_at: this.knex.fn.now() as unknown as Date });

    return updated;
  }

  async softDelete(id: number): Promise<boolean> {
    const affected = await this.knex(this.tableName)
      .where({ id })
      .whereNull('deleted_at')
      .update({ deleted_at: this.knex.fn.now() as unknown as Date });

    return affected > 0;
  }

  protected applyFilters(
    query: Knex.QueryBuilder,
    filters: FilterRequestDto[],
  ) {
    filters.forEach((filter) => {
      const col = `${this.tableName}.${filter.key}`;
      switch (filter.operator) {
        case Operator.EQUALS:
          query.andWhere(col, '=', this.knex.raw('?', [filter.value]));
          break;
        case Operator.NOT_EQUALS:
          query.andWhere(col, '!=', this.knex.raw('?', [filter.value]));
          break;
        case Operator.GREATER_THAN:
          query.andWhere(col, '>', this.knex.raw('?', [filter.value]));
          break;
        case Operator.LESS_THAN:
          query.andWhere(col, '<', this.knex.raw('?', [filter.value]));
          break;
        case Operator.BETWEEN:
          query.andWhereBetween(col, [filter.value, filter.valueTo]);
          break;
        case Operator.IN:
          if (filter.values?.length) query.whereIn(col, filter.values);
          break;
        case Operator.LIKE:
          query.andWhere(
            col,
            'like',
            this.knex.raw('?', [`%${filter.value}%`]),
          );
          break;
        case Operator.ILIKE:
          query.andWhereRaw(`LOWER(${col}) LIKE LOWER(?)`, [
            `%${filter.value}%`,
          ]);
          break;
      }
    });
  }

  protected applySorts(query: Knex.QueryBuilder, sorts: SortRequestDto[]) {
    sorts.forEach((sort) => {
      query.orderBy(`${this.tableName}.${sort.key}`, sort.direction);
    });
  }
}
