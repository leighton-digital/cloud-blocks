import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Tags } from '../../types/tag-types';
import { addTagsToStack } from './add-tags-to-stack';

describe('addTagsToStack', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle empty tags object without errors', () => {
    const tags: Tags = {};

    // Should not throw any errors
    expect(() => {
      addTagsToStack(stack, tags);
    }).not.toThrow();
  });

  it('should add tags to resources created in the stack', () => {
    const tags: Tags = {
      Environment: 'production',
    };

    addTagsToStack(stack, tags);

    // Create a resource to verify tags are applied
    new s3.Bucket(stack, 'TestBucket');

    const template = Template.fromStack(stack);

    // Check that the tag was applied to the S3 bucket
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        {
          Key: 'Environment',
          Value: 'production',
        },
      ]),
    });
  });

  it('should add multiple tags to resources in the stack', () => {
    const tags: Tags = {
      Environment: 'production',
      Owner: 'team-alpha',
      Project: 'cloud-blocks',
      CostCenter: '12345',
    };

    addTagsToStack(stack, tags);

    // Create a resource to verify tags are applied
    new s3.Bucket(stack, 'TestBucket');

    const template = Template.fromStack(stack);
    template.toJSON();

    // Check that all tags were applied to the S3 bucket
    // Test each tag individually to avoid order issues
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Environment', Value: 'production' }]),
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Owner', Value: 'team-alpha' }]),
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Project', Value: 'cloud-blocks' }]),
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'CostCenter', Value: '12345' }]),
    });
  });

  it('should handle tags with special characters and spaces', () => {
    const tags: Tags = {
      'Tag With Spaces': 'value with spaces',
      'Tag-With-Dashes': 'value-with-dashes',
      'Tag.With.Dots': 'value.with.dots',
      Tag_With_Underscores: 'value_with_underscores',
    };

    addTagsToStack(stack, tags);

    // Create a resource to verify tags are applied
    new s3.Bucket(stack, 'TestBucket');

    const template = Template.fromStack(stack);

    // Check that all special character tags were applied correctly
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        { Key: 'Tag With Spaces', Value: 'value with spaces' },
      ]),
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        { Key: 'Tag-With-Dashes', Value: 'value-with-dashes' },
      ]),
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        { Key: 'Tag.With.Dots', Value: 'value.with.dots' },
      ]),
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        { Key: 'Tag_With_Underscores', Value: 'value_with_underscores' },
      ]),
    });
  });

  it('should handle empty string values', () => {
    const tags: Tags = {
      EmptyTag: '',
      NonEmptyTag: 'value',
    };

    addTagsToStack(stack, tags);

    // Create a resource to verify tags are applied
    new s3.Bucket(stack, 'TestBucket');

    const template = Template.fromStack(stack);

    // Check that empty string values are handled correctly
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        { Key: 'EmptyTag', Value: '' },
        { Key: 'NonEmptyTag', Value: 'value' },
      ]),
    });
  });

  it('should apply tags with higher priority over existing tags', () => {
    // Add initial tag with default priority
    cdk.Tags.of(stack).add('Environment', 'development');

    const tags: Tags = {
      Environment: 'production',
    };

    // Our function should add tags with default priority (100)
    // which should be the same as the existing tag, but applied later
    addTagsToStack(stack, tags);

    // Create a resource to verify the final tag value
    new s3.Bucket(stack, 'TestBucket');

    const template = Template.fromStack(stack);

    // The last applied tag should win (production)
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Environment', Value: 'production' }]),
    });
  });

  it('should work with different CDK stack configurations', () => {
    // Create a stack with specific configuration
    const configuredStack = new cdk.Stack(app, 'ConfiguredStack', {
      description: 'A test stack with configuration',
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });

    const tags: Tags = {
      StackType: 'configured',
      Region: 'us-east-1',
    };

    addTagsToStack(configuredStack, tags);

    // Create a resource to verify tags are applied
    new s3.Bucket(configuredStack, 'TestBucket');

    const template = Template.fromStack(configuredStack);

    // Check that tags are applied to the configured stack's resources
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'StackType', Value: 'configured' }]),
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Region', Value: 'us-east-1' }]),
    });
  });

  it('should preserve existing tags when adding new ones', () => {
    // Add initial tags using CDK directly
    cdk.Tags.of(stack).add('ExistingTag1', 'value1');
    cdk.Tags.of(stack).add('ExistingTag2', 'value2');

    const tags: Tags = {
      NewTag1: 'newValue1',
      NewTag2: 'newValue2',
    };

    addTagsToStack(stack, tags);

    // Create a resource to verify tags are applied
    new s3.Bucket(stack, 'TestBucket');

    const template = Template.fromStack(stack);

    // Check that both existing and new tags are present
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        { Key: 'ExistingTag1', Value: 'value1' },
        { Key: 'ExistingTag2', Value: 'value2' },
        { Key: 'NewTag1', Value: 'newValue1' },
        { Key: 'NewTag2', Value: 'newValue2' },
      ]),
    });
  });

  it('should handle numeric and boolean-like string values', () => {
    const tags: Tags = {
      Version: '1.0.0',
      Port: '8080',
      Debug: 'true',
      Count: '42',
      Percentage: '85.5',
    };

    addTagsToStack(stack, tags);

    // Create a resource to verify tags are applied
    new s3.Bucket(stack, 'TestBucket');

    const template = Template.fromStack(stack);

    // Check that numeric and boolean-like values are stored as strings
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Version', Value: '1.0.0' }]),
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Port', Value: '8080' }]),
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Debug', Value: 'true' }]),
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Count', Value: '42' }]),
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Percentage', Value: '85.5' }]),
    });
  });

  it('should work with large number of tags', () => {
    // AWS supports up to 50 tags per resource, test with a reasonable number
    const tags: Tags = {};
    const expectedTags = [];

    for (let i = 1; i <= 20; i++) {
      tags[`Tag${i}`] = `Value${i}`;
      expectedTags.push({ Key: `Tag${i}`, Value: `Value${i}` });
    }

    addTagsToStack(stack, tags);

    // Create a resource to verify tags are applied
    new s3.Bucket(stack, 'TestBucket');

    const template = Template.fromStack(stack);

    // Check that a sample of tags were applied (testing all 20 individually would be verbose)
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Tag1', Value: 'Value1' }]),
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Tag10', Value: 'Value10' }]),
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Tag20', Value: 'Value20' }]),
    });

    // Also verify the total number of tags by getting the template JSON
    const templateJson = template.toJSON();
    const resources = templateJson.Resources || {};
    const s3Resources = Object.values(resources).filter(
      (resource) => (resource as { Type: string }).Type === 'AWS::S3::Bucket',
    );
    const s3Tags =
      (
        s3Resources[0] as {
          Properties?: { Tags?: Array<{ Key: string; Value: string }> };
        }
      )?.Properties?.Tags || [];
    expect(s3Tags).toHaveLength(20);
  });

  it('should work correctly when called multiple times', () => {
    // First call
    addTagsToStack(stack, { FirstBatch: 'value1' });

    // Second call
    addTagsToStack(stack, { SecondBatch: 'value2' });

    // Create a resource to verify tags are applied
    new s3.Bucket(stack, 'TestBucket');

    const template = Template.fromStack(stack);

    // Check that tags from both calls are present
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        { Key: 'FirstBatch', Value: 'value1' },
        { Key: 'SecondBatch', Value: 'value2' },
      ]),
    });
  });

  it('should handle tags applied to different resource types', () => {
    const tags: Tags = {
      Environment: 'test',
      Owner: 'developer',
    };

    addTagsToStack(stack, tags);

    // Create multiple different resource types
    new s3.Bucket(stack, 'TestBucket');
    new cdk.aws_ec2.Vpc(stack, 'TestVpc');

    const template = Template.fromStack(stack);

    // Check that tags are applied to both resource types
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        { Key: 'Environment', Value: 'test' },
        { Key: 'Owner', Value: 'developer' },
      ]),
    });

    template.hasResourceProperties('AWS::EC2::VPC', {
      Tags: Match.arrayWith([
        { Key: 'Environment', Value: 'test' },
        { Key: 'Owner', Value: 'developer' },
      ]),
    });
  });
});
