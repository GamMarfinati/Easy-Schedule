import { Knex } from 'knex';

/**
 * Helper to automatically add tenant isolation to a Knex query.
 * Ensures that queries only return data belonging to the specified tenant.
 * 
 * @param query The Knex query builder instance
 * @param tenantId The ID of the tenant (organization)
 * @returns The modified query builder
 */
export const withTenant = <TRecord extends {} = any, TResult = unknown[]>(
  query: Knex.QueryBuilder<TRecord, TResult>,
  tenantId: string | undefined
): Knex.QueryBuilder<TRecord, TResult> => {
  if (!tenantId) {
    throw new Error('Tenant ID is required for secure queries');
  }
  return query.where('organization_id', tenantId);
};
