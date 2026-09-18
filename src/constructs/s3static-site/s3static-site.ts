import * as s3 from 'aws-cdk-lib/aws-s3';
import { Duration, RemovalPolicy, Stack, Tags, Token } from 'aws-cdk-lib/core';
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
   * Ignored when {@link versioned} is false. Must be a positive integer when set.
   * @default 30
   */
  readonly noncurrentVersionExpirationDays?: number;
  /**
   * Optional destination bucket for S3 server access logs.
   *
   * Requirements (otherwise CloudFormation may succeed while no logs are delivered):
   * - Must allow ACLs — use {@link s3.ObjectOwnership.OBJECT_WRITER} (or
   *   {@link s3.ObjectOwnership.BUCKET_OWNER_PREFERRED}). Destinations with
   *   {@link s3.ObjectOwnership.BUCKET_OWNER_ENFORCED} (CDK/S3 default) cannot
   *   receive server access logs.
   * - Must be in the same AWS Region as this site bucket.
   * - Should be owned by the same account as this site bucket.
   */
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

    if (props.serverAccessLogsBucket) {
      validateServerAccessLogsDestination(this, props.serverAccessLogsBucket);
    }

    if (
      versioned &&
      props.noncurrentVersionExpirationDays !== undefined &&
      (!Number.isInteger(props.noncurrentVersionExpirationDays) ||
        props.noncurrentVersionExpirationDays < 1)
    ) {
      throw new Error(
        'S3StaticSite: noncurrentVersionExpirationDays must be a positive integer',
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

/**
 * Ensures the log destination can actually receive S3 server access logs.
 * Concrete {@link s3.Bucket} instances are checked for ACL-compatible ownership;
 * imported {@link s3.IBucket} references cannot be inspected — callers must meet
 * the documented requirements themselves.
 */
function validateServerAccessLogsDestination(
  scope: Construct,
  destination: s3.IBucket,
): void {
  const sourceStack = Stack.of(scope);
  const destinationStack = Stack.of(destination);

  if (
    !Token.isUnresolved(sourceStack.region) &&
    !Token.isUnresolved(destinationStack.region) &&
    sourceStack.region !== destinationStack.region
  ) {
    throw new Error(
      'S3StaticSite: serverAccessLogsBucket must be in the same Region as the site bucket',
    );
  }

  if (!(destination instanceof s3.Bucket)) {
    return;
  }

  // BucketBase keeps ownership protected; read it for synth-time validation.
  const ownership = (
    destination as s3.Bucket & { objectOwnership?: s3.ObjectOwnership }
  ).objectOwnership;

  if (
    ownership === undefined ||
    ownership === s3.ObjectOwnership.BUCKET_OWNER_ENFORCED
  ) {
    throw new Error(
      'S3StaticSite: serverAccessLogsBucket must allow ACLs (set objectOwnership to ObjectOwnership.OBJECT_WRITER). ' +
        'BUCKET_OWNER_ENFORCED destinations (the CDK/S3 default) cannot receive S3 server access logs.',
    );
  }
}
