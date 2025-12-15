import * as cdk from 'aws-cdk-lib';
import * as codeDeploy from 'aws-cdk-lib/aws-codedeploy';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import type { Construct } from 'constructs';
import { ProgressiveLambda } from '../../../src/constructs/progressive-lambda';

export class ProgressiveLambdaNestedStack extends cdk.NestedStack {
  public readonly progressiveLambda: ProgressiveLambda;
  public readonly application: codeDeploy.LambdaApplication;
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    // Create CodeDeploy application for progressive deployments
    this.application = new codeDeploy.LambdaApplication(
      this,
      'TestApplication',
      {
        applicationName: 'progressive-lambda-test-app',
      },
    );

    // Create SNS topic for alarm notifications
    this.alertTopic = new sns.Topic(this, 'AlertTopic', {
      displayName: 'Progressive Lambda Test Alerts',
    });

    // Create the Progressive Lambda with test configuration
    this.progressiveLambda = new ProgressiveLambda(this, 'ProgressiveLambda', {
      // Lambda function configuration
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Test progressive lambda handler', JSON.stringify(event));

          // Simulate some processing
          const success = Math.random() > 0.1; // 90% success rate for testing

          if (success) {
            return {
              statusCode: 200,
              body: JSON.stringify({
                message: 'Test function executed successfully',
                timestamp: new Date().toISOString(),
              }),
            };
          } else {
            throw new Error('Simulated processing error for testing');
          }
        };
      `),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_24_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,

      // Progressive deployment configuration
      stageName: 'test',
      application: this.application,
      deploymentConfig:
        codeDeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmEnabled: true,
      snsTopic: this.alertTopic,

      // CloudWatch metrics configuration
      namespace: 'TestProject/ProgressiveLambda',
      serviceName: 'TestFunction',
      metricSuccessName: 'TestSuccess',
      metricSuccessNameTitle: 'Test Function Success Count',
      metricErrorName: 'TestErrors',
      metricErrorNameTitle: 'Test Function Error Count',
      region: cdk.Stack.of(this).region,

      // Enable widgets for testing dashboard functionality
      createWidget: true,

      // Additional test environment configuration
      environment: {
        STAGE: 'test',
        LOG_LEVEL: 'DEBUG',
      },
    });
  }
}
