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
import { S3StaticSite } from '@leighton-digital/constructs';
import { RemovalPolicy } from 'aws-cdk-lib/core';

const site = new S3StaticSite(this, 'StaticSite');

// Pass the bucket to CloudFrontDistribution (platform default origin)
const cloudFront = new CloudFrontDistribution(this, 'CloudFront', {
  siteBucket: site.bucket,
  bucket: site.bucket,
  // ...other props
});
```

### Non-production (destroyable) bucket

```typescript
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

## Props

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `bucketName` | `string` | No | CloudFormation-generated | Explicit S3 bucket name |
| `removalPolicy` | `RemovalPolicy` | No | `RETAIN` | Policy when the bucket is removed from the stack |
| `autoDeleteObjects` | `boolean` | No | `false` | Empty the bucket on delete; requires `removalPolicy: DESTROY` |
| `versioned` | `boolean` | No | `false` | Enable object versioning |
| `noncurrentVersionExpirationDays` | `number` | No | `30` | Expire noncurrent versions (only when `versioned` is true) |
| `serverAccessLogsBucket` | `s3.IBucket` | No | — | Destination for S3 server access logs |
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

Used by `EdgeStack` in `apps/platform-backend` as the default origin bucket for the central CloudFront distribution.
