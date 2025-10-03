import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { generateResourceName } from '../../utils';

/**
 * Properties for configuring a RestApi construct.
 *
 * This interface extends selected properties from AWS CDK's RestApiProps while adding
 * custom properties for stage management and environment-specific CORS configuration.
 * The construct automatically configures CloudWatch logging, tracing, and metrics
 * based on the provided properties.
 *
 * @example
 * ```typescript
 * // Production API with strict CORS
 * const prodApi = new RestApi(this, 'ProdApi', {
 *   stageName: 'prod',
 *   description: 'Production API for user management',
 *   deploy: true,
 *   isStagingEnvironment: false,
 *   defaultCorsPreflightOptions: {
 *     allowOrigins: ['https://myapp.com'],
 *     allowMethods: ['GET', 'POST'],
 *     allowHeaders: ['Content-Type', 'Authorization'],
 *   },
 * });
 *
 * // Staging API with permissive CORS
 * const stagingApi = new RestApi(this, 'StagingApi', {
 *   stageName: 'staging',
 *   description: 'Staging API for testing',
 *   deploy: true,
 *   isStagingEnvironment: true, // Enables default permissive CORS
 * });
 * ```
 */
interface ApiProps extends Omit<apigw.RestApiProps, 'description' | 'deploy'> {
  /**
   * The stage name for the API deployment.
   *
   * This is used to name the API and its associated resources, following the pattern:
   * `${constructId}-api-${stageName}`. It helps differentiate between environments
   * like 'dev', 'staging', 'prod', etc.
   *
   * @example 'prod', 'staging', 'dev', 'ephemeral-123'
   */
  stageName: string;

  /**
   * A human-readable description of the API.
   *
   * This description appears in the AWS Console and helps identify the API's purpose.
   * The construct will use this in the format: `${description} ${stageName}`.
   *
   * @example 'User Management API', 'Order Processing Service'
   */
  description: string;

  /**
   * Whether to deploy the API immediately upon creation.
   *
   * When true, the API will be deployed to the specified stage with all configured
   * logging, tracing, and metrics enabled. When false, you'll need to manually
   * deploy the API later.
   *
   * @defaultValue true
   */
  deploy: boolean;

  /**
   * Whether this API is being deployed in a staging/development environment.
   *
   * When true, the construct applies permissive CORS settings by default:
   * - Allow all origins (*)
   * - Allow credentials
   * - Allow common HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS)
   * - Allow all headers (*)
   *
   * This should be false for production environments where explicit CORS
   * configuration should be provided via `defaultCorsPreflightOptions`.
   *
   * @defaultValue false
   */
  isStagingEnvironment?: boolean;
}

/**
 * A REST API construct that creates and configures an AWS API Gateway with best practices.
 *
 * This construct simplifies the creation of REST APIs by providing:
 * - Regional endpoint configuration for better performance and security
 * - Automatic CloudWatch logging with configurable retention
 * - Distributed tracing and metrics collection
 * - Stage-aware CORS configuration
 * - Security-focused defaults (disabled execute-api endpoint)
 * - Structured naming conventions for multi-environment deployments
 *
 * The construct automatically sets up comprehensive observability through CloudWatch
 * logs, AWS X-Ray tracing, and CloudWatch metrics. For staging environments, it can
 * apply permissive CORS settings suitable for development, while production
 * environments require explicit CORS configuration.
 *
 * @example
 * ```typescript
 * // Basic production API
 * const api = new RestApi(this, 'UserApi', {
 *   stageName: 'prod',
 *   description: 'User Management API',
 *   deploy: true,
 *   defaultCorsPreflightOptions: {
 *     allowOrigins: ['https://myapp.com'],
 *     allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
 *     allowHeaders: ['Content-Type', 'Authorization'],
 *     allowCredentials: true,
 *   },
 * });
 *
 * // Add resources and methods to the API
 * const users = api.api.root.addResource('users');
 * users.addMethod('GET', new apigw.LambdaIntegration(getUsersFunction));
 * users.addMethod('POST', new apigw.LambdaIntegration(createUserFunction));
 *
 * // Development API with permissive CORS
 * const devApi = new RestApi(this, 'DevApi', {
 *   stageName: 'dev',
 *   description: 'Development API',
 *   deploy: true,
 *   isStagingEnvironment: true, // Enables permissive CORS
 * });
 * ```
 *
 * @remarks
 * The construct creates the following AWS resources:
 * - API Gateway REST API with regional endpoint
 * - CloudWatch Log Group for access logging (1-day retention)
 * - API Gateway deployment with stage configuration
 * - CloudWatch role for API Gateway logging
 *
 * Security considerations:
 * - Execute API endpoint is disabled by default for security
 * - CloudWatch role is automatically created for audit logging
 * - CORS should be explicitly configured for production environments
 */
export class RestApi extends Construct {
  /**
   * The underlying AWS API Gateway REST API instance.
   *
   * This provides direct access to the API Gateway for adding resources, methods,
   * and integrations. You can use this to:
   * - Add resources: `api.root.addResource('users')`
   * - Add methods: `resource.addMethod('GET', integration)`
   * - Configure authorizers, validators, and other API Gateway features
   *
   * @example
   * ```typescript
   * const restApi = new RestApi(this, 'MyApi', { ... });
   *
   * // Add a resource
   * const users = restApi.api.root.addResource('users');
   *
   * // Add methods with integrations
   * users.addMethod('GET', new apigw.LambdaIntegration(listUsersFunction));
   * users.addMethod('POST', new apigw.LambdaIntegration(createUserFunction));
   *
   * // Add nested resources
   * const userById = users.addResource('{id}');
   * userById.addMethod('GET', new apigw.LambdaIntegration(getUserFunction));
   * ```
   */
  public readonly api: apigw.RestApi;

  /**
   * Default CORS configuration applied to staging environments.
   *
   * This permissive configuration is suitable for development and testing
   * environments but should not be used in production. It includes:
   * - All origins allowed (*)
   * - Credentials allowed
   * - Common HTTP methods (OPTIONS, POST, GET, PUT, DELETE, PATCH)
   * - All headers allowed (*)
   *
   * @internal
   */
  private readonly defaultCorsOpitions: apigw.CorsOptions = {
    allowOrigins: apigw.Cors.ALL_ORIGINS,
    allowCredentials: true,
    allowMethods: ['OPTIONS', 'POST', 'GET', 'PUT', 'DELETE', 'PATCH'],
    allowHeaders: ['*'],
  };

  /**
   * Creates a new RestApi construct with comprehensive API Gateway configuration.
   *
   * The constructor sets up a REST API with the following features:
   * - Regional endpoint for improved performance and security
   * - CloudWatch logging with 1-day retention for cost optimization
   * - AWS X-Ray tracing for request tracking
   * - CloudWatch metrics for monitoring
   * - Stage-aware CORS configuration
   * - Disabled execute-api endpoint for security
   *
   * @param scope - The parent construct (typically a Stack or Stage)
   * @param id - A unique identifier for this construct within the scope
   * @param props - Configuration properties for the REST API
   *
   * @example
   * ```typescript
   * // Production API with explicit CORS
   * const prodApi = new RestApi(this, 'ProductionAPI', {
   *   stageName: 'prod',
   *   description: 'Production User Management API',
   *   deploy: true,
   *   defaultCorsPreflightOptions: {
   *     allowOrigins: ['https://myapp.com', 'https://admin.myapp.com'],
   *     allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
   *     allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
   *     allowCredentials: true,
   *   },
   * });
   *
   * // Development API with auto-CORS
   * const devApi = new RestApi(this, 'DevelopmentAPI', {
   *   stageName: 'dev',
   *   description: 'Development API',
   *   deploy: true,
   *   isStagingEnvironment: true,
   * });
   * ```
   *
   * @throws Will throw an error if the API Gateway creation fails
   *
   * @remarks
   * The construct automatically creates:
   * - A CloudWatch Log Group named `${id}ApiLogs` with 1-day retention
   * - An API Gateway REST API named `${id}-api-${stageName}`
   * - A deployment stage named 'api' with logging and tracing enabled
   * - A CloudWatch role for API Gateway service logging
   */
  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const corsOptions: apigw.CorsOptions | undefined =
      props.defaultCorsPreflightOptions ??
      (props.isStagingEnvironment ? this.defaultCorsOpitions : undefined);

    const defaultProps: apigw.RestApiProps = {
      endpointTypes: [apigw.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: corsOptions,
      cloudWatchRole: true,
      retainDeployments: false,
      restApiName: generateResourceName(
        props.stageName,
        id.toLowerCase(),
        'api',
      ),
      disableExecuteApiEndpoint: true,
      deploy: true,
      ...(props.deploy !== false && {
        deployOptions: {
          stageName: props.stageName,
          loggingLevel: apigw.MethodLoggingLevel.INFO,
          tracingEnabled: true,
          metricsEnabled: true,
          accessLogDestination: new apigw.LogGroupLogDestination(
            new logs.LogGroup(this, `${id}ApiLogs`, {
              removalPolicy: cdk.RemovalPolicy.DESTROY,
              retention: logs.RetentionDays.ONE_DAY,
            }),
          ),
        },
      }),
    };

    this.api = new apigw.RestApi(this, `${id}Api`, {
      ...defaultProps,
      ...props,
      // Remove deployOptions from props if deploy is false
      ...(props.deploy === false && { deployOptions: undefined }),
      // Add merged deployOptions if deploy is not false
      ...(props.deploy !== false && {
        deployOptions: {
          ...defaultProps.deployOptions,
          ...props.deployOptions,
        },
      }),
    });
  }
}
