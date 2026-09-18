import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { S3StaticSite } from '../../../src/constructs/s3static-site';

export class S3StaticSiteNestedStack extends cdk.NestedStack {
  public readonly s3StaticSite: S3StaticSite;

  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    // Destroyable configuration suitable for the ephemeral test project
    this.s3StaticSite = new S3StaticSite(this, 'S3StaticSite', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
      noncurrentVersionExpirationDays: 30,
    });
  }
}
