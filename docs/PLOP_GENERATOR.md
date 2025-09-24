# CDK Construct Generator

This project uses [Plop](https://plopjs.com/) to generate new CDK construct directories with a consistent structure and boilerplate code.

## Usage

To generate a new CDK construct, run:

```bash
pnpm generate construct
```

You will be prompted for:

1. **Construct name** (PascalCase, e.g., `ApiGatewayLambda`)
2. **Brief description** of the construct
3. **Author name** (defaults to "Leighton Digital")

## Generated Structure

The generator creates a complete construct package with the following structure:

```
src/
└── your-construct-name/
    ├── index.ts                      # Main export file
    ├── __docs__.ts                   # TypeDoc documentation inclusion
    ├── README.md                     # Comprehensive documentation
    ├── your-construct-name.ts        # Main construct implementation
    └── your-construct-name.test.ts   # Jest unit tests with CDK Nag

tests/test-project/lib/
└── your-construct-name-nested-stack.ts  # Test nested stack implementation
```

Additionally, the generator updates:
- `src/index.ts` - Adds export for the new construct
- `tests/test-project/lib/test-project-stack.ts` - Imports and instantiates the nested stack

## Generated Files

### `index.ts`
Exports the main construct class.

### `__docs__.ts`
TypeDoc package documentation that includes the README.md content.

### `README.md`
Comprehensive documentation including:
- Description and features
- Installation instructions
- Usage examples (basic and advanced)
- API reference
- Development and contributing guidelines

### `your-construct-name.ts`
Main construct implementation with:
- TypeScript interfaces for props with JSDoc comments
- Constructor validation for required properties
- Comprehensive JSDoc comments with usage examples
- Example implementation structure with placeholder properties
- Import statements for common CDK and external libraries
- CDK Nag suppression examples and comments
- Public readonly properties for construct outputs
- Proper error handling and validation patterns

### `your-construct-name.test.ts`
Complete Jest test suite with:
- Basic functionality tests (constructor validation, default values)
- CloudFormation template validation using CDK assertions
- CDK Nag compliance checks with proper setup and suppressions
- Edge case testing (empty values, invalid inputs)
- Proper test setup and teardown with beforeEach/afterEach
- Template resource counting and property validation
- Mock implementations for external dependencies
- Comprehensive test coverage patterns following project standards

### `your-construct-name-nested-stack.ts`
Test nested stack implementation with:
- CDK NestedStack extension following project patterns
- Import of the generated construct from the source directory
- Example configuration with placeholder values and TODO comments
- Public readonly property exposing the construct instance
- Structured layout matching the existing `api-distribution-nested-stack.ts`
- Ready for integration into the test project stack

## Automatic Updates

The generator automatically:
- Updates `src/index.ts` to export the new construct
- Creates nested test stack in `tests/test-project/lib/`
- Updates `tests/test-project/lib/test-project-stack.ts` to import and instantiate the nested stack
- Uses consistent naming conventions (PascalCase → kebab-case → camelCase)
- Applies project-specific templates and standards

## Template Customization

Templates are located in `plop-templates/` and use Handlebars syntax with custom helpers:

- `{{kebabCase name}}` - Converts PascalCase to kebab-case
- `{{pascalCase name}}` - Converts kebab-case to PascalCase
- `{{camelCase name}}` - Converts kebab-case to camelCase
- `{{titleCase name}}` - Converts PascalCase to "Title Case"

## Example

Running the generator:

```bash
$ pnpm generate construct
? Construct name (PascalCase, e.g., ApiGatewayLambda): EcsServiceWithLoadBalancer
? Brief description of the construct: An ECS service with Application Load Balancer and auto-scaling
? Author name: Leighton Digital

✔  ++ /src/ecs-service-with-load-balancer/index.ts
✔  ++ /src/ecs-service-with-load-balancer/__docs__.ts
✔  ++ /src/ecs-service-with-load-balancer/README.md
✔  ++ /src/ecs-service-with-load-balancer/ecs-service-with-load-balancer.ts
✔  ++ /src/ecs-service-with-load-balancer/ecs-service-with-load-balancer.test.ts
✔  ++ /tests/test-project/lib/ecs-service-with-load-balancer-nested-stack.ts
✔  +- /src/index.ts
✔  +- /tests/test-project/lib/test-project-stack.ts
```

This generates:
- Directory: `src/ecs-service-with-load-balancer/`
- Class: `EcsServiceWithLoadBalancer`
- Interface: `EcsServiceWithLoadBalancerProps`
- Test class: Comprehensive Jest tests with CDK Nag
- Nested test stack: `EcsServiceWithLoadBalancerNestedStack`
- Documentation: Complete README with examples and API reference

The generated construct is immediately available for import:

```typescript
import { EcsServiceWithLoadBalancer } from '@leighton-digital/cloud-blocks';

const service = new EcsServiceWithLoadBalancer(this, 'MyService', {
  requiredProperty: 'value',
  // ... other props
});
```

## Development

The Plop configuration is defined in `plopfile.js` in the project root. To modify the generator:

1. Edit `plopfile.js` for generator logic
2. Modify templates in `plop-templates/` for file content
3. Test with `pnpm generate construct`

## Best Practices

When creating new constructs:

1. Use descriptive PascalCase names (e.g., `ApiGatewayCloudFrontDistribution`)
2. Provide clear, concise descriptions
3. Follow the existing project patterns shown in `api-gateway-cloudfront-distribution/`
4. Add comprehensive tests and CDK Nag compliance
5. Update documentation as needed
