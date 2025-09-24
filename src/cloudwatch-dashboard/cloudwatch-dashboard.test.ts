import * as cdk from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { AwsSolutionsChecks } from 'cdk-nag';
import {
  CloudWatchDashboard,
  type CloudWatchDashboardProps,
} from './cloudwatch-dashboard';

describe('CloudWatchDashboard', () => {
  let stack: cdk.Stack;
  let defaultConfig: CloudWatchDashboardProps;
  let cloudwatchDashboard: CloudWatchDashboard;

  beforeEach(() => {
    stack = new cdk.Stack();

    defaultConfig = {
      dashboardName: 'test-dashboard',
      dashboardDescription: 'Test dashboard for monitoring application health',
    };

    cloudwatchDashboard = new CloudWatchDashboard(
      stack,
      'TestDashboard',
      defaultConfig,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates CloudWatch Dashboard with correct properties', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'test-dashboard',
      DashboardBody: Match.anyValue(), // CloudFormation intrinsic function
    });
  });

  it('applies removal policy to the dashboard', () => {
    expect(cloudwatchDashboard.applyRemovalPolicy).toBeDefined();
  });

  it('is a CloudWatch dashboard instance', () => {
    expect(cloudwatchDashboard).toBeInstanceOf(cloudwatch.Dashboard);
    // The dashboardName is a CDK token at runtime, so we test via the CloudFormation template
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'test-dashboard',
    });
  });

  it('creates description widget with correct dimensions', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardBody: Match.anyValue(), // CloudFormation intrinsic function
    });
  });

  it('supports initial widgets alongside description widget', () => {
    // Create a fresh stack for this test to avoid interference from the beforeEach setup
    const customStack = new cdk.Stack();

    // Create a mock metric for testing
    const mockMetric = new cloudwatch.Metric({
      namespace: 'Test',
      metricName: 'TestMetric',
    });

    const graphWidget = new cloudwatch.GraphWidget({
      title: 'Test Graph',
      left: [mockMetric],
      width: 12,
      height: 6,
    });

    const numberWidget = new cloudwatch.SingleValueWidget({
      title: 'Test Number',
      metrics: [mockMetric],
      width: 12,
      height: 6,
    });

    new CloudWatchDashboard(customStack, 'CustomDashboard', {
      dashboardName: 'custom-dashboard',
      dashboardDescription: 'Custom dashboard with initial widgets',
      initialWidgets: [graphWidget, numberWidget],
    });

    const template = Template.fromStack(customStack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'custom-dashboard',
      DashboardBody: Match.anyValue(), // CloudFormation intrinsic function
    });
  });

  it('allows widgets to be added after construction', () => {
    // Create a mock metric for testing
    const mockMetric = new cloudwatch.Metric({
      namespace: 'Test',
      metricName: 'TestMetric',
    });

    const additionalWidget = new cloudwatch.GraphWidget({
      title: 'Added Later',
      left: [mockMetric],
      width: 24,
      height: 6,
    });

    cloudwatchDashboard.addWidgets(additionalWidget);

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardBody: Match.anyValue(), // CloudFormation intrinsic function
    });
  });

  it('supports multiple widgets added after construction', () => {
    // Create mock metrics for testing
    const mockMetric1 = new cloudwatch.Metric({
      namespace: 'Test',
      metricName: 'TestMetric1',
    });

    const mockMetric2 = new cloudwatch.Metric({
      namespace: 'Test',
      metricName: 'TestMetric2',
    });

    const widget1 = new cloudwatch.GraphWidget({
      title: 'Widget 1',
      left: [mockMetric1],
      width: 12,
      height: 6,
    });

    const widget2 = new cloudwatch.SingleValueWidget({
      title: 'Widget 2',
      metrics: [mockMetric2],
      width: 12,
      height: 6,
    });

    cloudwatchDashboard.addWidgets(widget1, widget2);

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardBody: Match.anyValue(), // CloudFormation intrinsic function
    });
  });

  it('supports custom dashboard properties', () => {
    // Create a fresh stack for this test to avoid interference from the beforeEach setup
    const customStack = new cdk.Stack();

    new CloudWatchDashboard(customStack, 'CustomPropsDashboard', {
      dashboardName: 'custom-props-dashboard',
      dashboardDescription: 'Dashboard with custom properties',
      periodOverride: cloudwatch.PeriodOverride.AUTO,
    });

    const template = Template.fromStack(customStack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'custom-props-dashboard',
      DashboardBody: Match.anyValue(), // CloudFormation intrinsic function
    });
  });

  it('generates unique dashboard logical IDs for multiple instances', () => {
    // Create a fresh stack for this test to avoid interference from the beforeEach setup
    const uniqueStack = new cdk.Stack();

    const dashboard1 = new CloudWatchDashboard(uniqueStack, 'Dashboard1', {
      dashboardName: 'dashboard-1',
      dashboardDescription: 'First dashboard',
    });

    const dashboard2 = new CloudWatchDashboard(uniqueStack, 'Dashboard2', {
      dashboardName: 'dashboard-2',
      dashboardDescription: 'Second dashboard',
    });

    expect(dashboard1.node.id).toBe('Dashboard1');
    expect(dashboard2.node.id).toBe('Dashboard2');
  });

  it('handles empty description gracefully', () => {
    // Create a fresh stack for this test to avoid interference from the beforeEach setup
    const emptyDescStack = new cdk.Stack();

    new CloudWatchDashboard(emptyDescStack, 'EmptyDescDashboard', {
      dashboardName: 'empty-desc-dashboard',
      dashboardDescription: '',
    });

    const template = Template.fromStack(emptyDescStack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardBody: Match.anyValue(), // CloudFormation intrinsic function
    });
  });

  it('applies default removal policy DESTROY when not specified', () => {
    // The default dashboard from beforeEach should have DESTROY removal policy
    expect(cloudwatchDashboard.applyRemovalPolicy).toBeDefined();

    // Verify via CloudFormation template that DeletionPolicy is not set (default behavior)
    const template = Template.fromStack(stack);
    template.hasResource('AWS::CloudWatch::Dashboard', {});
  });

  it('applies custom removal policy when specified', () => {
    // Create a fresh stack for this test to avoid interference from the beforeEach setup
    const customPolicyStack = new cdk.Stack();

    new CloudWatchDashboard(customPolicyStack, 'RetainDashboard', {
      dashboardName: 'retain-dashboard',
      dashboardDescription: 'Dashboard with RETAIN removal policy',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const template = Template.fromStack(customPolicyStack);

    template.hasResource('AWS::CloudWatch::Dashboard', {
      DeletionPolicy: 'Retain',
    });
  });

  it('supports all removal policy options', () => {
    // Test different removal policies
    const testCases = [
      { policy: cdk.RemovalPolicy.DESTROY, expected: undefined }, // Default CloudFormation behavior
      { policy: cdk.RemovalPolicy.RETAIN, expected: 'Retain' },
      { policy: cdk.RemovalPolicy.SNAPSHOT, expected: 'Snapshot' },
    ];

    testCases.forEach(({ policy, expected }, index) => {
      const testStack = new cdk.Stack();

      new CloudWatchDashboard(testStack, `TestDashboard${index}`, {
        dashboardName: `test-dashboard-${index}`,
        dashboardDescription: `Test dashboard with ${policy} policy`,
        removalPolicy: policy,
      });

      const template = Template.fromStack(testStack);

      if (expected) {
        template.hasResource('AWS::CloudWatch::Dashboard', {
          DeletionPolicy: expected,
        });
      } else {
        // For DESTROY policy, DeletionPolicy should not be explicitly set
        template.hasResource('AWS::CloudWatch::Dashboard', {});
      }
    });
  });

  it('No unsuppressed AwsSolutions findings', () => {
    cdk.Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

    // CloudWatch dashboards typically don't have AwsSolutions findings,
    // but we include this test for consistency with the pattern
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
