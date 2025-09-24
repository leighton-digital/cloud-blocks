import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudFront from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as monitoring from 'cdk-monitoring-constructs';
import type { Construct } from 'constructs';
import { ApiCloudFrontDistribution } from '../../../src/api-gateway-cloudfront-distribution';

export class ApiDistributionNestedStack extends cdk.NestedStack {
  public readonly distribution: ApiCloudFrontDistribution;
  public readonly api: apigw.RestApi;
  public readonly zone: route53.IHostedZone;
  public readonly certificate: acm.ICertificate;
  public readonly monitoringFacade: monitoring.MonitoringFacade;

  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    // Hardcoded configuration values
    const stageName = 'dev';
    const apiSubDomain = 'api.example.com';
    const zoneName = 'example.com';
    const hostedZoneId = 'Z1234567890';
    const certificateArn =
      'arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    const edgeFunctionArn =
      'arn:aws:lambda:us-east-1:111111111111:function:myEdgeFn:1';

    // Create API Gateway
    this.api = new apigw.RestApi(this, 'Api', {
      deployOptions: { stageName },
    });
    this.api.root.addMethod('ANY');

    // Reference existing hosted zone
    this.zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId,
      zoneName,
    });

    // Reference existing certificate
    this.certificate = acm.Certificate.fromCertificateArn(
      this,
      'Cert',
      certificateArn,
    );

    // Create monitoring facade
    this.monitoringFacade = new monitoring.MonitoringFacade(
      this,
      'Monitoring',
      {},
    );

    // Optional Lambda@Edge version
    const edgeVersion = lambda.Version.fromVersionArn(
      this,
      'EdgeVer',
      edgeFunctionArn,
    );

    // Create the API CloudFront Distribution
    this.distribution = new ApiCloudFrontDistribution(this, 'ApiDist', {
      stageName,
      domainHostedZone: this.zone,
      apiSubDomain,
      domainCertificate: this.certificate,
      api: this.api,
      priceClass: cloudFront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      comment: `${stageName} api distribution`,
      edgeFunction: edgeVersion,
      monitoringFacade: this.monitoringFacade,
      alarmConfiguration: {
        addError4xxRate: {
          '4xxErrorRate': {
            maxErrorRate: 1,
            evaluationPeriods: 1,
            datapointsToAlarm: 1,
          },
        },
      },
    });
  }
}
