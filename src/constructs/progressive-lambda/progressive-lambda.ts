import * as cdk from 'aws-cdk-lib';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as codeDeploy from 'aws-cdk-lib/aws-codedeploy';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import type * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

/**
 * Configuration properties for the ProgressiveLambda construct.
 *
 * Extends NodejsFunctionProps to inherit all standard Lambda function configuration options.
 */
export interface ProgressiveLambdaProps extends nodeLambda.NodejsFunctionProps {
  /**
   * Whether to create CloudWatch dashboard widgets for monitoring.
   *
   * When enabled, creates three widgets:
   * - Success metric single value widget
   * - Error metric single value widget
   * - Alarm status widget
   *
   * @default false
   */
  createWidget?: boolean;

  /**
   * The deployment stage name (e.g., 'dev', 'staging', 'prod').
   *
   * Used for:
   * - Lambda alias name
   * - CloudWatch alarm descriptions
   * - Resource naming and tagging
   *
   * @example 'prod', 'dev', 'staging'
   */
  stageName: string;

  /**
   * The CodeDeploy application that manages this Lambda function's deployments.
   *
   * @see {@link https://docs.aws.amazon.com/codedeploy/latest/userguide/applications.html | CodeDeploy Applications}
   */
  application: codeDeploy.LambdaApplication;

  /**
   * The deployment configuration defining how traffic shifts during deployments.
   *
   * Common options:
   * - `LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE` - Gradual linear shift
   * - `LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES` - Canary deployment
   * - `LambdaDeploymentConfig.ALL_AT_ONCE` - Blue/green deployment
   *
   * @see {@link https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html | Deployment Configurations}
   */
  deploymentConfig: codeDeploy.ILambdaDeploymentConfig;

  /**
   * Whether CloudWatch alarms should trigger actions when breached.
   *
   * When `false`, alarms are created but won't send notifications or trigger auto-rollbacks.
   * Useful for testing or monitoring-only scenarios.
   *
   * @default true
   */
  alarmEnabled: boolean;

  /**
   * SNS topic for alarm notifications.
   *
   * @remarks
   * **Security Note**: For compliance with AwsSolutions-SNS3, ensure your SNS topic
   * enforces SSL by adding a topic policy that denies non-HTTPS requests.
   *
   * @example
   * ```typescript
   * const topic = new sns.Topic(this, 'AlarmTopic');
   * topic.addToResourcePolicy(new iam.PolicyStatement({
   *   effect: iam.Effect.DENY,
   *   principals: [new iam.AnyPrincipal()],
   *   actions: ['sns:Publish'],
   *   resources: [topic.topicArn],
   *   conditions: {
   *     Bool: { 'aws:SecureTransport': 'false' }
   *   }
   * }));
   * ```
   */
  snsTopic: sns.Topic;

  /**
   * CloudWatch namespace for custom metrics.
   *
   * Groups related metrics together for organisation and filtering.
   * Should follow a hierarchical naming convention.
   *
   * @example 'MyApp/Lambda', 'ECommerce/OrderProcessing'
   */
  namespace: string;

  /**
   * Service name dimension for CloudWatch metrics.
   *
   * Used to differentiate metrics from different services within the same namespace.
   * Appears as a dimension in CloudWatch metrics and alarms.
   *
   * @example 'OrderProcessor', 'UserAuthenticator'
   */
  serviceName: string;

  /**
   * Name of the custom metric that tracks successful operations.
   *
   * This metric should be published by your Lambda function code to indicate
   * successful processing or operations.
   *
   * @example 'SuccessfulOrders', 'ProcessedEvents'
   * @default '${id}-SuccessOperation'
   */
  metricSuccessName?: string;

  /**
   * Display title for the success metric widget.
   *
   * Human-readable title shown in CloudWatch dashboards and widgets.
   * Should clearly describe what the metric represents.
   *
   * @example 'Successful Order Processing', 'Events Processed Successfully'
   * @default '${id} - Success Operation'
   */
  metricSuccessNameTitle?: string;

  /**
   * Name of the custom metric that tracks failed operations.
   *
   * This metric should be published by your Lambda function code to indicate
   * failures or errors. Used by the CloudWatch alarm for deployment monitoring.
   *
   * @example 'FailedOrders', 'ProcessingErrors'
   */
  metricErrorName: string;

  /**
   * Display title for the error metric widget.
   *
   * Human-readable title shown in CloudWatch dashboards and widgets.
   * Should clearly describe what the error metric represents.
   *
   * @example 'Failed Order Processing', 'Processing Errors'
   * @default '${id} - Error Operation'
   */
  metricErrorNameTitle?: string;

  /**
   * AWS region where the Lambda function and associated resources are deployed.
   *
   * Used for CloudWatch metric configurations and cross-region references.
   * Should match the region where the construct is deployed.
   *
   * @example 'us-east-1', 'eu-west-1', 'ap-southeast-2'
   */
  region: string;

  /**
   * Optional configuration overrides for the CloudWatch alarm.
   *
   * Allows customization of alarm properties such as threshold, evaluation periods,
   * and missing data treatment. Merges with sensible defaults provided by the construct.
   *
   * @example
   * ```typescript
   * alarmConfiguration: {
   *   threshold: 5, // Trigger alarm on 5 errors instead of default 10
   *   evaluationPeriods: 2, // Require 2 consecutive periods to trigger
   *   treatMissingData: cloudwatch.TreatMissingData.BREACHING, // Change missing data handling
   * }
   * ```
   */
  alarmConfiguration?: {
    // Trigger alarm when 10 or more errors occur in the evaluation period
    threshold?: number;
    // Single evaluation period enables fast rollback response
    evaluationPeriods?: number;
    // Don't trigger alarm on missing data to avoid false positives during low traffic
    treatMissingData?: cloudwatch.TreatMissingData;
  };
}

/**
 * A progressive deployment Lambda function with integrated CloudWatch monitoring and CodeDeploy automation.
 *
 * ## Overview
 *
 * This construct provides a production-ready Lambda function with:
 * - **Progressive Deployments**: Uses AWS CodeDeploy for safe, automated rollouts
 * - **Error Monitoring**: CloudWatch alarms that trigger rollbacks on failures
 * - **Observability**: Optional dashboard widgets and X-Ray tracing
 * - **Security Best Practices**: Latest runtime, SSL enforcement guidance, and proper IAM roles
 *
 * ## Key Features
 *
 * ### Progressive Deployment
 * - Creates a Lambda alias for traffic management
 * - Integrates with CodeDeploy for controlled traffic shifting
 * - Supports various deployment strategies (linear, canary, blue/green)
 *
 * ### Monitoring & Alerting
 * - CloudWatch alarm based on custom error metrics
 * - Automatic rollback when error threshold is breached
 * - SNS notifications for deployment events
 * - Optional dashboard widgets for real-time monitoring
 *
 * ### Security & Compliance
 * - Uses latest Node.js runtime by default (AwsSolutions-L1)
 * - X-Ray tracing enabled for request tracking
 * - Follows AWS Well-Architected Framework principles
 * - CDK Nag compliant with documented exceptions
 *
 * ## Usage Patterns
 *
 * ### Basic Usage
 * ```typescript
 * const app = new codeDeploy.LambdaApplication(this, 'MyApp');
 * const alertTopic = new sns.Topic(this, 'Alerts');
 *
 * const lambda = new ProgressiveLambda(this, 'ProcessorFunction', {
 *   entry: 'src/handlers/processor.ts',
 *   stageName: 'prod',
 *   application: app,
 *   deploymentConfig: codeDeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
 *   alarmEnabled: true,
 *   snsTopic: alertTopic,
 *   namespace: 'ECommerce',
 *   serviceName: 'OrderProcessor',
 *   metricSuccessName: 'ProcessedOrders',
 *   metricSuccessNameTitle: 'Successfully Processed Orders',
 *   metricErrorName: 'ProcessingErrors',
 *   metricErrorNameTitle: 'Order Processing Failures',
 *   region: 'us-east-1'
 * });
 * ```
 *
 * ### With Dashboard Widgets
 * ```typescript
 * const lambda = new ProgressiveLambda(this, 'ProcessorFunction', {
 *   // ... other props
 *   createWidget: true  // Creates dashboard widgets
 * });
 *
 * // Add widgets to a dashboard
 * const dashboard = new cloudwatch.Dashboard(this, 'MyDashboard');
 * dashboard.addWidgets(...lambda.widgets);
 * ```
 *
 * ### Canary Deployment
 * ```typescript
 * const lambda = new ProgressiveLambda(this, 'RiskyFeature', {
 *   // ... other props
 *   deploymentConfig: codeDeploy.LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
 *   // Deploy 10% of traffic, wait 5 minutes, then proceed or rollback
 * });
 * ```
 *
 * ## Metrics Integration
 *
 * Your Lambda function code should publish the specified success and error metrics:
 *
 * ```typescript
 * import { CloudWatch } from 'aws-sdk';
 * const cloudwatch = new CloudWatch();
 *
 * export const handler = async (event) => {
 *   try {
 *     // Process event
 *     await processOrder(event);
 *
 *     // Publish success metric
 *     await cloudwatch.putMetricData({
 *       Namespace: 'ECommerce',
 *       MetricData: [{
 *         MetricName: 'ProcessedOrders',
 *         Value: 1,
 *         Dimensions: [{ Name: 'service', Value: 'OrderProcessor' }]
 *       }]
 *     }).promise();
 *   } catch (error) {
 *     // Publish error metric
 *     await cloudwatch.putMetricData({
 *       Namespace: 'ECommerce',
 *       MetricData: [{
 *         MetricName: 'ProcessingErrors',
 *         Value: 1,
 *         Dimensions: [{ Name: 'service', Value: 'OrderProcessor' }]
 *       }]
 *     }).promise();
 *     throw error;
 *   }
 * };
 * ```
 *
 * ## Alarm Configuration
 *
 * - **Threshold**: 10 errors within 1 minute triggers alarm
 * - **Evaluation**: Single evaluation period to enable fast rollbacks
 * - **Missing Data**: Treated as NOT_BREACHING to avoid false alarms
 * - **Actions**: SNS notification and CodeDeploy rollback
 *
 * @see {@link https://docs.aws.amazon.com/codedeploy/latest/userguide/applications-create-lambda.html | CodeDeploy Lambda Applications}
 * @see {@link https://docs.aws.amazon.com/lambda/latest/dg/lambda-x-ray.html | Lambda X-Ray Tracing}
 * @see {@link https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/working_with_metrics.html | CloudWatch Custom Metrics}
 *
 * @remarks
 * **Security Considerations:**
 * - Uses latest Node.js runtime by default (AwsSolutions-L1 compliance)
 * - Requires user-provided SNS topic to enforce SSL policies (AwsSolutions-SNS3)
 * - Uses AWS managed policies for Lambda execution (AwsSolutions-IAM4 - acceptable for standard roles)
 * - X-Ray tracing requires wildcard IAM permissions (AwsSolutions-IAM5 - acceptable for tracing)
 */
export class ProgressiveLambda extends Construct {
  /**
   * The underlying Lambda function.
   *
   * Provides access to the NodejsFunction for additional configuration,
   * permissions, or integration with other AWS services.
   */
  public readonly lambda: nodeLambda.NodejsFunction;

  /**
   * Lambda alias for traffic management during deployments.
   *
   * Points to the current version and is used by CodeDeploy to shift traffic
   * between versions during progressive deployments.
   */
  public readonly alias: lambda.Alias;

  /**
   * CloudWatch alarm that monitors error metrics.
   *
   * Triggers when error count exceeds threshold, causing CodeDeploy to
   * automatically rollback the deployment to the previous version.
   */
  public readonly alarm: cloudwatch.Alarm;

  /**
   * CodeDeploy deployment group managing progressive rollouts.
   *
   * Orchestrates traffic shifting between Lambda versions based on the
   * configured deployment strategy and alarm status.
   */
  public readonly deploymentGroup: codeDeploy.LambdaDeploymentGroup;

  /**
   * CloudWatch dashboard widgets for monitoring (when enabled).
   *
   * Contains three widgets when `createWidget` is true:
   * 1. Success metric single value widget
   * 2. Error metric single value widget
   * 3. Alarm status widget
   *
   * Add to dashboards using: `dashboard.addWidgets(...lambda.widgets)`
   */
  public readonly widgets: cloudwatch.ConcreteWidget[] = [];

  /** @internal CodeDeploy application reference for deployment group creation. */
  private readonly application: codeDeploy.LambdaApplication;

  /** @internal Deployment configuration reference for progressive rollout strategy. */
  private readonly deploymentConfig: codeDeploy.ILambdaDeploymentConfig;

  private defaultAlarmConfig = {
    threshold: 10,
    evaluationPeriods: 1,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  };

  /**
   * Creates a new ProgressiveLambda construct.
   *
   * @param scope - The construct scope
   * @param id - The construct identifier
   * @param props - Configuration properties
   *
   * @throws {Error} When required properties are missing or invalid
   *
   * @example
   * ```typescript
   * const lambda = new ProgressiveLambda(this, 'MyLambda', {
   *   entry: 'src/handler.ts',
   *   stageName: 'prod',
   *   application: myCodeDeployApp,
   *   deploymentConfig: codeDeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
   *   alarmEnabled: true,
   *   snsTopic: mySnsTopic,
   *   namespace: 'MyApp',
   *   serviceName: 'MyService',
   *   metricSuccessName: 'Success',
   *   metricSuccessNameTitle: 'Successful Operations',
   *   metricErrorName: 'Errors',
   *   metricErrorNameTitle: 'Failed Operations',
   *   region: 'us-east-1'
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props: ProgressiveLambdaProps) {
    super(scope, id);

    // Extract widget creation flag for cleaner conditional logic
    const createWidget = !!props?.createWidget;

    // Store CodeDeploy references for deployment group creation
    this.application = props.application;
    this.deploymentConfig = props.deploymentConfig;

    // Configure Lambda function with secure defaults
    const lambdaProps = {
      // Security: Use latest Node.js runtime for patches and features (AwsSolutions-L1)
      runtime: lambda.Runtime.NODEJS_22_X,
      // Observability: Enable X-Ray tracing for request tracking and debugging
      tracing: lambda.Tracing.ACTIVE,
      // Performance: Set reasonable defaults if not provided by user
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      // User configuration takes precedence over defaults
      ...props,
    };

    // Create the Lambda function with merged configuration
    this.lambda = new nodeLambda.NodejsFunction(this, id, lambdaProps);

    // Create Lambda alias for traffic management during deployments
    // The alias provides a stable endpoint that CodeDeploy can shift traffic between versions
    this.alias = new lambda.Alias(this, `${id}Alias`, {
      aliasName: props.stageName,
      version: this.lambda.currentVersion,
    });

    // Configure CloudWatch alarm for error monitoring and automatic rollbacks
    this.alarm = new cloudwatch.Alarm(this, `${id}Failure`, {
      alarmDescription: `${props.stageName} - ${props.namespace}/${props.metricErrorName} deployment errors = 10 for ${id}`,
      actionsEnabled: props.alarmEnabled,
      metric: new cloudwatch.Metric({
        metricName: props.metricErrorName,
        namespace: props.namespace,
        statistic: cloudwatch.Stats.SUM,
        dimensionsMap: {
          service: props.serviceName,
        },
        // Monitor errors over 1-minute periods for quick detection
        period: Duration.minutes(1),
      }),
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      ...this.defaultAlarmConfig,
      ...props.alarmConfiguration,
    });

    // Connect alarm to SNS topic for notifications
    this.alarm.addAlarmAction(new actions.SnsAction(props.snsTopic));
    // Allow CloudFormation to delete alarm during stack teardown
    this.alarm.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Create CodeDeploy deployment group for progressive rollout management
    this.deploymentGroup = new codeDeploy.LambdaDeploymentGroup(
      this,
      `${id}CanaryDeployment`,
      {
        alias: this.alias,
        deploymentConfig: this.deploymentConfig,
        // Alarm will trigger automatic rollback if breached during deployment
        alarms: [this.alarm],
        application: this.application,
      },
    );

    // Optionally create CloudWatch dashboard widgets for monitoring
    if (createWidget) {
      this.widgets.push(
        // Success metric widget showing positive operations
        new cloudwatch.SingleValueWidget({
          title: props.metricSuccessNameTitle ?? `${id} - Success Operation`,
          metrics: [
            new cloudwatch.Metric({
              namespace: props.namespace,
              metricName: props.metricSuccessName ?? `${id}-SuccessOperation`,
              label: props.metricSuccessName ?? `${id} - Success Operation`,
              region: props.region,
              dimensionsMap: {
                service: props.serviceName,
              },
              statistic: cloudwatch.Stats.SUM,
              period: cdk.Duration.minutes(1),
            }),
          ],
        }),
        // Error metric widget showing failures and issues
        new cloudwatch.SingleValueWidget({
          title: props.metricErrorNameTitle ?? `${id} - Error Operation`,
          metrics: [
            new cloudwatch.Metric({
              namespace: props.namespace,
              metricName: props.metricErrorName,
              label: props.metricErrorName ?? `${id} - Error Operation`,
              region: props.region,
              dimensionsMap: {
                service: props.serviceName,
              },
              statistic: cloudwatch.Stats.SUM,
              period: cdk.Duration.minutes(1),
            }),
          ],
        }),
        // Alarm status widget showing current alarm state
        new cloudwatch.AlarmStatusWidget({
          title: 'Alarms',
          alarms: [this.alarm],
        }),
      );
    }
  }
}
