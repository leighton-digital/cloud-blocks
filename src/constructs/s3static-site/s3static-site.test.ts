import { Match, Template } from 'aws-cdk-lib/assertions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { App, RemovalPolicy, Stack } from 'aws-cdk-lib/core';
import { S3StaticSite } from './s3static-site';

describe('S3StaticSite', () => {
  it('applies secure defaults for a CloudFront OAC origin bucket', () => {
    const stack = new Stack(new App(), 'TestStack');
    new S3StaticSite(stack, 'StaticSite');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
      OwnershipControls: {
        Rules: [
          {
            ObjectOwnership: 'BucketOwnerEnforced',
          },
        ],
      },
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            AbortIncompleteMultipartUpload: {
              DaysAfterInitiation: 7,
            },
            Status: 'Enabled',
          }),
        ]),
      },
    });

    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Deny',
            Condition: {
              Bool: {
                'aws:SecureTransport': 'false',
              },
            },
          }),
        ]),
      },
    });

    template.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });

  it('enables versioning and noncurrent expiry when requested', () => {
    const stack = new Stack(new App(), 'TestStack');
    new S3StaticSite(stack, 'StaticSite', {
      versioned: true,
      noncurrentVersionExpirationDays: 14,
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled',
      },
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            NoncurrentVersionExpiration: {
              NoncurrentDays: 14,
            },
            Status: 'Enabled',
          }),
        ]),
      },
    });
  });

  it('supports destroy and auto-delete for non-production stacks', () => {
    const stack = new Stack(new App(), 'TestStack');
    new S3StaticSite(stack, 'StaticSite', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const template = Template.fromStack(stack);

    template.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Delete',
      UpdateReplacePolicy: 'Delete',
    });
  });

  it('wires server access logging when a log bucket is provided', () => {
    const stack = new Stack(new App(), 'TestStack');
    const logBucket = new s3.Bucket(stack, 'LogBucket', {
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
    });

    new S3StaticSite(stack, 'StaticSite', {
      serverAccessLogsBucket: logBucket,
      serverAccessLogsPrefix: 'site-access/',
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      LoggingConfiguration: Match.objectLike({
        LogFilePrefix: 'site-access/',
      }),
    });
  });

  it('throws when autoDeleteObjects is set without DESTROY', () => {
    const stack = new Stack(new App(), 'TestStack');

    expect(
      () =>
        new S3StaticSite(stack, 'StaticSite', {
          autoDeleteObjects: true,
          removalPolicy: RemovalPolicy.RETAIN,
        }),
    ).toThrow(/autoDeleteObjects requires removalPolicy/);
  });
});
