# API Gateway CloudFront Distribution

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/leighton-digital/cloud-blocks/blob/main/LICENSE)
![Maintained](https://img.shields.io/maintenance/yes/2025)

A CDK construct that provisions an **Amazon CloudFront** distribution in front of an **API Gateway (REST)** stage, complete with:

* Route 53 **A-alias** record for your API hostname
* Centralized **S3 access-logs** bucket
* Secure CloudFront defaults (HTTPS only, TLS 1.2\_2021, HTTP/3, compression)
* Sensible API behaviour (disabled caching, forward common viewer data)
* Optional **Lambda\@Edge** (version) association
* Optional integration with a **monitoring facade** (e.g. `cdk-monitoring-constructs`)
* Optional **CloudWatch Alarms** configuration for error monitoring (uses `cdk-monitoring-constructs` alarm types)
* Jest unit tests with **cdk-nag** checks

---

## Features

* **Distribution**: `cloudFront.Distribution` using `origins.RestApiOrigin(api)` with:

  * `viewerProtocolPolicy: REDIRECT_TO_HTTPS`
  * `allowedMethods: ALLOW_ALL`
  * `cachePolicy: CACHING_DISABLED` (API default)
  * `originRequestPolicy: ALL_VIEWER_EXCEPT_HOST_HEADER`
  * `responseHeadersPolicy: CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT`
  * `httpVersion: HTTP3`, `minimumProtocolVersion: TLS_V1_2_2021`, `sslSupportMethod: SNI`
* **Access logging**: dedicated S3 bucket (OBJECT\_WRITER, SSL enforced, auto-delete on destroy)
* **DNS**: Route 53 A-alias targeting the distribution
* **Edge**: optional `lambda.IVersion` attached at `VIEWER_REQUEST`
* **Monitoring**: optional `monitoringFacade.monitorCloudFrontDistribution({ distribution })`
* **Alarms**: optional CloudWatch alarm configuration (5xx error rate, thresholds, SNS notifications)
* **cdk-nag**: targeted suppressions for:

  * `AwsSolutions-S1` (on the central logs bucket to avoid recursive logging)
  * `AwsSolutions-CFR1` (geo restrictions – deferred)
  * `AwsSolutions-CFR2` (WAF – deferred)

---

## Install

```bash
npm i aws-cdk-lib constructs cdk-nag cdk-monitoring-constructs
# For tests
npm i -D jest ts-jest @types/jest
```

> In a monorepo, ensure package test scripts invoke Jest with your **ts-jest** config (e.g. `jest -c ../../jest.config.ts`).

---

## Usage

```ts
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as cloudFront from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as monitoring from 'cdk-monitoring-constructs';
import { ApiCloudFrontDistribution } from './ApiCloudFrontDistribution';

const api = new apigw.RestApi(this, 'Api', { deployOptions: { stageName: 'dev' } });

const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
  hostedZoneId: 'Z1234567890',
  zoneName: 'example.com',
});

const cert = acm.Certificate.fromCertificateArn(
  this,
  'Cert',
  'arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
);

// Optional monitoring facade
const facade = new monitoring.MonitoringFacade(this, 'Monitoring', { /* ... */ });

// Optional Lambda@Edge version (must be us-east-1)
const edgeVersion = lambda.Version.fromVersionArn(
  this, 'EdgeVer', 'arn:aws:lambda:us-east-1:111111111111:function:myEdgeFn:1'
);

new ApiCloudFrontDistribution(this, 'ApiDist', {
  stageName: 'dev',
  domainHostedZone: zone,
  apiSubDomain: 'api.example.com',      // FQDN for CloudFront alias + Route53 record
  domainCertificate: cert,              // ACM cert in us-east-1
  api,
  priceClass: cloudFront.PriceClass.PRICE_CLASS_100,
  enabled: true,
  comment: 'dev api distribution',
  edgeFunction: edgeVersion,            // optional
  monitoringFacade: facade,             // optional
  // Optional alarms — these examples use the official types from
  // the cdklabs/cdk-monitoring-constructs package.
  alarmConfiguration: {
    // Map of disambiguator (e.g. 'Critical', 'Warning') to ErrorRateThreshold
    // See constructs.dev docs for ErrorRateThreshold.
    addError4xxRate: {
      '4xxErrorRate': {
        maxErrorRate: 1,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
      },
    },
  },
});
```

---

## Props

| Prop                | Type                          | Required | Default           | Notes                                                                                              |
| ------------------- | ----------------------------- | :------: | ----------------- | -------------------------------------------------------------------------------------------------- |
| `stageName`         | `string`                      |     ✅    | —                 | API stage (e.g., `dev`, `prod`) used in naming/comments.                                           |
| `domainHostedZone`  | `route53.IHostedZone`         |     ✅    | —                 | Zone that owns your domain. Used to create the alias record.                                       |
| `apiSubDomain`      | `string`                      |     ✅    | —                 | **FQDN** for the API (e.g., `api.example.com`). Used as CloudFront alias and Route 53 record name. |
| `domainCertificate` | `acm.ICertificate`            |     ✅    | —                 | **Must be in `us-east-1`** for CloudFront.                                                         |
| `api`               | `apigw.RestApi`               |     ✅    | —                 | Origin for the distribution (via `RestApiOrigin`).                                                 |
| `priceClass`        | `cloudFront.PriceClass`       |     ✅    | `PRICE_CLASS_100` | Cost/edge-location scope.                                                                          |
| `enabled`           | `boolean`                     |     ✅    | `true`            | Toggle distribution availability.                                                                  |
| `comment`           | `string`                      |     ✅    | —                 | Distribution comment (e.g., `dev api distribution`).                                               |
| `edgeFunction`      | `lambda.IVersion`             |     ❌    | —                 | Optional Lambda\@Edge **version** (must be in `us-east-1`), associated at `VIEWER_REQUEST`.        |
| `monitoringFacade`  | `monitoring.MonitoringFacade` |     ❌    | —                 | If provided, the construct calls `monitorCloudFrontDistribution({ distribution })`.                |
| `alarmConfig`       | `AlarmConfig`                 |     ❌    | —                 | Optional CloudWatch alarm settings for the distribution (typed using `cdk-monitoring-constructs`). |

### `AlarmConfig` interface

````ts
import * as monitoring from 'cdk-monitoring-constructs';

// NOTE: This shape intentionally reuses types from cdk-monitoring-constructs
// so you get compile-time help and future compatibility.
export interface AlarmConfig {
  /**
   * Thresholds for 5xx error rate alarms keyed by disambiguator
   * (e.g. 'Critical', 'Warning').
   */
  add5xxErrorRateAlarm?: Record<string, monitoring.ErrorRateThreshold>;

  /**
   * Thresholds for 4xx error rate alarms keyed by disambiguator.
   */
  add4xxErrorRateAlarm?: Record<string, monitoring.ErrorRateThreshold>;

  /** SNS topic ARN for alarm notifications. */
  alarmSnsTopicArn?: string;
}
```ts
interface AlarmConfig {
  errorRateThreshold?: number;   // % of 5xx error rate to alarm on
  evaluationPeriods?: number;    // how many periods to evaluate
  snsTopicArn?: string;          // SNS topic ARN for notifications
}
````

---

## What gets created

* **S3**: `${id}AccessLogs-${stageName}`

  * `OBJECT_WRITER` ownership, `enforceSSL: true`, `autoDeleteObjects: true`, `RemovalPolicy.DESTROY`
* **CloudFront Distribution**: `${id}ApiCloudfrontDistribution-${stageName}`

  * Alias: `[apiSubDomain]`; logging to access-logs bucket
  * Secure defaults & API-friendly behaviour (see **Features**)
* **Route 53 A-alias**: `${id}Alias-${stageName}` → CloudFront distribution
* **CloudWatch Alarms** (if `alarmConfig` provided):

  * 5xx error rate alarm on the distribution, configurable thresholds.
  * Alarms send notifications to the provided SNS topic.

---

## Testing

This package includes Jest unit tests with **cdk-nag** integration.

### Run

```bash
npm test
# or, in a monorepo with Turbo:
# turbo run test
```

### Example test pattern

```ts
import { App, Stack, Aspects } from 'aws-cdk-lib';
import { Template, Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
// import { ApiCloudFrontDistribution } from '../src';

test('no unsuppressed AwsSolutions findings', () => {
  const app = new App();
  const stack = new Stack(app, 'Test');

  // Instantiate your ApiCloudFrontDistribution here...

  Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
  Template.fromStack(stack); // runs aspects

  expect(
    Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'))
  ).toHaveLength(0);
  expect(
    Annotations.fromStack(stack).findWarning('*', Match.stringLikeRegexp('AwsSolutions-.*'))
  ).toHaveLength(0);
});
```

> This construct intentionally suppresses `AwsSolutions-S1` on the **log bucket** (to avoid recursive logging) and `AwsSolutions-CFR1/CFR2` on the **distribution** (geo restrictions & WAF are out of scope for the defaults). Your tests should allow these suppressions.

---

## Operational notes & caveats

* **ACM certificate** for CloudFront must be issued/located in **`us-east-1`**.
* **Lambda\@Edge** versions also live in **`us-east-1`**. The construct accepts an `IVersion`; it does **not** create Edge functions.
* `apiSubDomain` should be a **fully qualified domain** (e.g., `api.example.com`). The construct uses it for the distribution alias **and** the Route 53 record name.
* The access-logs bucket is designed for **ephemeral/dev** environments (`RemovalPolicy.DESTROY`, `autoDeleteObjects: true`). Adjust for production retention/compliance.

---

## Extending

* **WAF**: Associate an AWS WAF web ACL to the distribution (rule `CFR2`).
* **Geo restrictions**: Configure `geoRestriction` on behaviours (rule `CFR1`).
* **Headers policy**: If your API sends CORS/security headers itself, swap to `ResponseHeadersPolicy.SECURITY_HEADERS`.
* **Caching**: If parts of your API are cacheable, override `cachePolicy`/behaviours accordingly.
* **Monitoring**: Supply a `monitoringFacade` to attach alarms/dashboards without extra wiring.
* **Alarms**: Provide an `alarmConfig` to enable CloudWatch alarms for error rates with SNS notifications.

---

## Troubleshooting

* **“Lambda\@Edge must be us-east-1”** → ensure `edgeFunction` is a `lambda.Version` ARN from `us-east-1`.
* **“Certificate must be in us-east-1”** → use an ACM certificate in `us-east-1` for CloudFront aliases.
* **cdk-nag `S1` on log bucket** → suppression is intentional; use a centralized log archive bucket if you need strict S1 compliance everywhere else.

---

## License

MIT License - see the [LICENSE](https://github.com/leighton-digital/cloud-blocks/blob/main/LICENSE) file for details

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

---

<img src="https://raw.githubusercontent.com/leighton-digital/cloud-blocks/HEAD/images/leighton-logo.svg" width="200" />
