# CDK Aspects

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/leighton-digital/cdk-ts-core-temp/blob/main/LICENSE)
![Maintained](https://img.shields.io/maintenance/yes/2025)

A collection of **AWS CDK Aspects** for **infrastructure compliance and tagging enforcement**, featuring:

* **Tag validation** through the `RequiredTagsChecker` aspect
* **Automated tagging** with the `addTagsToStack` utility function
* **Policy enforcement** at CDK synthesis time
* **Flexible configuration** supporting organisation-specific tagging requirements
* **Error annotations** for missing or incorrect tag configurations
* **Type-safe tag definitions** with TypeScript support

## Features

* **RequiredTagsChecker Aspect**:
  * Validates presence of mandatory tags on CDK stacks
  * Ensures stacks have at least one tag applied
  * Generates synthesis-time errors for missing required tags
  * Supports custom required tag lists per organisation
* **Tag Management Utilities**:
  * `addTagsToStack()` - Bulk apply tags to CDK stacks
  * Type-safe tag key/value definitions
  * Consistent tagging patterns across infrastructure
* **Compliance**: Enforce organizational tagging policies at build time
* **Flexibility**: Configurable required tags to match your governance requirements
* **Integration**: Works seamlessly with existing CDK constructs and stacks

## Usage

### Basic Tag Validation

```ts
import { App, Stack } from 'aws-cdk-lib';
import { Aspects } from 'aws-cdk-lib';
import { RequiredTagsChecker } from '@leighton-digital/cdk-ts-core/aspects';

const app = new App();
const stack = new Stack(app, 'MyStack');

// Define required tags for your organisation
const requiredTags = ['Environment', 'Owner', 'Project', 'CostCenter'];

// Apply the aspect to enforce tagging policy
Aspects.of(app).add(new RequiredTagsChecker(requiredTags));

// This will cause a synthesis error if any required tags are missing
```

### Adding Tags to Stacks

```ts
import { App, Stack } from 'aws-cdk-lib';
import { addTagsToStack } from '@leighton-digital/cdk-ts-core/aspects';

const app = new App();
const stack = new Stack(app, 'MyStack');

// Define your tags
const commonTags = {
  Environment: 'production',
  Owner: 'platform-team',
  Project: 'customer-portal',
  CostCenter: 'engineering',
  ManagedBy: 'cdk',
};

// Apply tags to the stack
addTagsToStack(stack, commonTags);
```

### Complete Example with Validation

```ts
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Aspects } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
  addTagsToStack,
  RequiredTagsChecker
} from '@leighton-digital/cdk-ts-core/aspects';
import type { Tags } from '@leighton-digital/cdk-ts-core/types';

// Define organisation-wide required tags
const organizationRequiredTags = [
  'Environment',
  'Owner',
  'Project',
  'CostCenter',
  'DataClassification'
];

// Define common tags for this application
const applicationTags: Tags = {
  Environment: 'production',
  Owner: 'platform-team',
  Project: 'customer-portal',
  CostCenter: 'engineering',
  DataClassification: 'confidential',
  Application: 'web-api',
  Version: '1.2.0',
};

class MyApplicationStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    // Apply standard tags to this stack
    addTagsToStack(this, applicationTags);

    // Create some resources - they will inherit the stack tags
    new Bucket(this, 'DataBucket', {
      bucketName: 'my-app-data-bucket',
    });
  }
}

const app = new App();

// Create the stack
new MyApplicationStack(app, 'CustomerPortalStack');

// Apply tag validation to the entire app
Aspects.of(app).add(new RequiredTagsChecker(organizationRequiredTags));

// Synthesize the app - will fail if required tags are missing
app.synth();
```

### Environment-Specific Tagging

```ts
import { App, Stack } from 'aws-cdk-lib';
import { addTagsToStack } from '@leighton-digital/cdk-ts-core/aspects';
import { getStage } from '@leighton-digital/cdk-ts-core/infra';

function createEnvironmentTags(stage: string): Tags {
  const baseTags = {
    Owner: 'platform-team',
    Project: 'customer-portal',
    ManagedBy: 'cdk',
  };

  switch (stage) {
    case 'dev':
      return {
        ...baseTags,
        Environment: 'development',
        CostCenter: 'development',
        DataClassification: 'internal',
        AutoShutdown: 'true',
      };
    case 'staging':
      return {
        ...baseTags,
        Environment: 'staging',
        CostCenter: 'engineering',
        DataClassification: 'internal',
        AutoShutdown: 'false',
      };
    case 'prod':
      return {
        ...baseTags,
        Environment: 'production',
        CostCenter: 'engineering',
        DataClassification: 'confidential',
        AutoShutdown: 'false',
        BackupRequired: 'true',
      };
    default:
      throw new Error(`Unknown stage: ${stage}`);
  }
}

const app = new App();
const stage = getStage(app);
const stack = new Stack(app, `MyStack-${stage}`);

// Apply environment-specific tags
const environmentTags = createEnvironmentTags(stage);
addTagsToStack(stack, environmentTags);
```

### Multi-Stack Application with Shared Tags

```ts
import { App, Stack } from 'aws-cdk-lib';
import { Aspects } from 'aws-cdk-lib';
import {
  addTagsToStack,
  RequiredTagsChecker
} from '@leighton-digital/cdk-ts-core/aspects';

class DatabaseStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id);

    // Stack-specific tags
    addTagsToStack(this, {
      Component: 'database',
      DataRetention: '7years',
      BackupSchedule: 'daily',
    });
  }
}

class ApiStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id);

    // Stack-specific tags
    addTagsToStack(this, {
      Component: 'api',
      Scaling: 'auto',
      LoadBalanced: 'true',
    });
  }
}

const app = new App();

// Shared tags across all stacks
const sharedTags = {
  Environment: 'production',
  Owner: 'platform-team',
  Project: 'e-commerce',
  CostCenter: 'engineering',
};

// Create stacks
const dbStack = new DatabaseStack(app, 'DatabaseStack');
const apiStack = new ApiStack(app, 'ApiStack');

// Apply shared tags to all stacks
addTagsToStack(dbStack, sharedTags);
addTagsToStack(apiStack, sharedTags);

// Enforce required tags across the entire application
const requiredTags = ['Environment', 'Owner', 'Project', 'CostCenter', 'Component'];
Aspects.of(app).add(new RequiredTagsChecker(requiredTags));
```

## Tag Types

### TagKey and TagValue

```ts
// Basic tag types
export type TagKey = string;
export type TagValue = string;

// Individual tag
export interface Tag {
  key: TagKey;
  value: TagValue;
}
```

### Tags Map

```ts
// Multiple tags as key/value pairs
export type Tags = Record<TagKey, TagValue>;

const myTags: Tags = {
  Environment: 'production',
  Owner: 'team-alpha',
  Project: 'web-portal',
};
```

### Required Tags

```ts
// List of mandatory tag keys
export type RequiredTags = TagKey[];

const organizationRequiredTags: RequiredTags = [
  'Environment',
  'Owner',
  'Project',
  'CostCenter',
  'DataClassification'
];
```

## Organizational Tagging Patterns

### Standard Tag Categories

```ts
// Operational tags
const operationalTags = {
  Environment: 'production',     // dev, staging, prod
  Owner: 'platform-team',        // Responsible team/person
  ManagedBy: 'cdk',             // How resource is managed
};

// Business tags
const businessTags = {
  Project: 'customer-portal',    // Business project
  CostCenter: 'engineering',     // Billing/cost allocation
  Application: 'web-api',        // Application name
};

// Security tags
const securityTags = {
  DataClassification: 'confidential', // public, internal, confidential, restricted
  Compliance: 'sox',                  // Regulatory requirements
  BackupRequired: 'true',             // Backup policy
};

// Operational tags
const automationTags = {
  AutoShutdown: 'false',        // Automated shutdown policy
  Monitoring: 'enabled',         // Monitoring configuration
  Scaling: 'auto',              // Scaling policy
};
```

### Best Practices

```ts
// Create reusable tag factories
export function createStandardTags(
  environment: string,
  owner: string,
  project: string,
  additionalTags: Tags = {}
): Tags {
  return {
    Environment: environment,
    Owner: owner,
    Project: project,
    ManagedBy: 'cdk',
    CreatedDate: new Date().toISOString().split('T')[0],
    ...additionalTags,
  };
}

// Usage
const prodTags = createStandardTags('production', 'platform-team', 'customer-portal', {
  CostCenter: 'engineering',
  DataClassification: 'confidential',
});
```

## Error Handling and Validation

### Synthesis-Time Validation

When required tags are missing, the CDK synthesis will fail with clear error messages:

```bash
# Example error output
[ERROR] There are no tags on "MyStack"
[ERROR] "Environment" is missing from stack with id "MyStack"
[ERROR] "Owner" is missing from stack with id "MyStack"
[ERROR] "Project" is missing from stack with id "MyStack"
```

### Common Validation Scenarios

The `RequiredTagsChecker` validates:

1. **No tags present**: Ensures stacks have at least one tag
2. **Missing required tags**: Checks all mandatory tags are present
3. **Stack-level validation**: Only validates CDK stacks, ignores other constructs

## What gets created

### Aspect Behaviour
* **RequiredTagsChecker**:
  * Visits all constructs during CDK synthesis
  * Validates only `Stack` constructs
  * Adds error annotations for missing tags
  * Causes synthesis to fail if validation fails

### Tag Application
* **addTagsToStack**:
  * Applies tags using `cdk.Tags.of(stack).add()`
  * Tags propagate to all child resources by default
  * Supports tag inheritance and overrides

## Integration with CDK

### Tag Inheritance

CDK tags applied to stacks automatically propagate to child resources:

```ts
// Tags applied to stack will appear on the bucket
addTagsToStack(stack, { Environment: 'prod' });

new Bucket(stack, 'MyBucket', {
  // This bucket will have Environment=prod tag
  bucketName: 'my-bucket',
});
```

### Tag Overrides

Child resources can override inherited tags:

```ts
addTagsToStack(stack, { Environment: 'prod' });

new Bucket(stack, 'DevBucket', {
  bucketName: 'dev-bucket',
});

// Override the Environment tag for this specific bucket
Tags.of(bucket).add('Environment', 'development');
```

## Operational notes & caveats

* **Synthesis-time validation**: Tag validation occurs during `cdk synth`, not at runtime
* **Stack-only validation**: The aspect only validates CDK Stack constructs, not individual resources
* **Tag propagation**: Tags applied to stacks automatically propagate to child resources unless overridden
* **Case sensitivity**: Tag keys and values are case-sensitive
* **AWS limits**: AWS has limits on number of tags (50 per resource) and tag key/value length (128/256 characters)
* **Cost implications**: Tags are used for cost allocation and billing - ensure consistent tagging for accurate cost tracking

## Troubleshooting

* **"There are no tags on [StackName]"** → Apply tags using `addTagsToStack()` or CDK's `Tags.of(stack).add()`
* **"[TagKey] is missing from stack"** → Add the missing required tag to your stack's tag configuration
* **Synthesis fails with tag errors** → Review the error messages and ensure all required tags are present
* **Tags not appearing on resources** → Verify tags are applied to the stack, not just individual constructs
* **Tag inheritance issues** → Check that child constructs haven't overridden inherited tags

## Best Practices

1. **Define organisation-wide required tags** early in your CDK adoption
2. **Use tag factories** for consistent tag application across projects
3. **Apply aspects at the App level** to enforce policies across all stacks
4. **Include cost allocation tags** for accurate billing and cost tracking
5. **Use environment-specific tag values** for proper resource classification
6. **Document your tagging strategy** for team consistency
7. **Validate tags in CI/CD** by running `cdk synth` in your deployment pipeline

<img src="https://github.com/leighton-digital/cdk-ts-core-temp/blob/main/images/leighton-logo.svg" width="200" />
