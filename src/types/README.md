# Types

This directory contains **TypeScript type definitions** and **enums** that provide type safety and consistency across the Cloud Blocks library and projects that consume it.

## Purpose

The types in this directory serve to:

- **Ensure type safety** across all constructs, utilities, and consuming applications
- **Standardize common patterns** like resource naming, tagging, and environment configuration
- **Provide consistent interfaces** for configuration objects and function parameters
- **Enable IntelliSense support** and better developer experience in IDEs
- **Enforce best practices** through well-defined type constraints
- **Facilitate code reuse** by providing shared type definitions

## Available Types

### Environment Types (`environments.ts`)
- **`Region`** - Enum mapping human-readable region names to AWS region codes (e.g., `dublin` → `eu-west-1`)
- **`Stage`** - Enum defining deployment stages (development, staging, production, etc.)
- Environment-related interfaces and types for consistent deployment patterns

### Resource Naming Types (`resource-name-types.ts`)
- **`ResourceNameParts`** - Interface defining the core components for generating AWS resource names
- **`ResourceNameOptions`** - Configuration options for resource name generation
- Standardized naming convention types following the pattern: `<stage>-<service>-<resource>`

### Tag Types (`tag-types.ts`)
- **`TagKey`** - Base type for tag keys (extensible for project-specific constraints)
- **`TagValue`** - Type definition for tag values
- **`Tags`** - Interface for key-value tag collections
- **`RequiredTags`** - Interface defining mandatory tags for compliance

## Usage

Import and use these types to ensure consistency across your CDK applications:

```typescript
import { Region, Stage, ResourceNameParts, Tags } from '@leighton-digital/cloud-blocks';

// Use in your constructs or utilities
const resourceConfig: ResourceNameParts = {
  stage: Stage.production,
  service: 'api',
  resource: 'gateway'
};

const tags: Tags = {
  Environment: Stage.production,
  Owner: 'platform-team'
};
```

These types are designed to work seamlessly with the constructs and utilities provided by Cloud Blocks, ensuring a consistent and type-safe development experience.
