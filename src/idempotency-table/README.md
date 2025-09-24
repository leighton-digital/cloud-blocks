# Idempotency Table

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/leighton-digital/cloud-blocks/blob/main/LICENSE)
![Maintained](https://img.shields.io/maintenance/yes/2025)

A CDK construct that provisions a **DynamoDB table** optimized for **AWS Lambda Powertools** idempotency functionality, complete with:

* Proper **partition key** configuration (`id` as STRING)
* Built-in **TTL** support with `expiration` attribute
* **AWS-managed encryption** by default
* Sensible defaults for **cost optimization**
* **Point-in-time recovery** configuration options
* **cdk-nag** compliance with targeted suppressions
* Jest unit tests with comprehensive validation

## Features

* **Table Schema**: DynamoDB table with mandatory idempotency configuration:
  * `partitionKey: { name: 'id', type: STRING }` (required by Powertools)
  * `timeToLiveAttribute: 'expiration'` (automatic clean-up)
  * No sort key (simple primary key only)
* **Security**: AWS-managed encryption enabled by default
* **Cost Optimization**: Point-in-time recovery disabled by default, contributor insights disabled
* **Flexibility**: All other DynamoDB table properties are customizable
* **Compliance**: Built-in cdk-nag compatibility with appropriate suppressions
* **Testing**: Comprehensive Jest test suite with CloudFormation template validation

## Usage

### Basic Usage

```ts
import { IdempotencyTable } from '@leighton-digital/cloud-blocks';

// Minimal configuration
const idempotencyTable = new IdempotencyTable(this, 'IdempotencyTable', {
  tableName: 'my-function-idempotency'
});

// Access the underlying DynamoDB table
const table = idempotencyTable.table;
```

### Advanced Configuration

```ts
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { IdempotencyTable } from '@leighton-digital/cloud-blocks';

const customTable = new IdempotencyTable(this, 'CustomIdempotencyTable', {
  tableName: 'custom-idempotency-table',
  removalPolicy: cdk.RemovalPolicy.RETAIN,

  // Capacity configuration
  billingMode: dynamodb.BillingMode.PROVISIONED,
  readCapacity: 10,
  writeCapacity: 10,

  // Advanced features
  pointInTimeRecoverySpecification: {
    pointInTimeRecoveryEnabled: true,
  },
  contributorInsightsSpecification: {
    enabled: true,
  },

  // Encryption
  encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
  encryptionKey: myKmsKey,

  // Deletion protection
  deletionProtection: true,
});
```

### Lambda Function Integration

```ts
import { Code, Function, Runtime} from 'aws-cdk-lib/aws-lambda';
import { IdempotencyTable } from '@leighton-digital/cloud-blocks';

const idempotencyTable = new IdempotencyTable(this, 'IdempotencyTable', {
  tableName: 'my-lambda-idempotency'
});

const myFunction = new Function(this, 'MyFunction', {
  runtime: Runtime.PYTHON_3_11,
  handler: 'index.handler',
  code: Code.fromAsset('lambda'),
  environment: {
    IDEMPOTENCY_TABLE_NAME: idempotencyTable.table.tableName,
  },
});

// Grant read/write permissions to the Lambda function
idempotencyTable.table.grantReadWriteData(myFunction);
```

## Props

All of the props are inherited from the [DynamoDB Table](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.TableProps.html) construct, except for the following:

* `partitionKey`: Always `{ name: 'id', type: STRING }`
* `timeToLiveAttribute`: Always `'expiration'`
* `sortKey`: Not allowed (simple primary key only)

The above props are automatically set and **cannot be customized** as they are required for AWS Lambda Powertools compatibility.

## What gets created

* **DynamoDB Table**: `IdempTable${constructId}`
  * Partition key: `id` (STRING)
  * TTL attribute: `expiration`
  * AWS-managed encryption by default
  * Uses CDK default billing mode
  * Point-in-time recovery disabled by default (cost optimization)

## AWS Lambda Powertools Integration

This construct is specifically designed to work with the [AWS Lambda Powertools (TypeScript) - Idempotency](https://docs.powertools.aws.dev/lambda/typescript/latest/utilities/idempotency/) utility:

### Example

```typescript
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import { makeIdempotent } from '@aws-lambda-powertools/idempotency';

const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IDEMPOTENCY_TABLE_NAME!,
});

export const handler = makeIdempotent(
  async (event: any, context: any) => {
    // Your idempotent function logic here
    return { statusCode: 200, body: 'Success' };
  },
  { persistenceStore }
);
```

## Cost Optimization

The construct includes several cost optimization features enabled by default:

* **Pay-per-request billing**: No upfront capacity costs
* **Point-in-time recovery disabled**: Reduces costs for dev/test environments
* **Contributor insights disabled**: Avoids additional CloudWatch charges
* **TTL enabled**: Automatic clean-up of expired records reduces storage costs

For production environments, consider:

```ts
const prodTable = new IdempotencyTable(this, 'ProdIdempotencyTable', {
  tableName: 'prod-idempotency-table',
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  pointInTimeRecoverySpecification: {
    pointInTimeRecoveryEnabled: true,
  },
  deletionProtection: true, // Prevent accidental deletion
});
```

## Operational notes & caveats

* **Schema constraints**: The table schema is **fixed** to ensure compatibility with AWS Lambda Powertools. You cannot modify the partition key, TTL attribute, or add a sort key.
* **TTL behaviour**: Records with an `expiration` timestamp in the past will be automatically deleted by DynamoDB (typically within 48 hours).
* **Removal policy**: Uses CDK default behaviour. Explicitly set `RETAIN` for production safety or `DESTROY` for development environments.
* **Billing mode**: Uses CDK default (pay-per-request), which is cost-effective for variable workloads. Switch to provisioned if you have predictable traffic patterns.

## Extending

* **Monitoring**: Add CloudWatch alarms for throttling, errors, or capacity metrics
* **Global tables**: Configure global tables for multi-region deployments
* **Backup**: Configure automated backups for compliance requirements
* **Indexes**: Add global secondary indexes if you need additional query patterns (though this is uncommon for idempotency use cases)

## Troubleshooting

* **"Cannot override partition key"** → The partition key is fixed to `'id'` (STRING) for Powertools compatibility
* **"TTL attribute is required"** → The `expiration` TTL attribute is mandatory and cannot be changed
* **"Sort key not supported"** → Idempotency tables use a simple primary key only
* **Lambda permission errors** → Ensure you've granted `grantReadWriteData()` permissions for the table to your Lambda function
* **Powertools not finding table** → Verify the table name environment variable matches your table's name

<img src="https://github.com/leighton-digital/cloud-blocks/blob/main/images/leighton-logo.svg" width="200" />
