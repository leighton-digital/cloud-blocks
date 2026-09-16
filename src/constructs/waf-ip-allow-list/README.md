# WAF IP Allow List

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/leighton-digital/cloud-blocks/blob/main/LICENSE)
![Maintained](https://img.shields.io/maintenance/yes/2025)

CDK construct that creates a WAFv2 Web ACL with a default-block action and a single IPv4 CIDR allow rule.

## Overview

`WafIpAllowList` provisions an AWS WAF v2 IP set and Web ACL that blocks all traffic by default and allows only requests originating from a specified IPv4 CIDR range. CloudWatch metrics are enabled on the Web ACL and the allow rule.

**Important:** When `scope` is `CLOUDFRONT` (the default), the Web ACL must be deployed in `us-east-1`. Use `REGIONAL` for Application Load Balancers or API Gateway in the same region as those resources.

## Usage

```typescript
import { WafIpAllowList } from '@leighton-digital/cloud-blocks';

const waf = new WafIpAllowList(this, 'Waf', {
  allowedIpCidr: '203.0.113.0/24',
  scope: 'CLOUDFRONT', // default — stack must be in us-east-1
});

// Pass the ACL ARN to a CloudFront distribution (CDK prop is webAclId)
// new cloudfront.Distribution(this, 'Distribution', {
//   webAclId: waf.webAclArn,
//   defaultBehavior: { origin },
// });
```

### Regional scope (ALB / API Gateway)

```typescript
const waf = new WafIpAllowList(this, 'RegionalWaf', {
  allowedIpCidr: '203.0.113.10/32',
  scope: 'REGIONAL',
});
```

## Props

### `WafIpAllowListProps`

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `allowedIpCidr` | `string` | Yes | — | IPv4 CIDR to allow (e.g. `203.0.113.0/24`). All other traffic is blocked. |
| `scope` | `'CLOUDFRONT' \| 'REGIONAL'` | No | `CLOUDFRONT` | WAF scope; use `CLOUDFRONT` for distributions (must deploy in `us-east-1`), `REGIONAL` for ALB/API Gateway |

## Public Members

| Member | Type | Description |
|--------|------|-------------|
| `webAclArn` | `string` | ARN of the created Web ACL |

## Resources Created

| Resource | Description |
|----------|-------------|
| WAFv2 IP Set | Single IPv4 CIDR address list |
| WAFv2 Web ACL | Default action: block; allow rule for the IP set; CloudWatch metrics enabled |

## Development

### Testing

```bash
pnpm test
```

### Building

```bash
pnpm run build
```

## Contributing

Please read [CONTRIBUTING.md](../../../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.
