import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaEmbeddedSignupSdkLoader,
  MetaEmbeddedSignupSdkError,
} from "../features/workspace/metaEmbeddedSignupSdk.ts";

const configuration = {
  appId: "123456789",
  apiVersion: "v21.0",
};

class FixtureScript {
  tagName = "SCRIPT";
  id = "";
  src = "";
  async = false;
  defer = false;
  crossOrigin = "";
  removed = false;
  listeners = new Map();
  onRemove = null;

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) {
      this.listeners.delete(type);
    }
  }

  emit(type) {
    this.listeners.get(type)?.();
  }

  remove() {
    this.removed = true;
    this.onRemove?.();
  }
}

function createBrowserFixture() {
  const windowObject = {};
  let activeScript = null;
  let appendCount = 0;
  const documentObject = {
    getElementById(id) {
      return activeScript?.id === id ? activeScript : null;
    },
    createElement(tagName) {
      assert.equal(tagName, "script");
      const script = new FixtureScript();
      script.onRemove = () => {
        if (activeScript === script) {
          activeScript = null;
        }
      };
      return script;
    },
    head: {
      appendChild(script) {
        activeScript = script;
        appendCount += 1;
      },
    },
  };

  return {
    documentObject,
    get activeScript() {
      return activeScript;
    },
    get appendCount() {
      return appendCount;
    },
    windowObject,
  };
}

test("loads and initializes the fixed Meta SDK exactly once", async () => {
  const fixture = createBrowserFixture();
  const initializationCalls = [];
  const loader = createMetaEmbeddedSignupSdkLoader({
    getWindow: () => fixture.windowObject,
    getDocument: () => fixture.documentObject,
  });

  const firstLoad = loader.load(configuration);
  const repeatedLoad = loader.load(configuration);

  assert.equal(firstLoad, repeatedLoad);
  assert.equal(fixture.appendCount, 1);
  assert.equal(
    fixture.activeScript.src,
    "https://connect.facebook.net/en_US/sdk.js",
  );
  assert.equal(
    fixture.activeScript.id,
    "connect-meta-facebook-sdk",
  );
  assert.equal(fixture.activeScript.async, true);
  assert.equal(fixture.activeScript.defer, true);
  assert.equal(fixture.activeScript.crossOrigin, "anonymous");

  const sdk = {
    init(options) {
      initializationCalls.push(options);
    },
    login() {},
  };
  fixture.windowObject.FB = sdk;
  fixture.windowObject.fbAsyncInit();

  assert.equal(await firstLoad, sdk);
  assert.deepEqual(initializationCalls, [
    {
      appId: "123456789",
      autoLogAppEvents: true,
      xfbml: true,
      version: "v21.0",
    },
  ]);
  assert.equal(fixture.windowObject.fbAsyncInit, undefined);
  assert.equal(fixture.activeScript.listeners.size, 0);
});

test("uses an SDK that is already present without adding a script", async () => {
  const fixture = createBrowserFixture();
  const initializationCalls = [];
  fixture.windowObject.FB = {
    init(options) {
      initializationCalls.push(options);
    },
    login() {},
  };
  const loader = createMetaEmbeddedSignupSdkLoader({
    getWindow: () => fixture.windowObject,
    getDocument: () => fixture.documentObject,
  });

  const sdk = await loader.load(configuration);

  assert.equal(sdk, fixture.windowObject.FB);
  assert.equal(fixture.appendCount, 0);
  assert.equal(initializationCalls.length, 1);
});

test("fails closed when another configuration is already loading", async () => {
  const fixture = createBrowserFixture();
  const loader = createMetaEmbeddedSignupSdkLoader({
    getWindow: () => fixture.windowObject,
    getDocument: () => fixture.documentObject,
  });
  const activeLoad = loader.load(configuration);

  await assert.rejects(
    loader.load({
      appId: "987654321",
      apiVersion: "v21.0",
    }),
    (error) =>
      error instanceof MetaEmbeddedSignupSdkError &&
      error.code === "CONFIGURATION_CONFLICT",
  );

  fixture.activeScript.emit("error");
  await assert.rejects(activeLoad);
});

test("rejects a script ID that points to another source", async () => {
  const fixture = createBrowserFixture();
  const conflictingScript = new FixtureScript();
  conflictingScript.id = "connect-meta-facebook-sdk";
  conflictingScript.src = "https://invalid.example/sdk.js";
  fixture.documentObject.head.appendChild(conflictingScript);
  const loader = createMetaEmbeddedSignupSdkLoader({
    getWindow: () => fixture.windowObject,
    getDocument: () => fixture.documentObject,
  });

  await assert.rejects(
    loader.load(configuration),
    (error) =>
      error instanceof MetaEmbeddedSignupSdkError &&
      error.code === "LOAD_FAILED",
  );
  assert.equal(conflictingScript.removed, false);
});

test("removes a failed script and allows a controlled retry", async () => {
  const fixture = createBrowserFixture();
  const loader = createMetaEmbeddedSignupSdkLoader({
    getWindow: () => fixture.windowObject,
    getDocument: () => fixture.documentObject,
  });
  const failedLoad = loader.load(configuration);
  const failedScript = fixture.activeScript;

  fixture.windowObject.FB = {
    init() {},
  };
  failedScript.emit("load");

  await assert.rejects(
    failedLoad,
    (error) =>
      error instanceof MetaEmbeddedSignupSdkError &&
      error.code === "INVALID_SDK",
  );
  assert.equal(failedScript.removed, true);

  fixture.windowObject.FB = undefined;
  const retryLoad = loader.load(configuration);

  assert.equal(fixture.appendCount, 2);
  fixture.activeScript.emit("error");
  await assert.rejects(
    retryLoad,
    (error) =>
      error instanceof MetaEmbeddedSignupSdkError &&
      error.code === "LOAD_FAILED",
  );
});

test("reports a deterministic timeout without provider details", async () => {
  const fixture = createBrowserFixture();
  const loader = createMetaEmbeddedSignupSdkLoader({
    getWindow: () => fixture.windowObject,
    getDocument: () => fixture.documentObject,
    loadTimeoutMs: 1,
  });

  await assert.rejects(
    loader.load(configuration),
    (error) => {
      assert.equal(
        error instanceof MetaEmbeddedSignupSdkError,
        true,
      );
      assert.equal(error.code, "LOAD_TIMEOUT");
      assert.doesNotMatch(
        JSON.stringify(error),
        /fixture|provider|https?:\/\//,
      );
      return true;
    },
  );
});

test("rejects invalid configuration and non-browser use before loading", async () => {
  const fixture = createBrowserFixture();
  const browserLoader = createMetaEmbeddedSignupSdkLoader({
    getWindow: () => fixture.windowObject,
    getDocument: () => fixture.documentObject,
  });

  assert.throws(
    () =>
      browserLoader.load({
        appId: "invalid-app-id",
        apiVersion: "latest",
      }),
    (error) =>
      error instanceof MetaEmbeddedSignupSdkError &&
      error.code === "INVALID_CONFIGURATION",
  );
  assert.equal(fixture.appendCount, 0);

  const serverLoader = createMetaEmbeddedSignupSdkLoader({
    getWindow: () => undefined,
    getDocument: () => undefined,
  });

  await assert.rejects(
    serverLoader.load(configuration),
    (error) =>
      error instanceof MetaEmbeddedSignupSdkError &&
      error.code === "UNSUPPORTED_ENVIRONMENT",
  );
});
