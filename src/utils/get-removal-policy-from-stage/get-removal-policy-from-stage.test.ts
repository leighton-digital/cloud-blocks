import { RemovalPolicy } from 'aws-cdk-lib';
import { Stage } from '../../types/environments';
import { getRemovalPolicyFromStage } from './get-removal-policy-from-stage';

describe('getRemovalPolicyFromStage', () => {
  describe('when stage is prod', () => {
    it('should return retain policy', () => {
      const result = getRemovalPolicyFromStage(Stage.prod);
      expect(result).toBe(RemovalPolicy.RETAIN);
    });
  });

  describe('when stage is staging', () => {
    it('should return retain policy', () => {
      const result = getRemovalPolicyFromStage(Stage.staging);
      expect(result).toBe(RemovalPolicy.RETAIN);
    });
  });

  describe('when stage is develop', () => {
    it('should return destroy policy', () => {
      const result = getRemovalPolicyFromStage(Stage.develop);
      expect(result).toBe(RemovalPolicy.DESTROY);
    });
  });

  describe('when stage is test', () => {
    it('should return destroy policy', () => {
      const result = getRemovalPolicyFromStage('test');
      expect(result).toBe(RemovalPolicy.DESTROY);
    });
  });

  describe('when stage is an ephemeral', () => {
    it('should return destroy policy', () => {
      const result = getRemovalPolicyFromStage('pr-123');
      expect(result).toBe(RemovalPolicy.DESTROY);
    });
  });

  describe('edge cases', () => {
    it('should be case sensitive for prod', () => {
      const result = getRemovalPolicyFromStage('PROD');
      expect(result).toBe(RemovalPolicy.RETAIN);
    });

    it('should be case sensitive for staging', () => {
      const result = getRemovalPolicyFromStage('STAGING');
      expect(result).toBe(RemovalPolicy.RETAIN);
    });

    it('should be case sensitive for develop', () => {
      const result = getRemovalPolicyFromStage('DEVELOP');
      expect(result).toBe(RemovalPolicy.DESTROY);
    });

    it('should be case sensitive for test', () => {
      const result = getRemovalPolicyFromStage('TEST');
      expect(result).toBe(RemovalPolicy.DESTROY);
    });

    it('should be case sensitive for ephemeral', () => {
      const result = getRemovalPolicyFromStage('PR-123');
      expect(result).toBe(RemovalPolicy.DESTROY);
    });

    it('should handle stages with whitespace', () => {
      const result = getRemovalPolicyFromStage(' prod ');
      expect(result).toBe(RemovalPolicy.RETAIN);
    });
  });
});
