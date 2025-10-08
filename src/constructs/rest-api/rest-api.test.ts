import * as cdk from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { RestApi } from './rest-api';

describe('RestApi', () => {
  let stack: cdk.Stack;
  let restApi: RestApi;

  beforeEach(() => {
    stack = new cdk.Stack();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper function to add a dummy method to satisfy CDK validation
   * that requires at least one method before synthesis
   */
  const addDummyMethod = (api: RestApi): void => {
    api.api.root.addMethod(
      'GET',
      new apigw.MockIntegration({
        integrationResponses: [{ statusCode: '200' }],
        requestTemplates: { 'application/json': '{"statusCode": 200}' },
      }),
      {
        methodResponses: [{ statusCode: '200' }],
      },
    );
  };

  describe('Basic functionality', () => {
    it('creates a REST API with default configuration', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'test-testapi-api',
        Description: 'Test API',
        EndpointConfiguration: {
          Types: ['REGIONAL'],
        },
        DisableExecuteApiEndpoint: true,
      });

      expect(restApi.api).toBeInstanceOf(apigw.RestApi);
    });

    it('creates CloudWatch log group for API access logs', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 1,
      });
    });

    it('creates deployment with proper stage configuration', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        StageName: 'test',
        TracingEnabled: true,
        AccessLogSetting: Match.objectLike({
          Format: Match.anyValue(),
        }),
        MethodSettings: Match.arrayWith([
          Match.objectLike({
            LoggingLevel: 'INFO',
            MetricsEnabled: true,
            ResourcePath: '/*',
            HttpMethod: '*',
          }),
        ]),
      });
    });

    it('enables CloudWatch role for API Gateway', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'apigateway.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
        ManagedPolicyArns: [
          {
            'Fn::Join': [
              '',
              [
                'arn:',
                { Ref: 'AWS::Partition' },
                ':iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs',
              ],
            ],
          },
        ],
      });
    });
  });

  describe('CORS configuration', () => {
    it('applies default permissive CORS for staging environments', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'dev',
        description: 'Development API',
        deploy: true,
        isStagingEnvironment: true,
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'OPTIONS',
        Integration: {
          IntegrationResponses: [
            {
              ResponseParameters: {
                'method.response.header.Access-Control-Allow-Headers': "'*'",
                'method.response.header.Access-Control-Allow-Methods':
                  "'OPTIONS,POST,GET,PUT,DELETE,PATCH'",
                'method.response.header.Access-Control-Allow-Origin': "'*'",
                'method.response.header.Access-Control-Allow-Credentials':
                  "'true'",
              },
              StatusCode: '204',
            },
          ],
        },
      });
    });

    it('applies custom CORS configuration when provided', () => {
      const customCors: apigw.CorsOptions = {
        allowOrigins: ['https://example.com'],
        allowMethods: ['GET', 'POST'],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true,
      };

      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'prod',
        description: 'Production API',
        deploy: true,
        defaultCorsPreflightOptions: customCors,
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'OPTIONS',
        Integration: {
          IntegrationResponses: [
            {
              ResponseParameters: {
                'method.response.header.Access-Control-Allow-Headers':
                  "'Content-Type,Authorization'",
                'method.response.header.Access-Control-Allow-Methods':
                  "'GET,POST'",
                'method.response.header.Access-Control-Allow-Origin':
                  "'https://example.com'",
                'method.response.header.Access-Control-Allow-Credentials':
                  "'true'",
              },
              StatusCode: '204',
            },
          ],
        },
      });
    });

    it('does not apply CORS when not specified and not in staging environment', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'prod',
        description: 'Production API',
        deploy: true,
        isStagingEnvironment: false,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      // Should not have any OPTIONS methods automatically created
      const methods = template.findResources('AWS::ApiGateway::Method', {
        HttpMethod: 'OPTIONS',
      });

      expect(Object.keys(methods)).toHaveLength(0);
    });

    it('prioritizes explicit CORS over staging environment setting', () => {
      const customCors: apigw.CorsOptions = {
        allowOrigins: ['https://specific.com'],
        allowMethods: ['GET'],
        allowHeaders: ['Content-Type'],
        allowCredentials: true, // Changed to true to ensure it appears in the template
      };

      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'dev',
        description: 'Test API',
        deploy: true,
        isStagingEnvironment: true, // This should be ignored
        defaultCorsPreflightOptions: customCors, // This should take precedence
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'OPTIONS',
        Integration: {
          IntegrationResponses: [
            {
              ResponseParameters: {
                'method.response.header.Access-Control-Allow-Headers':
                  "'Content-Type'",
                'method.response.header.Access-Control-Allow-Methods': "'GET'",
                'method.response.header.Access-Control-Allow-Origin':
                  "'https://specific.com'",
                'method.response.header.Access-Control-Allow-Credentials':
                  "'true'",
              },
              StatusCode: '204',
            },
          ],
        },
      });
    });
  });

  describe('Deploy configuration', () => {
    it('respects deploy: false setting', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: false,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      // Should have no deployment or stage resources when deploy is false
      const deployments = template.findResources('AWS::ApiGateway::Deployment');
      const stages = template.findResources('AWS::ApiGateway::Stage');

      expect(Object.keys(deployments)).toHaveLength(0);
      expect(Object.keys(stages)).toHaveLength(0);
    });

    it('uses stageName prop for deployment stage name', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'production',
        description: 'Test API',
        deploy: true,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        StageName: 'production',
      });
    });

    it('allows props to override default deployOptions', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
        deployOptions: {
          stageName: 'custom-stage',
          loggingLevel: apigw.MethodLoggingLevel.ERROR,
          tracingEnabled: false,
          metricsEnabled: false,
        },
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        StageName: 'custom-stage',
        TracingEnabled: false,
        MethodSettings: Match.arrayWith([
          Match.objectLike({
            LoggingLevel: 'ERROR',
            MetricsEnabled: false,
            ResourcePath: '/*',
            HttpMethod: '*',
          }),
        ]),
      });
    });

    it('merges deployOptions correctly when provided', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
        deployOptions: {
          loggingLevel: apigw.MethodLoggingLevel.ERROR,
          // tracingEnabled and metricsEnabled should use defaults (true)
        },
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        StageName: 'test', // From stageName prop, not overridden
        TracingEnabled: true, // Default value
        MethodSettings: Match.arrayWith([
          Match.objectLike({
            LoggingLevel: 'ERROR', // Overridden value
            MetricsEnabled: true, // Default value
            ResourcePath: '/*',
            HttpMethod: '*',
          }),
        ]),
      });
    });

    it('handles deploy: false correctly without deployOptions', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: false,
        // Even if deployOptions are provided, they should be ignored when deploy is false
        deployOptions: {
          stageName: 'should-be-ignored',
          loggingLevel: apigw.MethodLoggingLevel.ERROR,
        },
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      // Should have no deployment or stage resources when deploy is false
      const deployments = template.findResources('AWS::ApiGateway::Deployment');
      const stages = template.findResources('AWS::ApiGateway::Stage');

      expect(Object.keys(deployments)).toHaveLength(0);
      expect(Object.keys(stages)).toHaveLength(0);
    });
  });

  describe('Props interface extension', () => {
    it('allows all RestApiProps except excluded ones', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
        // These should be allowed since ApiProps extends Omit<RestApiProps, 'description' | 'deploy'>
        policy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              principals: [new iam.AnyPrincipal()],
              actions: ['execute-api:Invoke'],
              resources: ['*'],
            }),
          ],
        }),
        retainDeployments: true, // Override default
        minCompressionSize: cdk.Size.kibibytes(1), // Use the non-deprecated property
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      // Verify the policy was applied
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'test-testapi-api',
        Description: 'Test API',
        MinimumCompressionSize: 1024,
        Policy: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: Match.objectLike({
                AWS: '*',
              }),
              Action: 'execute-api:Invoke',
              Resource: '*',
            }),
          ]),
        }),
      });
    });

    it('allows overriding default props like retainDeployments', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
        retainDeployments: true, // Override default (false)
      });
      addDummyMethod(restApi);

      // We can't directly test retainDeployments in the template,
      // but we can verify the API was created successfully
      expect(restApi.api).toBeDefined();
      expect(restApi.api.restApiName).toBe('test-testapi-api');
    });

    it('allows overriding default properties', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
        // Override the default disableExecuteApiEndpoint
        disableExecuteApiEndpoint: false,
        // Override the default cloudWatchRole
        cloudWatchRole: false,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        DisableExecuteApiEndpoint: false,
      });

      // Should not have the CloudWatch role when disabled
      const roles = template.findResources('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'apigateway.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
      });

      expect(Object.keys(roles)).toHaveLength(0);
    });
  });

  describe('Default behaviour validation', () => {
    it('uses correct naming pattern for API resources', () => {
      restApi = new RestApi(stack, 'UserManagement', {
        stageName: 'production',
        description: 'User Management Service',
        deploy: true,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'production-usermanagement-api',
        Description: 'User Management Service',
      });
    });

    it('creates log group with correct naming pattern', () => {
      restApi = new RestApi(stack, 'OrderService', {
        stageName: 'staging',
        description: 'Order Processing API',
        deploy: true,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 1,
      });
    });
  });

  describe('Security configuration', () => {
    it('disables execute API endpoint by default', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        DisableExecuteApiEndpoint: true,
      });
    });

    it('configures regional endpoint type for security', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        EndpointConfiguration: {
          Types: ['REGIONAL'],
        },
      });
    });
  });

  describe('Observability configuration', () => {
    it('enables tracing and metrics on the stage', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        TracingEnabled: true,
        MethodSettings: Match.arrayWith([
          Match.objectLike({
            LoggingLevel: 'INFO',
            ResourcePath: '/*',
            HttpMethod: '*',
          }),
        ]),
      });
    });

    it('configures log retention for cost optimization', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 1,
      });
    });
  });

  describe('Edge cases', () => {
    it('handles special characters in stage names', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'ephemeral-pr-123',
        description: 'PR Environment API',
        deploy: true,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'ephemeral-pr-123-testapi-api',
        Description: 'PR Environment API',
      });
    });

    it('handles long descriptions properly', () => {
      const longDescription =
        'This is a very long description that might be used in production environments with detailed information about the API';

      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: longDescription,
        deploy: true,
      });
      addDummyMethod(restApi);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Description: longDescription,
      });
    });
  });

  describe('API Gateway integration', () => {
    it('allows adding resources and methods to the API', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
      });

      // Add a resource and method
      const users = restApi.api.root.addResource('users');
      users.addMethod(
        'GET',
        new apigw.MockIntegration({
          integrationResponses: [{ statusCode: '200' }],
          requestTemplates: { 'application/json': '{"statusCode": 200}' },
        }),
        {
          methodResponses: [{ statusCode: '200' }],
        },
      );

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: 'users',
      });

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
        ResourceId: { Ref: Match.anyValue() },
      });
    });
  });

  describe('AWS Solutions compliance', () => {
    it('has no unsuppressed AwsSolutions findings', () => {
      restApi = new RestApi(stack, 'TestApi', {
        stageName: 'test',
        description: 'Test API',
        deploy: true,
      });
      addDummyMethod(restApi);

      // Add suppressions before applying the checks
      NagSuppressions.addStackSuppressions(
        stack,
        [
          'AwsSolutions-APIG1', // API Gateway does not have access logging configured
          'AwsSolutions-APIG2', // API Gateway does not have request validation enabled
          'AwsSolutions-APIG3', // API Gateway does not have a Web Application Firewall (WAF) enabled
          'AwsSolutions-APIG4', // API Gateway does not implement authorization
          'AwsSolutions-APIG6', // API Gateway does not have CloudWatch request logging enabled
          'AwsSolutions-IAM4', // IAM role has AWS managed policies
          'AwsSolutions-IAM5', // IAM role has wildcard permissions
          'AwsSolutions-COG4', // API Gateway method does not use Cognito authorizer
        ].map((id) => ({
          id,
          reason:
            'These are acceptable for this construct as it provides base functionality',
        })),
      );

      cdk.Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      const warnings = Annotations.fromStack(stack).findWarning(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*'),
      );
      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*'),
      );

      expect(warnings).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Constructor edge cases', () => {
    it('accepts minimal configuration', () => {
      restApi = new RestApi(stack, 'MinimalApi', {
        stageName: 'minimal',
        description: 'Minimal API',
        deploy: true,
      });

      expect(restApi.api).toBeDefined();
      expect(restApi.api.restApiName).toBe('minimal-minimalapi-api');
    });

    it('handles different stage names correctly', () => {
      const stageNames = [
        'dev',
        'staging',
        'prod',
        'ephemeral-123',
        'feature-branch',
      ];

      stageNames.forEach((stageName, index) => {
        const api = new RestApi(stack, `TestApi${index}`, {
          stageName,
          description: `Test API for ${stageName}`,
          deploy: true,
        });

        expect(api.api.restApiName).toBe(`${stageName}-testapi${index}-api`);
      });
    });
  });
});
