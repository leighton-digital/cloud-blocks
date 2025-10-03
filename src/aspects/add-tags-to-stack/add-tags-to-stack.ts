import * as cdk from 'aws-cdk-lib';
import type { Tags } from '../../types/tag-types';

/**
 * Adds a set of tags to an AWS CDK stack.
 *
 * Iterates over the provided tag map and applies each tag to the given CDK stack
 * using the CDK `Tags` utility.
 *
 * @param stack - The AWS CDK stack to which tags will be applied.
 * @param tags - A map of tag keys and values to apply to the stack.
 */
export function addTagsToStack(stack: cdk.Stack, tags: Tags) {
  for (const [key, value] of Object.entries(tags)) {
    cdk.Tags.of(stack).add(key, value);
  }
}
