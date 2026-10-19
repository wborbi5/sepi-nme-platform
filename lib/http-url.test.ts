import assert from "node:assert/strict";
import test from "node:test";
import { optionalHttpUrl } from "./http-url";

test("accepts bare domains, www, and tracking params", () => {
  assert.deepEqual(optionalHttpUrl("linkedin.com/in/x"), {
    ok: true,
    value: "https://linkedin.com/in/x",
  });
  assert.deepEqual(optionalHttpUrl("  www.x.com  "), {
    ok: true,
    value: "https://www.x.com",
  });
  assert.deepEqual(
    optionalHttpUrl(
      "linkedin.com/in/x?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app"
    ),
    {
      ok: true,
      value:
        "https://linkedin.com/in/x?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app",
    }
  );
  assert.deepEqual(optionalHttpUrl("https://czarcrm.com/path?utm_source=ig"), {
    ok: true,
    value: "https://czarcrm.com/path?utm_source=ig",
  });
  assert.deepEqual(optionalHttpUrl("   "), { ok: true, value: null });
});

test("rejects text that is not a domain", () => {
  assert.equal(optionalHttpUrl("hello").ok, false);
  assert.equal(optionalHttpUrl("not a url").ok, false);
});
