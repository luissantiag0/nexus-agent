// ============================================================================
// Nexus Agent Platform — Base Repository Implementation
// ============================================================================
// Abstract base repository providing default CRUD implementations
// for Supabase. Extend this class to create entity-specific repositories.
// ============================================================================

import type { IRepository } from "../interfaces/irepository";
import type { QueryOptions, FilterOperator, UUID } from "@/engine/types/supabase-types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";

// ============================================================================
// Base Repository
// ============================================================================

export abstract class BaseRepository<TEntity extends Record<string, unknown>, TCreate = TEntity, TUpdate = Partial<TEntity>>
  implements IRepository<TEntity, TCreate, TUpdate>
{
  constructor(
    protected readonly client: SupabaseClient,
    protected readonly tableName: string,
    protected readonly softDeleteField: string | null = "deleted_at",
  ) {}

  // ========================================================================
  // Read Operations
  // ========================================================================

  async findById(id: UUID): Promise<TEntity | null> {
    const query = this.client
      .from(this.tableName)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    this.applySoftDeleteFilter(query);
    const { data, error } = await query;

    if (error) throw new RepositoryError(`findById failed: ${error.message}`, error);
    return data as TEntity | null;
  }

  async find(criteria: Partial<TEntity>, options?: QueryOptions): Promise<TEntity[]> {
    let query = this.client.from(this.tableName).select(options?.select ?? "*");
    this.applySoftDeleteFilter(query);

    for (const [key, value] of Object.entries(criteria)) {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    }

    this.applyQueryOptions(query, options);
    const { data, error } = await query;

    if (error) throw new RepositoryError(`find failed: ${error.message}`, error);
    return (data ?? []) as TEntity[];
  }

  async findOne(criteria: Partial<TEntity>): Promise<TEntity | null> {
    let query = this.client.from(this.tableName).select("*").maybeSingle();
    this.applySoftDeleteFilter(query);

    for (const [key, value] of Object.entries(criteria)) {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query;
    if (error) throw new RepositoryError(`findOne failed: ${error.message}`, error);
    return data as TEntity | null;
  }

  async findAll(options?: QueryOptions): Promise<TEntity[]> {
    let query = this.client.from(this.tableName).select(options?.select ?? "*");
    this.applySoftDeleteFilter(query);
    this.applyQueryOptions(query, options);

    const { data, error } = await query;
    if (error) throw new RepositoryError(`findAll failed: ${error.message}`, error);
    return (data ?? []) as TEntity[];
  }

  async count(criteria?: Partial<TEntity>): Promise<number> {
    let query = this.client
      .from(this.tableName)
      .select("*", { count: "exact", head: true });
    this.applySoftDeleteFilter(query);

    if (criteria) {
      for (const [key, value] of Object.entries(criteria)) {
        if (value !== undefined) {
          query = query.eq(key, value);
        }
      }
    }

    const { count, error } = await query;
    if (error) throw new RepositoryError(`count failed: ${error.message}`, error);
    return count ?? 0;
  }

  async exists(criteria: Partial<TEntity>): Promise<boolean> {
    const count = await this.count(criteria);
    return count > 0;
  }

  // ========================================================================
  // Write Operations
  // ========================================================================

  async create(data: TCreate): Promise<TEntity> {
    const record = {
      id: uuid(),
      ...(data as Record<string, unknown>),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await this.client
      .from(this.tableName)
      .insert(record)
      .select()
      .single();

    if (error) throw new RepositoryError(`create failed: ${error.message}`, error);
    return created as TEntity;
  }

  async createBatch(data: TCreate[]): Promise<TEntity[]> {
    const now = new Date().toISOString();
    const records = data.map((item) => ({
      id: uuid(),
      ...(item as Record<string, unknown>),
      created_at: now,
      updated_at: now,
    }));

    const { data: created, error } = await this.client
      .from(this.tableName)
      .insert(records)
      .select();

    if (error) throw new RepositoryError(`createBatch failed: ${error.message}`, error);
    return (created ?? []) as TEntity[];
  }

  async update(id: UUID, data: TUpdate): Promise<TEntity | null> {
    const record = {
      ...(data as Record<string, unknown>),
      updated_at: new Date().toISOString(),
    };

    let query = this.client
      .from(this.tableName)
      .update(record)
      .eq("id", id)
      .select()
      .maybeSingle();

    this.applySoftDeleteFilter(query);
    const { data: updated, error } = await query;

    if (error) throw new RepositoryError(`update failed: ${error.message}`, error);
    return updated as TEntity | null;
  }

  async updateWhere(criteria: Partial<TEntity>, data: TUpdate): Promise<number> {
    const record = {
      ...(data as Record<string, unknown>),
      updated_at: new Date().toISOString(),
    };

    let query = this.client.from(this.tableName).update(record);
    for (const [key, value] of Object.entries(criteria)) {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    }

    const { error, count } = await query.select("id", { count: "exact", head: true });
    if (error) throw new RepositoryError(`updateWhere failed: ${error.message}`, error);
    return count ?? 0;
  }

  async delete(id: UUID, soft: boolean = true): Promise<boolean> {
    if (soft && this.softDeleteField) {
      const { error } = await this.client
        .from(this.tableName)
        .update({ [this.softDeleteField]: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw new RepositoryError(`soft delete failed: ${error.message}`, error);
      return true;
    }

    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq("id", id);

    if (error) throw new RepositoryError(`hard delete failed: ${error.message}`, error);
    return true;
  }

  async deleteWhere(criteria: Partial<TEntity>): Promise<number> {
    if (this.softDeleteField) {
      let query = this.client
        .from(this.tableName)
        .update({ [this.softDeleteField]: new Date().toISOString(), updated_at: new Date().toISOString() });

      for (const [key, value] of Object.entries(criteria)) {
        if (value !== undefined) {
          query = query.eq(key, value);
        }
      }

      const { error, count } = await query.select("id", { count: "exact", head: true });
      if (error) throw new RepositoryError(`soft deleteWhere failed: ${error.message}`, error);
      return count ?? 0;
    }

    let query = this.client.from(this.tableName).delete();
    for (const [key, value] of Object.entries(criteria)) {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    }

    const { error, count } = await query.select("id", { count: "exact", head: true });
    if (error) throw new RepositoryError(`hard deleteWhere failed: ${error.message}`, error);
    return count ?? 0;
  }

  async upsert(data: TCreate, conflictColumn: string): Promise<TEntity> {
    const record = {
      ...(data as Record<string, unknown>),
      updated_at: new Date().toISOString(),
    };

    if (!record.created_at) {
      record.created_at = new Date().toISOString();
    }

    const { data: upserted, error } = await this.client
      .from(this.tableName)
      .upsert(record, { onConflict: conflictColumn })
      .select()
      .single();

    if (error) throw new RepositoryError(`upsert failed: ${error.message}`, error);
    return upserted as TEntity;
  }

  async rawQuery<R>(query: string, params?: unknown[]): Promise<R[]> {
    const { data, error } = await this.client.rpc("run_sql", {
      query_text: query,
      query_params: params ?? [],
    });

    if (error) throw new RepositoryError(`rawQuery failed: ${error.message}`, error);
    return (data ?? []) as R[];
  }

  // ========================================================================
  // Protected Helpers
  // ========================================================================

  protected applySoftDeleteFilter(query: any): void {
    if (this.softDeleteField) {
      query.is(this.softDeleteField, null);
    }
  }

  protected applyQueryOptions(query: any, options?: QueryOptions): void {
    if (!options) return;

    if (options.orderBy) {
      query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      });
    }

    if (options.limit) {
      query.limit(options.limit);
    }

    if (options.offset) {
      query.range(options.offset, options.offset + (options.limit ?? 10) - 1);
    }

    if (options.filters) {
      for (const filter of options.filters) {
        query = query.filter(filter.column, filter.operator, filter.value);
      }
    }
  }
}

// ============================================================================
// Repository Error
// ============================================================================

export class RepositoryError extends Error {
  public readonly originalError: unknown;

  constructor(message: string, original?: unknown) {
    super(message);
    this.name = "RepositoryError";
    this.originalError = original;
  }
}
