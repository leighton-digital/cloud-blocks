import { Region, Stage } from '../../types/environments';
import { generateResourceName } from './generate-resource-name';

describe('generateResourceName', () => {
  it('should generate a valid resource name with all parts', () => {
    const name = generateResourceName(
      Stage.develop,
      'update-user',
      'queue',
      'dlq',
      Region.london,
    );
    expect(name).toBe('develop-update-user-queue-dlq-eu-west-2');
  });

  it('should generate a valid resource name without region or suffix', () => {
    const name = generateResourceName(Stage.prod, 'get-orders', 'function');
    expect(name).toBe('prod-get-orders-function');
  });

  it('should generate a valid resource name without region', () => {
    const name = generateResourceName(
      Stage.develop,
      'update-user',
      'queue',
      'dlq',
    );
    expect(name).toBe('develop-update-user-queue-dlq');
  });

  it('should throw an error if the name exceeds the max length', () => {
    const longService = 'verylongservicenamethatexceedslimits';
    const longResource = 'verylongresourcetypewithmanycharacters';

    expect(() =>
      generateResourceName(
        Stage.staging,
        longService,
        longResource,
        Region.london,
      ),
    ).toThrow(/exceeds the maximum allowed length/);
  });

  it('should handle empty strings gracefully', () => {
    const name = generateResourceName(Stage.develop, '', 'table', '');
    expect(name).toBe('develop-table');
  });

  it('should lowercase the result', () => {
    const name = generateResourceName(
      Stage.develop,
      'Orders',
      'QUEUE',
      Region.london,
    );
    expect(name).toBe('develop-orders-queue-eu-west-2');
  });
});
