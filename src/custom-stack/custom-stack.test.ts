import * as cdk from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { AwsSolutionsChecks } from 'cdk-nag';
import { CustomStack, type CustomStackProps } from './custom-stack';

describe('CustomStack', () => {
  let app: cdk.App;
  let defaultConfig: CustomStackProps;

  beforeEach(() => {
    app = new cdk.App();
    defaultConfig = {
      description: 'Test custom stack',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates stack without dashboard by default', () => {
    const stack = new CustomStack(app, 'TestStack', defaultConfig);

    expect(stack.isDashboardEnabled).toBe(false);
    expect(stack.dashboard).toBeUndefined();
    expect(stack.getWidgets()).toHaveLength(0);

    const template = Template.fromStack(stack);

    // Should not create any CloudWatch dashboard resources
    template.resourceCountIs('AWS::CloudWatch::Dashboard', 0);
  });

  it('creates stack with dashboard when enabled', () => {
    const stack = new CustomStack(app, 'TestStackWithDashboard', {
      ...defaultConfig,
      createDashboard: true,
    });

    expect(stack.isDashboardEnabled).toBe(true);
    expect(stack.dashboard).toBeDefined();

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'test-stack-with-dashboard-dashboard',
      DashboardBody: Match.anyValue(),
    });
  });

  it('uses custom dashboard name when provided', () => {
    const customDashboardName = 'my-custom-monitoring-dashboard';

    const stack = new CustomStack(app, 'CustomNameStack', {
      ...defaultConfig,
      createDashboard: true,
      dashboardName: customDashboardName,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: customDashboardName,
    });
  });

  it('uses custom dashboard description when provided', () => {
    const customDescription = 'Custom monitoring dashboard for my application';

    const stack = new CustomStack(app, 'CustomDescStack', {
      ...defaultConfig,
      createDashboard: true,
      dashboardDescription: customDescription,
    });

    const template = Template.fromStack(stack);

    // Verify the custom description appears in the dashboard body
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardBody: Match.stringLikeRegexp(
        `.*"markdown":"${customDescription.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}".*`,
      ),
    });
  });

  it('handles dashboard description with special characters', () => {
    const specialDescription = 'Dashboard with (special) chars: $100+ & more!';

    const stack = new CustomStack(app, 'SpecialCharsStack', {
      ...defaultConfig,
      createDashboard: true,
      dashboardDescription: specialDescription,
    });

    const template = Template.fromStack(stack);

    // Verify the description with special characters appears correctly
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardBody: Match.stringLikeRegexp(
        `.*"markdown":"${specialDescription.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}".*`,
      ),
    });
  });

  it('generates default dashboard name from stack ID', () => {
    const stack = new CustomStack(app, 'MyTestStack', {
      ...defaultConfig,
      createDashboard: true,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'my-test-stack-dashboard',
    });
  });

  it('generates default dashboard description from stack ID', () => {
    const stack = new CustomStack(app, 'MyTestStack', {
      ...defaultConfig,
      createDashboard: true,
    });

    const template = Template.fromStack(stack);

    // Verify the default description appears in the dashboard body
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardBody: Match.stringLikeRegexp(
        '.*"markdown":"Dashboard for monitoring resources in the MyTestStack stack".*',
      ),
    });
  });

  it('handles complex stack ID naming patterns', () => {
    const testCases = [
      { stackId: 'SimpleStack', expected: 'simple-stack-dashboard' },
      { stackId: 'MyAPIStack', expected: 'my-a-p-i-stack-dashboard' },
      {
        stackId: 'ProductionWebAppStack',
        expected: 'production-web-app-stack-dashboard',
      },
      { stackId: 'stack', expected: 'stack-dashboard' },
    ];

    for (const { stackId, expected } of testCases) {
      const testApp = new cdk.App();
      const stack = new CustomStack(testApp, stackId, {
        createDashboard: true,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: expected,
      });
    }
  });

  it('supports custom removal policy for dashboard', () => {
    const stack = new CustomStack(app, 'RetainStack', {
      ...defaultConfig,
      createDashboard: true,
      dashboardRemovalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const template = Template.fromStack(stack);

    template.hasResource('AWS::CloudWatch::Dashboard', {
      DeletionPolicy: 'Retain',
    });
  });

  it('supports initial widgets during construction', () => {
    const mockMetric = new cloudwatch.Metric({
      namespace: 'Test',
      metricName: 'TestMetric',
    });

    const initialWidget = new cloudwatch.GraphWidget({
      title: 'Initial Widget',
      left: [mockMetric],
      width: 12,
      height: 6,
    });

    const stack = new CustomStack(app, 'InitialWidgetsStack', {
      ...defaultConfig,
      createDashboard: true,
      initialWidgets: [initialWidget],
    });

    expect(stack.getWidgets()).toHaveLength(0); // Initial widgets go directly to dashboard, not to our registry

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardBody: Match.anyValue(),
    });
  });

  describe('widget management', () => {
    it('tracks widgets added to stack without dashboard', () => {
      const stack = new CustomStack(app, 'Nodashboard', defaultConfig);

      const mockMetric = new cloudwatch.Metric({
        namespace: 'Test',
        metricName: 'TestMetric',
      });

      const widget = new cloudwatch.GraphWidget({
        title: 'Test Widget',
        left: [mockMetric],
      });

      stack.addWidget(widget);

      expect(stack.getWidgets()).toHaveLength(1);
      expect(stack.getWidgets()[0]).toBe(widget);
    });

    it('adds single widget to dashboard when enabled', () => {
      const stack = new CustomStack(app, 'WithDashboard', {
        ...defaultConfig,
        createDashboard: true,
      });

      const mockMetric = new cloudwatch.Metric({
        namespace: 'Test',
        metricName: 'TestMetric',
      });

      const widget = new cloudwatch.GraphWidget({
        title: 'Added Widget',
        left: [mockMetric],
        width: 24,
        height: 6,
      });

      stack.addWidget(widget);

      expect(stack.getWidgets()).toHaveLength(1);
      expect(stack.dashboard).toBeDefined();

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardBody: Match.anyValue(),
      });
    });

    it('adds multiple widgets at once', () => {
      const stack = new CustomStack(app, 'MultiWidget', {
        ...defaultConfig,
        createDashboard: true,
      });

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

      stack.addWidgets([widget1, widget2]);

      expect(stack.getWidgets()).toHaveLength(2);
      expect(stack.getWidgets()).toContain(widget1);
      expect(stack.getWidgets()).toContain(widget2);
    });

    it('returns copy of widgets array to prevent external modification', () => {
      const stack = new CustomStack(app, 'ImmutableWidgets', defaultConfig);

      const mockMetric = new cloudwatch.Metric({
        namespace: 'Test',
        metricName: 'TestMetric',
      });

      const widget = new cloudwatch.GraphWidget({
        title: 'Protected Widget',
        left: [mockMetric],
      });

      stack.addWidget(widget);

      const widgets = stack.getWidgets();
      widgets.pop(); // Try to modify the returned array

      // Original array should be unchanged
      expect(stack.getWidgets()).toHaveLength(1);
    });
  });

  describe('dashboard access', () => {
    it('returns dashboard when available', () => {
      const stack = new CustomStack(app, 'DashboardAccess', {
        ...defaultConfig,
        createDashboard: true,
      });

      const dashboard = stack.getDashboard();
      expect(dashboard).toBeDefined();
      expect(dashboard).toBe(stack.dashboard);
    });

    it('throws error when accessing dashboard without creation', () => {
      const stack = new CustomStack(app, 'NoDashboardAccess', defaultConfig);

      expect(() => stack.getDashboard()).toThrow(
        'Dashboard access requested but createDashboard is false. ' +
          'Set createDashboard: true in CustomStackProps to enable dashboard creation.',
      );
    });

    it('throws error when dashboard is unexpectedly undefined', () => {
      const stack = new CustomStack(app, 'UnexpectedUndefined', {
        ...defaultConfig,
        createDashboard: true,
      });

      // Simulate the unexpected condition by directly setting dashboard to undefined
      // This tests the internal consistency check
      (stack as { dashboard?: unknown }).dashboard = undefined;

      expect(() => stack.getDashboard()).toThrow(
        'Dashboard should exist when createDashboard is true, but dashboard is undefined. ' +
          'This indicates an internal error in CustomStack construction.',
      );
    });
  });

  describe('stack properties inheritance', () => {
    it('passes through standard stack properties', () => {
      const stack = new CustomStack(app, 'StandardProps', {
        ...defaultConfig,
        description: 'Custom stack with standard props',
        env: {
          region: 'us-east-1',
          account: '123456789012',
        },
        terminationProtection: true,
      });

      expect(stack.stackName).toBe('StandardProps');
      expect(stack.region).toBe('us-east-1');
      expect(stack.account).toBe('123456789012');
      expect(stack.terminationProtection).toBe(true);
    });

    it('allows tags and other stack-level configuration', () => {
      const stack = new CustomStack(app, 'TaggedStack', {
        ...defaultConfig,
        tags: {
          Environment: 'test',
          Team: 'platform',
        },
      });

      // Tags are applied at the stack level
      expect(stack.tags).toBeDefined();
    });
  });

  describe('error handling and edge cases', () => {
    it('handles empty widgets array', () => {
      const stack = new CustomStack(app, 'EmptyWidgets', {
        ...defaultConfig,
        createDashboard: true,
      });

      stack.addWidgets([]);

      expect(stack.getWidgets()).toHaveLength(0);
    });

    it('handles dashboard creation with all optional props', () => {
      const stack = new CustomStack(app, 'AllProps', {
        ...defaultConfig,
        createDashboard: true,
        dashboardName: 'comprehensive-dashboard',
        dashboardDescription: 'Complete monitoring solution',
        dashboardRemovalPolicy: cdk.RemovalPolicy.SNAPSHOT,
        initialWidgets: [],
      });

      expect(stack.isDashboardEnabled).toBe(true);
      expect(stack.dashboard).toBeDefined();

      const template = Template.fromStack(stack);
      template.hasResource('AWS::CloudWatch::Dashboard', {
        DeletionPolicy: 'Snapshot',
      });
    });
  });

  it('No unsuppressed AwsSolutions findings', () => {
    const stack = new CustomStack(app, 'TestNagStack', {
      ...defaultConfig,
      createDashboard: true,
    });

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

  describe('integration with CloudWatchDashboard construct', () => {
    it('properly integrates with existing CloudWatchDashboard construct', () => {
      const stack = new CustomStack(app, 'Integration', {
        ...defaultConfig,
        createDashboard: true,
        dashboardName: 'integration-test',
      });

      // Verify the dashboard is actually a CloudWatchDashboard instance
      expect(stack.dashboard).toBeDefined();

      // Test that we can call CloudWatchDashboard methods
      const mockMetric = new cloudwatch.Metric({
        namespace: 'Integration',
        metricName: 'TestMetric',
      });

      const widget = new cloudwatch.GraphWidget({
        title: 'Integration Widget',
        left: [mockMetric],
      });

      // This should work because CloudWatchDashboard extends cloudwatch.Dashboard
      stack.dashboard?.addWidgets(widget);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: 'integration-test',
      });
    });
  });
});
