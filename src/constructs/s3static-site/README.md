# S3 Static Site

CDK construct that creates a private, encrypted S3 bucket for static web assets served through CloudFront with Origin Access Control (OAC).

## Overview

`S3StaticSite` provisions a single S3 bucket with security-first defaults for the MFE edge pattern:

- **All public access blocked** (`BlockPublicAccess.BLOCK_ALL`)
- **TLS enforced** (`enforceSSL: true`) — denies non-HTTPS access to the bucket
- **Bucket owner enforced** object ownership (required for CloudFront OAC)
- **Server-side encryption** (SSE-S3)
- **Incomplete multipart uploads aborted** after 7 days
- **Retained on stack deletion** (`RemovalPolicy.RETAIN`) by default

The bucket is intentionally **not** configured as an S3 static website (no website endpoint or public bucket policy). CloudFront should use the S3 REST API origin with OAC.

## Usage

```typescript
import { S3StaticSite } from '@leighton-digital/cloud-blocks';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';

const site = new S3StaticSite(this, 'StaticSite');

// S3BucketOrigin.withOriginAccessControl creates an OAC and grants the
// distribution read access on the bucket policy (S3 REST API origin).
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    origin: S3BucketOrigin.withOriginAccessControl(site.bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  defaultRootObject: 'index.html',
});
```

This package does not ship a CloudFront distribution construct for static sites.
`ApiCloudFrontDistribution` fronts API Gateway and is not a consumer of `S3StaticSite`.
Wire `site.bucket` into your own `cloudfront.Distribution` with OAC as shown above.

### Non-production (destroyable) bucket

```typescript
import { RemovalPolicy } from 'aws-cdk-lib/core';

const site = new S3StaticSite(this, 'StaticSite', {
  bucketName: 'lips-my-app-web-site-develop',
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});
```

### Versioned assets (recover from a bad deploy)

```typescript
const site = new S3StaticSite(this, 'StaticSite', {
  versioned: true,
  noncurrentVersionExpirationDays: 30,
});
```

### Server access logging

S3 server access logging requires a destination bucket that **allows ACLs**. A normal CDK bucket defaults to `BUCKET_OWNER_ENFORCED`, which silently receives no logs. Use `OBJECT_WRITER` (or `BUCKET_OWNER_PREFERRED`) and keep the log bucket in the **same Region** (and account) as the site bucket:

```typescript
import * as s3 from 'aws-cdk-lib/aws-s3';

const accessLogsBucket = new s3.Bucket(this, 'AccessLogs', {
  objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
  enforceSSL: true,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
});

const site = new S3StaticSite(this, 'StaticSite', {
  serverAccessLogsBucket: accessLogsBucket,
  serverAccessLogsPrefix: 'site-access/',
});
```

When `serverAccessLogsBucket` is a concrete `s3.Bucket` in the same app, the construct throws at synth time if ownership is missing/`BUCKET_OWNER_ENFORCED` or if Regions differ. Imported `IBucket` references cannot be inspected — callers must satisfy these constraints themselves.

## Props

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `bucketName` | `string` | No | CloudFormation-generated | Explicit S3 bucket name |
| `removalPolicy` | `RemovalPolicy` | No | `RETAIN` | Policy when the bucket is removed from the stack |
| `autoDeleteObjects` | `boolean` | No | `false` | Empty the bucket on delete; requires `removalPolicy: DESTROY` |
| `versioned` | `boolean` | No | `false` | Enable object versioning |
| `noncurrentVersionExpirationDays` | `number` | No | `30` | Expire noncurrent versions (only when `versioned` is true); must be a positive integer |
| `serverAccessLogsBucket` | `s3.IBucket` | No | — | Destination for S3 server access logs. Must allow ACLs (`OBJECT_WRITER` / `BUCKET_OWNER_PREFERRED`) and be in the same Region |
| `serverAccessLogsPrefix` | `string` | No | — | Key prefix for access log objects |

## Public Members

| Member | Type | Description |
|--------|------|-------------|
| `bucket` | `s3.Bucket` | The created S3 bucket (concrete type for grants / policy updates) |

## Resources Created

| Resource | Description |
|----------|-------------|
| S3 bucket | Private OAC-ready origin: blocked public access, SSE-S3, TLS enforced, bucket-owner-enforced ownership, multipart abort lifecycle |
| S3 bucket policy | Deny statements for non-TLS access (`enforceSSL`) |

## Consumers

Intended as the origin bucket for a CloudFront distribution using Origin Access Control
(see Usage). There is no static-site CloudFront construct in this package today.
