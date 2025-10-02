import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import type { Construct } from 'constructs';
import { CloudWatchDashboard } from '../../../src/constructs/cloudwatch-dashboard';

export class CloudWatchDashboardNestedStack extends cdk.NestedStack {
  public readonly dashboard: CloudWatchDashboard;
  public readonly advancedDashboard: CloudWatchDashboard;

  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    // Basic dashboard with minimal configuration
    this.dashboard = new CloudWatchDashboard(this, 'Dashboard', {
      dashboardName: 'test-dashboard',
      dashboardDescription: 'Test dashboard for monitoring application health',
    });

    // Create mock metrics for demonstration
    const requestMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'RequestCount',
      dimensionsMap: {
        LoadBalancer: 'app/test-alb/1234567890abcdef',
      },
      statistic: 'Sum',
    });

    const latencyMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'TargetResponseTime',
      dimensionsMap: {
        LoadBalancer: 'app/test-alb/1234567890abcdef',
      },
      statistic: 'Average',
    });

    const errorMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'HTTPCode_ELB_5XX_Count',
      dimensionsMap: {
        LoadBalancer: 'app/test-alb/1234567890abcdef',
      },
      statistic: 'Sum',
    });

    // Advanced dashboard demonstrating all optional properties
    this.advancedDashboard = new CloudWatchDashboard(
      this,
      'AdvancedDashboard',
      {
        // Required property
        dashboardDescription: `# Advanced Test Dashboard

## Overview
This dashboard demonstrates all available configuration options for the CloudWatchDashboard construct.

## Metrics Included
- **Request Volume**: Total requests per minute
- **Response Time**: Average latency percentiles
- **Error Rate**: 5XX error count and percentage
- **System Health**: Overall application performance indicators

## Usage Notes
- Metrics refresh every 5 minutes
- Use the time range selector to adjust the viewing window
- Contact: test-team@example.com for dashboard issues`,

        // Dashboard-specific properties (inherited from CloudWatch DashboardProps)
        dashboardName: 'advanced-test-dashboard',
        periodOverride: cloudwatch.PeriodOverride.AUTO,

        // Custom removal policy - retain for production-like testing
        removalPolicy: cdk.RemovalPolicy.RETAIN,

        // Initial widgets to populate the dashboard
        initialWidgets: [
          // Request volume graph
          new cloudwatch.GraphWidget({
            title: 'Request Volume',
            left: [requestMetric],
            width: 12,
            height: 6,
            period: cdk.Duration.minutes(5),
            statistic: 'Sum',
          }),

          // Response time graph
          new cloudwatch.GraphWidget({
            title: 'Response Time',
            left: [latencyMetric],
            width: 12,
            height: 6,
            period: cdk.Duration.minutes(5),
            statistic: 'Average',
            leftYAxis: {
              label: 'Milliseconds',
              showUnits: true,
            },
          }),

          // Error count single value widget
          new cloudwatch.SingleValueWidget({
            title: 'Total Errors (5XX)',
            metrics: [errorMetric],
            width: 8,
            height: 6,
            period: cdk.Duration.hours(1),
          }),

          // Error rate calculation widget
          new cloudwatch.SingleValueWidget({
            title: 'Error Rate',
            metrics: [
              new cloudwatch.MathExpression({
                expression: '(errors/requests)*100',
                usingMetrics: {
                  errors: errorMetric,
                  requests: requestMetric,
                },
                label: 'Error Rate %',
              }),
            ],
            width: 8,
            height: 6,
          }),

          // System status text widget
          new cloudwatch.TextWidget({
            markdown: `## System Status

**Current Status**: ✅ Operational
**Last Updated**: ${new Date().toISOString()}
**Monitoring**: Active

### Quick Links
- [Application Logs](https://console.aws.amazon.com/cloudwatch/home#logs:)
- [Alarm Console](https://console.aws.amazon.com/cloudwatch/home#alarms:)
- [Metrics Explorer](https://console.aws.amazon.com/cloudwatch/home#metricsV2:)`,
            width: 8,
            height: 6,
          }),
        ],
      },
    );

    // Demonstrate adding widgets after construction
    this.advancedDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Error Trend Analysis',
        left: [errorMetric],
        right: [
          new cloudwatch.MathExpression({
            expression: 'RATE(METRICS())',
            usingMetrics: { m1: errorMetric },
            label: 'Error Rate per Second',
          }),
        ],
        width: 24,
        height: 6,
        period: cdk.Duration.minutes(1),
      }),
    );
  }
}
