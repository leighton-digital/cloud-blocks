import * as cdk from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import * as codeDeploy from 'aws-cdk-lib/aws-codedeploy';
import * as sns from 'aws-cdk-lib/aws-sns';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import {
  ProgressiveLambda,
  type ProgressiveLambdaProps,
} from './progressive-lambda';

describe('ProgressiveLambda', () => {
  let stack: cdk.Stack;
  let defaultConfig: ProgressiveLambdaProps;
  let progressiveLambda: ProgressiveLambda;
  let mockApplication: codeDeploy.LambdaApplication;
  let mockSnsTopic: sns.Topic;

  beforeEach(() => {
    stack = new cdk.Stack();

    // Create required dependencies
    mockApplication = new codeDeploy.LambdaApplication(
      stack,
      'TestApplication',
    );
    mockSnsTopic = new sns.Topic(stack, 'TestTopic');

    defaultConfig = {
      stageName: 'dev',
      application: mockApplication,
      deploymentConfig:
        codeDeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmEnabled: true,
      snsTopic: mockSnsTopic,
      namespace: 'TestNamespace',
      serviceName: 'TestService',
      metricSuccessName: 'SuccessMetric',
      metricSuccessNameTitle: 'Success Metric Title',
      metricErrorName: 'ErrorMetric',
      metricErrorNameTitle: 'Error Metric Title',
      region: 'us-east-1',
      code: cdk.aws_lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Test lambda handler', event);
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Test lambda function',
            }),
          };
        };
      `),
      handler: 'index.handler',
      runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
    };

    progressiveLambda = new ProgressiveLambda(
      stack,
      'TestProgressiveLambda',
      defaultConfig,
    );
  });

  describe('Basic functionality', () => {
    it('should create the construct with required properties', () => {
      expect(progressiveLambda).toBeDefined();
      expect(progressiveLambda.lambda).toBeDefined();
      expect(progressiveLambda.alias).toBeDefined();
      expect(progressiveLambda.alarm).toBeDefined();
      expect(progressiveLambda.deploymentGroup).toBeDefined();
    });

    it('should create widgets when createWidget is true', () => {
      const progressiveLambdaWithWidgets = new ProgressiveLambda(
        stack,
        'TestProgressiveLambdaWidgets',
        {
          ...defaultConfig,
          createWidget: true,
        },
      );

      expect(progressiveLambdaWithWidgets.widgets).toHaveLength(3);
    });

    it('should not create widgets when createWidget is false or undefined', () => {
      expect(progressiveLambda.widgets).toHaveLength(0);
    });

    it('should create alias with correct stage name', () => {
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Alias', {
        Name: 'dev',
      });
    });
  });

  describe('CloudFormation template', () => {
    it('should create expected resources', () => {
      const template = Template.fromStack(stack);

      // Lambda function
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs22.x',
        Handler: 'index.handler',
        TracingConfig: {
          Mode: 'Active',
        },
        Timeout: 30,
        MemorySize: 1024,
      });

      // Lambda alias
      template.hasResourceProperties('AWS::Lambda::Alias', {
        Name: 'dev',
      });

      // CloudWatch alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription: Match.stringLikeRegexp('.*deployment errors.*'),
        MetricName: 'ErrorMetric',
        Namespace: 'TestNamespace',
        Threshold: 10,
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        EvaluationPeriods: 1,
      });

      // CodeDeploy deployment group
      template.hasResourceProperties('AWS::CodeDeploy::DeploymentGroup', {
        ApplicationName: Match.anyValue(),
        DeploymentConfigName:
          'CodeDeployDefault.LambdaLinear10PercentEvery1Minute',
      });
    });

    it('should have correct resource count', () => {
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::Lambda::Function', 1);
      template.resourceCountIs('AWS::Lambda::Alias', 1);
      template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
      template.resourceCountIs('AWS::CodeDeploy::DeploymentGroup', 1);
    });

    it('should configure alarm with correct dimensions', () => {
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        Dimensions: [
          {
            Name: 'service',
            Value: 'TestService',
          },
        ],
      });
    });
  });

  describe('CDK Nag compliance', () => {
    let nagApp: cdk.App;
    let nagStack: cdk.Stack;

    beforeEach(() => {
      nagApp = new cdk.App();
      nagStack = new cdk.Stack(nagApp, 'TestStack');

      const nagApplication = new codeDeploy.LambdaApplication(
        nagStack,
        'NagApplication',
      );
      const nagSnsTopic = new sns.Topic(nagStack, 'NagTopic');

      new ProgressiveLambda(nagStack, 'NagProgressiveLambda', {
        ...defaultConfig,
        application: nagApplication,
        snsTopic: nagSnsTopic,
      });

      // Add necessary suppressions for common CDK Nag violations
      NagSuppressions.addResourceSuppressions(nagSnsTopic, [
        {
          id: 'AwsSolutions-SNS3',
          reason: 'Test environment - SSL enforcement not required for test',
        },
      ]);

      NagSuppressions.addResourceSuppressionsByPath(
        nagStack,
        [
          '/TestStack/NagProgressiveLambda/NagProgressiveLambda/ServiceRole/Resource',
          '/TestStack/NagProgressiveLambda/NagProgressiveLambdaCanaryDeployment/ServiceRole/Resource',
        ],
        [
          {
            id: 'AwsSolutions-IAM4',
            reason:
              'Using AWS managed policies for standard Lambda and CodeDeploy execution roles',
            appliesTo: [
              'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
              'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSCodeDeployRoleForLambdaLimited',
            ],
          },
        ],
      );

      // Suppress IAM5 for X-Ray tracing permissions
      NagSuppressions.addResourceSuppressionsByPath(
        nagStack,
        [
          '/TestStack/NagProgressiveLambda/NagProgressiveLambda/ServiceRole/DefaultPolicy/Resource',
        ],
        [
          {
            id: 'AwsSolutions-IAM5',
            reason:
              'X-Ray tracing requires wildcard permissions for trace segments',
            appliesTo: ['Resource::*'],
          },
        ],
      );

      // Apply cdk-nag checks
      cdk.Aspects.of(nagApp).add(new AwsSolutionsChecks({ verbose: true }));
    });

    it('should pass cdk-nag checks', () => {
      const warnings = Annotations.fromStack(nagStack).findWarning(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*'),
      );

      const errors = Annotations.fromStack(nagStack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*'),
      );

      // Log any violations for debugging
      if (warnings.length) {
        console.warn('CDK Nag Warnings:', warnings);
      }
      if (errors.length) {
        console.error('CDK Nag Errors:', errors);
      }

      // Expect no violations (or only suppressed ones)
      expect(errors).toHaveLength(0);
    });
  });

  describe('Widget functionality', () => {
    it('should create success metric widget when createWidget is true', () => {
      const progressiveLambdaWithWidgets = new ProgressiveLambda(
        stack,
        'TestProgressiveLambdaWidgets',
        {
          ...defaultConfig,
          createWidget: true,
        },
      );

      const widgets = progressiveLambdaWithWidgets.widgets;
      expect(widgets).toHaveLength(3);

      // Verify widget types exist (we can't easily test widget content without more complex setup)
      const [successWidget, errorWidget, alarmWidget] = widgets;
      expect(successWidget).toBeDefined(); // Success metric widget
      expect(errorWidget).toBeDefined(); // Error metric widget
      expect(alarmWidget).toBeDefined(); // Alarm status widget
    });

    it('should handle different deployment configurations', () => {
      const progressiveLambdaCanary = new ProgressiveLambda(
        stack,
        'CanaryLambda',
        {
          ...defaultConfig,
          deploymentConfig:
            codeDeploy.LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
        },
      );

      expect(progressiveLambdaCanary.deploymentGroup).toBeDefined();

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CodeDeploy::DeploymentGroup', {
        DeploymentConfigName: 'CodeDeployDefault.LambdaCanary10Percent5Minutes',
      });
    });

    it('should handle disabled alarms', () => {
      const progressiveLambdaDisabledAlarm = new ProgressiveLambda(
        stack,
        'DisabledAlarmLambda',
        {
          ...defaultConfig,
          alarmEnabled: false,
        },
      );

      expect(progressiveLambdaDisabledAlarm.alarm).toBeDefined();

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        ActionsEnabled: false,
      });
    });
  });

  describe('Alarm configuration', () => {
    it('should use default alarm configuration when not specified', () => {
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        Threshold: 10,
        EvaluationPeriods: 1,
        TreatMissingData: 'notBreaching',
      });
    });

    it('should use custom alarm configuration when provided', () => {
      const customAlarmLambda = new ProgressiveLambda(
        stack,
        'CustomAlarmLambda',
        {
          ...defaultConfig,
          alarmConfiguration: {
            threshold: 5,
            evaluationPeriods: 2,
            treatMissingData: cdk.aws_cloudwatch.TreatMissingData.BREACHING,
          },
        },
      );

      expect(customAlarmLambda.alarm).toBeDefined();

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        Threshold: 5,
        EvaluationPeriods: 2,
        TreatMissingData: 'breaching',
      });
    });

    it('should merge custom alarm configuration with defaults', () => {
      const partialCustomAlarmLambda = new ProgressiveLambda(
        stack,
        'PartialCustomAlarmLambda',
        {
          ...defaultConfig,
          alarmConfiguration: {
            threshold: 15, // Only override threshold
          },
        },
      );

      expect(partialCustomAlarmLambda.alarm).toBeDefined();

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        Threshold: 15, // Custom value
        EvaluationPeriods: 1, // Default value
        TreatMissingData: 'notBreaching', // Default value
      });
    });

    it('should handle different TreatMissingData options', () => {
      const ignoreMissingDataLambda = new ProgressiveLambda(
        stack,
        'IgnoreMissingDataLambda',
        {
          ...defaultConfig,
          alarmConfiguration: {
            treatMissingData: cdk.aws_cloudwatch.TreatMissingData.IGNORE,
          },
        },
      );

      expect(ignoreMissingDataLambda.alarm).toBeDefined();

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        TreatMissingData: 'ignore',
      });
    });

    it('should validate alarm configuration preserves other properties', () => {
      new ProgressiveLambda(stack, 'ValidateAlarmLambda', {
        ...defaultConfig,
        alarmConfiguration: {
          threshold: 20,
          evaluationPeriods: 3,
        },
      });

      const template = Template.fromStack(stack);

      // Verify custom properties are applied
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        Threshold: 20,
        EvaluationPeriods: 3,
      });

      // Verify other alarm properties remain unchanged
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'ErrorMetric',
        Namespace: 'TestNamespace',
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        Statistic: 'Sum',
        Dimensions: [
          {
            Name: 'service',
            Value: 'TestService',
          },
        ],
      });
    });
  });

  describe('Default metric names', () => {
    it('should use default metric success name when not provided', () => {
      const defaultMetricLambda = new ProgressiveLambda(
        stack,
        'DefaultMetricLambda',
        {
          ...defaultConfig,
          metricSuccessName: undefined,
          metricSuccessNameTitle: undefined,
          metricErrorNameTitle: undefined,
        },
      );

      expect(defaultMetricLambda).toBeDefined();

      // Create widgets to test default metric names
      const lambdaWithWidgets = new ProgressiveLambda(
        stack,
        'DefaultMetricWidgetLambda',
        {
          ...defaultConfig,
          createWidget: true,
          metricSuccessName: undefined,
          metricSuccessNameTitle: undefined,
          metricErrorNameTitle: undefined,
        },
      );

      expect(lambdaWithWidgets.widgets).toHaveLength(3);
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle zero threshold in alarm configuration', () => {
      new ProgressiveLambda(stack, 'ZeroThresholdLambda', {
        ...defaultConfig,
        alarmConfiguration: {
          threshold: 0,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        Threshold: 0,
      });
    });

    it('should handle high evaluation periods', () => {
      new ProgressiveLambda(stack, 'HighEvaluationLambda', {
        ...defaultConfig,
        alarmConfiguration: {
          evaluationPeriods: 10,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        EvaluationPeriods: 10,
      });
    });

    it('should work with all TreatMissingData enum values', () => {
      const treatMissingDataValues = [
        cdk.aws_cloudwatch.TreatMissingData.BREACHING,
        cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
        cdk.aws_cloudwatch.TreatMissingData.IGNORE,
        cdk.aws_cloudwatch.TreatMissingData.MISSING,
      ];

      treatMissingDataValues.forEach((treatMissingData, index) => {
        const lambda = new ProgressiveLambda(
          stack,
          `TreatMissingDataLambda${index}`,
          {
            ...defaultConfig,
            alarmConfiguration: {
              treatMissingData,
            },
          },
        );

        expect(lambda.alarm).toBeDefined();
      });

      const template = Template.fromStack(stack);

      // Verify each TreatMissingData value is properly set
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        TreatMissingData: 'breaching',
      });

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        TreatMissingData: 'notBreaching',
      });

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        TreatMissingData: 'ignore',
      });

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        TreatMissingData: 'missing',
      });
    });

    it('should preserve alarm description with custom configuration', () => {
      new ProgressiveLambda(stack, 'CustomDescriptionLambda', {
        ...defaultConfig,
        alarmConfiguration: {
          threshold: 7,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription: Match.stringLikeRegexp('.*deployment errors.*'),
        Threshold: 7,
      });
    });
  });
});
