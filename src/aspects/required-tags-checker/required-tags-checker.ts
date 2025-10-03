import { Annotations, type IAspect, Stack } from 'aws-cdk-lib';
import type { IConstruct } from 'constructs';
import type { RequiredTags } from '../../types/tag-types';

/**
 * CDK aspect that checks for the presence of required tags on a stack.
 *
 * This aspect can be applied to a CDK app or stack to enforce tagging policies.
 * It validates that:
 * - The stack has at least one tag.
 * - All specified required tags are present.
 *
 * If any required tags are missing or no tags are found, an error annotation is added to the stack.
 *
 * @example
 * import { RequiredTagsChecker } from './aspects/required-tags-checker';
 * import { appRequiredTags } from './tags';
 *
 * cdk.Aspects.of(this).add(new RequiredTagsChecker(appRequiredTags));
 *
 * @implements {IAspect}
 */
export class RequiredTagsChecker implements IAspect {
  /**
   * Creates a new RequiredTagsChecker.
   *
   * @param requiredTags - A list of tag keys that must be present on the stack.
   */
  constructor(private readonly requiredTags: RequiredTags) {}

  /**
   * Visits each construct in the CDK app and performs tag validation on stacks.
   *
   * @param node - The construct being visited.
   */
  public visit(node: IConstruct): void {

    if (!(node instanceof Stack)) return;

    if (!node.tags.hasTags()) {
      Annotations.of(node).addError(`There are no tags on "${node.stackName}"`);
    }

    for (const tag of this.requiredTags) {
      if (!Object.keys(node.tags.tagValues()).includes(tag)) {
        Annotations.of(node).addError(
          `"${tag}" is missing from stack with id "${node.stackName}"`,
        );
      }
    }
  }
}
