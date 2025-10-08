import { Stage } from '../../types/environments';
import { getStage } from './get-stage';

describe('getStage', () => {
  it('should return "prod" for Stage.Prod', () => {
    expect(getStage(Stage.Prod)).toBe(Stage.Prod);
  });

  it('should return "staging" for Stage.Staging', () => {
    expect(getStage(Stage.Staging)).toBe(Stage.Staging);
  });

  it('should return "test" for Stage.Test', () => {
    expect(getStage(Stage.Test)).toBe(Stage.Test);
  });

  it('should return the input string for ephemeral stage', () => {
    expect(getStage('pr-123')).toBe('pr-123');
  });

  it('should be lowercase for ephemeral environments', () => {
    expect(getStage('PR-123')).toBe('pr-123');
  });
});
