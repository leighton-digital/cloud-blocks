import { RemovalPolicy } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

import type { Construct } from 'constructs';

/**
 * Properties for configuring a CloudWatchDashboard construct.
 *
 * This interface extends CloudWatch DashboardProps but excludes properties that are
 * automatically managed by the construct. The following properties are automatically set:
 * - widgets: Initially populated with a description widget based on dashboardDescription
 *
 * @example
 * ```typescript
 * const dashboard = new CloudWatchDashboard(this, 'MyDashboard', {
 *   dashboardName: 'my-application-dashboard',
 *   dashboardDescription: 'Dashboard for monitoring my application',
 *   periodOverride: cloudwatch.PeriodOverride.INHERIT,
 *   removalPolicy: RemovalPolicy.RETAIN, // Optional: defaults to DESTROY
 * });
 * ```
 */
export interface CloudWatchDashboardProps
  extends Omit<cloudwatch.DashboardProps, 'widgets'> {
  /**
   * A descriptive text that will be displayed at the top of the dashboard as a text widget.
   * This provides context and documentation for the dashboard's purpose.
   *
   * @example 'This dashboard monitors the health and performance of our API Gateway and CloudFront distribution.'
   */
  dashboardDescription: string;

  /**
   * Optional initial widgets to add to the dashboard in addition to the description widget.
   * The description widget will always be added first, followed by these widgets.
   *
   * @defaultValue No additional widgets are added initially
   */
  initialWidgets?: cloudwatch.IWidget[];

  /**
   * Policy to apply when the dashboard is removed from the stack.
   *
   * @defaultValue RemovalPolicy.DESTROY - The dashboard will be deleted when the stack is deleted
   */
  removalPolicy?: RemovalPolicy;
}

/**
 * A CloudWatch dashboard construct with sensible defaults and built-in description widget.
 *
 * This construct extends the CloudWatch Dashboard directly and provides:
 * - A prominent text widget displaying the dashboard description at the top
 * - Optional initial widgets that can be specified during construction
 * - Direct access to all CloudWatch Dashboard methods and properties
 * - Automatic removal policy application for easy teardown in ephemeral environments
 *
 * The construct follows AWS best practices for dashboard design by including
 * descriptive documentation directly in the dashboard interface.
 *
 * @example
 * ```typescript
 * // Basic usage with description only
 * const dashboard = new CloudWatchDashboard(this, 'AppDashboard', {
 *   dashboardName: 'application-monitoring',
 *   dashboardDescription: 'Monitors API performance and error rates'
 * });
 *
 * // Add widgets after creation - direct dashboard access
 * dashboard.addWidgets(
 *   new cloudwatch.GraphWidget({
 *     title: 'API Requests',
 *     left: [apiRequestMetric],
 *   })
 * );
 *
 * // Advanced usage with initial widgets and custom removal policy
 * const advancedDashboard = new CloudWatchDashboard(this, 'DetailedDashboard', {
 *   dashboardName: 'detailed-monitoring',
 *   dashboardDescription: 'Comprehensive monitoring for production workloads',
 *   periodOverride: cloudwatch.PeriodOverride.AUTO,
 *   removalPolicy: RemovalPolicy.RETAIN, // Keep dashboard when stack is deleted
 *   initialWidgets: [
 *     new cloudwatch.GraphWidget({
 *       title: 'Error Rate',
 *       left: [errorRateMetric],
 *       width: 12,
 *       height: 6,
 *     }),
 *     new cloudwatch.SingleValueWidget({
 *       title: 'Total Requests',
 *       metrics: [totalRequestsMetric],
 *       width: 12,
 *       height: 6,
 *     }),
 *   ],
 * });
 * ```
 */
export class CloudWatchDashboard extends cloudwatch.Dashboard {
  /**
   * Create a new CloudWatch dashboard with description widget and optional initial widgets.
   *
   * @param scope - The construct scope.
   * @param id - Logical ID for this construct.
   * @param props - {@link CloudWatchDashboardProps} controlling dashboard name, description, and optional initial widgets.
   */
  constructor(scope: Construct, id: string, props: CloudWatchDashboardProps) {
    // Extract special props and pass remaining props to the Dashboard constructor
    const {
      initialWidgets,
      dashboardDescription,
      removalPolicy,
      ...dashboardProps
    } = props;

    super(scope, id, dashboardProps);

    // Create the description widget that will appear at the top of the dashboard
    const descriptionWidget = new cloudwatch.TextWidget({
      markdown: dashboardDescription,
      width: 24,
      height: 2,
    });

    // Add the description widget first
    this.addWidgets(descriptionWidget);

    // Add any initial widgets provided
    if (initialWidgets) {
      this.addWidgets(...initialWidgets);
    }

    // Apply the specified removal policy, defaulting to DESTROY for easy cleanup
    this.applyRemovalPolicy(removalPolicy ?? RemovalPolicy.DESTROY);
  }
}
