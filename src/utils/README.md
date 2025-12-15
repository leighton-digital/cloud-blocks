# Infrastructure Utilities

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/leighton-digital/cdk-ts-core-temp/blob/main/LICENSE)
![Maintained](https://img.shields.io/maintenance/yes/2025)

A collection of **AWS CDK infrastructure utilities** for **consistent resource naming and environment management**, featuring:

* **Standardised resource naming** with `generateResourceName` and `generateS3BucketName`
* **Environment-aware policies** through `getRemovalPolicyFromStage`
* **Stage normalisation** with `getStage` for consistent environment handling
* **AWS compliance** with service-specific naming constraints
* **Type-safe resource names** with TypeScript validation
* **Early error detection** during CDK synthesis for invalid names
* **Multi-environment support** including ephemeral environments

## Features

* **Resource Naming Utilities**:
  * `generateResourceName()` - Standardised AWS resource names up to 64 characters
  * `generateS3BucketName()` - S3-compliant bucket names with strict validation
  * Consistent naming pattern: `<stage>-<service>-<resource>[-<suffix>][-<region>]`
  * Automatic length validation and character sanitization
* **Environment Management**:
  * `getStage()` - Normalise stage names for known and ephemeral environments
  * `getRemovalPolicyFromStage()` - Environment-appropriate resource retention policies
  * Support for `prod`, `staging`, `test`, and dynamic environments (e.g., `pr-123`)
* **Safety**: Prevents accidental resource deletion in production environments
* **Validation**: Early error detection during CDK synthesis
* **Flexibility**: Supports custom suffixes and regional resource identification

## Usage

### Basic Resource Naming

```ts
import { generateResourceName } from '@leighton-digital/cloud-blocks';

// Basic resource naming
const tableName = generateResourceName('prod', 'orders', 'table');
// Result: "prod-orders-table"

const queueName = generateResourceName('dev', 'notifications', 'queue', 'v2');
// Result: "dev-notifications-queue-v2"

// With region specification
const functionName = generateResourceName('staging', 'api', 'function', 'auth', 'us-east-1');
// Result: "staging-api-function-auth-us-east-1"
```

### S3 Bucket Naming

```ts
import { generateS3BucketName } from '@leighton-digital/cloud-blocks';

// Basic S3 bucket
const bucketName = generateS3BucketName('prod', 'assets');
// Result: "prod-assets-bucket"

// With suffix for identification
const logsBucket = generateS3BucketName('dev', 'analytics', 'logs');
// Result: "dev-analytics-bucket-logs"

// With region for multi-region setup
const backupBucket = generateS3BucketName('prod', 'database', 'backup', 'eu-west-1');
// Result: "prod-database-bucket-backup-eu-west-1"
```

### Environment-Aware Removal Policies

```ts
import { RemovalPolicy } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import {
  generateResourceName,
  getRemovalPolicyFromStage
} from '@leighton-digital/cloud-blocks';

const stage = 'prod'; // or process.env.STAGE
const tableName = generateResourceName(stage, 'users', 'table');
const removalPolicy = getRemovalPolicyFromStage(stage);

const table = new Table(this, 'UsersTable', {
  tableName,
  removalPolicy, // RemovalPolicy.RETAIN for prod/staging, DESTROY for others
  // ... other table configuration
});
```

### Stage Normalisation

```ts
import { getStage } from '@leighton-digital/cloud-blocks';

// Known stages are normalised
const prodStage = getStage('prod');        // 'prod'
const stagingStage = getStage('staging');  // 'staging'
const testStage = getStage('test');        // 'test'

// Ephemeral environments are lowercased
const prStage = getStage('PR-123');        // 'pr-123'
const featureStage = getStage('Feature-Auth'); // 'feature-auth'
```

### Complete CDK Stack Example

```ts
import { App, Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import {
  generateResourceName,
  generateS3BucketName,
  getRemovalPolicyFromStage,
  getStage
} from '@leighton-digital/cloud-blocks';

interface MyStackProps extends StackProps {
  stage: string;
  service: string;
}

class MyApplicationStack extends Stack {
  constructor(scope: App, id: string, props: MyStackProps) {
    super(scope, id, props);

    const { stage, service } = props;
    const normalisedStage = getStage(stage);
    const removalPolicy = getRemovalPolicyFromStage(normalisedStage);

    // DynamoDB table with standardised naming
    const table = new Table(this, 'UsersTable', {
      tableName: generateResourceName(normalisedStage, service, 'table'),
      partitionKey: { name: 'id', type: AttributeType.STRING },
      removalPolicy,
    });

    // S3 buckets with different purposes
    const assetsBucket = new Bucket(this, 'AssetsBucket', {
      bucketName: generateS3BucketName(normalisedStage, service, 'assets'),
      removalPolicy,
    });

    const logsBucket = new Bucket(this, 'LogsBucket', {
      bucketName: generateS3BucketName(normalisedStage, service, 'logs'),
      removalPolicy,
    });

    // Lambda function
    const apiFunction = new Function(this, 'ApiFunction', {
      functionName: generateResourceName(normalisedStage, service, 'function', 'api'),
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: Code.fromAsset('lambda'),
    });
  }
}

const app = new App();
const stage = process.env.STAGE || 'dev';
const service = 'customer-portal';

new MyApplicationStack(app, `CustomerPortalStack-${getStage(stage)}`, {
  stage,
  service,
});
```

### Multi-Region Resource Naming

```ts
import { generateResourceName, generateS3BucketName } from '@leighton-digital/cloud-blocks';
import { Region } from '@leighton-digital/cloud-blocks';

// Primary region resources
const primaryTable = generateResourceName('prod', 'orders', 'table', undefined, Region.virginia);
// "prod-orders-table-us-east-1"

const primaryBucket = generateS3BucketName('prod', 'assets', 'primary', Region.virginia);
// "prod-assets-bucket-primary-us-east-1"

// Disaster recovery region resources
const drTable = generateResourceName('prod', 'orders', 'table', 'dr', Region.oregon);
// "prod-orders-table-dr-us-west-2"

const drBucket = generateS3BucketName('prod', 'assets', 'dr', Region.oregon);
// "prod-assets-bucket-dr-us-west-2"
```

### Environment-Specific Configuration

```ts
import {
  generateResourceName,
  getRemovalPolicyFromStage,
  getStage
} from '@leighton-digital/cloud-blocks';

function createEnvironmentConfig(rawStage: string, service: string) {
  const stage = getStage(rawStage);
  const removalPolicy = getRemovalPolicyFromStage(stage);

  return {
    stage,
    removalPolicy,

    // Generate all resource names
    names: {
      table: generateResourceName(stage, service, 'table'),
      queue: generateResourceName(stage, service, 'queue'),
      function: generateResourceName(stage, service, 'function'),
      bucket: generateS3BucketName(stage, service),
      logsBucket: generateS3BucketName(stage, service, 'logs'),
    },

    // Environment-specific settings
    settings: {
      enableXRay: stage === 'prod' || stage === 'staging',
      logLevel: stage === 'prod' ? 'ERROR' : 'DEBUG',
      retentionDays: stage === 'prod' ? 365 : 30,
    }
  };
}

// Usage in different environments
const prodConfig = createEnvironmentConfig('prod', 'api');
const devConfig = createEnvironmentConfig('dev', 'api');
const prConfig = createEnvironmentConfig('pr-123', 'api');
```

## Resource Name Patterns

### Standard Resource Names

Format: `<stage>-<service>-<resource>[-<suffix>][-<region>]`

```ts
// Basic pattern
generateResourceName('prod', 'orders', 'table')
// → "prod-orders-table"

// With suffix
generateResourceName('dev', 'users', 'queue', 'dlq')
// → "dev-users-queue-dlq"

// With region
generateResourceName('staging', 'api', 'function', 'auth', 'us-east-1')
// → "staging-api-function-auth-us-east-1"
```

### S3 Bucket Names

Format: `<stage>-<service>-bucket[-<suffix>][-<region>]`

```ts
// Basic S3 bucket
generateS3BucketName('prod', 'analytics')
// → "prod-analytics-bucket"

// With purpose suffix
generateS3BucketName('dev', 'application', 'logs')
// → "dev-application-bucket-logs"

// Multi-region with suffix
generateS3BucketName('prod', 'backup', 'daily', 'eu-west-1')
// → "prod-backup-bucket-daily-eu-west-1"
```

## Environment Management

### Stage Normalisation

```ts
import { getStage } from '@leighton-digital/cloud-blocks';

// Known stages (from Stage enum)
getStage('prod')     // → 'prod'
getStage('staging')  // → 'staging'
getStage('test')     // → 'test'

// Ephemeral environments (normalised to lowercase)
getStage('PR-123')        // → 'pr-123'
getStage('FEATURE-auth')  // → 'feature-auth'
getStage('hotfix-login')  // → 'hotfix-login'
```

### Removal Policies by Environment

```ts
import { getRemovalPolicyFromStage } from '@leighton-digital/cloud-blocks';
import { RemovalPolicy } from 'aws-cdk-lib';

// Production and staging: RETAIN (prevent accidental deletion)
getRemovalPolicyFromStage('prod')     // → RemovalPolicy.RETAIN
getRemovalPolicyFromStage('staging')  // → RemovalPolicy.RETAIN

// All other environments: DESTROY (allow cleanup)
getRemovalPolicyFromStage('dev')      // → RemovalPolicy.DESTROY
getRemovalPolicyFromStage('test')     // → RemovalPolicy.DESTROY
getRemovalPolicyFromStage('pr-123')   // → RemovalPolicy.DESTROY
```

## Type Definitions

### ResourceNameParts Interface

```ts
interface ResourceNameParts {
  /** Environment stage (e.g., 'dev', 'prod') */
  stage: string;

  /** Service or domain name (e.g., 'orders', 'users') */
  service: string;

  /** Resource type (e.g., 'table', 'queue', 'function') */
  resource: string;

  /** Optional suffix for uniqueness (e.g., 'v2', 'backup') */
  suffix?: string;

  /** Optional AWS region (e.g., 'us-east-1') */
  region?: Region;
}
```

### Environment Enums

```ts
// Deployment stages
enum Stage {
  develop = 'develop',
  staging = 'staging',
  prod = 'prod',
  test = 'test',
}

// AWS regions with human-readable names
enum Region {
  virginia = 'us-east-1',
  ohio = 'us-east-2',
  oregon = 'us-west-2',
  dublin = 'eu-west-1',
  london = 'eu-west-2',
  frankfurt = 'eu-central-1',
  // ... additional regions
}
```

## Validation and Error Handling

### Resource Name Validation

```ts
// Automatic length validation
try {
  const name = generateResourceName('very-long-stage-name', 'extremely-long-service-name', 'resource', 'with-long-suffix');
} catch (error) {
  // Error: Generated resource name "very-long-stage..." exceeds the maximum allowed length of 64 characters.
}
```

### S3 Bucket Name Validation

```ts
// S3-specific validation rules
try {
  const bucket = generateS3BucketName('prod', 'my_service'); // Invalid: underscore
} catch (error) {
  // Error: Generated S3 bucket name contains invalid characters...
}

try {
  const bucket = generateS3BucketName('A', 'B'); // Invalid: too short
} catch (error) {
  // Error: Generated S3 bucket name "a-b-bucket" is too short. Must be at least 3 characters.
}
```

## What gets created

### Resource Naming Functions
* **generateResourceName**: Creates names up to 64 characters for general AWS resources
* **generateS3BucketName**: Creates S3-compliant names (3-63 chars, lowercase, no underscores)
* Both functions validate length and character constraints
* Names follow consistent `stage-service-resource` pattern

### Environment Management
* **getStage**: Normalises stage names, supports ephemeral environments
* **getRemovalPolicyFromStage**: Returns `RETAIN` for prod/staging, `DESTROY` for others
* Enables safe multi-environment deployments with appropriate resource lifecycle policies

## AWS Service Compatibility

### Naming Constraints by Service

| Service | Max Length | Special Rules |
|---------|------------|---------------|
| DynamoDB Tables | 255 chars | Letters, numbers, hyphens, underscores, periods |
| Lambda Functions | 64 chars | Letters, numbers, hyphens, underscores |
| SQS Queues | 80 chars | Letters, numbers, hyphens, underscores |
| S3 Buckets | 63 chars | Lowercase only, no underscores, globally unique |
| CloudWatch Log Groups | 512 chars | Letters, numbers, periods, hyphens, underscores, forward slashes |

*Note: `generateResourceName` uses 64-character limit for broad compatibility. `generateS3BucketName` enforces S3-specific rules.*

## Operational notes & caveats

* **Global uniqueness**: S3 bucket names must be globally unique across all AWS accounts
* **Character restrictions**: S3 buckets cannot contain uppercase letters or underscores
* **Length limits**: Function validates against AWS service limits during synthesis
* **Stage normalisation**: Unknown stages are converted to lowercase for consistency
* **Removal policies**: Production/staging resources are retained by default to prevent data loss
* **Ephemeral environments**: Support for dynamic environments like `pr-123` enables flexible CI/CD workflows
* **Early validation**: Naming errors occur during CDK synthesis, not deployment

## Troubleshooting

* **"Generated resource name exceeds maximum length"** → Shorten stage, service, or suffix names
* **"S3 bucket name contains invalid characters"** → Ensure names contain only lowercase letters, numbers, dots, and hyphens
* **"S3 bucket name is too short"** → Ensure combined name parts result in at least 3 characters
* **Resources not deleted in development** → Check that stage is not 'prod' or 'staging' if you want `DESTROY` policy
* **Inconsistent naming across environments** → Use `getStage()` to normalise stage names before resource creation

## Best Practices

1. **Use consistent service names** across all environments and resources
2. **Leverage region suffixes** for multi-region deployments to avoid naming conflicts
3. **Apply removal policies** using `getRemovalPolicyFromStage()` for appropriate resource lifecycle management
4. **Normalise stages** with `getStage()` before passing to naming functions
5. **Keep names short** to stay within AWS service limits while maintaining readability
6. **Use descriptive suffixes** when multiple resources of the same type exist (e.g., 'primary', 'backup', 'logs')
7. **Validate early** by testing resource names during development and CI/CD

<img src="https://github.com/leighton-digital/cdk-ts-core-temp/blob/main/images/leighton-logo.svg" width="200" />
