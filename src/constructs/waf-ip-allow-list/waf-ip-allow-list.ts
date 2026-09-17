import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface WafIpAllowListProps {
  /** IPv4 CIDR allowed through the Web ACL (e.g. `203.0.113.0/24`). All other traffic is blocked. */
  allowedIpCidr: string;
  /** WAF scope. Use `CLOUDFRONT` for distributions (must deploy in `us-east-1`), `REGIONAL` for ALB/API Gateway. */
  scope?: 'CLOUDFRONT' | 'REGIONAL';
}

/**
 * WAFv2 Web ACL that blocks all traffic by default and allows only requests
 * originating from a single IPv4 CIDR range.
 */
export class WafIpAllowList extends Construct {
  public readonly webAclArn: string;

  constructor(scope: Construct, id: string, props: WafIpAllowListProps) {
    super(scope, id);

    const scopeType = props.scope ?? 'CLOUDFRONT';
    const namePrefix = this.node.path.replace(/[^A-Za-z0-9-]/g, '-').slice(-80);

    const ipSet = new wafv2.CfnIPSet(this, 'AllowedIps', {
      addresses: [props.allowedIpCidr],
      ipAddressVersion: 'IPV4',
      scope: scopeType,
      name: `${namePrefix}-ip-allow-list`,
    });

    const webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      name: `${namePrefix}-waf`,
      scope: scopeType,
      defaultAction: { block: {} },
      rules: [this.createIpAllowRule(ipSet.attrArn)],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'WafIpAllowList',
      },
    });

    this.webAclArn = webAcl.attrArn;
  }

  private createIpAllowRule(ipSetArn: string): wafv2.CfnWebACL.RuleProperty {
    return {
      name: 'AllowFromAllowedIp',
      priority: 0,
      statement: {
        ipSetReferenceStatement: { arn: ipSetArn },
      },
      action: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AllowFromAllowedIp',
      },
    };
  }
}
