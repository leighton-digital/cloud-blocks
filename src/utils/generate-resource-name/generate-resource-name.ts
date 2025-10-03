import type {
  ResourceName,
  ResourceNameParts,
} from '../../types/resource-name-types';

/**
 * Generates a standardised AWS resource name using the provided components.
 *
 * The name is constructed using the format: `<stage>-<service>-<resource>[-<suffix>][-<region>]`,
 * and converted to lowercase. If the resulting name exceeds the maximum allowed length,
 * an error is thrown to prevent invalid resource creation.
 *
 * This function is intended to fail early during synthesis or deployment to ensure compliance
 * with AWS naming constraints across services.
 *
 * @param {string} stage - The deployment stage (e.g., "dev", "prod").
 * @param {string} service - The name of the service or domain.
 * @param {string} resource - The type of AWS resource (e.g., "table", "queue").
 * @param {string} [suffix] - Optional suffix for additional uniqueness or identification.
 * @param {string} [region] - Optional AWS region identifier for regional identification.
 * @returns {ResourceName} A lowercase, hyphenated resource name suitable for AWS usage.
 * @throws {Error} If the generated name exceeds the maximum allowed length.
 *
 * @example
 * const name = generateResourceName('dev', 'orders', 'queue', 'v2', 'us-east-1');
 * // "dev-orders-queue-v2-us-east-1"
 *
 * @example
 * const name = generateResourceName('prod', 'users', 'table');
 * // "prod-users-table"
 *
 * @example
 * const name = generateResourceName('dev', 'cache', 'bucket', 'temp');
 * // "dev-cache-bucket-temp"
 */
export function generateResourceName(
  stage: ResourceNameParts['stage'],
  service: ResourceNameParts['service'],
  resource: ResourceNameParts['resource'],
  suffix?: ResourceNameParts['suffix'],
  region?: ResourceNameParts['region'],
): ResourceName {
  const MAX_LENGTH = 64;

  const name = [stage, service, resource, suffix, region]
    .filter(Boolean)
    .join('-')
    .toLowerCase();

  if (name.length > MAX_LENGTH) {
    throw new Error(
      `Generated resource name "${name}" exceeds the maximum allowed length of ${MAX_LENGTH} characters.`,
    );
  }

  return name;
}
