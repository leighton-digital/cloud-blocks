# Custom Stack

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/leighton-digital/cloud-blocks/blob/main/LICENSE)
![Maintained](https://img.shields.io/maintenance/yes/2025)

A reusable **CDK Stack** with optional **CloudWatch Dashboard** integration and comprehensive widget management, complete with:

* **Optional dashboard creation** with sensible defaults
* **Widget registry** that tracks all monitoring components across stack lifecycle
* **Flexible configuration** allowing all stack and dashboard properties to be customized
* **Auto-generated naming** with intelligent defaults derived from stack context
* **Lifecycle management** with configurable removal policies
* **Direct inheritance** from CDK Stack - no wrapper needed
* **TypeScript-first** design with comprehensive type safety
* **cdk-nag** compliance out of the box
* Jest unit tests with comprehensive CloudFormation template validation

---

## Features

* **Stack Foundation**: CDK Stack with enhanced monitoring capabilities:
  * Optional CloudWatch dashboard creation via `createDashboard` prop
  * Widget registry maintains all added widgets regardless of dashboard state
  * Intelligent default naming based on stack logical ID
  * Standard CDK Stack inheritance with all native methods available
* **Dashboard Integration**: Built on `CloudWatchDashboard` construct with:
  * Auto-generated dashboard names (e.g., `MyAPIStack` → `my-api-stack-dashboard`)
  * Descriptive text widget automatically added to dashboard top
  * Support for initial widgets during construction
  * Configurable removal policies for environment-specific lifecycle management
* **Widget Management**: Comprehensive tracking and manipulation:
  * `addWidget()` and `addWidgets()` methods for flexible widget addition
  * Widget registry persists all widgets even without dashboard
  * Safe widget access with immutable returns
  * Dashboard integration automatically handles widget addition when enabled
* **Configuration**: Full customization of both stack and dashboard properties:
  * All `cdk.StackProps` are supported and passed through
  * Dashboard name, description, and removal policy customization
  * Initial widgets can be provided during construction
  * Intelligent defaults reduce boilerplate while allowing full control

---

## Usage

### Basic Stack Without Dashboard

```ts
import * as cdk from 'aws-cdk-lib';
import { CustomStack } from '@leighton-digital/cloud-blocks';

const app = new cdk.App();

// Simple stack - dashboard creation disabled by default
const basicStack = new CustomStack(app, 'BasicApplicationStack', {
  description: 'Basic application infrastructure without monitoring dashboard',
  env: {
    region: 'us-east-1',
    account: '123456789012',
  },
});

// Widgets are still tracked even without dashboard
basicStack.addWidget(
  new cloudwatch.GraphWidget({
    title: 'API Request Rate',
    left: [apiRequestMetric],
    width: 12,
    height: 6,
  })
);

// Can retrieve widgets later for custom dashboard creation
const trackedWidgets = basicStack.getWidgets();
console.log(`Stack has ${trackedWidgets.length} widgets tracked`);
```

### Stack With Dashboard and Auto-Generated Names

```ts
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { CustomStack } from '@leighton-digital/cloud-blocks';

const app = new cdk.App();

// Dashboard automatically created with intelligent naming
const monitoredStack = new CustomStack(app, 'ProductionAPIStack', {
  description: 'Production API infrastructure with monitoring',
  createDashboard: true, // Creates 'production-api-stack-dashboard'
  env: { region: 'us-east-1' },
});

// Widgets automatically added to both registry and dashboard
monitoredStack.addWidget(
  new cloudwatch.GraphWidget({
    title: 'Request Volume',
    left: [requestVolumeMetric],
    width: 12,
    height: 6,
  })
);

// Multiple widgets at once
monitoredStack.addWidgets([
  new cloudwatch.GraphWidget({
    title: 'Error Rate',
    left: [errorRateMetric],
    width: 12,
    height: 6,
  }),
  new cloudwatch.SingleValueWidget({
    title: 'Current TPS',
    metrics: [tpsMetric],
    width: 12,
    height: 6,
  }),
]);
```

### Advanced Configuration with Custom Dashboard Properties

```ts
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { CustomStack } from '@leighton-digital/cloud-blocks';

const app = new cdk.App();

// Initial widgets for dashboard
const errorRateWidget = new cloudwatch.GraphWidget({
  title: 'Error Rate Trends',
  left: [error4xxMetric, error5xxMetric],
  width: 12,
  height: 6,
  period: cdk.Duration.minutes(5),
});

const latencyWidget = new cloudwatch.GraphWidget({
  title: 'Response Latency',
  left: [latencyP50, latencyP95, latencyP99],
  width: 12,
  height: 6,
  period: cdk.Duration.minutes(5),
});

const comprehensiveStack = new CustomStack(app, 'ComprehensiveMonitoringStack', {
  description: 'Production stack with comprehensive monitoring and alerting',

  // Stack-level configuration
  env: { region: 'us-east-1', account: '123456789012' },
  terminationProtection: true,
  tags: {
    Environment: 'production',
    Team: 'platform',
    CostCenter: 'engineering',
  },

  // Dashboard configuration
  createDashboard: true,
  dashboardName: 'production-comprehensive-monitoring',
  dashboardDescription: `# Production System Monitoring

## 📊 Key Performance Indicators
- **Availability**: > 99.9% uptime SLA
- **Response Time**: P95 < 500ms
- **Error Rate**: < 0.1% target

## 🚨 Alert Configuration
- Critical alerts: Pager notifications
- Warning alerts: Slack notifications
- Info alerts: Email notifications

## 📞 On-Call Information
- **Primary**: platform-team@company.com
- **Escalation**: engineering-managers@company.com
- **Runbooks**: https://wiki.company.com/runbooks/api

## 📈 Dashboard Sections
1. **Traffic Patterns** - Request volume and user behavior
2. **Performance Metrics** - Latency and throughput analysis
3. **Error Analysis** - Error rates and failure investigation
4. **Infrastructure Health** - Resource utilization and capacity`,

  initialWidgets: [errorRateWidget, latencyWidget],
  dashboardRemovalPolicy: cdk.RemovalPolicy.RETAIN, // Preserve in production
});

// Add infrastructure monitoring widgets
comprehensiveStack.addWidgets([
  new cloudwatch.GraphWidget({
    title: 'Infrastructure CPU Utilization',
    left: [cpuUtilizationMetric],
    width: 8,
    height: 6,
  }),
  new cloudwatch.GraphWidget({
    title: 'Memory Usage',
    left: [memoryUsageMetric],
    width: 8,
    height: 6,
  }),
  new cloudwatch.GraphWidget({
    title: 'Network I/O',
    left: [networkInMetric, networkOutMetric],
    width: 8,
    height: 6,
  }),
]);

// Direct dashboard access for advanced configuration
const dashboard = comprehensiveStack.getDashboard();
dashboard.addWidgets(
  new cloudwatch.LogQueryWidget({
    title: 'Recent Error Logs',
    logGroups: [apiLogGroup],
    width: 24,
    height: 6,
    queryLines: [
      'fields @timestamp, @message',
      'filter @message like /ERROR/',
      'sort @timestamp desc',
      'limit 100',
    ],
  })
);
```

### Integration with Application Resources

```ts
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { CustomStack } from '@leighton-digital/cloud-blocks';

export class ApplicationStack extends CustomStack {
  public readonly api: apigateway.RestApi;
  public readonly handler: lambda.Function;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      createDashboard: true,
      dashboardDescription: 'Monitoring dashboard for serverless API application',
    });

    // Create application resources
    this.handler = new lambda.Function(this, 'ApiHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
    });

    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: 'serverless-api',
      defaultIntegration: new apigateway.LambdaIntegration(this.handler),
    });

    // Add monitoring widgets for the resources we created
    this.setupMonitoring();
  }

  private setupMonitoring(): void {
    // API Gateway metrics
    this.addWidgets([
      new cloudwatch.GraphWidget({
        title: 'API Request Volume',
        left: [this.api.metricCount()],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Latency',
        left: [this.api.metricLatency()],
        width: 12,
        height: 6,
      }),
    ]);

    // Lambda function metrics
    this.addWidgets([
      new cloudwatch.GraphWidget({
        title: 'Lambda Duration',
        left: [this.handler.metricDuration()],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Errors',
        left: [this.handler.metricErrors()],
        width: 12,
        height: 6,
      }),
    ]);

    // Combined error rate widget
    this.addWidget(
      new cloudwatch.GraphWidget({
        title: 'Overall Error Rates',
        left: [
          this.api.metricClientError(),
          this.api.metricServerError(),
          this.handler.metricErrors(),
        ],
        width: 24,
        height: 6,
        yAxis: { min: 0 },
      })
    );
  }
}

// Usage
const app = new cdk.App();
new ApplicationStack(app, 'MyApplicationStack', {
  env: { region: 'us-east-1' },
});
```

### Multi-Environment Deployment Pattern

```ts
import * as cdk from 'aws-cdk-lib';
import { CustomStack } from '@leighton-digital/cloud-blocks';

interface EnvironmentConfig {
  dashboardEnabled: boolean;
  dashboardRetention: cdk.RemovalPolicy;
  terminationProtection: boolean;
}

const environments: Record<string, EnvironmentConfig> = {
  dev: {
    dashboardEnabled: false, // Reduce costs in dev
    dashboardRetention: cdk.RemovalPolicy.DESTROY,
    terminationProtection: false,
  },
  staging: {
    dashboardEnabled: true,
    dashboardRetention: cdk.RemovalPolicy.DESTROY,
    terminationProtection: false,
  },
  prod: {
    dashboardEnabled: true,
    dashboardRetention: cdk.RemovalPolicy.RETAIN, // Preserve monitoring data
    terminationProtection: true,
  },
};

function createEnvironmentStack(app: cdk.App, env: string): CustomStack {
  const config = environments[env];

  return new CustomStack(app, `MyApp${env.charAt(0).toUpperCase() + env.slice(1)}Stack`, {
    description: `My application infrastructure for ${env} environment`,
    env: {
      region: process.env.CDK_DEFAULT_REGION,
      account: process.env.CDK_DEFAULT_ACCOUNT,
    },
    terminationProtection: config.terminationProtection,
    createDashboard: config.dashboardEnabled,
    dashboardRemovalPolicy: config.dashboardRetention,
    tags: {
      Environment: env,
      Application: 'my-app',
    },
  });
}

const app = new cdk.App();
const targetEnv = app.node.tryGetContext('environment') || 'dev';

const stack = createEnvironmentStack(app, targetEnv);
// Add environment-specific resources and monitoring...
```

---

## Props

All props are inherited from the [CDK Stack](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.StackProps.html), with the following additional dashboard-related properties:

| Prop                        | Type                          | Required | Default                                     | Notes                                                    |
| --------------------------- | ----------------------------- | :------: | ------------------------------------------- | -------------------------------------------------------- |
| `createDashboard`           | `boolean`                     |    ❌     | `false`                                     | Whether to create a CloudWatch dashboard for this stack |
| `dashboardName`             | `string`                      |    ❌     | Auto-generated from stack ID                | Name for the CloudWatch dashboard                       |
| `dashboardDescription`      | `string`                      |    ❌     | Auto-generated from stack context           | Descriptive text displayed at top of dashboard          |
| `initialWidgets`            | `cloudwatch.IWidget[]`        |    ❌     | `[]`                                        | Widgets to add during dashboard construction             |
| `dashboardRemovalPolicy`    | `cdk.RemovalPolicy`           |    ❌     | `cdk.RemovalPolicy.DESTROY`                 | Policy for dashboard removal when stack is deleted      |

### Dashboard Naming Convention

The stack automatically generates dashboard names from the stack logical ID using the following convention:

- `MyAPIStack` → `my-api-stack-dashboard`
- `ProductionWebAppStack` → `production-web-app-stack-dashboard`
- `SimpleStack` → `simple-stack-dashboard`

This ensures consistent, predictable dashboard naming across environments while allowing full customization when needed.

---

## Methods

### Widget Management

| Method                          | Description                                      | Returns                    |
| ------------------------------- | ------------------------------------------------ | -------------------------- |
| `addWidget(widget)`             | Add a single widget to registry and dashboard   | `void`                     |
| `addWidgets(widgets[])`         | Add multiple widgets to registry and dashboard  | `void`                     |
| `getWidgets()`                  | Get all widgets added to this stack             | `cloudwatch.IWidget[]`     |

### Dashboard Access

| Method            | Description                                   | Returns              | Throws                          |
| ----------------- | --------------------------------------------- | -------------------- | ------------------------------- |
| `getDashboard()`  | Get the CloudWatch dashboard if created      | `CloudWatchDashboard`| Error if dashboard not enabled  |

### Properties

| Property              | Type                      | Description                                    |
| --------------------- | ------------------------- | ---------------------------------------------- |
| `dashboard`           | `CloudWatchDashboard?`    | The dashboard instance (if created)           |
| `widgets`             | `cloudwatch.IWidget[]`    | Read-only array of all added widgets          |
| `isDashboardEnabled`  | `boolean`                 | Whether dashboard creation is enabled          |

---

## What gets created

When `createDashboard: true`:

* **CloudWatch Dashboard**: `${stackId}Dashboard`
  * Auto-generated name: `${kebab-case-stack-id}-dashboard`
  * Description text widget with stack context
  * Any initial widgets specified in props
  * All widgets added via `addWidget()` and `addWidgets()`
  * Configurable removal policy (defaults to DESTROY for easy cleanup)

When `createDashboard: false` (default):

* **Widget Registry**: Internal tracking only
  * All widgets added via methods are tracked
  * Can be retrieved with `getWidgets()` for later dashboard creation
  * No CloudWatch resources created

---

## Stack Lifecycle Management

### Development Environments

```ts
const devStack = new CustomStack(app, 'DevStack', {
  createDashboard: false, // Save costs
  description: 'Development environment - monitoring disabled',
});

// Widgets still tracked for debugging
devStack.addWidget(debugWidget);
console.log(`Dev stack tracking ${devStack.getWidgets().length} widgets`);
```

### Staging Environments

```ts
const stagingStack = new CustomStack(app, 'StagingStack', {
  createDashboard: true,
  dashboardRemovalPolicy: cdk.RemovalPolicy.DESTROY, // Clean slate on redeploy
  description: 'Staging environment with temporary monitoring',
});
```

### Production Environments

```ts
const prodStack = new CustomStack(app, 'ProdStack', {
  createDashboard: true,
  dashboardRemovalPolicy: cdk.RemovalPolicy.RETAIN, // Preserve monitoring history
  terminationProtection: true, // Prevent accidental deletion
  description: 'Production environment with persistent monitoring',
});
```

### Cross-Stack Dashboard Creation

```ts
// Stack without dashboard
const appStack = new CustomStack(app, 'ApplicationStack', {
  createDashboard: false,
});

// Add monitoring widgets throughout application construction
appStack.addWidget(apiWidget);
appStack.addWidget(databaseWidget);

// Separate monitoring stack with consolidated dashboard
const monitoringStack = new CustomStack(app, 'MonitoringStack', {
  createDashboard: true,
  dashboardName: 'centralized-application-monitoring',
  dashboardDescription: 'Centralized monitoring for all application components',
});

// Transfer widgets from application stack to monitoring stack
const appWidgets = appStack.getWidgets();
monitoringStack.addWidgets(appWidgets);
```

---

## Operational notes & caveats

* **Dashboard Creation**: Dashboards are only created when `createDashboard: true`. Widget tracking occurs regardless of dashboard state.
* **Widget Registry**: The `widgets` array contains only widgets added via `addWidget()` and `addWidgets()` methods. Initial widgets go directly to the dashboard.
* **Naming Conventions**: Auto-generated dashboard names use kebab-case conversion. Complex PascalCase IDs may result in verbose names.
* **Removal Policies**: Use `RemovalPolicy.RETAIN` in production to preserve monitoring history. Default `DESTROY` policy enables clean teardown in development.
* **Cross-Region Considerations**: Dashboard and metrics must be in the same region. Ensure stack region matches your monitoring requirements.
* **Performance**: Large numbers of widgets can impact dashboard load times. Consider breaking up dashboards with 50+ widgets.
* **Access Control**: Dashboard access follows CloudWatch IAM permissions. Ensure appropriate policies for team access.

---

## Extending

### Custom Widget Types

```ts
// Custom alarm widget factory
function createAlarmWidget(alarm: cloudwatch.Alarm): cloudwatch.AlarmWidget {
  return new cloudwatch.AlarmWidget({
    title: alarm.alarmName,
    alarm,
    width: 6,
    height: 6,
  });
}

// Add custom widgets to stack
stack.addWidget(createAlarmWidget(criticalAlarm));
```

### Dashboard Themes and Layouts

```ts
// Create themed dashboard sections
class MonitoringTheme {
  static createErrorSection(metrics: cloudwatch.Metric[]): cloudwatch.IWidget[] {
    return [
      new cloudwatch.GraphWidget({
        title: '🚨 Error Rates',
        left: metrics,
        width: 24,
        height: 6,
        yAxis: { min: 0, max: 10 },
      }),
    ];
  }

  static createPerformanceSection(metrics: cloudwatch.Metric[]): cloudwatch.IWidget[] {
    return [
      new cloudwatch.GraphWidget({
        title: '⚡ Performance Metrics',
        left: metrics,
        width: 24,
        height: 6,
      }),
    ];
  }
}

// Apply themed sections
stack.addWidgets(MonitoringTheme.createErrorSection([errorMetric]));
stack.addWidgets(MonitoringTheme.createPerformanceSection([latencyMetric]));
```

### Multi-Stack Monitoring

```ts
// Central monitoring stack pattern
export class MonitoringStack extends CustomStack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      createDashboard: true,
      dashboardName: 'enterprise-monitoring',
      dashboardDescription: 'Enterprise-wide application monitoring',
    });
  }

  public addApplicationWidgets(appStack: CustomStack): void {
    const widgets = appStack.getWidgets();
    this.addWidgets(widgets);
  }
}
```

---

## Troubleshooting

* **"Dashboard access requested but createDashboard is false"** → Set `createDashboard: true` in props to enable dashboard creation.
* **"Dashboard should exist when createDashboard is true"** → Internal error during construction. Check for conflicting stack modifications.
* **"Widgets not appearing in dashboard"** → Verify widgets are added via `addWidget()` or `addWidgets()` methods after stack construction.
* **"Dashboard name conflicts"** → Customize `dashboardName` prop to avoid conflicts with existing dashboards.
* **"Cross-region metric errors"** → Ensure dashboard and metrics are in the same AWS region.
* **"Performance issues with dashboard"** → Reduce widget count or optimize metric queries. Consider splitting into multiple dashboards.
* **"IAM permission errors"** → Verify CloudWatch dashboard permissions in IAM policies for dashboard access.

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

---

<img src="https://github.com/leighton-digital/cloud-blocks/blob/main/images/leighton-logo.svg" width="200" />
