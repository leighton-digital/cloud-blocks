# Rest Api

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/leighton-digital/cloud-blocks/blob/main/LICENSE)
![Maintained](https://img.shields.io/maintenance/yes/2025)

The RestApi construct is a custom AWS CDK construct that streamlines the creation and configuration of API Gateway REST APIs. It provides stage-aware CORS settings, automatic CloudWatch logging, and regional endpoint configuration. The construct allows customization of API description, deployment options, and CORS behavior based on the deployment stage (e.g., ephemeral stages get permissive CORS). It also sets up access logging and tracing for enhanced observability and security. This construct is designed to simplify API Gateway setup while enforcing best practices for monitoring and access control.

---

## Features

* **Flexible Props Interface**: Extends `RestApiProps` allowing access to all AWS CDK RestApi properties while providing sensible defaults
* **Default Override System**: Comprehensive default configuration with easy override capabilities for any property
* **Stage-Aware CORS**: Automatically applies permissive CORS for staging environments, while requiring explicit configuration for production
* **Comprehensive Logging**: CloudWatch access logs, X-Ray tracing, and CloudWatch metrics enabled by default
* **Security Defaults**: Regional endpoints and disabled execute-api endpoints for enhanced security
* **Deployment Flexibility**: Configurable deployment options with intelligent merging of defaults and user overrides
* **Environment Flexibility**: Supports multiple deployment stages with consistent naming conventions
* **Cost Optimization**: 1-day log retention for development environments to minimize costs

---

## Usage

### Basic Example

```ts
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { RestApi } from '@leighton-digital/cloud-blocks';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create a basic REST API for development
    const api = new RestApi(this, 'MyApi', {
      stageName: 'dev',
      description: 'My Application API',
      deploy: true,
      isStagingEnvironment: true, // Enables permissive CORS
    });

    // Add resources and methods
    const users = api.api.root.addResource('users');
    users.addMethod('GET'); // Add your integration here
    users.addMethod('POST'); // Add your integration here
  }
}
```

### Advanced Configuration

```ts
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { RestApi } from '@leighton-digital/cloud-blocks';

export class ProductionApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Production API with strict CORS configuration
    const api = new RestApi(this, 'ProdApi', {
      stageName: 'prod',
      description: 'Production User Management API',
      deploy: true,
      defaultCorsPreflightOptions: {
        allowOrigins: ['https://myapp.com', 'https://admin.myapp.com'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
        allowCredentials: true,
      },
    });

    // Create Lambda functions (example)
    const getUsersFunction = new lambda.Function(this, 'GetUsers', {
      // ... lambda configuration
    });

    const createUserFunction = new lambda.Function(this, 'CreateUser', {
      // ... lambda configuration
    });

    // Add API resources and methods with Lambda integrations
    const users = api.api.root.addResource('users');
    users.addMethod('GET', new apigw.LambdaIntegration(getUsersFunction));
    users.addMethod('POST', new apigw.LambdaIntegration(createUserFunction));

    // Add nested resources
    const userById = users.addResource('{id}');
    userById.addMethod('GET', new apigw.LambdaIntegration(getUsersFunction));
    userById.addMethod('PUT', new apigw.LambdaIntegration(createUserFunction));
    userById.addMethod('DELETE', new apigw.LambdaIntegration(createUserFunction));
  }
}
```

### Deployment Options Customization

```ts
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { RestApi } from '@leighton-digital/cloud-blocks';

export class CustomDeploymentStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // API with custom deployment options
    const api = new RestApi(this, 'CustomApi', {
      stageName: 'prod',
      description: 'Production API with custom deployment settings',
      deploy: true,

      // Override specific deployment options while keeping defaults for others
      deployOptions: {
        loggingLevel: apigw.MethodLoggingLevel.ERROR, // Override: Only log errors
        stageName: 'production-v2', // Override: Custom stage name
        // tracingEnabled and metricsEnabled will use defaults (true)
      },

      // Override other default properties
      retainDeployments: true, // Override: Keep deployments for production
      cloudWatchRole: false, // Override: Disable CloudWatch role if using existing one
    });

    // Add your API resources
    const users = api.api.root.addResource('users');
    users.addMethod('GET');
  }
}
```

### Extending with Additional RestApi Properties

```ts
// The construct now supports all RestApiProps except 'description' and 'deploy'
const api = new RestApi(this, 'ExtendedApi', {
  stageName: 'prod',
  description: 'Extended API with additional properties',
  deploy: true,

  // Any RestApiProps can now be used
  policy: new iam.PolicyDocument({
    statements: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal('123456789012')],
        actions: ['execute-api:Invoke'],
        resources: ['*'],
      }),
    ],
  }),

  minCompressionSize: cdk.Size.kibibytes(1),
  binaryMediaTypes: ['image/*', 'application/octet-stream'],

  defaultCorsPreflightOptions: {
    allowOrigins: ['https://myapp.com'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowCredentials: true,
  },
});
```
```

---

## API Reference

### RestApi

The main construct class that creates and configures an AWS API Gateway REST API with best practices.

#### Constructor

```ts
constructor(scope: Construct, id: string, props: ApiProps)
```

Creates a new RestApi construct with comprehensive API Gateway configuration including CloudWatch logging, X-Ray tracing, and stage-aware CORS settings.

#### Properties

* `api: apigw.RestApi` - The underlying AWS API Gateway REST API instance. Use this to add resources, methods, and integrations.

#### ApiProps Interface

Configuration properties for the RestApi construct. The interface extends all `RestApiProps` except `description` and `deploy`, giving you access to the full AWS CDK RestApi configuration while providing intelligent defaults.

**Required Properties:**
* `stageName: string` - The stage name for API deployment (e.g., 'dev', 'staging', 'prod')
* `description: string` - Human-readable description of the API
* `deploy: boolean` - Whether to deploy the API immediately upon creation

**Optional Properties:**
* `isStagingEnvironment?: boolean` - Whether this is a staging/development environment (enables permissive CORS when true)
* `deployOptions?: DeploymentOptions` - Custom deployment options that will be merged with intelligent defaults
* **All other `RestApiProps`** - Any property from AWS CDK's RestApiProps can be used to override construct defaults

**Examples of commonly overridden properties:**
* `defaultCorsPreflightOptions` - Custom CORS configuration
* `retainDeployments` - Whether to retain API deployments (default: false)
* `cloudWatchRole` - Whether to create CloudWatch role (default: true)
* `disableExecuteApiEndpoint` - Whether to disable execute-api endpoint (default: true)
* `policy` - Resource policy for the API
* `minCompressionSize` - Minimum response compression size
* `binaryMediaTypes` - Binary media types for the API

#### Default Configuration

The construct provides intelligent defaults that can be overridden by any corresponding property in your configuration:

**Default RestApi Properties:**
* **Regional endpoint** for better performance and security
* **CloudWatch role enabled** for audit logging
* **Execute API endpoint disabled** for enhanced security
* **Retain deployments disabled** for cost optimization
* **Structured naming** following `${constructId}-api-${stageName}` pattern

**Default Deployment Options (when `deploy: true`):**
* **Stage name** matches the `stageName` property
* **CloudWatch logging** with INFO level for comprehensive monitoring
* **AWS X-Ray tracing enabled** for request tracking and debugging
* **CloudWatch metrics enabled** for monitoring API performance
* **Access logs** to CloudWatch with 1-day retention for cost optimization

**Default CORS Behavior:**
* **Production environments**: No CORS unless explicitly configured via `defaultCorsPreflightOptions`
* **Staging environments** (when `isStagingEnvironment: true`): Permissive CORS for development convenience
  - Allow all origins (`*`)
  - Allow credentials
  - Allow common HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS)
  - Allow all headers (`*`)

**Override Mechanism:**
Any property you provide will override the corresponding default. The construct uses intelligent merging for nested objects like `deployOptions`, allowing you to override specific settings while keeping others as defaults.

#### Deployment Options Merging

When you provide `deployOptions`, the construct intelligently merges your settings with the defaults:

```ts
// Example: Override only logging level, keep other defaults
const api = new RestApi(this, 'MyApi', {
  stageName: 'prod',
  description: 'My API',
  deploy: true,
  deployOptions: {
    loggingLevel: apigw.MethodLoggingLevel.ERROR, // Override
    // stageName, tracingEnabled, metricsEnabled, accessLogDestination use defaults
  },
});

// Result:
// - loggingLevel: ERROR (your override)
// - stageName: 'prod' (from stageName prop)
// - tracingEnabled: true (default)
// - metricsEnabled: true (default)
// - accessLogDestination: CloudWatch log group (default)
```

#### Security Features

* Regional endpoints only (no edge-optimized endpoints)
* Execute API endpoint disabled by default
* CloudWatch role automatically created for audit logging
* Structured naming conventions for resource identification

---

## Contributing

Please read [CONTRIBUTING.md](../../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.
