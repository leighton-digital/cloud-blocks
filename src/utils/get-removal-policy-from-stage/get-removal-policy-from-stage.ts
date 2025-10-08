import { RemovalPolicy } from 'aws-cdk-lib';
import { Stage } from '../../types/environments';

/**
 * Determines the appropriate AWS CDK `RemovalPolicy` based on the deployment stage.
 *
 * This function is used to prevent accidental deletion of critical resources (e.g., DynamoDB tables,
 * Cognito User Pools) in sensitive environments like `staging` and `prod`. In these environments,
 * the policy is set to `RETAIN`, ensuring resources are preserved even if the stack is deleted.
 * In other stages (e.g., `develop`, `test`), the policy is set to `DESTROY` to allow cleanup during development.
 *
 * @param {string} stage - The current deployment stage (e.g., "dev", "staging", "prod").
 * @returns {RemovalPolicy} The appropriate removal policy for the given stage.
 *
 * @example
 * const policy = getRemovalPolicyFromStage(Stage.Prod);
 * // Returns RemovalPolicy.RETAIN
 *
 * @example
 * const policy = getRemovalPolicyFromStage(Stage.Develop);
 * // Returns RemovalPolicy.DESTROY
 */
export function getRemovalPolicyFromStage(stage: string): RemovalPolicy {
  if (
    [Stage.Prod, Stage.Staging].includes(stage.toLowerCase().trim() as Stage)
  ) {
    return RemovalPolicy.RETAIN;
  }

  return RemovalPolicy.DESTROY;
}
