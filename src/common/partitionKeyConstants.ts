/**
 * Used to specify that your partition key is undefined.
 */
export const UNDEFINED_PARTITION_KEY = Symbol("UNDEFINED_PARTITION_KEY");

/**
 * Header value used for indicating undefined partition key value. Only used for non-migrated containers.
 * @hidden
 * @internal
 */
export const UNDEFINED_PARTITION_KEY_VALUE_HEADER = "[{}]";
/**
 * Header value used for indicating undefined partition key value. Only used for migrated containers.
 * @hidden
 * @internal
 */
export const EMPTY_PARTITION_KEY_VALUE_HEADER = "[]";

/**
 * The default path for the partition key if the user does not specify one on container create.
 * @hidden
 * @internal
 */
export const DEFAULT_PARTITION_KEY_PATH = "/_partitionKey";
