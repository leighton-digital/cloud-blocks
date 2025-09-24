import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NagSuppressions } from 'cdk-nag';

import { Construct } from 'constructs';

/**
 * Properties for configuring an IdempotencyTable construct.
 *
 * This interface extends DynamoDB TableProps but excludes properties that are
 * mandatory for AWS Lambda Powertools idempotency functionality. The following
 * properties are automatically set and cannot be overridden:
 * - partitionKey: Fixed to 'id' (STRING type)
 * - timeToLiveAttribute: Fixed to 'expiration'
 * - sortKey: Not allowed (idempotency tables use simple primary key)
 *
 * @example
 * ```typescript
 * const idempotencyTable = new IdempotencyTable(this, 'MyIdempotencyTable', {
 *   tableName: 'my-idempotency-table',
 *   removalPolicy: RemovalPolicy.DESTROY,
 *   readCapacity: 5,
 *   writeCapacity: 5,
 * });
 * ```
 */
export interface IdempotencyTableProps
  extends Omit<
    dynamodb.TableProps,
    'partitionKey' | 'sortKey' | 'timeToLiveAttribute'
  > {}

/**
 * A DynamoDB table construct optimized for AWS Lambda Powertools idempotency functionality.
 *
 * This construct creates a DynamoDB table with sensible defaults for idempotency use cases
 * while enforcing specific requirements needed by the AWS Lambda Powertools library:
 * - Partition key is always 'id' (STRING type)
 * - TTL attribute is always 'expiration'
 * - No sort key is allowed (simple primary key only)
 *
 * All other DynamoDB table properties can be customized as needed.
 *
 * @example
 * ```typescript
 * // Basic usage with defaults
 * const idempotencyTable = new IdempotencyTable(this, 'IdempotencyTable', {
 *   tableName: 'my-function-idempotency'
 * });
 *
 * // Custom configuration
 * const customTable = new IdempotencyTable(this, 'CustomTable', {
 *   tableName: 'custom-idempotency-table',
 *   removalPolicy: RemovalPolicy.RETAIN,
 *   readCapacity: 10,
 *   writeCapacity: 10,
 *   pointInTimeRecoverySpecification: {
 *     pointInTimeRecoveryEnabled: true
 *   }
 * });
 * ```
 */
export class IdempotencyTable extends Construct {
  /**
   * The underlying DynamoDB table.
   */
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: IdempotencyTableProps = {}) {
    super(scope, id);

    // Default configuration optimized for idempotency use cases
    const defaultProps: Partial<dynamodb.TableProps> = {
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: false,
        recoveryPeriodInDays: undefined,
      },
    };

    // Add contributorInsightsSpecification if available (aws-cdk-lib v2.215.0+)
    // This property was introduced in aws-cdk-lib v2.215.0
    try {
      const propsWithInsights = defaultProps as dynamodb.TableProps & {
        contributorInsightsSpecification?: {
          enabled: boolean;
        };
      };
      propsWithInsights.contributorInsightsSpecification = {
        enabled: false,
      };
    } catch {
      // Property not available in this CDK version, skip silently
    }

    // Mandatory properties required by AWS Lambda Powertools
    const mandatoryProps: Pick<
      dynamodb.TableProps,
      'partitionKey' | 'timeToLiveAttribute'
    > = {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: 'expiration',
    };

    // Merge props: defaults < user props < mandatory props
    const tableProps: dynamodb.TableProps = {
      ...defaultProps,
      ...props,
      ...mandatoryProps,
    };

    this.table = new dynamodb.Table(this, `IdempTable${id}`, tableProps);

    // Apply removal policy if specified
    if (props.removalPolicy) {
      this.table.applyRemovalPolicy(props.removalPolicy);
    }

    // Add CDK Nag suppression for point-in-time recovery when it's disabled by default
    if (!props.pointInTimeRecoverySpecification?.pointInTimeRecoveryEnabled) {
      NagSuppressions.addResourceSuppressions(this.table, [
        {
          id: 'AwsSolutions-DDB3',
          reason:
            'Point-in-time recovery is disabled by design for idempotency tables to reduce costs. Data in idempotency tables is transient and recoverable from source systems.',
        },
      ]);
    }
  }
}
