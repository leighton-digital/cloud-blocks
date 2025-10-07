import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import type * as apigw from 'aws-cdk-lib/aws-apigateway';
import type * as certificateManager from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudFront from 'aws-cdk-lib/aws-cloudfront';
import { ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import type * as lambda from 'aws-cdk-lib/aws-lambda';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type * as monitoring from 'cdk-monitoring-constructs';
import type { CloudFrontDistributionMonitoringOptions } from 'cdk-monitoring-constructs';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { generateS3BucketName } from '../../utils';

/**
 * Props for an API Gateway–fronted CloudFront distribution.
 *
 * @remarks
 * Wraps a {@link cloudFront.Distribution} that fronts an {@link apigw.RestApi},
 * creates an alias for `<apiSubDomain>.<hostedZone>`, optionally associates a
 * Lambda@Edge version, and (optionally) wires the distribution into a provided
 * monitoring facade.
 *
 * **Important constraints**
 * - {@link domainCertificate}: When used with CloudFront, the ACM certificate
 *   **must be in `us-east-1`**.
 * - {@link edgeFunction}: Lambda@Edge versions **must be in `us-east-1`**.
 * - If {@link monitoringFacade} is supplied, the construct calls
 *   `monitoringFacade.monitorCloudFrontDistribution({ distribution })`
 *   after creating the distribution.
 *
 * @example
 * ```ts
 * const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
 *   hostedZoneId: 'Z1234567890',
 *   zoneName: 'mydomain.com',
 * });
 *
 * const cert = acm.Certificate.fromCertificateArn(this, 'Cert',
 *   'arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
 * );
 *
 * const api = new apigw.RestApi(this, 'Api', {
 *   deployOptions: { stageName: 'dev' },
 * });
 *
 * // (Optional) monitoring facade you manage elsewhere
 * const facade = new monitoring.MonitoringFacade(this, 'Monitoring', { /\* ... *\/ });
 *
 * new ApiCloudFrontDistribution(this, 'Dist', {
 *   stageName: 'dev',
 *   domainHostedZone: zone,
 *   apiSubDomain: 'api',
 *   domainCertificate: cert,
 *   api,
 *   priceClass: cloudFront.PriceClass.PRICE_CLASS_100,
 *   enabled: true,
 *   comment: 'dev api distribution',
 *   edgeFunction: lambda.Version.fromVersionArn(this, 'EdgeVer', 'arn:aws:lambda:us-east-1:acct:function:name:1'),
 *   monitoringFacade: facade,
 *   // Optional alarms — these examples use the official types from
 *   // the cdklabs/cdk-monitoring-constructs package.
 *   alarmConfiguration: {
 *     // Map of disambiguator (e.g. 'Critical', 'Warning') to ErrorRateThreshold
 *     // See constructs.dev docs for ErrorRateThreshold.
 *     addError4xxRate: {
 *       '4xxErrorRate': {
 *         maxErrorRate: 1,
 *         evaluationPeriods: 1,
 *         datapointsToAlarm: 1,
 *       },
 *     },
 *   },
 * });
 * ```
 *
 * @see cloudFront.DistributionProps
 * @public
 */
export interface ApiCloudFrontDistributionProps
  extends Pick<
    cloudFront.DistributionProps,
    'comment' | 'priceClass' | 'enabled'
  > {
  /**
   * The API Gateway stage name that this distribution targets (e.g., `dev`, `prod`).
   *
   * @example 'dev'
   */
  stageName: string;

  /**
   * The public Route 53 hosted zone that owns the apex domain (e.g., `mydomain.com`).
   * Used to create the DNS record for the API subdomain.
   */
  domainHostedZone: route53.IHostedZone;

  /**
   * The subdomain to use for the API.
   * The final DNS name will typically be `<apiSubDomain>.<domainHostedZone.zoneName>`.
   *
   * @example 'api'
   */
  apiSubDomain: string;

  /**
   * The ACM certificate for the CloudFront alias. **Must be in `us-east-1`.**
   * (CloudFront requires certificates in the N. Virginia region.)
   */
  domainCertificate: certificateManager.ICertificate;

  /**
   * The API Gateway REST API that the distribution will front.
   */
  api: apigw.RestApi;

  /**
   * The CloudFront price class.
   *
   * @defaultValue `cloudFront.PriceClass.PRICE_CLASS_100` (recommended)
   */
  priceClass: cloudFront.PriceClass;

  /**
   * Whether the distribution is enabled.
   *
   * @defaultValue `true`
   */
  enabled: boolean;

  /**
   * A human-readable comment for the distribution.
   *
   * @example 'dev api distribution'
   */
  comment: string;

  /**
   * Optional Lambda@Edge function **version** to associate with the distribution
   * (e.g., at `VIEWER_REQUEST`). The version **must be in `us-east-1`**.
   * If omitted, no edge function is attached.
   *
   * @see lambda.Version
   */
  edgeFunction?: lambda.IVersion;

  /**
   * Optional monitoring facade used to register metrics/alarms/dashboards
   * for the created CloudFront distribution.
   *
   * @remarks
   * When provided, the construct calls
   * `monitoringFacade.monitorCloudFrontDistribution({ distribution })`
   * after creating the distribution.
   *
   * @defaultValue `undefined`
   */
  monitoringFacade?: monitoring.MonitoringFacade;

  /**
   * Optional configuration for alarms and thresholds to apply to the
   * monitored CloudFront distribution.
   *
   * @remarks
   * Only applicable if {@link monitoringFacade} is also provided.
   *
   * @defaultValue No alarms or thresholds are configured.
   */
  alarmConfiguration?: CloudFrontDistributionMonitoringOptions;
}

/**
 * Fixed subset of {@link cloudFront.DistributionProps} used for this construct’s
 * internal/default CloudFront configuration.
 *
 * @remarks
 * This omits properties that are managed elsewhere by the construct or exposed
 * via higher-level props:
 * - `comment` — derived by the construct.
 * - `priceClass` — controlled by top-level props/defaults.
 * - `enabled` — toggled by the construct.
 * - `responseHeadersPolicy` — set explicitly (e.g., to a managed policy).
 *
 * Use this when supplying defaults to the underlying `Distribution` without
 * accidentally overriding construct-managed fields.
 *
 * @example
 * ```ts
 * const defaults: FixedApiCloudFrontDistributionProps = {
 *   httpVersion: cloudFront.HttpVersion.HTTP3,
 *   enableLogging: true,
 *   logBucket,
 *   minimumProtocolVersion: cloudFront.SecurityPolicyProtocol.TLS_V1_2_2021,
 * };
 *
 * new cloudFront.Distribution(this, 'Dist', {
 *   ...defaults,
 *   // provided elsewhere by the construct or its higher-level props:
 *   comment: 'api distribution',
 *   enabled: true,
 *   priceClass: cloudFront.PriceClass.PRICE_CLASS_100,
 *   responseHeadersPolicy: cloudFront.ResponseHeadersPolicy.SECURITY_HEADERS,
 * });
 * ```
 *
 * @see cloudFront.DistributionProps
 * @private
 */
type FixedApiCloudFrontDistributionProps = Omit<
  cloudFront.DistributionProps,
  'comment' | 'priceClass' | 'enabled' | 'responseHeadersPolicy'
>;

/**
 * CloudFront distribution fronting an API Gateway REST API, with DNS, logging, and optional monitoring integration.
 *
 * @remarks
 * This construct:
 * - Creates a centralized S3 **access logs** bucket (with `OBJECT_WRITER` ownership) for the distribution.
 * - Provisions a {@link cloudFront.Distribution} with secure defaults (HTTP/3, HTTPS-only, TLSv1.2_2021),
 *   disabled caching for dynamic APIs, and a managed **CORS with preflight** response headers policy.
 * - Optionally associates a **Lambda@Edge** *version* (e.g., at `VIEWER_REQUEST`).
 * - Creates a Route 53 **A-alias** record targeting the distribution.
 * - Applies `RemovalPolicy.DESTROY` to the distribution and alias record for easy teardown in ephemeral stages.
 * - Adds `cdk-nag` suppressions for rules that are intentionally deferred (CFR1/CFR2) and for the central logs bucket
 *   (to avoid recursive S3 server access logging).
 * - **Monitoring integration:** If {@link ApiCloudFrontDistributionProps.monitoringFacade} is provided,
 *   the construct will automatically register the created distribution by calling
 *   `monitoringFacade.monitorCloudFrontDistribution({ distribution })`. Use this to attach metrics, alarms,
 *   and dashboards without additional wiring in your stacks.
 *
 * **Important constraints**
 * - The ACM certificate used by CloudFront ({@link ApiCloudFrontDistributionProps.domainCertificate})
 *   **must be in `us-east-1`** (CloudFront requirement).
 * - Any Lambda@Edge version passed via {@link ApiCloudFrontDistributionProps.edgeFunction} **must be in `us-east-1`**.
 * - {@link ApiCloudFrontDistributionProps.apiSubDomain} should be a **fully-qualified domain name** (e.g. `api.example.com`)
 *   because it is used both as the CloudFront alias and as the Route 53 record name.
 *
 * **Defaults & opinions**
 * - `AllowedMethods`: **ALLOW_ALL** (APIs often use non-GET methods).
 * - `CachePolicy`: **CACHING_DISABLED** (typical for dynamic APIs; adjust if your API is cacheable).
 * - `OriginRequestPolicy`: **ALL_VIEWER_EXCEPT_HOST_HEADER** (forwards common viewer data minus Host).
 * - `ViewerProtocolPolicy`: **REDIRECT_TO_HTTPS**.
 * - `ResponseHeadersPolicy`: **CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT** (managed policy).
 * - `HttpVersion`: **HTTP3** enabled.
 * - `PriceClass`: defaults to **PRICE_CLASS_100** unless overridden in props.
 * - Access logging is **enabled** and written to the construct-managed logs bucket.
 *
 * @example
 * ```ts
 * const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
 *   hostedZoneId: 'Z1234567890', zoneName: 'example.com',
 * });
 *
 * const cert = acm.Certificate.fromCertificateArn(this, 'Cert',
 *   'arn:aws:acm:us-east-1:123456789012:certificate/xxxx-xxxx-xxxx-xxxx'
 * );
 *
 * const api = new apigw.RestApi(this, 'Api', {
 *   deployOptions: { stageName: 'dev' },
 * });
 *
 * // Optional monitoring facade provided by your monitoring library
 * const facade = new monitoring.MonitoringFacade(this, 'Monitoring', { /\* ... *\/ });
 *
 * new ApiCloudFrontDistribution(this, 'ApiDist', {
 *   stageName: 'dev',
 *   domainHostedZone: zone,
 *   apiSubDomain: 'api.example.com',
 *   domainCertificate: cert,
 *   api,
 *   enabled: true,
 *   priceClass: cloudFront.PriceClass.PRICE_CLASS_100,
 *   comment: 'dev api distribution',
 *   // Optional Lambda@Edge version (must be us-east-1)
 *   // edgeFunction: lambda.Version.fromVersionArn(this, 'EdgeVer', 'arn:aws:lambda:us-east-1:111111111111:function:name:1'),
 *   monitoringFacade: facade, // <-- distribution is auto-registered here
 * });
 * ```
 *
 * @see ApiCloudFrontDistributionProps
 * @see monitoring.MonitoringFacade
 * @see cloudFront.Distribution
 * @see route53.ARecord
 * @public
 */
export class ApiCloudFrontDistribution extends Construct {
  /**
   * The CloudFront distribution created by this construct.
   */
  public readonly distribution: cloudFront.Distribution;
  /**
   * Centralized S3 bucket receiving CloudFront access logs.
   *
   * @remarks
   * - Created with `objectOwnership: OBJECT_WRITER` so S3 can deliver logs.
   * - `RemovalPolicy.DESTROY` and `autoDeleteObjects: true` are set for ephemeral environments.
   * - The construct adds a `cdk-nag` suppression for `AwsSolutions-S1` to avoid recursive logging on the log bucket itself.
   */
  public readonly accessLogsBucket: s3.Bucket;
  private readonly api: apigw.RestApi;

  /**
   * Create a new API-fronted CloudFront distribution with DNS, logging, and optional monitoring integration.
   *
   * @param scope - The construct scope.
   * @param id - Logical ID for this construct.
   * @param props - {@link ApiCloudFrontDistributionProps} controlling domain, certificate, API origin, optional edge function,
   *   and optional {@link ApiCloudFrontDistributionProps.monitoringFacade | monitoring facade} registration.
   */
  constructor(
    scope: Construct,
    id: string,
    props: ApiCloudFrontDistributionProps,
  ) {
    super(scope, id);

    this.api = props.api;

    const edgeLambdas: cloudFront.EdgeLambda[] = props.edgeFunction
      ? [
          {
            functionVersion: props.edgeFunction,
            eventType: cloudFront.LambdaEdgeEventType.VIEWER_REQUEST,
          },
        ]
      : [];

    this.accessLogsBucket = new s3.Bucket(
      this,
      `${id}AccessLogs-${props.stageName}`,
      {
        enforceSSL: true,
        autoDeleteObjects: true,
        objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
        removalPolicy: RemovalPolicy.DESTROY,
        bucketName: generateS3BucketName({
          stage:props.stageName,
          service: 'oms-distribution',
          suffix: 'access-logs',
      })
      },
    );

    NagSuppressions.addResourceSuppressions(this.accessLogsBucket, [
      {
        id: 'AwsSolutions-S1',
        reason:
          'Centralised log archive bucket; enabling server access logs here would create recursive logging.',
      },
    ]);

    const fixedProps: FixedApiCloudFrontDistributionProps = {
      httpVersion: cloudFront.HttpVersion.HTTP3,
      defaultBehavior: {
        edgeLambdas,
        responseHeadersPolicy:
          // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-response-headers-policies.html#managed-response-headers-policies-security
          cloudFront.ResponseHeadersPolicy
            .CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
        origin: new origins.RestApiOrigin(this.api, {
          originPath: '/api',
          readTimeout: Duration.seconds(60),
        }),
        allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
        compress: true,
        cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy:
          cloudFront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
      domainNames: [props.apiSubDomain],
      sslSupportMethod: cloudFront.SSLMethod.SNI,
      minimumProtocolVersion: cloudFront.SecurityPolicyProtocol.TLS_V1_2_2021,
      logBucket: this.accessLogsBucket,
      certificate: props.domainCertificate,
      enableLogging: true,
    };

    this.distribution = new cloudFront.Distribution(
      this,
      `${id}ApiCloudfrontDistribution-${props.stageName}`,
      {
        // fixed props
        ...fixedProps,
        // custom props
        priceClass: props.priceClass
          ? props.priceClass
          : cloudFront.PriceClass.PRICE_CLASS_100,
        enabled: props.enabled ? props.enabled : true,
        comment: `${props.stageName} api distribution`,
      },
    );

    NagSuppressions.addResourceSuppressions(
      this.distribution,
      [
        {
          id: 'AwsSolutions-CFR1',
          reason:
            'This construct is currently not configured to enforce geo-restrictions.',
        },
        {
          id: 'AwsSolutions-CFR2',
          reason:
            'This construct is currently not configured to enforce WAF, this will be a future enhancement.',
        },
      ],
      true,
    );

    // create the alias record for the api for this particular stage
    const subDomainRecord: route53.ARecord = new route53.ARecord(
      this,
      `${id}Alias-${props.stageName}`,
      {
        zone: props.domainHostedZone,
        recordName: props.apiSubDomain,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(this.distribution),
        ),
      },
    );
    subDomainRecord.applyRemovalPolicy(RemovalPolicy.DESTROY);
    this.distribution.applyRemovalPolicy(RemovalPolicy.DESTROY);

    if (props.alarmConfiguration && !props.monitoringFacade) {
      throw new Error(
        'alarmConfiguration is provided but monitoringFacade is undefined; cannot configure alarms without a monitoring facade',
      );
    }

    if (props.monitoringFacade) {
      props.monitoringFacade.monitorCloudFrontDistribution({
        distribution: this.distribution,
        ...props.alarmConfiguration,
      });
    }
  }
}
