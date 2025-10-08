import { Region, Stage } from '../../types/environments';
import { generateResourceName } from './generate-resource-name';

describe('generateResourceName', () => {
  it('should generate a valid resource name with all parts', () => {
    const name = generateResourceName({
      stage: Stage.Develop,
      service: 'update-user',
      resource: 'queue',
      suffix: 'dlq',
      region: Region.London,
    });
    expect(name).toBe('develop-update-user-queue-dlq-eu-west-2');
  });

  it('should generate a valid resource name without region or suffix', () => {
    const name = generateResourceName({
      stage: Stage.Prod,
      service: 'get-orders',
      resource: 'function',
    });
    expect(name).toBe('prod-get-orders-function');
  });

  it('should generate a valid resource name without region', () => {
    const name = generateResourceName({
      stage: Stage.Develop,
      service: 'update-user',
      resource: 'queue',
      suffix: 'dlq',
    });
    expect(name).toBe('develop-update-user-queue-dlq');
  });

  it('should generate a valid resource name without suffix', () => {
    const name = generateResourceName({
      stage: Stage.Staging,
      service: 'analytics',
      resource: 'table',
      region: Region.London,
    });
    expect(name).toBe('staging-analytics-table-eu-west-2');
  });

  it('should throw an error if the name exceeds the max length', () => {
    const longService = 'verylongservicenamethatexceedslimits';
    const longResource = 'verylongresourcetypewithmanycharacters';

    expect(() =>
      generateResourceName({
        stage: Stage.Staging,
        service: longService,
        resource: longResource,
        region: Region.London,
      }),
    ).toThrow(/exceeds the maximum allowed length/);
  });

  it('should handle empty strings gracefully', () => {
    const name = generateResourceName({
      stage: Stage.Develop,
      service: '',
      resource: 'table',
      suffix: '',
    });
    expect(name).toBe('develop-table');
  });

  it('should lowercase the result', () => {
    const name = generateResourceName({
      stage: Stage.Develop,
      service: 'Orders',
      resource: 'QUEUE',
      region: Region.London,
    });
    expect(name).toBe('develop-orders-queue-eu-west-2');
  });

  it('should handle mixed case in all parameters', () => {
    const name = generateResourceName({
      stage: Stage.Develop,
      service: 'User-Service',
      resource: 'Lambda-Function',
      suffix: 'V2',
      region: Region.London,
    });
    expect(name).toBe('develop-user-service-lambda-function-v2-eu-west-2');
  });

  it('should handle undefined optional parameters', () => {
    const name = generateResourceName({
      stage: Stage.Prod,
      service: 'payment',
      resource: 'bucket',
      suffix: undefined,
      region: undefined,
    });
    expect(name).toBe('prod-payment-bucket');
  });

  it('should generate name exactly at max length boundary', () => {
    const name = generateResourceName({
      stage: Stage.Develop,
      service: 'service12345678901234567890123456789',
      resource: 'resource12345678901',
    });
    expect(name).toHaveLength(64);
    expect(name).toBe(
      'develop-service12345678901234567890123456789-resource12345678901',
    );
  });

  it('should handle single character components', () => {
    const name = generateResourceName({
      stage: Stage.Develop,
      service: 'a',
      resource: 'b',
      suffix: 'c',
    });
    expect(name).toBe('develop-a-b-c');
  });
});
