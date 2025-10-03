import type {
  ResourceName,
  ResourceNameParts,
} from '../../types/resource-name-types';

/**
 * Generates a standardised S3 bucket name using the provided components.
 *
 * S3 buckets have specific naming requirements:
 * - Must be globally unique across all AWS accounts
 * - Must be between 3-63 characters long
 * - Must contain only lowercase letters, numbers, dots, and hyphens
 * - Must start and end with a letter or number
 * - Cannot contain uppercase characters or underscores
 * - Cannot be formatted as an IP address
 *
 * The name is constructed using the format: `<stage>-<service>-bucket[-<suffix>][-<region>]`
 * and converted to lowercase. The 'bucket' resource type is automatically included.
 *
 * @param {string} stage - The deployment stage (e.g., "dev", "prod").
 * @param {string} service - The name of the service or domain.
 * @param {string} [suffix] - Optional suffix for additional uniqueness or identification.
 * @param {string} [region] - Optional AWS region identifier for regional identification.
 * @returns {ResourceName} A lowercase, hyphenated S3 bucket name suitable for AWS usage.
 * @throws {Error} If the generated name exceeds 63 characters or is less than 3 characters.
 *
 * @example
 * const bucketName = generateS3BucketName('dev', 'orders', 'images', 'us-east-1');
 * // "dev-orders-bucket-images-us-east-1"
 *
 * @example
 * const bucketName = generateS3BucketName('prod', 'users');
 * // "prod-users-bucket"
 *
 * @example
 * const bucketName = generateS3BucketName('staging', 'analytics', 'logs');
 * // "staging-analytics-bucket-logs"
 */
export function generateS3BucketName(
  stage: ResourceNameParts['stage'],
  service: ResourceNameParts['service'],
  suffix?: ResourceNameParts['suffix'],
  region?: ResourceNameParts['region'],
): ResourceName {
  const MIN_LENGTH = 3;
  const MAX_LENGTH = 63;
  const RESOURCE_TYPE = 'bucket';

  const name = [stage, service, RESOURCE_TYPE, suffix, region]
    .filter(Boolean)
    .join('-')
    .toLowerCase();

  if (name.length < MIN_LENGTH) {
    throw new Error(
      `Generated S3 bucket name "${name}" is too short. Must be at least ${MIN_LENGTH} characters.`,
    );
  }

  if (name.length > MAX_LENGTH) {
    throw new Error(
      `Generated S3 bucket name "${name}" exceeds the maximum allowed length of ${MAX_LENGTH} characters.`,
    );
  }

  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(name)) {
    throw new Error(
      `Generated S3 bucket name "${name}" contains invalid characters. Must contain only lowercase letters, numbers, dots, and hyphens, and start/end with alphanumeric characters.`,
    );
  }

  return name;
}
