module.exports = (plop) => {
  // Helper to convert camelCase/PascalCase to kebab-case
  plop.setHelper('kebabCase', (text) => {
    return text
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  });

  // Helper to convert kebab-case to PascalCase
  plop.setHelper('pascalCase', (text) => {
    return text
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  });

  // Helper to convert kebab-case to camelCase
  plop.setHelper('camelCase', (text) => {
    const pascalCase = text
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
  });

  // Helper to convert PascalCase to title case with spaces
  plop.setHelper('titleCase', (text) => {
    return text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  });

  plop.setGenerator('construct', {
    description: 'Generate a new CDK construct package',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Construct name (PascalCase, e.g., ApiGatewayLambda):',
        validate: (value) => {
          if (!value) {
            return 'Construct name is required';
          }
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
            return 'Construct name must be in PascalCase (e.g., ApiGatewayLambda)';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Brief description of the construct:',
        validate: (value) => {
          if (!value) {
            return 'Description is required';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author name:',
        default: 'Leighton Digital',
      },
    ],
    actions: [
      // Create the directory structure
      {
        type: 'add',
        path: 'src/{{kebabCase name}}/index.ts',
        templateFile: 'plop-templates/index.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/{{kebabCase name}}/__docs__.ts',
        templateFile: 'plop-templates/__docs__.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/{{kebabCase name}}/README.md',
        templateFile: 'plop-templates/README.md.hbs',
      },
      {
        type: 'add',
        path: 'src/{{kebabCase name}}/{{kebabCase name}}.ts',
        templateFile: 'plop-templates/construct.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/{{kebabCase name}}/{{kebabCase name}}.test.ts',
        templateFile: 'plop-templates/construct.test.ts.hbs',
      },
      // Create the nested test stack
      {
        type: 'add',
        path: 'tests/test-project/lib/{{kebabCase name}}-nested-stack.ts',
        templateFile: 'plop-templates/nested-stack.ts.hbs',
      },
      // Update main index.ts to export the new construct
      {
        type: 'modify',
        path: 'src/index.ts',
        pattern: /(export \* from '\.\/api-gateway-cloudfront-distribution';)/,
        template: "$1\nexport * from './{{kebabCase name}}';",
      },
      // Update test project stack to import the new nested stack
      {
        type: 'modify',
        path: 'tests/test-project/lib/test-project-stack.ts',
        pattern:
          /(import { ApiDistributionNestedStack } from '\.\/api-distribution-nested-stack';)/,
        template:
          "$1\nimport { {{name}}NestedStack } from './{{kebabCase name}}-nested-stack';",
      },
      {
        type: 'modify',
        path: 'tests/test-project/lib/test-project-stack.ts',
        pattern:
          /(\/\/ Create the API Distribution using a nested stack with no custom properties\s+new ApiDistributionNestedStack\(this, 'ApiDistributionStack'\);)/,
        template:
          "$1\n\n    // Create the {{titleCase name}} using a nested stack\n    new {{name}}NestedStack(this, '{{name}}Stack');",
      },
    ],
  });
};
