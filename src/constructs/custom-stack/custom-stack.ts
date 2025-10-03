import * as cdk from 'aws-cdk-lib';
import type * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import type { Construct } from 'constructs';
import { CloudWatchDashboard } from '../cloudwatch-dashboard';

/**
 * Properties for configuring a CustomStack.
 *
 * This interface extends StackProps and provides options for optional dashboard
 * creation and widget management. The stack can optionally create a CloudWatch
 * dashboard and provides methods to manage widgets across the stack lifecycle.
 *
 * @example
 * ```typescript
 * const customStack = new CustomStack(this, 'MyCustomStack', {
 *   createDashboard: true,
 *   dashboardName: 'my-application-monitoring',
 *   dashboardDescription: 'Comprehensive monitoring for my application',
 *   env: { region: 'us-east-1' },
 * });
 * ```
 */
export interface CustomStackProps extends cdk.StackProps {
  /**
   * Whether to create a CloudWatch dashboard for this stack.
   *
   * @defaultValue `false` - No dashboard is created by default
   */
  createDashboard?: boolean;

  /**
   * The name for the CloudWatch dashboard.
   * Only used if {@link createDashboard} is `true`.
   *
   * @defaultValue Derived from the stack's logical ID (e.g., 'MyStack' becomes 'my-stack-dashboard')
   */
  dashboardName?: string;

  /**
   * A descriptive text that will be displayed at the top of the dashboard.
   * Only used if {@link createDashboard} is `true`.
   *
   * @defaultValue 'Dashboard for monitoring resources in the {stackName} stack'
   */
  dashboardDescription?: string;

  /**
   * Optional initial widgets to add to the dashboard during stack construction.
   * Only used if {@link createDashboard} is `true`.
   *
   * @defaultValue No initial widgets are added
   */
  initialWidgets?: cloudwatch.IWidget[];

  /**
   * Policy to apply when the dashboard is removed from the stack.
   * Only used if {@link createDashboard} is `true`.
   *
   * @defaultValue `cdk.RemovalPolicy.DESTROY` - The dashboard will be deleted when the stack is deleted
   */
  dashboardRemovalPolicy?: cdk.RemovalPolicy;
}

/**
 * A reusable CDK stack with optional CloudWatch dashboard integration and widget management.
 *
 * This stack provides a foundation for building monitoring-aware applications by:
 * - Optionally creating a CloudWatch dashboard with descriptive documentation
 * - Managing a collection of widgets that can be added throughout the stack lifecycle
 * - Providing consistent patterns for dashboard integration across different stack types
 * - Following established CDK patterns for prop handling and sensible defaults
 *
 * The stack maintains a registry of all widgets added to it, whether or not a dashboard
 * is created, allowing for flexible monitoring strategies and easy dashboard creation
 * after initial deployment.
 *
 * **Key features:**
 * - **Optional Dashboard**: Dashboard creation can be toggled via `createDashboard` prop
 * - **Widget Registry**: All widgets are tracked internally for later dashboard integration
 * - **Flexible Configuration**: All CloudWatch dashboard properties can be customized
 * - **Sensible Defaults**: Dashboard names and descriptions are auto-generated from stack context
 * - **Lifecycle Management**: Automatic removal policy handling for ephemeral environments
 *
 * @example
 * ```typescript
 * // Basic stack without dashboard
 * const basicStack = new CustomStack(this, 'BasicStack', {
 *   description: 'Basic application stack without monitoring dashboard'
 * });
 *
 * // Add widgets - they're tracked even without a dashboard
 * basicStack.addWidget(
 *   new cloudwatch.GraphWidget({
 *     title: 'API Requests',
 *     left: [apiMetric],
 *   })
 * );
 *
 * // Stack with dashboard and custom configuration
 * const monitoredStack = new CustomStack(this, 'MonitoredStack', {
 *   createDashboard: true,
 *   dashboardName: 'production-monitoring',
 *   dashboardDescription: 'Production application monitoring dashboard',
 *   dashboardRemovalPolicy: cdk.RemovalPolicy.RETAIN,
 *   env: { region: 'us-east-1' },
 *   initialWidgets: [
 *     new cloudwatch.GraphWidget({
 *       title: 'Error Rate',
 *       left: [errorMetric],
 *       width: 12,
 *       height: 6,
 *     }),
 *   ],
 * });
 *
 * // Add widgets dynamically during stack construction
 * monitoredStack.addWidgets([
 *   new cloudwatch.SingleValueWidget({
 *     title: 'Total Requests',
 *     metrics: [requestMetric],
 *     width: 12,
 *     height: 6,
 *   }),
 * ]);
 * ```
 *
 * @see CloudWatchDashboard
 * @see cdk.Stack
 * @public
 */
export class CustomStack extends cdk.Stack {
  /**
   * The CloudWatch dashboard created by this stack, if {@link CustomStackProps.createDashboard} is `true`.
   *
   * @remarks
   * This property is only defined when dashboard creation is enabled.
   * Use {@link isDashboardEnabled} to check if a dashboard was created.
   */
  public readonly dashboard?: CloudWatchDashboard;

  /**
   * Registry of all widgets added to this stack.
   *
   * @remarks
   * This array maintains a record of all widgets that have been added to the stack,
   * regardless of whether a dashboard was created. This allows for:
   * - Later dashboard creation with all previously added widgets
   * - Debugging and inspection of monitoring configuration
   * - Potential export of widget configuration for external tools
   */
  public readonly widgets: cloudwatch.IWidget[] = [];

  /**
   * Whether this stack has dashboard creation enabled.
   *
   * @remarks
   * This is a convenience property that indicates whether a dashboard was created
   * during stack construction. Use this to conditionally perform dashboard-related
   * operations without checking for dashboard existence.
   */
  public readonly isDashboardEnabled: boolean;

  /**
   * Create a new CustomStack with optional CloudWatch dashboard integration.
   *
   * @param scope - The construct scope (typically an App or Stage).
   * @param id - Logical ID for this stack.
   * @param props - {@link CustomStackProps} controlling dashboard creation, widget configuration, and standard stack properties.
   */
  constructor(scope: Construct, id: string, props: CustomStackProps = {}) {
    super(scope, id, props);

    const {
      createDashboard = false,
      dashboardName,
      dashboardDescription,
      initialWidgets,
      dashboardRemovalPolicy,
      ...stackProps
    } = props;

    this.isDashboardEnabled = createDashboard;

    // Create dashboard if requested
    if (createDashboard) {
      // Generate default dashboard name from stack ID
      const defaultDashboardName = this.generateDefaultDashboardName(id);
      const defaultDashboardDescription =
        this.generateDefaultDashboardDescription(id);

      this.dashboard = new CloudWatchDashboard(this, `${id}Dashboard`, {
        dashboardName: dashboardName ?? defaultDashboardName,
        dashboardDescription:
          dashboardDescription ?? defaultDashboardDescription,
        initialWidgets,
        removalPolicy: dashboardRemovalPolicy,
      });
    }
  }

  /**
   * Add a single widget to the stack's widget registry and dashboard (if enabled).
   *
   * @param widget - The CloudWatch widget to add
   *
   * @example
   * ```typescript
   * const stack = new CustomStack(this, 'MyStack', { createDashboard: true });
   *
   * stack.addWidget(
   *   new cloudwatch.GraphWidget({
   *     title: 'API Request Rate',
   *     left: [apiRequestMetric],
   *     width: 12,
   *     height: 6,
   *   })
   * );
   * ```
   */
  public addWidget(widget: cloudwatch.IWidget): void {
    this.widgets.push(widget);

    if (this.isDashboardEnabled && this.dashboard) {
      this.dashboard.addWidgets(widget);
    }
  }

  /**
   * Add multiple widgets to the stack's widget registry and dashboard (if enabled).
   *
   * @param widgets - Array of CloudWatch widgets to add
   *
   * @example
   * ```typescript
   * const stack = new CustomStack(this, 'MyStack', { createDashboard: true });
   *
   * stack.addWidgets([
   *   new cloudwatch.GraphWidget({
   *     title: 'Error Rate',
   *     left: [errorMetric],
   *     width: 12,
   *     height: 6,
   *   }),
   *   new cloudwatch.SingleValueWidget({
   *     title: 'Total Errors',
   *     metrics: [totalErrorsMetric],
   *     width: 12,
   *     height: 6,
   *   }),
   * ]);
   * ```
   */
  public addWidgets(widgets: cloudwatch.IWidget[]): void {
    this.widgets.push(...widgets);

    if (this.isDashboardEnabled && this.dashboard) {
      this.dashboard.addWidgets(...widgets);
    }
  }

  /**
   * Get all widgets that have been added to this stack.
   *
   * @returns A copy of the widgets array to prevent external modification
   *
   * @example
   * ```typescript
   * const stack = new CustomStack(this, 'MyStack');
   * stack.addWidget(someWidget);
   *
   * const allWidgets = stack.getWidgets();
   * console.log(`Stack has ${allWidgets.length} widgets`);
   * ```
   */
  public getWidgets(): cloudwatch.IWidget[] {
    return [...this.widgets];
  }

  /**
   * Get the CloudWatch dashboard if one was created.
   *
   * @returns The dashboard instance, or `undefined` if no dashboard was created
   * @throws Error if called when dashboard creation is disabled
   *
   * @example
   * ```typescript
   * const stack = new CustomStack(this, 'MyStack', { createDashboard: true });
   * const dashboard = stack.getDashboard();
   *
   * // Direct access to dashboard methods
   * dashboard.addWidgets(additionalWidget);
   * ```
   */
  public getDashboard(): CloudWatchDashboard {
    if (!this.isDashboardEnabled) {
      throw new Error(
        'Dashboard access requested but createDashboard is false. ' +
          'Set createDashboard: true in CustomStackProps to enable dashboard creation.',
      );
    }

    if (!this.dashboard) {
      throw new Error(
        'Dashboard should exist when createDashboard is true, but dashboard is undefined. ' +
          'This indicates an internal error in CustomStack construction.',
      );
    }

    return this.dashboard;
  }

  /**
   * Generate a default dashboard name from the stack's logical ID.
   *
   * @param stackId - The stack's logical ID
   * @returns A kebab-case dashboard name with '-dashboard' suffix
   *
   * @private
   */
  private generateDefaultDashboardName(stackId: string): string {
    // Convert PascalCase/camelCase to kebab-case and add suffix
    const kebabCase = stackId
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');

    return `${kebabCase}-dashboard`;
  }

  /**
   * Generate a default dashboard description from the stack's logical ID.
   *
   * @param stackId - The stack's logical ID
   * @returns A descriptive string explaining the dashboard's purpose
   *
   * @private
   */
  private generateDefaultDashboardDescription(stackId: string): string {
    return `Dashboard for monitoring resources in the ${stackId} stack`;
  }
}
