import { z } from 'zod';
import type {
  ResourceName,
  ResourceNameParts,
} from '../../types/resource-name-types';

const s3BucketNameSchema = z
  .string()
  .min(3, 'is too short. Must be at least 3 characters.')
  .max(63, 'exceeds the maximum allowed length of 63 characters.')
  .regex(
    /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
    'contains invalid characters. Must contain only lowercase letters, numbers, dots, and hyphens, and start/end with alphanumeric characters.',
  );

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
 * @param {ResourceNameParts} params - The components used to generate the S3 bucket name.
 * @returns {ResourceName} A lowercase, hyphenated S3 bucket name suitable for AWS usage.
 * @throws {Error} If the generated name exceeds 63 characters or is less than 3 characters.
 *
 * @example
 * const bucketName = generateS3BucketName({ stage: 'dev', service: 'orders', suffix: 'images', region: 'us-east-1' });
 * // "dev-orders-bucket-images-us-east-1"
 *
 * @example
 * const bucketName = generateS3BucketName({ stage: 'prod', service: 'users' });
 * // "prod-users-bucket"
 *
 * @example
 * const bucketName = generateS3BucketName({ stage: 'staging', service: 'analytics', suffix: 'logs' });
 * // "staging-analytics-bucket-logs"
 */
export function generateS3BucketName({
  stage,
  service,
  suffix,
  region,
}: Omit<ResourceNameParts, 'resource'>): ResourceName {
  const RESOURCE_TYPE = 'bucket';

  const name = [stage, service, RESOURCE_TYPE, suffix, region]
    .filter(Boolean)
    .join('-')
    .toLowerCase();

  try {
    s3BucketNameSchema.parse(name);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((issue) => issue.message);
      const combinedMessage = errorMessages.join(' ');
      throw new Error(`Error generating S3 bucket name "${name}": ${combinedMessage}`);
    }
    throw error;
  }

  return name;
}
