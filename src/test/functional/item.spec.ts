import assert from "assert";
import { Container, PartitionKind } from "../..";
import { ItemDefinition } from "../../client";
import { UNDEFINED_PARTITION_KEY } from "../../common/partitionKeyConstants";
import {
  bulkDeleteItems,
  bulkInsertItems,
  bulkQueryItemsWithPartitionKey,
  bulkReadItems,
  bulkReplaceItems,
  createOrUpsertItem,
  getTestDatabase,
  removeAllDatabases,
  replaceOrUpsertItem
} from "../common/TestHelpers";

/**
 * @ignore
 * @hidden
 */
interface TestItem {
  id?: string;
  name?: string;
  foo?: string;
  key?: string;
  replace?: string;
}

describe("NodeJS CRUD Tests", function() {
  this.timeout(process.env.MOCHA_TIMEOUT || 10000);
  beforeEach(async function() {
    await removeAllDatabases();
  });

  describe("Validate Document CRUD", function() {
    const documentCRUDTest = async function(isUpsertTest: boolean) {
      // create database
      const database = await getTestDatabase("sample 中文 database");
      // create container
      const { resource: containerdef } = await database.containers.create({ id: "sample container" });
      const container: Container = database.container(containerdef.id);

      // read items
      const { resources: items } = await container.items.readAll().fetchAll();
      assert(Array.isArray(items), "Value should be an array");

      // create an item
      const beforeCreateDocumentsCount = items.length;
      const itemDefinition: TestItem = {
        name: "sample document",
        foo: "bar",
        key: "value",
        replace: "new property"
      };
      try {
        await createOrUpsertItem(container, itemDefinition, { disableAutomaticIdGeneration: true }, isUpsertTest);
        assert.fail("id generation disabled must throw with invalid id");
      } catch (err) {
        assert(err !== undefined, "should throw an error because automatic id generation is disabled");
      }
      const { resource: document } = await createOrUpsertItem(container, itemDefinition, undefined, isUpsertTest);
      assert.equal(document.name, itemDefinition.name);
      assert(document.id !== undefined);
      // read documents after creation
      const { resources: documents2 } = await container.items.readAll().fetchAll();
      assert.equal(documents2.length, beforeCreateDocumentsCount + 1, "create should increase the number of documents");
      // query documents
      const querySpec = {
        query: "SELECT * FROM root r WHERE r.id=@id",
        parameters: [
          {
            name: "@id",
            value: document.id
          }
        ]
      };
      const { resources: results } = await container.items.query(querySpec).fetchAll();
      assert(results.length > 0, "number of results for the query should be > 0");
      const { resources: results2 } = await container.items.query(querySpec, { enableScanInQuery: true }).fetchAll();
      assert(results2.length > 0, "number of results for the query should be > 0");

      // replace document
      document.name = "replaced document";
      document.foo = "not bar";
      const { resource: replacedDocument } = await replaceOrUpsertItem(container, document, undefined, isUpsertTest);
      assert.equal(replacedDocument.name, "replaced document", "document name property should change");
      assert.equal(replacedDocument.foo, "not bar", "property should have changed");
      assert.equal(document.id, replacedDocument.id, "document id should stay the same");
      // read document
      const { resource: document2 } = await container
        .item(replacedDocument.id, UNDEFINED_PARTITION_KEY)
        .read<TestItem>();
      assert.equal(replacedDocument.id, document2.id);
      // delete document
      const { resource: res } = await container.item(replacedDocument.id, UNDEFINED_PARTITION_KEY).delete();

      // read documents after deletion
      try {
        const { resource: document3 } = await container.item(replacedDocument.id, UNDEFINED_PARTITION_KEY).read();
        assert.fail("must throw if document doesn't exist");
      } catch (err) {
        const notFoundErrorCode = 404;
        assert.equal(err.code, notFoundErrorCode, "response should return error code 404");
      }
    };

    const documentCRUDMultiplePartitionsTest = async function() {
      // create database
      const database = await getTestDatabase("db1");
      const partitionKey = "key";

      // create container
      const containerDefinition = {
        id: "coll1",
        partitionKey: { paths: ["/" + partitionKey], kind: PartitionKind.Hash }
      };

      const { resource: containerdef } = await database.containers.create(containerDefinition, {
        offerThroughput: 12000
      });
      const container = database.container(containerdef.id);

      const documents = [
        { id: "document1" },
        { id: "document2", key: null, prop: 1 },
        { id: "document3", key: false, prop: 1 },
        { id: "document4", key: true, prop: 1 },
        { id: "document5", key: 1, prop: 1 },
        { id: "document6", key: "A", prop: 1 }
      ];

      let returnedDocuments = await bulkInsertItems(container, documents);

      assert.equal(returnedDocuments.length, documents.length);
      returnedDocuments.sort(function(doc1, doc2) {
        return doc1.id.localeCompare(doc2.id);
      });
      await bulkReadItems(container, returnedDocuments, partitionKey);
      const { resources: successDocuments } = await container.items.readAll().fetchAll();
      assert(successDocuments !== undefined, "error reading documents");
      assert.equal(
        successDocuments.length,
        returnedDocuments.length,
        "Expected " + returnedDocuments.length + " documents to be succesfully read"
      );
      successDocuments.sort(function(doc1, doc2) {
        return doc1.id.localeCompare(doc2.id);
      });
      assert.equal(
        JSON.stringify(successDocuments),
        JSON.stringify(returnedDocuments),
        "Unexpected documents are returned"
      );

      returnedDocuments.forEach(function(document) {
        ++document.prop;
      });
      const newReturnedDocuments = await bulkReplaceItems(container, returnedDocuments, UNDEFINED_PARTITION_KEY);
      returnedDocuments = newReturnedDocuments;
      await bulkQueryItemsWithPartitionKey(container, returnedDocuments, partitionKey);
      const querySpec = {
        query: "SELECT * FROM Root"
      };
      try {
        const { resources: badUpdate } = await container.items.query(querySpec, { enableScanInQuery: true }).fetchAll();
        assert.fail("Must fail");
      } catch (err) {
        const badRequestErrorCode = 400;
        assert.equal(err.code, badRequestErrorCode, "response should return error code " + badRequestErrorCode);
      }
      const { resources: results } = await container.items
        .query<ItemDefinition>(querySpec, { enableScanInQuery: true, enableCrossPartitionQuery: true })
        .fetchAll();
      assert(results !== undefined, "error querying documents");
      results.sort(function(doc1, doc2) {
        return doc1.id.localeCompare(doc2.id);
      });
      assert.equal(
        results.length,
        returnedDocuments.length,
        "Expected " + returnedDocuments.length + " documents to be succesfully queried"
      );
      assert.equal(JSON.stringify(results), JSON.stringify(returnedDocuments), "Unexpected query results");

      await bulkDeleteItems(container, returnedDocuments, partitionKey);
    };

    it("nativeApi Should do document CRUD operations successfully name based", async function() {
      await documentCRUDTest(false);
    });

    it("nativeApi Should do document CRUD operations successfully name based with upsert", async function() {
      await documentCRUDTest(true);
    });

    it("nativeApi Should do document CRUD operations over multiple partitions", async function() {
      await documentCRUDMultiplePartitionsTest();
    });
  });
});
