import { describe, expect, it } from '@jest/globals';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib/core';

import { WafIpAllowList } from './waf-ip-allow-list';

describe('WafIpAllowList', () => {
  it('creates a default-block Web ACL with a single IP allow rule', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'Stack', {
      stackName: 'WafIpAllowListTestStack',
    });

    const waf = new WafIpAllowList(stack, 'Waf', {
      allowedIpCidr: '203.0.113.10/32',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      DefaultAction: { Block: {} },
      Scope: 'CLOUDFRONT',
      Rules: [
        Match.objectLike({
          Name: 'AllowFromAllowedIp',
          Priority: 0,
          Action: { Allow: {} },
        }),
      ],
    });

    template.hasResourceProperties('AWS::WAFv2::IPSet', {
      Addresses: ['203.0.113.10/32'],
      IPAddressVersion: 'IPV4',
      Scope: 'CLOUDFRONT',
    });

    expect(cdk.Token.isUnresolved(waf.webAclArn)).toBe(true);
  });

  it('defaults to a single allow rule (no CI bypass rule)', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'Stack', {});

    new WafIpAllowList(stack, 'Waf', {
      allowedIpCidr: '198.51.100.0/24',
    });

    const template = Template.fromStack(stack).toJSON();
    const resources = (template.Resources ?? {}) as Record<
      string,
      { Type?: string; Properties?: { Rules?: Array<{ Name?: string }> } }
    >;
    const acl = Object.values(resources).find(
      (r) => r.Type === 'AWS::WAFv2::WebACL',
    );
    const rules = acl?.Properties?.Rules ?? [];

    expect(rules).toHaveLength(1);
    expect(rules[0]?.Name).toBe('AllowFromAllowedIp');
  });

  it('scopes IP set and WebAcl to REGIONAL when scope is REGIONAL', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'Regional', {});

    new WafIpAllowList(stack, 'Waf', {
      allowedIpCidr: '10.10.10.10/32',
      scope: 'REGIONAL',
    });

    Template.fromStack(stack).hasResourceProperties('AWS::WAFv2::WebACL', {
      Scope: 'REGIONAL',
    });
    Template.fromStack(stack).hasResourceProperties('AWS::WAFv2::IPSet', {
      Scope: 'REGIONAL',
    });
  });
});
