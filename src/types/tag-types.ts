/**
 * Represents the key of a tag.
 *
 * A TagKey is always a string. Projects may extend this type to restrict
 * valid keys to a known set of values.
 *
 * @example
 * // Extended in a project:
 * export type MyTagKey = 'Environment' | 'Owner';
 */
export type TagKey = string;

/**
 * Represents the value of a tag.
 *
 * AWS tag values are strings, but can represent different concepts such as
 * environment names, project identifiers, or owner information.
 *
 * @example
 * const value: TagValue = 'production';
 */
export type TagValue = string;

/**
 * Represents a single AWS resource tag as a key/value pair.
 */
export interface Tag {
  /** The tag's key. */
  key: TagKey;

  /** The tag's value. */
  value: TagValue;
}

/**
 * Represents multiple AWS resource tags as a key/value map.
 *
 * Keys are tag names and values are tag values.
 *
 * @example
 * const tags: Tags = {
 *   Environment: 'prod',
 *   Owner: 'team-x',
 * };
 */
export type Tags = Record<TagKey, TagValue>;

/**
 * Represents a list of tag keys that must be present on AWS resources.
 *
 * This type can be used to define an organisation's required tagging policy.
 *
 * @example
 * export const requiredTags: RequiredTags = [
 *   'Environment',
 *   'Owner',
 *   'Project'
 * ];
 */
export type RequiredTags = TagKey[];
