# CloudWatch Dashboard

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/leighton-digital/cloud-blocks/blob/main/LICENSE)
![Maintained](https://img.shields.io/maintenance/yes/2025)

A CDK construct that extends **CloudWatch Dashboard** directly with sensible defaults and built-in documentation, complete with:

* Automatic **description widget** at the top of the dashboard
* Support for **initial widgets** during construction
* **Direct inheritance** from CloudWatch Dashboard - no wrapper needed
* **Flexible widget management** with native addWidgets method
* **Removal policy** configuration for easy tear-down
* **TypeScript-first** design with comprehensive type safety
* **cdk-nag** compliance out of the box
* Jest unit tests with comprehensive CloudFormation validation

## Features

* **Dashboard Structure**: CloudWatch dashboard with automatic layout:
  * Description widget displayed prominently at the top (24 width, 2 height)
  * Optional initial widgets positioned after description
  * Direct access to all CloudWatch Dashboard methods and properties
* **Documentation**: Built-in dashboard documentation via description widget
* **Flexibility**: All CloudWatch dashboard properties are customizable
* **Lifecycle Management**: Automatic removal policy application for ephemeral environments
* **Testing**: Comprehensive Jest test suite with CloudFormation template validation

## Usage

### Basic Usage

```ts
import { CloudWatchDashboard } from '@leighton-digital/cloud-blocks';

// Minimal configuration
const dashboard = new CloudWatchDashboard(this, 'AppDashboard', {
  dashboardName: 'application-monitoring',
  dashboardDescription: 'Monitors API performance and error rates'
});

// CloudWatchDashboard IS a CloudWatch Dashboard - direct access to all methods
dashboard.addWidgets(/* your widgets */);
```

### Advanced Configuration with Initial Widgets

```ts
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { CloudWatchDashboard } from '@leighton-digital/cloud-blocks';

// Create metrics for monitoring
const apiRequestsMetric = new cloudwatch.Metric({
  namespace: 'AWS/ApiGateway',
  metricName: 'Count',
  dimensionsMap: {
    ApiName: 'MyAPI',
  },
});

const errorRateMetric = new cloudwatch.Metric({
  namespace: 'AWS/ApiGateway',
  metricName: '4XXError',
  dimensionsMap: {
    ApiName: 'MyAPI',
  },
});

const comprehensiveDashboard = new CloudWatchDashboard(this, 'ComprehensiveDashboard', {
  dashboardName: 'production-monitoring',
  dashboardDescription: `# Production API Monitoring

This dashboard provides comprehensive monitoring for our production API including:
- Request volume and latency trends
- Error rates and types
- Infrastructure health metrics
- Performance baselines and alerting thresholds`,

  periodOverride: cloudwatch.PeriodOverride.AUTO,

  initialWidgets: [
    new cloudwatch.GraphWidget({
      title: 'API Request Volume',
      left: [apiRequestsMetric],
      width: 12,
      height: 6,
      period: cdk.Duration.minutes(5),
    }),
    new cloudwatch.GraphWidget({
      title: 'Error Rate',
      left: [errorRateMetric],
      width: 12,
      height: 6,
      period: cdk.Duration.minutes(5),
    }),
  ],
});
```

### Adding Widgets After Construction

```ts
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { CloudWatchDashboard } from '@leighton-digital/cloud-blocks';

const dashboard = new CloudWatchDashboard(this, 'DynamicDashboard', {
  dashboardName: 'dynamic-monitoring',
  dashboardDescription: 'Dashboard that grows with our monitoring needs'
});

// Add widgets individually
dashboard.addWidgets(
  new cloudwatch.SingleValueWidget({
    title: 'Current TPS',
    metrics: [tpsMetric],
    width: 6,
    height: 6,
  })
);

// Add multiple widgets at once
dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'Latency Trends',
    left: [latencyP50, latencyP95, latencyP99],
    width: 18,
    height: 6,
  }),
  new cloudwatch.AlarmWidget({
    title: 'Active Alarms',
    alarms: [criticalAlarm, warningAlarm],
    width: 6,
    height: 6,
  })
);
```

### Integration with Monitoring Constructs

```ts
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { CloudWatchDashboard } from '@leighton-digital/cloud-blocks';

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'MyApi', {
      restApiName: 'production-api',
    });

    // Create monitoring dashboard
    const dashboard = new CloudWatchDashboard(this, 'ApiMonitoring', {
      dashboardName: `${this.stackName}-api-monitoring`,
      dashboardDescription: `Monitoring dashboard for ${api.restApiName}

## Key Metrics
- **Request Volume**: Total requests per minute
- **Error Rates**: 4XX and 5XX error percentages
- **Latency**: Response time percentiles
- **Throttling**: Request throttling incidents

## Operational Notes
- Alerts are configured for error rates > 5%
- Expected latency P95 < 2000ms
- Contact: platform-team@company.com`,

      initialWidgets: [
        new cloudwatch.GraphWidget({
          title: 'API Request Volume',
          left: [api.metricCount()],
          width: 12,
          height: 6,
        }),
        new cloudwatch.GraphWidget({
          title: 'API Latency',
          left: [api.metricLatency()],
          width: 12,
          height: 6,
        }),
      ],
    });

    // Add additional monitoring widgets based on your needs
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Error Rates',
        left: [api.metricClientError(), api.metricServerError()],
        width: 24,
        height: 6,
      })
    );
  }
}
```

### Configuring Removal Policy

```ts
import * as cdk from 'aws-cdk-lib';
import { CloudWatchDashboard } from '@leighton-digital/cloud-blocks';

// Default behavior: Dashboard is deleted when stack is deleted
const ephemeralDashboard = new CloudWatchDashboard(this, 'EphemeralDashboard', {
  dashboardName: 'ephemeral-monitoring',
  dashboardDescription: 'Dashboard for development environment',
  // removalPolicy defaults to RemovalPolicy.DESTROY
});

// Production dashboard: Retain the dashboard when stack is deleted
const productionDashboard = new CloudWatchDashboard(this, 'ProductionDashboard', {
  dashboardName: 'production-monitoring',
  dashboardDescription: 'Critical production metrics - preserved across deployments',
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// Snapshot before deletion (if supported by the resource)
const snapshotDashboard = new CloudWatchDashboard(this, 'SnapshotDashboard', {
  dashboardName: 'snapshot-monitoring',
  dashboardDescription: 'Dashboard that will be snapshotted before deletion',
  removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
});
```

## Props

All props are inherited from the [CloudWatch Dashboard](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.DashboardProps.html) construct, except for the following:

* `widgets`: Automatically managed by the construct (use `initialWidgets` and `addWidgets()` instead)

The following additional props are available:

* `dashboardDescription`: **Required** - Descriptive text displayed at the top of the dashboard
* `initialWidgets`: **Optional** - Array of widgets to add during construction (after description widget)
* `removalPolicy`: **Optional** - Policy to apply when the dashboard is removed from the stack (defaults to `RemovalPolicy.DESTROY`)

## What gets created

* **CloudWatch Dashboard**: `${constructId}` (the construct itself)
  * Description text widget (width: 24, height: 2)
  * Any initial widgets specified in props
  * Configured with specified dashboard properties
  * Configurable removal policy (defaults to DESTROY for easy cleanup)

## Dashboard Layout Best Practices

The construct follows CloudWatch dashboard best practices:

* **Description Widget**: Always appears first, full width (24), providing context
* **Widget Sizing**: Use consistent widget dimensions (multiples of 6 for width)
* **Logical Grouping**: Group related metrics together
* **Information Hierarchy**: Most important metrics should appear near the top

### Recommended Widget Layouts

```ts
// Full-width sections for major metric groups
new cloudwatch.GraphWidget({
  title: 'Primary KPIs',
  width: 24,  // Full width
  height: 6,
  // ... metrics
});

// Side-by-side comparison widgets
new cloudwatch.GraphWidget({
  title: 'Requests',
  width: 12,  // Half width
  height: 6,
  // ... metrics
});
new cloudwatch.GraphWidget({
  title: 'Errors',
  width: 12,  // Half width
  height: 6,
  // ... metrics
});

// Number widgets for key indicators
new cloudwatch.SingleValueWidget({
  title: 'Current TPS',
  width: 6,   // Quarter width
  height: 6,
  // ... metrics
});
```

## Markdown Support in Descriptions

The dashboard description supports full Markdown formatting:

```ts
const dashboard = new CloudWatchDashboard(this, 'RichDashboard', {
  dashboardName: 'comprehensive-monitoring',
  dashboardDescription: `# Production System Health

## 🎯 Key Performance Indicators
- **Availability**: > 99.9% uptime
- **Latency**: P95 < 500ms
- **Error Rate**: < 0.1%

## 📊 Dashboard Sections
1. **Traffic Patterns** - Request volume and geographic distribution
2. **Performance Metrics** - Latency percentiles and throughput
3. **Error Analysis** - Error rates, types, and root cause indicators
4. **Infrastructure Health** - CPU, memory, and resource utilization

## 🚨 Alert Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | 1% | 5% |
| Latency P95 | 1000ms | 2000ms |
| CPU Usage | 70% | 85% |

> 📞 **On-Call**: platform-team@company.com
> 📚 **Runbooks**: https://wiki.company.com/runbooks`,
});
```

## Operational notes & caveats

* **Widget Limits**: CloudWatch dashboards support up to 500 widgets per dashboard
* **Refresh Rates**: Dashboards auto-refresh every minute; use periodOverride for custom behavior
* **Cross-Account Metrics**: Requires appropriate IAM permissions for cross-account metric access
* **Regional Considerations**: Dashboards exist in specific regions; metrics from other regions incur additional charges
* **Performance**: Large dashboards with many metrics may have slower load times
* **Removal Policy**: Use `RemovalPolicy.RETAIN` for production dashboards to preserve them across stack updates. Default `DESTROY` policy is ideal for development environments.

## Extending

* **Custom Widgets**: Create custom widgets using CloudWatch Insights or third-party integrations
* **Programmatic Updates**: Use the dashboard construct in CI/CD pipelines for dynamic dashboard generation
* **Alerting Integration**: Combine with CloudWatch Alarms for comprehensive monitoring solutions
* **Cross-Account Dashboards**: Configure cross-account IAM roles for centralized monitoring

## Troubleshooting

* **"Widgets not appearing"** → Verify metric permissions and regional configuration
* **"Dashboard not updating"** → Check metric timestamps and CloudWatch service health
* **"Cross-region metrics failing"** → Ensure IAM permissions for cross-region access
* **"Performance issues"** → Reduce widget count or optimize metric queries for faster loading
* **"Access denied errors"** → Verify CloudWatch dashboard permissions in IAM policies

<img src="https://github.com/leighton-digital/cloud-blocks/blob/main/images/leighton-logo.svg" width="200" />
