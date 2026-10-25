import { describe, expect, it } from "vitest";
import { canStartDirectConversation } from "../src/modules/messaging/messaging.service";

describe("direct conversation permissions", () => {
  it("allows buyer and seller conversations in both directions", () => {
    expect(canStartDirectConversation(["buyer"], ["seller"])).toBe(true);
    expect(canStartDirectConversation(["seller"], ["buyer"])).toBe(true);
  });

  it("allows buyers and sellers to contact administrators", () => {
    expect(canStartDirectConversation(["buyer"], ["admin"])).toBe(true);
    expect(canStartDirectConversation(["seller"], ["admin"])).toBe(true);
    expect(canStartDirectConversation(["admin"], ["buyer"])).toBe(true);
    expect(canStartDirectConversation(["admin"], ["seller"])).toBe(true);
  });

  it("rejects conversations between unrelated non-admin accounts", () => {
    expect(canStartDirectConversation(["buyer"], ["buyer"])).toBe(false);
    expect(canStartDirectConversation(["seller"], ["seller"])).toBe(false);
    expect(canStartDirectConversation([], ["buyer"])).toBe(false);
  });
});
