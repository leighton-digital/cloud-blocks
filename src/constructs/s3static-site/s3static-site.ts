import * as s3 from 'aws-cdk-lib/aws-s3';
import { Duration, RemovalPolicy, Tags } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export interface S3StaticSiteProps {
  /** Explicit S3 bucket name. When omitted CloudFormation generates a unique name. */
  readonly bucketName?: string;
  /**
   * Policy applied when the bucket is removed from the stack.
   * @default RemovalPolicy.RETAIN
   */
  readonly removalPolicy?: RemovalPolicy;
  /**
   * When true, empties the bucket on stack deletion.
   * Requires {@link removalPolicy} to be {@link RemovalPolicy.DESTROY}.
   * @default false
   */
  readonly autoDeleteObjects?: boolean;
  /**
   * Enable S3 object versioning (useful for recovery from a bad deploy).
   * @default false
   */
  readonly versioned?: boolean;
  /**
   * When versioning is enabled, expire noncurrent object versions after this many days.
   * Ignored when {@link versioned} is false.
   * @default 30
   */
  readonly noncurrentVersionExpirationDays?: number;
  /** Optional destination bucket for S3 server access logs. */
  readonly serverAccessLogsBucket?: s3.IBucket;
  /** Prefix for server access log objects when {@link serverAccessLogsBucket} is set. */
  readonly serverAccessLogsPrefix?: string;
}

/**
 * Private S3 bucket for static web assets served through CloudFront with Origin Access Control.
 *
 * This is intentionally **not** an S3 static website bucket (no website endpoint or public
 * bucket policy). CloudFront should use the REST API origin with OAC.
 */
export class S3StaticSite extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: S3StaticSiteProps = {}) {
    super(scope, id);

    const removalPolicy = props.removalPolicy ?? RemovalPolicy.RETAIN;
    const autoDeleteObjects = props.autoDeleteObjects ?? false;
    const versioned = props.versioned ?? false;

    if (autoDeleteObjects && removalPolicy !== RemovalPolicy.DESTROY) {
      throw new Error(
        'S3StaticSite: autoDeleteObjects requires removalPolicy to be RemovalPolicy.DESTROY',
      );
    }

    const lifecycleRules: s3.LifecycleRule[] = [
      {
        id: 'AbortIncompleteMultipartUploads',
        abortIncompleteMultipartUploadAfter: Duration.days(7),
        enabled: true,
      },
    ];

    if (versioned) {
      lifecycleRules.push({
        id: 'ExpireNoncurrentVersions',
        noncurrentVersionExpiration: Duration.days(
          props.noncurrentVersionExpirationDays ?? 30,
        ),
        enabled: true,
      });
    }

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: props.bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      versioned,
      removalPolicy,
      autoDeleteObjects,
      lifecycleRules,
      serverAccessLogsBucket: props.serverAccessLogsBucket,
      serverAccessLogsPrefix: props.serverAccessLogsPrefix,
    });

    Tags.of(this.bucket).add('Type', 'web');
  }
}
