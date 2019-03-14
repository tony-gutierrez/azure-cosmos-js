import { PartitionKind } from "./index";

export interface PartitionKeyDefinition {
  paths: string[];
  kind: keyof typeof PartitionKind;
}

export interface PartitionKeyDefinitionResponse {
  systemKey: boolean;
}
