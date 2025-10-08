import { z } from 'zod';
import type {
  ResourceName,
  ResourceNameParts,
} from '../../types/resource-name-types';

const resourceNameSchema = z
  .string()
  .max(64, 'exceeds the maximum allowed length of 64 characters.');

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
 * @param {ResourceNameParts} params - The components used to generate the resource name.
 * @returns {ResourceName} A lowercase, hyphenated resource name suitable for AWS usage.
 * @throws {Error} If the generated name exceeds the maximum allowed length.
 *
 * @example
 * const name = generateResourceName({ stage: 'dev', service: 'orders', resource: 'queue', suffix: 'v2', region: 'us-east-1' });
 * // "dev-orders-queue-v2-us-east-1"
 *
 * @example
 * const name = generateResourceName({ stage: 'prod', service: 'users', resource: 'table' });
 * // "prod-users-table"
 *
 * @example
 * const name = generateResourceName({ stage: 'dev', service: 'cache', resource: 'bucket', suffix: 'temp' });
 * // "dev-cache-bucket-temp"
 */
export function generateResourceName({
  stage,
  service,
  resource,
  suffix,
  region,
}: ResourceNameParts): ResourceName {
  const name = [stage, service, resource, suffix, region]
    .filter(Boolean)
    .join('-')
    .toLowerCase();

  try {
    resourceNameSchema.parse(name);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((issue) => issue.message);
      const combinedMessage = errorMessages.join(' ');
      throw new Error(
        `Error generating resource name "${name}": ${combinedMessage}`,
      );
    }
    throw error;
  }

  return name;
}
