import type * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import type { Construct } from 'constructs';
import { addTagsToStack } from '../../../src/aspects/add-tags-to-stack';
import { CustomStack } from '../../../src/constructs/custom-stack';
import { ApiDistributionNestedStack } from './api-distribution-nested-stack';
import { CloudWatchDashboardNestedStack } from './cloudwatch-dashboard-nested-stack';
import { IdempotencyTableNestedStack } from './idempotency-table-nested-stack';
import { ProgressiveLambdaNestedStack } from './progressive-lambda-nested-stack';
import { RestApiNestedStack } from './rest-api-nested-stack';

export class TestProjectStack extends CustomStack {
  public readonly apiDistributionStack: ApiDistributionNestedStack;
  public readonly restApiStack: RestApiNestedStack;
  public readonly idempotencyTableStack: IdempotencyTableNestedStack;
  public readonly cloudwatchDashboardStack: CloudWatchDashboardNestedStack;
  public readonly progressiveLambdaStack: ProgressiveLambdaNestedStack;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      description:
        'Test project demonstrating cloud-blocks constructs with centralized monitoring',
      createDashboard: true,
      dashboardDescription: `# Test Project Monitoring Dashboard

## 📊 Overview
This dashboard provides comprehensive monitoring for the test project, including:
- **API Gateway CloudFront Distribution** - Request metrics and performance
- **DynamoDB Idempotency Table** - Usage and performance metrics
- **Progressive Lambda Functions** - Deployment and execution metrics
- **CloudWatch Dashboards** - Meta-monitoring of dashboard usage

## 🏗️ Architecture Components
1. **API Distribution Stack** - CloudFront + API Gateway integration
2. **Idempotency Table Stack** - DynamoDB table for Lambda Powertools
3. **CloudWatch Dashboard Stack** - Individual component dashboards
4. **Progressive Lambda Stack** - CodeDeploy + Lambda with progressive rollouts

## 🚨 Key Metrics
- API request volume and latency
- Lambda function performance and errors
- DynamoDB operations and throttling
- CloudFront distribution health

## 📞 Support
- **Team**: Platform Engineering
- **Repository**: https://github.com/leighton-digital/cloud-blocks
- **Documentation**: See individual construct READMEs`,
    });

    // Create the API Distribution using a nested stack
    this.apiDistributionStack = new ApiDistributionNestedStack(
      this,
      'ApiDistributionStack',
    );

    // Create the REST API using a nested stack
    this.restApiStack = new RestApiNestedStack(this, 'RestApiStack');

    // Create the Idempotency Table using a nested stack
    this.idempotencyTableStack = new IdempotencyTableNestedStack(
      this,
      'IdempotencyTableStack',
    );

    // Create the CloudWatch Dashboard using a nested stack (for testing individual dashboards)
    this.cloudwatchDashboardStack = new CloudWatchDashboardNestedStack(
      this,
      'CloudWatchDashboardStack',
    );

    // Create the Progressive Lambda using a nested stack
    this.progressiveLambdaStack = new ProgressiveLambdaNestedStack(
      this,
      'ProgressiveLambdaStack',
    );

    // Add monitoring widgets to the centralized dashboard
    this.setupCentralizedMonitoring();

    // Apply additional test-specific tags to demonstrate tag utilities
    addTagsToStack(this, {
      StackType: 'test-project',
      Version: '1.0.0',
      CostCenter: 'engineering',
    });
  }

  /**
   * Set up centralized monitoring widgets for all nested stacks.
   * This demonstrates how CustomStack can provide consolidated monitoring
   * across multiple components.
   */
  private setupCentralizedMonitoring(): void {
    // Create mock metrics for demonstration (in real usage, these would come from the actual resources)
    const apiRequestsMetric = new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName: 'Requests',
      dimensionsMap: {
        DistributionId: 'test-distribution',
      },
      statistic: 'Sum',
    });

    const apiLatencyMetric = new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName: 'OriginLatency',
      dimensionsMap: {
        DistributionId: 'test-distribution',
      },
      statistic: 'Average',
    });

    const dynamoReadMetric = new cloudwatch.Metric({
      namespace: 'AWS/DynamoDB',
      metricName: 'ConsumedReadCapacityUnits',
      dimensionsMap: {
        TableName: 'test-idempotency-table',
      },
      statistic: 'Sum',
    });

    const dynamoWriteMetric = new cloudwatch.Metric({
      namespace: 'AWS/DynamoDB',
      metricName: 'ConsumedWriteCapacityUnits',
      dimensionsMap: {
        TableName: 'test-idempotency-table',
      },
      statistic: 'Sum',
    });

    const lambdaDurationMetric = new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Duration',
      dimensionsMap: {
        FunctionName: 'progressive-lambda-test',
      },
      statistic: 'Average',
    });

    const lambdaErrorsMetric = new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
      dimensionsMap: {
        FunctionName: 'progressive-lambda-test',
      },
      statistic: 'Sum',
    });

    // Add centralized monitoring widgets
    this.addWidgets([
      // API Gateway + CloudFront monitoring section
      new cloudwatch.GraphWidget({
        title: '🌐 API & CDN Performance',
        left: [apiRequestsMetric],
        right: [apiLatencyMetric],
        width: 24,
        height: 6,
        leftYAxis: { label: 'Requests', min: 0 },
        rightYAxis: { label: 'Latency (ms)', min: 0 },
      }),

      // DynamoDB monitoring section
      new cloudwatch.GraphWidget({
        title: '📊 DynamoDB Idempotency Table',
        left: [dynamoReadMetric, dynamoWriteMetric],
        width: 12,
        height: 6,
        leftYAxis: { label: 'Capacity Units', min: 0 },
      }),

      // Lambda monitoring section
      new cloudwatch.GraphWidget({
        title: '⚡ Progressive Lambda Performance',
        left: [lambdaDurationMetric],
        right: [lambdaErrorsMetric],
        width: 12,
        height: 6,
        leftYAxis: { label: 'Duration (ms)', min: 0 },
        rightYAxis: { label: 'Errors', min: 0 },
      }),

      // High-level KPI section
      new cloudwatch.SingleValueWidget({
        title: '🎯 API Request Rate',
        metrics: [apiRequestsMetric],
        width: 6,
        height: 6,
      }),

      new cloudwatch.SingleValueWidget({
        title: '⏱️ Average Latency',
        metrics: [apiLatencyMetric],
        width: 6,
        height: 6,
      }),

      new cloudwatch.SingleValueWidget({
        title: '📈 DynamoDB Operations',
        metrics: [dynamoReadMetric.with({ statistic: 'Sum' })],
        width: 6,
        height: 6,
      }),

      new cloudwatch.SingleValueWidget({
        title: '🚨 Lambda Errors',
        metrics: [lambdaErrorsMetric],
        width: 6,
        height: 6,
      }),
    ]);
  }
}
