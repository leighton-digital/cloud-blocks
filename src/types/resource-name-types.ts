import type { Region } from '../types/environments';
/**
 * Represents the core components used to generate AWS resource names.
 *
 * Naming convention:
 *   `<stage>-<service>-<resource>`
 *
 * This structure is generic so any project can pass its own service name
 * and resource type without being restricted to a fixed set.
 */
export interface ResourceNameParts {
  /**
   * The environment or stage in which the resource exists.
   * Placed first in the generated name for clarity and grouping.
   *
   * @example 'dev'
   * @example 'staging'
   * @example 'prod'
   */
  stage: string;

  /**
   * The logical name of the service or domain that owns this resource.
   *
   * @example 'orders'
   * @example 'billing'
   */
  service: string;

  /**
   * The type of the resource being named.
   *
   * Examples: 'table', 'queue', 'bucket', 'function'.
   */
  resource: string;

  /**
   * Optional AWS region identifier, useful for resources that need regional identification
   * or for cross-region resource management.
   *
   * @example 'us-east-1'
   * @example 'eu-west-1'
   */
  region?: Region;

  /**
   * Optional suffix to append to the resource name for additional uniqueness
   * or identification purposes.
   *
   * @example 'v2'
   * @example 'backup'
   * @example 'temp'
   */
  suffix?: string;
}

/**
 * Represents a fully-qualified AWS resource name.
 *
 * @example 'prod-orders-table'
 * @example 'dev-billing-queue'
 */
export type ResourceName = string;
