import * as cdk from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudFront from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import type { HostedZone } from 'aws-cdk-lib/aws-route53';
import type * as monitoring from 'cdk-monitoring-constructs';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import {
  ApiCloudFrontDistribution,
  type ApiCloudFrontDistributionProps,
} from './api-cloudfront-distribution';

describe('ApiCloudFrontDistribution', () => {
  let stack: cdk.Stack;
  let defaultConfig: ApiCloudFrontDistributionProps;
  let apiCloudFrontDistribution: ApiCloudFrontDistribution;

  beforeEach(() => {
    stack = new cdk.Stack();
    const api = new apigw.RestApi(stack, 'MockApi', {
      deploy: true,
      deployOptions: { stageName: 'dev' },
      cloudWatchRole: false,
      defaultIntegration: new apigw.MockIntegration({
        integrationResponses: [{ statusCode: '200' }],
        requestTemplates: { 'application/json': '{"statusCode": 200}' },
      }),
      defaultMethodOptions: { methodResponses: [{ statusCode: '200' }] },
    });
    api.root.addMethod('GET');
    const mockHostedZone = {
      hostedZoneId: 'Z1234567890',
      zoneName: 'mydomain.com.',
    } as unknown as HostedZone;

    defaultConfig = {
      stageName: 'dev',
      apiSubDomain: 'api.mydomain.com.',
      domainCertificate: Certificate.fromCertificateArn(
        stack,
        'MockCert',
        'arn:aws:acm:us-east-1:123456789012:certificate/mock',
      ),
      api,
      priceClass: cloudFront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      comment: 'Test distribution',
      domainHostedZone: mockHostedZone,
    };

    apiCloudFrontDistribution = new ApiCloudFrontDistribution(
      stack,
      'TestDist',
      defaultConfig,
    );
  });

  it('creates CloudFront Distribution and S3 access logs bucket', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Enabled: true,
        Comment: 'dev api distribution',
      },
    });

    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'dev-oms-distribution-bucket-access-logs',
    });
  });

  it('applies removal policies to resources', () => {
    expect(
      apiCloudFrontDistribution.accessLogsBucket.applyRemovalPolicy,
    ).toBeDefined();
    expect(
      apiCloudFrontDistribution.distribution.applyRemovalPolicy,
    ).toBeDefined();
  });

  it('supports optional edge function', () => {
    const edgeVersion = lambda.Version.fromVersionArn(
      stack,
      'EdgeVer',
      'arn:aws:lambda:us-east-1:111111111111:function:stub:1',
    );

    const apiCloudFrontDistribution = new ApiCloudFrontDistribution(
      stack,
      'TestDistEdge',
      {
        ...defaultConfig,
        edgeFunction: edgeVersion,
      },
    );

    expect(apiCloudFrontDistribution.distribution).toBeDefined();
  });

  it('creates Route53 ARecord for the api subdomain', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: 'api.mydomain.com.',
      Type: 'A',
    });
  });

  it('uses default values for priceClass and enabled if not provided', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Enabled: true,
        Comment: 'dev api distribution',
        PriceClass: 'PriceClass_100',
      },
    });
  });

  it('sets correct origin path and timeout for RestApiOrigin', () => {
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Origins: Match.arrayWith([
          Match.objectLike({
            OriginPath: '/api',
          }),
        ]),
      }),
    });
  });

  it('No unsuppressed AwsSolutions findings', () => {
    cdk.Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

    NagSuppressions.addStackSuppressions(
      stack,
      [
        'AwsSolutions-APIG1',
        'AwsSolutions-APIG2',
        'AwsSolutions-APIG3',
        'AwsSolutions-APIG4',
        'AwsSolutions-APIG6',
        'AwsSolutions-COG4',
      ].map((id) => ({
        id,
        reason:
          'Asserting the validation of the mocked API is not part of the test.',
      })),
    );

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

  describe('monitoring facade & alarms', () => {
    let mockMonitor: jest.Mock;
    let mockFacade: monitoring.MonitoringFacade;

    beforeEach(() => {
      jest.clearAllMocks();
      mockMonitor = jest.fn();
      mockFacade = {
        monitorCloudFrontDistribution: mockMonitor,
      } as unknown as monitoring.MonitoringFacade;
    });

    it('registers distribution with monitoring facade if provided', () => {
      const apiCloudFrontDistribution = new ApiCloudFrontDistribution(
        stack,
        'TestDistEdge',
        {
          ...defaultConfig,
          monitoringFacade: mockFacade,
        },
      );

      expect(mockMonitor).toHaveBeenCalledWith(
        expect.objectContaining({
          distribution: apiCloudFrontDistribution.distribution,
        }),
      );
    });

    it('registers distribution with monitoring facade and full alarm configuration', () => {
      const alarmConfig: monitoring.CloudFrontDistributionMonitoringOptions = {
        addError4xxRate: {
          '4xxErrorRate': {
            maxErrorRate: 1,
            evaluationPeriods: 1,
            datapointsToAlarm: 1,
          },
        },
        addFault5xxRate: {
          '5xxErrorRate': {
            maxErrorRate: 1,
            evaluationPeriods: 1,
            datapointsToAlarm: 1,
          },
        },
        addLowTpsAlarm: {
          LowTps: {
            minTps: 1,
            evaluationPeriods: 1,
            datapointsToAlarm: 1,
          },
        },
        addHighTpsAlarm: {
          HighTps: {
            maxTps: 1000,
            evaluationPeriods: 1,
            datapointsToAlarm: 1,
          },
        },
      };

      const apiCloudFrontDistribution = new ApiCloudFrontDistribution(
        stack,
        'TestDistEdge',
        {
          ...defaultConfig,
          monitoringFacade: mockFacade,
          alarmConfiguration: alarmConfig,
        },
      );

      expect(mockMonitor).toHaveBeenCalledWith(
        expect.objectContaining({
          distribution: apiCloudFrontDistribution.distribution,
          ...alarmConfig,
        }),
      );
    });

    it('registers distribution with monitoring facade and minimal alarm configuration', () => {
      const alarmConfig: monitoring.CloudFrontDistributionMonitoringOptions = {
        addError4xxRate: {
          '4xxErrorRate': {
            maxErrorRate: 1,
            evaluationPeriods: 1,
            datapointsToAlarm: 1,
          },
        },
      };

      const apiCloudFrontDistribution = new ApiCloudFrontDistribution(
        stack,
        'TestDistEdge',
        {
          ...defaultConfig,
          monitoringFacade: mockFacade,
          alarmConfiguration: alarmConfig,
        },
      );

      expect(mockMonitor).toHaveBeenCalledWith(
        expect.objectContaining({
          distribution: apiCloudFrontDistribution.distribution,
          ...alarmConfig,
        }),
      );
    });

    test('throws when alarmConfiguration is provided without a monitoring facade', () => {
      expect(
        () =>
          new ApiCloudFrontDistribution(stack, 'AlarmsOnly', {
            ...defaultConfig,
            alarmConfiguration:
              {} as monitoring.CloudFrontDistributionMonitoringOptions,
          }),
      ).toThrow(
        'alarmConfiguration is provided but monitoringFacade is undefined; cannot configure alarms without a monitoring facade',
      );
    });
  });
});
