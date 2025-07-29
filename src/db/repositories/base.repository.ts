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

  async findPaged(
    searchRequest: SearchRequestDto,
  ): Promise<PagedResult<Knex.ResolveTableType<T, 'base'>>> {
    const { filters = [], sorts = [], page = 1, size = 10 } = searchRequest;

    // 1. Build base query
    let baseQuery = this.createBaseQuery(this.tableName);

    // 2. Apply filters and sorts
    this.applyFilters(baseQuery, filters);
    this.applySorts(baseQuery, sorts);

    // 3. Optionally select specific fields
    baseQuery = this.applySelects(baseQuery);

    // 4. Get total count (cloned query)
    const total = await this.getTotalCount(baseQuery);

    // 5. Get paged items (cloned query)
    const items = await this.getPagedItems(baseQuery, page, size);

    return {
      items: items,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  protected createBaseQuery(
    tableName: keyof Tables,
  ): Knex.QueryBuilder<Knex.TableType<keyof Tables>> {
    return this.knex(tableName)
      .whereNull(`${tableName}.deleted_at`)
      .whereRaw('1=1');
  }

  protected async getTotalCount(query: Knex.QueryBuilder): Promise<number> {
    const result = (await query
      .clone()
      .clearSelect()
      .clearOrder()
      .count({ count: '*' })
      .first()) as { count: string };

    return Number(result?.count ?? 0);
  }

  protected applySelects(
    query: Knex.QueryBuilder<Knex.TableType<keyof Tables>>,
    selects?: string[],
  ): Knex.QueryBuilder<Knex.TableType<keyof Tables>> {
    if (selects && selects.length > 0) {
      return query.select(selects.map((key) => `${key}`));
    }
    return query.select(`${this.tableName}.*`);
  }

  protected async getPagedItems(
    query: Knex.QueryBuilder,
    page: number,
    size: number,
  ): Promise<Knex.ResolveTableType<T, 'base'>[]> {
    return (await query
      .clone()
      .offset((page - 1) * size)
      .limit(size)) as Knex.ResolveTableType<T, 'base'>[];
  }

  async findAll(
    trx?: Knex.Transaction,
  ): Promise<Knex.ResolveTableType<T, 'base'>[]> {
    const rows = await (trx || this.knex)(this.tableName)
      .whereNull('deleted_at')
      .select('*');

    return rows as Knex.ResolveTableType<T, 'base'>[];
  }

  async findOne(
    filter: Partial<Knex.ResolveTableType<T, 'base'>>,
    trx?: Knex.Transaction,
  ): Promise<Knex.ResolveTableType<T, 'base'> | null> {
    const row = await (trx || this.knex)(this.tableName)
      .where(filter)
      .whereNull('deleted_at')
      .first();

    return (row ?? null) as Knex.ResolveTableType<T, 'base'> | null;
  }

  async findById(
    id: number,
    trx?: Knex.Transaction,
  ): Promise<Knex.ResolveTableType<T, 'base'> | null> {
    const row = await (trx || this.knex)(this.tableName)
      .where({ id })
      .whereNull('deleted_at')
      .first();

    return (row ?? null) as Knex.ResolveTableType<T, 'base'> | null;
  }

  async insert(
    data: Knex.ResolveTableType<T, 'insert'>,
    trx?: Knex.Transaction,
  ): Promise<number> {
    const [created] = await (trx || this.knex)(this.tableName).insert(data);
    return created;
  }

  async update(
    id: number,
    data: Knex.ResolveTableType<T, 'update'>,
    trx?: Knex.Transaction,
  ): Promise<number> {
    const updated = await (trx || this.knex)(this.tableName)
      .where({ id })
      .whereNull('deleted_at')
      .update({
        ...data,
        updated_at: (trx || this.knex).fn.now() as unknown as Date,
      });

    return updated;
  }

  async softDelete(id: number, trx?: Knex.Transaction): Promise<boolean> {
    const affected = await (trx || this.knex)(this.tableName)
      .where({ id })
      .whereNull('deleted_at')
      .update({
        deleted_at: (trx || this.knex).fn.now() as unknown as Date,
      });

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
