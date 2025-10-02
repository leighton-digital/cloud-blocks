import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { RequiredTags } from '../../types/tag-types';
import { RequiredTagsChecker } from './required-tags-checker';

describe('RequiredTagsChecker', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not add errors when all required tags are present', () => {
    const requiredTags: RequiredTags = ['Environment', 'Owner', 'Project'];

    // Add all required tags to the stack
    cdk.Tags.of(stack).add('Environment', 'production');
    cdk.Tags.of(stack).add('Owner', 'team-alpha');
    cdk.Tags.of(stack).add('Project', 'cloud-blocks');

    const checker = new RequiredTagsChecker(requiredTags);
    cdk.Aspects.of(stack).add(checker);
    const assembly = app.synth();

    // Check that no error messages were added
    const stackArtifact = assembly.getStackByName(stack.stackName);
    const errorMessages = stackArtifact.messages.filter(
      (msg) => msg.level === 'error',
    );
    expect(errorMessages).toHaveLength(0);
  });

  it('should add error when stack has no tags', () => {
    const requiredTags: RequiredTags = ['Environment'];

    // Don't add any tags to the stack

    const checker = new RequiredTagsChecker(requiredTags);

    // Apply the checker as an aspect and then synthesize
    cdk.Aspects.of(stack).add(checker);
    const assembly = app.synth();

    // Check that error annotations were added via the assembly
    const stackArtifact = assembly.getStackByName(stack.stackName);
    const messages = stackArtifact.messages;
    const errorMessages = messages.filter((msg) => msg.level === 'error');

    expect(errorMessages).toHaveLength(2); // One for no tags, one for missing Environment tag
    expect(String(errorMessages[0].entry.data)).toContain(
      'There are no tags on "TestStack"',
    );
    expect(String(errorMessages[1].entry.data)).toContain(
      '"Environment" is missing from stack with id "TestStack"',
    );
  });

  it('should add error for each missing required tag', () => {
    const requiredTags: RequiredTags = ['Environment', 'Owner', 'Project'];

    // Add only one of the required tags
    cdk.Tags.of(stack).add('Environment', 'production');

    const checker = new RequiredTagsChecker(requiredTags);
    cdk.Aspects.of(stack).add(checker);
    const assembly = app.synth();

    // Check that error messages were added for missing tags
    const stackArtifact = assembly.getStackByName(stack.stackName);
    const errorMessages = stackArtifact.messages.filter(
      (msg) => msg.level === 'error',
    );

    expect(errorMessages).toHaveLength(2); // Missing Owner and Project
    expect(String(errorMessages[0].entry.data)).toContain(
      '"Owner" is missing from stack with id "TestStack"',
    );
    expect(String(errorMessages[1].entry.data)).toContain(
      '"Project" is missing from stack with id "TestStack"',
    );
  });

  it('should handle empty required tags list without errors', () => {
    const requiredTags: RequiredTags = [];

    // Add some tags to the stack
    cdk.Tags.of(stack).add('SomeTag', 'someValue');

    const checker = new RequiredTagsChecker(requiredTags);
    cdk.Aspects.of(stack).add(checker);
    const assembly = app.synth();

    // Check that no error messages were added
    const stackArtifact = assembly.getStackByName(stack.stackName);
    const errorMessages = stackArtifact.messages.filter(
      (msg) => msg.level === 'error',
    );
    expect(errorMessages).toHaveLength(0);
  });

  it('should handle empty required tags list on stack with no tags', () => {
    const requiredTags: RequiredTags = [];

    // Don't add any tags to the stack

    const checker = new RequiredTagsChecker(requiredTags);
    cdk.Aspects.of(stack).add(checker);
    const assembly = app.synth();

    // Should still add error for having no tags
    const stackArtifact = assembly.getStackByName(stack.stackName);
    const errorMessages = stackArtifact.messages.filter(
      (msg) => msg.level === 'error',
    );

    expect(errorMessages).toHaveLength(1);
    expect(String(errorMessages[0].entry.data)).toContain(
      'There are no tags on "TestStack"',
    );
  });

  it('should ignore non-stack constructs', () => {
    const requiredTags: RequiredTags = ['Environment'];

    // Add required tag to the stack so it passes validation
    cdk.Tags.of(stack).add('Environment', 'test');

    // Create a non-stack construct (S3 bucket)
    const bucket = new s3.Bucket(stack, 'TestBucket');

    const checker = new RequiredTagsChecker(requiredTags);

    // Test that visiting the bucket directly doesn't throw errors
    expect(() => {
      checker.visit(bucket);
    }).not.toThrow();

    // Also test that when applied as aspect, stack passes validation
    cdk.Aspects.of(stack).add(checker);
    const assembly = app.synth();

    const stackArtifact = assembly.getStackByName(stack.stackName);
    const errorMessages = stackArtifact.messages.filter(
      (msg) => msg.level === 'error',
    );
    expect(errorMessages).toHaveLength(0);
  });

  it('should work with multiple stacks', () => {
    const requiredTags: RequiredTags = ['Environment'];

    // Create fresh app and stacks for this test
    const testApp = new cdk.App();
    const stack1 = new cdk.Stack(testApp, 'TestStack1');
    const stack2 = new cdk.Stack(testApp, 'TestStack2');

    // Both stacks have no tags - should both generate errors

    const checker = new RequiredTagsChecker(requiredTags);
    cdk.Aspects.of(testApp).add(checker); // Apply to entire app
    const assembly = testApp.synth();

    // Both stacks should have errors (no tags + missing Environment)
    const stackArtifact1 = assembly.getStackByName(stack1.stackName);
    const errorMessages1 = stackArtifact1.messages.filter(
      (msg) => msg.level === 'error',
    );
    expect(errorMessages1).toHaveLength(2);
    expect(String(errorMessages1[0].entry.data)).toContain(
      'There are no tags on "TestStack1"',
    );
    expect(String(errorMessages1[1].entry.data)).toContain(
      '"Environment" is missing from stack with id "TestStack1"',
    );

    const stackArtifact2 = assembly.getStackByName(stack2.stackName);
    const errorMessages2 = stackArtifact2.messages.filter(
      (msg) => msg.level === 'error',
    );
    expect(errorMessages2).toHaveLength(2);
    expect(String(errorMessages2[0].entry.data)).toContain(
      'There are no tags on "TestStack2"',
    );
    expect(String(errorMessages2[1].entry.data)).toContain(
      '"Environment" is missing from stack with id "TestStack2"',
    );
  });

  it('should work when applied as an aspect to the app', () => {
    const requiredTags: RequiredTags = ['Environment', 'Owner'];

    // Create fresh app and stack for this test
    const testApp = new cdk.App();
    const testStack = new cdk.Stack(testApp, 'TestStack');

    // Stack has no tags - should generate errors for both required tags plus no-tags error

    // Apply the checker as an aspect to the app
    const checker = new RequiredTagsChecker(requiredTags);
    cdk.Aspects.of(testApp).add(checker);

    // Synthesize the app to trigger aspect execution
    const assembly = testApp.synth();

    // Check that errors were added for both missing tags plus no-tags error
    const stackArtifact = assembly.getStackByName(testStack.stackName);
    const errorMessages = stackArtifact.messages.filter(
      (msg) => msg.level === 'error',
    );

    expect(errorMessages).toHaveLength(3); // No tags + missing Environment + missing Owner
    expect(
      errorMessages.some((msg) =>
        String(msg.entry.data).includes('There are no tags on "TestStack"'),
      ),
    ).toBe(true);
    expect(
      errorMessages.some((msg) =>
        String(msg.entry.data).includes('"Environment" is missing'),
      ),
    ).toBe(true);
    expect(
      errorMessages.some((msg) =>
        String(msg.entry.data).includes('"Owner" is missing'),
      ),
    ).toBe(true);
  });

  it('should work when applied as an aspect to a specific stack', () => {
    const requiredTags: RequiredTags = ['Environment'];

    // Create a second stack with the required tag
    const stack2 = new cdk.Stack(app, 'TestStack2');
    cdk.Tags.of(stack2).add('Environment', 'staging');

    // Apply the checker only to the first stack (which has no tags)
    const checker = new RequiredTagsChecker(requiredTags);
    cdk.Aspects.of(stack).add(checker);

    // Synthesize the app to trigger aspect execution
    const assembly = app.synth();

    // First stack should have errors
    const stackArtifact1 = assembly.getStackByName(stack.stackName);
    const errorMessages1 = stackArtifact1.messages.filter(
      (msg) => msg.level === 'error',
    );
    expect(errorMessages1).toHaveLength(2); // No tags + missing Environment

    // Second stack should have no errors (aspect wasn't applied to it)
    const stackArtifact2 = assembly.getStackByName(stack2.stackName);
    const errorMessages2 = stackArtifact2.messages.filter(
      (msg) => msg.level === 'error',
    );
    expect(errorMessages2).toHaveLength(0);
  });

  it('should handle tag keys with special characters', () => {
    const requiredTags: RequiredTags = [
      'Environment',
      'Cost Center',
      'Tag-With-Dashes',
      'Tag.With.Dots',
    ];

    // Add tags with various special characters
    cdk.Tags.of(stack).add('Environment', 'production');
    cdk.Tags.of(stack).add('Cost Center', '12345');
    cdk.Tags.of(stack).add('Tag-With-Dashes', 'value');
    cdk.Tags.of(stack).add('Tag.With.Dots', 'value');

    const checker = new RequiredTagsChecker(requiredTags);
    cdk.Aspects.of(stack).add(checker);
    const assembly = app.synth();

    // Check that no error messages were added
    const stackArtifact = assembly.getStackByName(stack.stackName);
    const errorMessages = stackArtifact.messages.filter(
      (msg) => msg.level === 'error',
    );
    expect(errorMessages).toHaveLength(0);
  });

  it('should handle case-sensitive tag matching', () => {
    const requiredTags: RequiredTags = ['Environment', 'environment'];

    // Add tag with different case
    cdk.Tags.of(stack).add('Environment', 'production');

    const checker = new RequiredTagsChecker(requiredTags);
    cdk.Aspects.of(stack).add(checker);
    const assembly = app.synth();

    // Should show missing 'environment' tag (case-sensitive)
    const stackArtifact = assembly.getStackByName(stack.stackName);
    const errorMessages = stackArtifact.messages.filter(
      (msg) => msg.level === 'error',
    );

    expect(errorMessages).toHaveLength(1);
    expect(String(errorMessages[0].entry.data)).toContain(
      '"environment" is missing from stack with id "TestStack"',
    );
  });

  it('should work with additional non-required tags present', () => {
    const requiredTags: RequiredTags = ['Environment'];

    // Add required tag plus additional tags
    cdk.Tags.of(stack).add('Environment', 'production');
    cdk.Tags.of(stack).add('Owner', 'team-alpha');
    cdk.Tags.of(stack).add('Project', 'cloud-blocks');
    cdk.Tags.of(stack).add('ExtraTag', 'extraValue');

    const checker = new RequiredTagsChecker(requiredTags);
    cdk.Aspects.of(stack).add(checker);
    const assembly = app.synth();

    // Should have no errors - additional tags don't matter
    const stackArtifact = assembly.getStackByName(stack.stackName);
    const errorMessages = stackArtifact.messages.filter(
      (msg) => msg.level === 'error',
    );
    expect(errorMessages).toHaveLength(0);
  });

  it('should handle large number of required tags', () => {
    // Create a list of many required tags
    const requiredTags: RequiredTags = [];
    for (let i = 1; i <= 20; i++) {
      requiredTags.push(`RequiredTag${i}`);
    }

    // Add only half of the required tags
    for (let i = 1; i <= 10; i++) {
      cdk.Tags.of(stack).add(`RequiredTag${i}`, `value${i}`);
    }

    const checker = new RequiredTagsChecker(requiredTags);
    cdk.Aspects.of(stack).add(checker);
    const assembly = app.synth();

    // Should have errors for the missing 10 tags
    const stackArtifact = assembly.getStackByName(stack.stackName);
    const errorMessages = stackArtifact.messages.filter(
      (msg) => msg.level === 'error',
    );

    expect(errorMessages).toHaveLength(10); // Missing RequiredTag11 through RequiredTag20

    // Check a few specific error messages
    expect(
      errorMessages.some((msg) =>
        String(msg.entry.data).includes('"RequiredTag11" is missing'),
      ),
    ).toBe(true);
    expect(
      errorMessages.some((msg) =>
        String(msg.entry.data).includes('"RequiredTag20" is missing'),
      ),
    ).toBe(true);
  });
});
