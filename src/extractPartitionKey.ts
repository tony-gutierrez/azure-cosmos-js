import { parsePath } from "./common";
import { UNDEFINED_PARTITION_KEY } from "./common/partitionKeyConstants";
import { PartitionKey, PartitionKeyDefinition } from "./documents";

export function extractPartitionKey(
  document: any,
  partitionKeyDefinition: PartitionKeyDefinition
): PartitionKey[] | symbol {
  if (document === undefined) {
    return undefined;
  }
  if (partitionKeyDefinition && partitionKeyDefinition.paths && partitionKeyDefinition.paths.length > 0) {
    const partitionKey: PartitionKey[] = [];
    partitionKeyDefinition.paths.forEach((path: string) => {
      const pathParts = parsePath(path);
      let obj = document;
      for (const part of pathParts) {
        if (!(typeof obj === "object" && part in obj)) {
          obj = {};
          break;
        }
        obj = obj[part];
      }
      partitionKey.push(obj);
    });
    // if pk = [{}]
    if (partitionKey.length > 0 && partitionKey[0] && Object.keys(partitionKey[0]).length === 0) {
      return UNDEFINED_PARTITION_KEY;
    }
    return partitionKey;
  }
  return undefined;
}

export function throwPartitionKeyRequired() {
  throw new Error(
    "Partition Key must have a value provided. Please ensure you've specified one either in the provided document body or set `UNDEFINED_PARTITION_KEY` as a request option"
  );
}
