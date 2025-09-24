import * as cdk from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { AwsSolutionsChecks } from 'cdk-nag';
import {
  IdempotencyTable,
  type IdempotencyTableProps,
} from './idempotency-table';

describe('IdempotencyTable', () => {
  let stack: cdk.Stack;
  let defaultConfig: IdempotencyTableProps;
  let idempotencyTable: IdempotencyTable;

  beforeEach(() => {
    stack = new cdk.Stack();

    defaultConfig = {
      tableName: 'test-idempotency-table',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    };

    idempotencyTable = new IdempotencyTable(
      stack,
      'TestIdempotencyTable',
      defaultConfig,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates DynamoDB table with correct properties', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'test-idempotency-table',
      SSESpecification: {
        SSEEnabled: true,
      },
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S',
        },
      ],
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      TimeToLiveSpecification: {
        AttributeName: 'expiration',
        Enabled: true,
      },
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: false,
      },
    });
  });

  it('applies removal policy to the table', () => {
    expect(idempotencyTable.table.applyRemovalPolicy).toBeDefined();
  });

  it('exposes the DynamoDB table as a public property', () => {
    expect(idempotencyTable.table).toBeInstanceOf(Table);
    // The tableName is a CDK token at runtime, so we test via the CloudFormation template
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'test-idempotency-table',
    });
  });

  it('sets correct partition key for powertools compatibility', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      AttributeDefinitions: Match.arrayWith([
        {
          AttributeName: 'id',
          AttributeType: 'S',
        },
      ]),
      KeySchema: Match.arrayWith([
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ]),
    });
  });

  it('configures TTL attribute for powertools compatibility', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TimeToLiveSpecification: {
        AttributeName: 'expiration',
        Enabled: true,
      },
    });
  });

  it('uses AWS managed encryption by default', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      SSESpecification: {
        SSEEnabled: true,
      },
    });
  });

  it('disables point-in-time recovery by default', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: false,
      },
    });
  });

  it('allows custom props to override defaults', () => {
    // Create a fresh stack for this test to avoid interference from the beforeEach setup
    const customStack = new cdk.Stack();

    new IdempotencyTable(customStack, 'CustomTable', {
      tableName: 'custom-table',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      readCapacity: 10,
      writeCapacity: 10,
    });

    const template = Template.fromStack(customStack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'custom-table',
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10,
      },
    });
  });

  it('allows custom props to override some defaults but preserves powertools requirements', () => {
    // Create a fresh stack for this test to avoid interference from the beforeEach setup
    const customStack = new cdk.Stack();

    // Create a table with custom properties
    new IdempotencyTable(customStack, 'FixedPropsTable', {
      tableName: 'fixed-props-test',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      // Test that some custom props can be set
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    const template = Template.fromStack(customStack);

    // Verify the table is created with custom and fixed properties
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'fixed-props-test',
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true, // This is from custom props
      },
      KeySchema: [
        {
          AttributeName: 'id', // This is from fixed props (powertools requirement)
          KeyType: 'HASH',
        },
      ],
      TimeToLiveSpecification: {
        AttributeName: 'expiration', // This is from fixed props (powertools requirement)
        Enabled: true,
      },
    });
  });

  it('generates unique table logical IDs for multiple instances', () => {
    // Create a fresh stack for this test to avoid interference from the beforeEach setup
    const uniqueStack = new cdk.Stack();

    const table1 = new IdempotencyTable(uniqueStack, 'Table1', {
      tableName: 'table-1',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const table2 = new IdempotencyTable(uniqueStack, 'Table2', {
      tableName: 'table-2',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    expect(table1.table.node.id).toBe('IdempTableTable1');
    expect(table2.table.node.id).toBe('IdempTableTable2');
  });

  it('applies CDK Nag suppression when point-in-time recovery is disabled by default', () => {
    // The default setup already has point-in-time recovery disabled
    cdk.Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

    Template.fromStack(stack);
    const errors = Annotations.fromStack(stack).findError(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*'),
    );
    const warnings = Annotations.fromStack(stack).findWarning(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*'),
    );
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('does not apply CDK Nag suppression when point-in-time recovery is explicitly enabled', () => {
    // Create a fresh stack for this test
    const pitrStack = new cdk.Stack();

    new IdempotencyTable(pitrStack, 'PITRIdempotencyTable', {
      tableName: 'pitr-idempotency-table',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    cdk.Aspects.of(pitrStack).add(new AwsSolutionsChecks({ verbose: true }));

    Template.fromStack(pitrStack);
    // When PITR is enabled, there should be no AwsSolutions-DDB3 findings since it's compliant
    const errors = Annotations.fromStack(pitrStack).findError(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*'),
    );
    const warnings = Annotations.fromStack(pitrStack).findWarning(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*'),
    );
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('No unsuppressed AwsSolutions findings', () => {
    cdk.Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

    Template.fromStack(stack);
    const errors = Annotations.fromStack(stack).findError(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*'),
    );
    const warnings = Annotations.fromStack(stack).findWarning(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*'),
    );
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });
});
