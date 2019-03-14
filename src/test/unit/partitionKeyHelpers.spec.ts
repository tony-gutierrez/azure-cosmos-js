import assert from "assert";

import { UNDEFINED_PARTITION_KEY } from "../../common/partitionKeyConstants";
import { PartitionKey, PartitionKeyDefinition, PartitionKind } from "../../documents";
import { extractPartitionKey, throwPartitionKeyRequired } from "../../extractPartitionKey";

interface ExtractPartitionKeyTestScenario {
  expected: PartitionKey[] | symbol;
  body: any;
  partitionKeyDefinition: PartitionKeyDefinition;
}

describe("extractPartitionKey", function() {
  const scenarios: ExtractPartitionKeyTestScenario[] = [
    { expected: undefined, body: undefined, partitionKeyDefinition: { paths: ["/pk"], kind: "Hash" } },
    { expected: undefined, body: { id: "foo", pk: "foo" }, partitionKeyDefinition: undefined },
    {
      expected: UNDEFINED_PARTITION_KEY,
      body: { id: "bar" },
      partitionKeyDefinition: { paths: ["/pk"], kind: "Hash" }
    },
    { expected: ["foo"], body: { id: "bar", pk: "foo" }, partitionKeyDefinition: { paths: ["/pk"], kind: "Hash" } },
    { expected: ["bar"], body: { id: "bar", pk: "foo" }, partitionKeyDefinition: { paths: ["/id"], kind: "Hash" } },
    {
      expected: ["baz"],
      body: { id: "bar", path: { to: { pk: "baz" } } },
      partitionKeyDefinition: { paths: ["/path/to/pk"], kind: "Hash" }
    },
    {
      expected: [null],
      body: { id: "bar", path: { to: { pk: null } } },
      partitionKeyDefinition: { paths: ["/path/to/pk"], kind: "Hash" }
    },
    {
      expected: UNDEFINED_PARTITION_KEY,
      body: { id: "bar", path: { to: { pk: "baz" } } },
      partitionKeyDefinition: { paths: ["/path/to/too/far"], kind: "Hash" }
    }
  ];

  for (const scenario of scenarios) {
    it(
      "should return " +
        JSON.stringify(scenario.expected) +
        " when body is " +
        JSON.stringify(scenario.body) +
        " and partitionKeyDefinition is " +
        JSON.stringify(scenario.partitionKeyDefinition),
      function() {
        const action = extractPartitionKey(scenario.body, scenario.partitionKeyDefinition);
        assert.deepStrictEqual(action, scenario.expected, "extractPartitionKey should return expected result");
      }
    );
  }
});

describe("throwPartitionKeyRequired", function() {
  it("should throw", function() {
    assert.throws(
      throwPartitionKeyRequired,
      new Error(
        "Partition Key must have a value provided. Please ensure you've specified one either in the provided document body or set `UNDEFINED_PARTITION_KEY` as a request option"
      )
    );
  });
});
