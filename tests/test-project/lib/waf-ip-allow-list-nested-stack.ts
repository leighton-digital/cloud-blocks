import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { WafIpAllowList } from '../../../src/constructs/waf-ip-allow-list';

export class WafIpAllowListNestedStack extends cdk.NestedStack {
  public readonly wafIpAllowList: WafIpAllowList;

  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    // Documentation/example CIDR (TEST-NET-3) — replace in real deployments
    this.wafIpAllowList = new WafIpAllowList(this, 'WafIpAllowList', {
      allowedIpCidr: '203.0.113.0/24',
      // Default scope is CLOUDFRONT (must deploy in us-east-1). Use REGIONAL for ALB/API Gateway.
      scope: 'CLOUDFRONT',
    });
  }
}
