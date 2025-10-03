import { Region, Stage } from '../../types/environments';
import { generateS3BucketName } from './generate-s3-bucket-name';

describe('generateS3BucketName', () => {
  it('should generate a valid S3 bucket name with all parts', () => {
    const name = generateS3BucketName(
      Stage.develop,
      'user',
      'images',
      Region.london,
    );
    expect(name).toBe('develop-user-bucket-images-eu-west-2');
  });

  it('should generate a valid S3 bucket name without region or suffix', () => {
    const name = generateS3BucketName(Stage.prod, 'uploads');
    expect(name).toBe('prod-uploads-bucket');
  });

  it('should generate a valid S3 bucket name without region', () => {
    const name = generateS3BucketName(Stage.develop, 'user', 'logs');
    expect(name).toBe('develop-user-bucket-logs');
  });

  it('should generate a valid S3 bucket name without suffix', () => {
    const name = generateS3BucketName(
      Stage.staging,
      'analytics',
      '',
      Region.dublin,
    );
    expect(name).toBe('staging-analytics-bucket-eu-west-1');
  });

  it('should throw an error if the name exceeds S3 max length (63 characters)', () => {
    const longService = 'verylongservicenamethatexceedss3limits';
    const longSuffix = 'verylongsuffixthatmakesittoobig';

    expect(() =>
      generateS3BucketName(
        Stage.staging,
        longService,
        longSuffix,
        Region.london,
      ),
    ).toThrow(/exceeds the maximum allowed length of 63 characters/);
  });

  it('should handle empty strings gracefully', () => {
    const name = generateS3BucketName(Stage.develop, 'data', '');
    expect(name).toBe('develop-data-bucket');
  });

  it('should lowercase the result', () => {
    const name = generateS3BucketName(
      Stage.develop,
      'Orders',
      'IMAGES',
      Region.london,
    );
    expect(name).toBe('develop-orders-bucket-images-eu-west-2');
  });

  it('should automatically include bucket as resource type', () => {
    const name = generateS3BucketName(Stage.prod, 'assets');
    expect(name).toBe('prod-assets-bucket');
  });

  it('should validate S3 naming rules - reject invalid characters', () => {
    expect(() =>
      generateS3BucketName(Stage.staging, '/', '', Region.london),
    ).toThrow(
      'Generated S3 bucket name "staging-/-bucket-eu-west-2" contains invalid characters. Must contain only lowercase letters, numbers, dots, and hyphens, and start/end with alphanumeric characters.',
    );
  });

  it('should generate different names for different regions', () => {
    const londonName = generateS3BucketName(
      Stage.prod,
      'data',
      'backup',
      Region.london,
    );
    const dublinName = generateS3BucketName(
      Stage.prod,
      'data',
      'backup',
      Region.dublin,
    );

    expect(londonName).toBe('prod-data-bucket-backup-eu-west-2');
    expect(dublinName).toBe('prod-data-bucket-backup-eu-west-1');
  });

  it('should handle all stage types', () => {
    expect(generateS3BucketName(Stage.develop, 'test')).toBe(
      'develop-test-bucket',
    );
    expect(generateS3BucketName(Stage.staging, 'test')).toBe(
      'staging-test-bucket',
    );
    expect(generateS3BucketName(Stage.prod, 'test')).toBe('prod-test-bucket');
    expect(generateS3BucketName(Stage.test, 'test')).toBe('test-test-bucket');
  });
});
