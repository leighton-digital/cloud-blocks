# Constructs

This directory contains **AWS CDK constructs** - reusable infrastructure components that encapsulate AWS resources and their configurations to provide higher-level abstractions for common architectural patterns.

## Purpose

The constructs in this directory serve as **building blocks** for AWS CDK applications, providing:

- **Pre-configured AWS resources** with sensible defaults and best practices
- **Reusable components** that can be easily integrated into any CDK stack
- **Opinionated implementations** that promote security, observability, and maintainability
- **Reduced boilerplate** by abstracting complex resource configurations
- **Consistent patterns** across different infrastructure deployments

## Available Constructs

- **`api-gateway-cloudfront-distribution`** - Combines API Gateway with CloudFront distribution for optimized API delivery
- **`cloudwatch-dashboard`** - Pre-configured CloudWatch dashboard for monitoring and observability
- **`custom-stack`** - Base stack implementation with common configurations and best practices
- **`idempotency-table`** - DynamoDB table optimized for idempotency patterns in serverless applications
- **`progressive-lambda`** - Lambda function with progressive deployment capabilities
- **`rest-api`** - RESTful API implementation with common configurations and middleware

## Usage

Each construct is designed to be imported and used directly in your CDK applications:

```typescript
import { ApiGatewayCloudFrontDistribution } from '@leighton-digital/cloud-blocks';

// Use in your stack
const apiDistribution = new ApiGatewayCloudFrontDistribution(this, 'MyAPI', {
  // configuration options
});
```

For detailed documentation and usage examples for each construct, refer to the individual README files in each construct's directory.
