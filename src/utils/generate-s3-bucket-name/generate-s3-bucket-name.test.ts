import { Region, Stage } from '../../types/environments';
import { generateS3BucketName } from './generate-s3-bucket-name';

describe('generateS3BucketName', () => {
  it('should generate a valid S3 bucket name with all parts', () => {
    const name = generateS3BucketName({
      stage: Stage.develop,
      service: 'user',
      suffix: 'images',
      region: Region.london,
    });
    expect(name).toBe('develop-user-bucket-images-eu-west-2');
  });

  it('should generate a valid S3 bucket name without region or suffix', () => {
    const name = generateS3BucketName({
      stage: Stage.prod,
      service: 'uploads',
    });
    expect(name).toBe('prod-uploads-bucket');
  });

  it('should generate a valid S3 bucket name without region', () => {
    const name = generateS3BucketName({
      stage: Stage.develop,
      service: 'user',
      suffix: 'logs',
    });
    expect(name).toBe('develop-user-bucket-logs');
  });

  it('should generate a valid S3 bucket name without suffix', () => {
    const name = generateS3BucketName({
      stage: Stage.staging,
      service: 'analytics',
      suffix: '',
      region: Region.dublin,
    });
    expect(name).toBe('staging-analytics-bucket-eu-west-1');
  });

  it('should throw an error if the name exceeds S3 max length (63 characters)', () => {
    const longService = 'verylongservicenamethatexceedss3limits';
    const longSuffix = 'verylongsuffixthatmakesittoobig';

    expect(() =>
      generateS3BucketName({
        stage: Stage.staging,
        service: longService,
        suffix: longSuffix,
        region: Region.london,
      }),
    ).toThrow(/exceeds the maximum allowed length of 63 characters/);
  });

  it('should handle empty strings gracefully', () => {
    const name = generateS3BucketName({
      stage: Stage.develop,
      service: 'data',
      suffix: '',
    });
    expect(name).toBe('develop-data-bucket');
  });

  it('should lowercase the result', () => {
    const name = generateS3BucketName({
      stage: Stage.develop,
      service: 'Orders',
      suffix: 'IMAGES',
      region: Region.london,
    });
    expect(name).toBe('develop-orders-bucket-images-eu-west-2');
  });

  it('should automatically include bucket as resource type', () => {
    const name = generateS3BucketName({
      stage: Stage.prod,
      service: 'assets',
    });
    expect(name).toBe('prod-assets-bucket');
  });

  it('should validate S3 naming rules - reject invalid characters', () => {
    expect(() =>
      generateS3BucketName({
        stage: Stage.staging,
        service: '/',
        suffix: '',
        region: Region.london,
      }),
    ).toThrow(
      'Error generating S3 bucket name \"staging-/-bucket-eu-west-2\": contains invalid characters. Must contain only lowercase letters, numbers, dots, and hyphens, and start/end with alphanumeric characters.',
    );
  });

  it('should generate different names for different regions', () => {
    const londonName = generateS3BucketName({
      stage: Stage.prod,
      service: 'data',
      suffix: 'backup',
      region: Region.london,
    });
    const dublinName = generateS3BucketName({
      stage: Stage.prod,
      service: 'data',
      suffix: 'backup',
      region: Region.dublin,
    });

    expect(londonName).toBe('prod-data-bucket-backup-eu-west-2');
    expect(dublinName).toBe('prod-data-bucket-backup-eu-west-1');
  });

  it('should handle all stage types', () => {
    expect(
      generateS3BucketName({
        stage: Stage.develop,
        service: 'test',
      }),
    ).toBe('develop-test-bucket');
    expect(
      generateS3BucketName({
        stage: Stage.staging,
        service: 'test',
      }),
    ).toBe('staging-test-bucket');
    expect(
      generateS3BucketName({
        stage: Stage.prod,
        service: 'test',
      }),
    ).toBe('prod-test-bucket');
    expect(
      generateS3BucketName({
        stage: Stage.test,
        service: 'test',
      }),
    ).toBe('test-test-bucket');
  });
});
