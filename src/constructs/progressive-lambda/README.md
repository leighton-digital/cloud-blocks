# Progressive Lambda

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/leighton-digital/cloud-blocks/blob/main/LICENSE)
![Maintained](https://img.shields.io/maintenance/yes/2025)

A production-ready AWS CDK construct that creates a NodeJS Lambda function with progressive deployment capabilities, integrated monitoring, and automatic rollback functionality using AWS CodeDeploy and CloudWatch.

## Overview

The `ProgressiveLambda` construct combines several AWS services to provide a robust serverless deployment solution:

- **Progressive Deployments**: Uses AWS CodeDeploy to safely shift traffic between Lambda versions
- **Error Monitoring**: CloudWatch alarms that trigger automatic rollbacks when error thresholds are exceeded
- **Observability**: X-Ray tracing, optional dashboard widgets, and comprehensive metrics
- **Security Best Practices**: Latest Node.js runtime, proper IAM roles, and CDK Nag compliance

## Key Features

### 🚀 **Progressive Deployment Strategies**
- **Linear**: Gradually shift traffic in equal increments (e.g., 10% every minute)
- **Canary**: Deploy to a small percentage, validate, then complete rollout
- **Blue/Green**: All-at-once deployment with instant rollback capability

### 📊 **Automated Monitoring & Rollback**
- CloudWatch alarms based on custom error metrics
- Automatic rollback when error threshold (10 errors/minute) is breached
- SNS notifications for deployment events and alarm states

### 📈 **Built-in Observability**
- X-Ray tracing enabled by default for request tracking
- Optional CloudWatch dashboard widgets (success, error, alarm status)
- Custom metrics integration for business-specific monitoring

### 🔒 **Security & Compliance**
- Uses Node.js 22.x runtime by default (latest security patches)
- CDK Nag compliant with documented security considerations
- Proper IAM role configuration with least privilege

---

## Usage

### Basic Example

```typescript
import * as cdk from 'aws-cdk-lib';
import * as codeDeploy from 'aws-cdk-lib/aws-codedeploy';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { ProgressiveLambda } from '@leighton-digital/cloud-blocks';

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create CodeDeploy application
    const application = new codeDeploy.LambdaApplication(this, 'MyApp');

    // Create SNS topic for alerts
    const alertTopic = new sns.Topic(this, 'Alerts');

    // Create progressive Lambda with linear deployment
    const progressiveLambda = new ProgressiveLambda(this, 'OrderProcessor', {
      entry: 'src/handlers/process-order.ts',
      stageName: 'prod',
      application,
      deploymentConfig: codeDeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmEnabled: true,
      snsTopic: alertTopic,
      namespace: 'ECommerce',
      serviceName: 'OrderProcessor',
      metricErrorName: 'ProcessingErrors',
      region: 'us-east-1',
      // Optional: Custom metric names and titles (will use defaults if not specified)
      metricSuccessName: 'ProcessedOrders',
      metricSuccessNameTitle: 'Successfully Processed Orders',
      metricErrorNameTitle: 'Order Processing Failures',
      // Optional: Lambda function configuration
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        STAGE: 'prod'
      }
    });
  }
}
```

### Minimal Configuration with Defaults

```typescript
// Create progressive Lambda using default metric names and titles
const minimalLambda = new ProgressiveLambda(this, 'SimpleProcessor', {
  entry: 'src/handlers/simple-processor.ts',
  stageName: 'prod',
  application,
  deploymentConfig: codeDeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
  alarmEnabled: true,
  snsTopic: alertTopic,
  namespace: 'MyApp',
  serviceName: 'SimpleProcessor',
  metricErrorName: 'ProcessingErrors',
  region: 'us-east-1'
  // metricSuccessName defaults to 'SimpleProcessor-SuccessOperation'
  // metricSuccessNameTitle defaults to 'SimpleProcessor - Success Operation'
  // metricErrorNameTitle defaults to 'SimpleProcessor - Error Operation'
});
```

### Canary Deployment Example

```typescript
const canaryLambda = new ProgressiveLambda(this, 'RiskyFeature', {
  entry: 'src/handlers/new-feature.ts',
  stageName: 'prod',
  application,
  // Deploy 10% of traffic, wait 5 minutes, then proceed or rollback
  deploymentConfig: codeDeploy.LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
  alarmEnabled: true,
  snsTopic: alertTopic,
  namespace: 'MyApp',
  serviceName: 'NewFeature',
  metricErrorName: 'FeatureErrors',
  region: 'us-east-1',
  // Optional: Custom metric names and titles
  metricSuccessName: 'SuccessfulRequests',
  metricSuccessNameTitle: 'Successful Feature Requests',
  metricErrorNameTitle: 'Feature Processing Errors'
});
```

### Custom Alarm Configuration

```typescript
// Create progressive Lambda with custom alarm settings
const customAlarmLambda = new ProgressiveLambda(this, 'SensitiveProcessor', {
  entry: 'src/handlers/sensitive-processor.ts',
  stageName: 'prod',
  application,
  deploymentConfig: codeDeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
  alarmEnabled: true,
  snsTopic: alertTopic,
  namespace: 'CriticalApp',
  serviceName: 'SensitiveProcessor',
  metricErrorName: 'CriticalErrors',
  region: 'us-east-1',
  // Custom alarm configuration for more sensitive error detection
  alarmConfiguration: {
    threshold: 5,                                                    // Trigger on 5 errors instead of default 10
    evaluationPeriods: 2,                                          // Require 2 consecutive periods
    treatMissingData: cloudwatch.TreatMissingData.BREACHING        // Treat missing data as breaching
  }
});
```

### With Dashboard Widgets

```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

const lambda = new ProgressiveLambda(this, 'MonitoredFunction', {
  // ... other configuration
  createWidget: true  // Enable dashboard widgets
});

// Create dashboard and add widgets
const dashboard = new cloudwatch.Dashboard(this, 'MyDashboard', {
  dashboardName: 'Lambda-Monitoring'
});

dashboard.addWidgets(...lambda.widgets);
```

---

## Lambda Function Integration

Your Lambda function code should publish the specified success and error metrics to enable proper monitoring:

```typescript
import { CloudWatch } from 'aws-sdk';

const cloudwatch = new CloudWatch();

export const handler = async (event: any) => {
  try {
    // Your business logic here
    const result = await processOrder(event);

    // Publish success metric
    await cloudwatch.putMetricData({
      Namespace: 'ECommerce',
      MetricData: [{
        MetricName: 'ProcessedOrders',
        Value: 1,
        Dimensions: [{ Name: 'service', Value: 'OrderProcessor' }],
        Timestamp: new Date()
      }]
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    // Publish error metric
    await cloudwatch.putMetricData({
      Namespace: 'ECommerce',
      MetricData: [{
        MetricName: 'ProcessingErrors',
        Value: 1,
        Dimensions: [{ Name: 'service', Value: 'OrderProcessor' }],
        Timestamp: new Date()
      }]
    }).promise();

    throw error;
  }
};
```

---

## Configuration Reference

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `stageName` | `string` | Deployment stage (e.g., 'dev', 'prod') |
| `application` | `LambdaApplication` | CodeDeploy application for deployments |
| `deploymentConfig` | `ILambdaDeploymentConfig` | Traffic shifting strategy |
| `alarmEnabled` | `boolean` | Whether alarms trigger actions |
| `snsTopic` | `Topic` | SNS topic for notifications |
| `namespace` | `string` | CloudWatch metrics namespace |
| `serviceName` | `string` | Service dimension for metrics |
| `metricErrorName` | `string` | Name of error metric |
| `region` | `string` | AWS region for resources |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `createWidget` | `boolean` | `false` | Create CloudWatch dashboard widgets |
| `metricSuccessName` | `string` | `${id}-SuccessOperation` | Name of success metric |
| `metricSuccessNameTitle` | `string` | `${id} - Success Operation` | Display title for success metric |
| `metricErrorNameTitle` | `string` | `${id} - Error Operation` | Display title for error metric |
| `alarmConfiguration` | `object` | See defaults below | Custom CloudWatch alarm settings |
| `runtime` | `Runtime` | `NODEJS_22_X` | Lambda runtime version |
| `timeout` | `Duration` | `30 seconds` | Function timeout |
| `memorySize` | `number` | `256` | Memory allocation in MB |
| `tracing` | `Tracing` | `ACTIVE` | X-Ray tracing configuration |

#### Alarm Configuration Defaults

The `alarmConfiguration` object supports the following optional properties:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `threshold` | `number` | `10` | Number of errors to trigger alarm |
| `evaluationPeriods` | `number` | `1` | Number of consecutive periods to trigger |
| `treatMissingData` | `TreatMissingData` | `NOT_BREACHING` | How to handle missing metric data |

### Deployment Configurations

| Configuration | Description | Use Case |
|---------------|-------------|----------|
| `LINEAR_10PERCENT_EVERY_1MINUTE` | Shift 10% every minute | Gradual, safe deployments |
| `LINEAR_10PERCENT_EVERY_2MINUTES` | Shift 10% every 2 minutes | Conservative deployments |
| `CANARY_10PERCENT_5MINUTES` | 10% canary for 5 minutes | Validation before full rollout |
| `ALL_AT_ONCE` | Immediate blue/green switch | Fast deployments with instant rollback |

### Metric Name Defaults

When optional metric properties are not specified, the construct generates sensible defaults using the construct ID:

- **`metricSuccessName`**: Defaults to `${id}-SuccessOperation` (e.g., `OrderProcessor-SuccessOperation`)
- **`metricSuccessNameTitle`**: Defaults to `${id} - Success Operation` (e.g., `OrderProcessor - Success Operation`)
- **`metricErrorNameTitle`**: Defaults to `${id} - Error Operation` (e.g., `OrderProcessor - Error Operation`)

These defaults ensure that each Lambda function has unique metric names and descriptive titles without requiring explicit configuration for every deployment.

---

## Monitoring & Alerting

### Alarm Configuration

The construct creates a CloudWatch alarm with the following default settings:

- **Threshold**: 10 errors within 1 minute triggers alarm
- **Evaluation**: Single period for fast rollback response
- **Missing Data**: Treated as NOT_BREACHING to avoid false alarms
- **Actions**: SNS notification + automatic deployment rollback

These settings can be customized using the optional `alarmConfiguration` property:

```typescript
alarmConfiguration: {
  threshold: 5,                                                    // Lower threshold for critical services
  evaluationPeriods: 2,                                          // Require multiple periods to reduce false alarms
  treatMissingData: cloudwatch.TreatMissingData.BREACHING        // Change missing data behaviour
}
```

#### Common Alarm Configuration Patterns

- **Sensitive Services**: Lower threshold (3-5 errors) with single evaluation period
- **High-Traffic Services**: Higher threshold (15-20 errors) to account for normal error rates
- **Development Environments**: Multiple evaluation periods (2-3) to reduce noise
- **Critical Production**: Treat missing data as breaching to ensure monitoring coverage

### Dashboard Widgets (Optional)

When `createWidget: true`, three widgets are created:
1. **Success Metric Widget**: Shows successful operations count
2. **Error Metric Widget**: Shows error/failure count
3. **Alarm Status Widget**: Visual alarm state indicator

---

## Security Considerations

### SNS Topic SSL Enforcement

For security compliance (AwsSolutions-SNS3), configure your SNS topic to require SSL:

```typescript
import * as iam from 'aws-cdk-lib/aws-iam';

const topic = new sns.Topic(this, 'SecureTopic');

topic.addToResourcePolicy(new iam.PolicyStatement({
  effect: iam.Effect.DENY,
  principals: [new iam.AnyPrincipal()],
  actions: ['sns:Publish'],
  resources: [topic.topicArn],
  conditions: {
    Bool: { 'aws:SecureTransport': 'false' }
  }
}));
```

### CDK Nag Compliance

This construct is CDK Nag compliant with the following documented exceptions:
- **AwsSolutions-IAM4**: Uses AWS managed policies for standard Lambda execution roles
- **AwsSolutions-IAM5**: X-Ray tracing requires wildcard permissions for trace segments

---

---

## API Reference

### ProgressiveLambda Class

The main construct that creates a Lambda function with progressive deployment capabilities.

#### Public Properties

| Property | Type | Description |
|----------|------|-------------|
| `lambda` | `NodejsFunction` | The underlying Lambda function |
| `alias` | `Alias` | Lambda alias for traffic management |
| `alarm` | `Alarm` | CloudWatch alarm for error monitoring |
| `deploymentGroup` | `LambdaDeploymentGroup` | CodeDeploy deployment group |
| `widgets` | `ConcreteWidget[]` | Dashboard widgets (when enabled) |

#### Example Property Usage

```typescript
const progressiveLambda = new ProgressiveLambda(this, 'MyFunction', { /* config */ });

// Access the underlying Lambda function
progressiveLambda.lambda.addEnvironment('NEW_VAR', 'value');

// Get the deployment group for additional configuration
const deploymentGroup = progressiveLambda.deploymentGroup;

// Add widgets to a dashboard
if (progressiveLambda.widgets.length > 0) {
  dashboard.addWidgets(...progressiveLambda.widgets);
}
```

---

## Best Practices

### 1. Metric Publishing Strategy

- Publish metrics **synchronously** in critical paths to ensure accurate error tracking
- Use **dimensioned metrics** to enable filtering and aggregation
- Include **timestamp** for accurate time-series data

### 2. Deployment Configuration Selection

- **Linear**: Use for steady-state applications with predictable traffic
- **Canary**: Use for high-risk deployments or new features
- **All-at-once**: Use only for non-critical functions or when speed is essential

### 3. Alarm Tuning

- **Default threshold (10 errors/minute)** works well for most applications
- **Lower thresholds (3-5 errors)** for critical services requiring immediate attention
- **Higher thresholds (15-20 errors)** for high-traffic applications with expected error rates
- **Multiple evaluation periods** reduce false alarms but increase detection time
- **Test alarm sensitivity** in staging environments before production deployment
- **Consider missing data treatment** based on your monitoring requirements

### 4. Dashboard Organisation

- Group related Lambda functions in the same dashboard
- Use consistent naming conventions for metrics
- Include both technical and business metrics

---

## Troubleshooting

### Common Issues

#### Deployment Stuck in Progress

**Cause**: Alarm not receiving metric data or alarm threshold too sensitive.

**Solutions**:
- Verify your Lambda function is publishing the specified error metric
- Check CloudWatch Logs for metric publishing errors
- Temporarily disable alarms (`alarmEnabled: false`) for testing
- Review alarm threshold and evaluation period in `alarmConfiguration`
- Consider adjusting `treatMissingData` if metrics are intermittent

#### Automatic Rollbacks Occurring

**Cause**: Error threshold exceeded during deployment.

**Solutions**:
- Check CloudWatch metrics for actual error rates
- Review Lambda function logs for unexpected errors
- Validate that success metrics are being published correctly
- Consider adjusting alarm threshold using `alarmConfiguration.threshold`
- Increase `evaluationPeriods` to require sustained error rates before triggering

#### Missing Dashboard Widgets

**Cause**: `createWidget` not enabled or widgets not added to dashboard.

**Solutions**:
- Set `createWidget: true` in construct properties
- Add widgets to dashboard: `dashboard.addWidgets(...lambda.widgets)`
- Verify metrics are being published with correct namespace and dimensions

---

## Contributing

Please read [CONTRIBUTING.md](../../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.
