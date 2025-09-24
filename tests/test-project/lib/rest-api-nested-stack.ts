import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import type { Construct } from 'constructs';
import { RestApi } from '../../../src/rest-api';

export class RestApiNestedStack extends cdk.NestedStack {
  public readonly minimalApi: RestApi;
  public readonly fullApi: RestApi;

  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    // Minimal REST API configuration - only required properties
    this.minimalApi = new RestApi(this, 'MinimalApi', {
      stageName: 'test',
      description: 'Minimal test API',
      deploy: true,
    });

    // Add a simple resource and method to the minimal API for testing
    const minimalUsers = this.minimalApi.api.root.addResource('users');
    minimalUsers.addMethod(
      'GET',
      new apigw.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({
                users: [
                  { id: 1, name: 'John Doe' },
                  { id: 2, name: 'Jane Smith' },
                ],
              }),
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json': apigw.Model.EMPTY_MODEL,
            },
          },
        ],
      },
    );

    // Full REST API configuration - demonstrating all optional properties
    this.fullApi = new RestApi(this, 'FullApi', {
      // Required properties
      stageName: 'production',
      description: 'Full-featured production API for comprehensive testing',
      deploy: true,

      // Optional CORS configuration for production environment
      defaultCorsPreflightOptions: {
        allowOrigins: ['https://myapp.com', 'https://admin.myapp.com'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent',
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.hours(1),
      },

      // Not a staging environment (production-like settings)
      isStagingEnvironment: false,
    });

    // Add comprehensive API structure to the full API for testing
    const fullUsers = this.fullApi.api.root.addResource('users');
    const fullUserById = fullUsers.addResource('{id}');
    const fullHealth = this.fullApi.api.root.addResource('health');

    // Users collection endpoints
    fullUsers.addMethod(
      'GET',
      new apigw.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({
                users: [
                  { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
                  { id: 2, name: 'Bob Wilson', email: 'bob@example.com' },
                ],
                pagination: {
                  page: 1,
                  limit: 10,
                  total: 2,
                },
              }),
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [{ statusCode: '200' }],
      },
    );

    fullUsers.addMethod(
      'POST',
      new apigw.MockIntegration({
        integrationResponses: [
          {
            statusCode: '201',
            responseTemplates: {
              'application/json': JSON.stringify({
                id: 3,
                name: 'New User',
                email: 'newuser@example.com',
                created: new Date().toISOString(),
              }),
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 201}',
        },
      }),
      {
        methodResponses: [{ statusCode: '201' }],
      },
    );

    // Individual user endpoints
    fullUserById.addMethod(
      'GET',
      new apigw.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({
                id: 1,
                name: 'Alice Johnson',
                email: 'alice@example.com',
                profile: {
                  department: 'Engineering',
                  role: 'Senior Developer',
                },
              }),
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [{ statusCode: '200' }],
      },
    );

    fullUserById.addMethod(
      'PUT',
      new apigw.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({
                id: 1,
                name: 'Updated User',
                email: 'updated@example.com',
                updated: new Date().toISOString(),
              }),
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [{ statusCode: '200' }],
      },
    );

    fullUserById.addMethod(
      'DELETE',
      new apigw.MockIntegration({
        integrationResponses: [
          {
            statusCode: '204',
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 204}',
        },
      }),
      {
        methodResponses: [{ statusCode: '204' }],
      },
    );

    // Health check endpoint
    fullHealth.addMethod(
      'GET',
      new apigw.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                environment: 'production',
              }),
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [{ statusCode: '200' }],
      },
    );

    // Create staging environment API to test isStagingEnvironment feature
    const stagingApi = new RestApi(this, 'StagingApi', {
      stageName: 'staging',
      description: 'Staging API with permissive CORS',
      deploy: true,
      isStagingEnvironment: true, // This enables default permissive CORS
    });

    // Add a simple endpoint to staging API
    const stagingTest = stagingApi.api.root.addResource('test');
    stagingTest.addMethod(
      'GET',
      new apigw.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({
                message: 'Staging API with permissive CORS enabled',
                environment: 'staging',
              }),
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [{ statusCode: '200' }],
      },
    );

    // Create no-deploy API to test deploy: false functionality
    const noDeployApi = new RestApi(this, 'NoDeployApi', {
      stageName: 'development',
      description: 'API with deploy set to false',
      deploy: false,
    });

    // Add resources but no deployment will be created
    const devResource = noDeployApi.api.root.addResource('dev');
    devResource.addMethod(
      'GET',
      new apigw.MockIntegration({
        integrationResponses: [{ statusCode: '200' }],
        requestTemplates: { 'application/json': '{"statusCode": 200}' },
      }),
      {
        methodResponses: [{ statusCode: '200' }],
      },
    );

    // Output the API URLs for testing
    new cdk.CfnOutput(this, 'MinimalApiUrl', {
      value: this.minimalApi.api.url,
      description: 'URL of the minimal REST API',
    });

    new cdk.CfnOutput(this, 'FullApiUrl', {
      value: this.fullApi.api.url,
      description: 'URL of the full-featured REST API',
    });

    new cdk.CfnOutput(this, 'StagingApiUrl', {
      value: stagingApi.api.url,
      description: 'URL of the staging API with permissive CORS',
    });

    // Create API with custom deployment options to test override functionality
    // This demonstrates the new deployment options merging feature where users can
    // override specific deployment settings while keeping defaults for others
    const customDeployApi = new RestApi(this, 'CustomDeployApi', {
      stageName: 'custom',
      description: 'API with custom deployment options',
      deploy: true,

      // Test deployment options override - only override specific options
      deployOptions: {
        loggingLevel: apigw.MethodLoggingLevel.ERROR, // Override: Only log errors
        stageName: 'custom-stage-name', // Override: Custom stage name
        // tracingEnabled and metricsEnabled will use defaults (true)
        // accessLogDestination will use default (CloudWatch logs)
      },

      // Test other property overrides
      retainDeployments: true, // Override default (false)
      cloudWatchRole: false, // Override default (true) - disable CloudWatch role
    });

    // Add a test endpoint to custom deploy API
    const customTest = customDeployApi.api.root.addResource('custom');
    customTest.addMethod(
      'GET',
      new apigw.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({
                message: 'API with custom deployment options',
                stage: 'custom-stage-name',
                logging: 'ERROR level only',
              }),
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [{ statusCode: '200' }],
      },
    );

    // Create API with extended RestApiProps to test new props interface
    // This demonstrates the new Omit<RestApiProps> interface that allows access
    // to all CDK RestApiProps while maintaining the construct's intelligent defaults
    const extendedPropsApi = new RestApi(this, 'ExtendedPropsApi', {
      stageName: 'extended',
      description: 'API demonstrating extended RestApiProps usage',
      deploy: true,

      // Use additional RestApiProps that are now available
      minCompressionSize: cdk.Size.kibibytes(1), // Custom compression
      binaryMediaTypes: ['image/*', 'application/pdf'], // Binary media types
      disableExecuteApiEndpoint: false, // Override default (true)

      // Custom CORS with specific configuration
      defaultCorsPreflightOptions: {
        allowOrigins: ['https://example.com', 'https://api.example.com'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true,
        maxAge: cdk.Duration.minutes(30),
      },
    });

    // Add endpoint to extended props API
    const extendedResource = extendedPropsApi.api.root.addResource('extended');
    extendedResource.addMethod(
      'POST',
      new apigw.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({
                message: 'API with extended RestApiProps',
                features: [
                  'custom compression',
                  'binary media types',
                  'execute endpoint enabled',
                ],
              }),
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [{ statusCode: '200' }],
      },
    );

    // Output URLs for new APIs
    new cdk.CfnOutput(this, 'CustomDeployApiUrl', {
      value: customDeployApi.api.url,
      description: 'URL of the API with custom deployment options',
    });

    new cdk.CfnOutput(this, 'ExtendedPropsApiUrl', {
      value: extendedPropsApi.api.url,
      description: 'URL of the API with extended RestApiProps',
    });
  }
}
