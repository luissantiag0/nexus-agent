// ============================================================================
// Nexus Agent Platform — IRepository Interface
// ============================================================================
// Generic repository interface for data access. All concrete repositories
// implement this interface to ensure consistent CRUD operations.
// ============================================================================

import type { QueryOptions, UUID } from "@/engine/types/supabase-types";

// ============================================================================
// IRepository<T> — Generic Repository Interface
// ============================================================================

export interface IRepository<TEntity, TCreate = TEntity, TUpdate = Partial<TEntity>> {
  /** Find an entity by its primary key (UUID). */
  findById(id: UUID): Promise<TEntity | null>;

  /** Find entities matching a set of criteria. */
  find(criteria: Partial<TEntity>, options?: QueryOptions): Promise<TEntity[]>;

  /** Find a single entity matching criteria. */
  findOne(criteria: Partial<TEntity>): Promise<TEntity | null>;

  /** Get all entities with optional query options. */
  findAll(options?: QueryOptions): Promise<TEntity[]>;

  /** Count entities matching criteria. */
  count(criteria?: Partial<TEntity>): Promise<number>;

  /** Create a new entity. */
  create(data: TCreate): Promise<TEntity>;

  /** Create multiple entities in a batch. */
  createBatch(data: TCreate[]): Promise<TEntity[]>;

  /** Update an entity by its primary key. */
  update(id: UUID, data: TUpdate): Promise<TEntity | null>;

  /** Update entities matching criteria. */
  updateWhere(criteria: Partial<TEntity>, data: TUpdate): Promise<number>;

  /** Soft-delete or hard-delete an entity by its primary key. */
  delete(id: UUID, soft?: boolean): Promise<boolean>;

  /** Delete entities matching criteria. */
  deleteWhere(criteria: Partial<TEntity>): Promise<number>;

  /** Check if an entity exists with the given criteria. */
  exists(criteria: Partial<TEntity>): Promise<boolean>;

  /** Upsert: insert if not exists, update if exists. */
  upsert(data: TCreate, conflictColumn: string): Promise<TEntity>;

  /** Execute a raw query (for complex operations). */
  rawQuery<R>(query: string, params?: unknown[]): Promise<R[]>;
}
