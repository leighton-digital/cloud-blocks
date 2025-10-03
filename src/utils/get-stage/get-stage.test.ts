import { Stage } from '../../types/environments';
import { getStage } from './get-stage';

describe('getStage', () => {
  it('should return "prod" for Stage.prod', () => {
    expect(getStage(Stage.prod)).toBe(Stage.prod);
  });

  it('should return "staging" for Stage.staging', () => {
    expect(getStage(Stage.staging)).toBe(Stage.staging);
  });

  it('should return "test" for Stage.test', () => {
    expect(getStage(Stage.test)).toBe(Stage.test);
  });

  it('should return the input string for ephemeral stage', () => {
    expect(getStage('pr-123')).toBe('pr-123');
  });

  it('should be lowercase for ephemeral environments', () => {
    expect(getStage('PR-123')).toBe('pr-123');
  });
});
