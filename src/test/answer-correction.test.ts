import { describe, expect, it } from "vitest";
import { correctRecallTypo } from "@/lib/answer-correction";

describe("recall autocorrect", () => {
  it("corrects one spelling slip", () => expect(correctRecallTypo("photosyntheiss", "photosynthesis")).toBe("photosynthesis"));
  it("does not supply missing concepts", () => expect(correctRecallTypo("light", "light and water")).toBeNull());
  it("does not change numerical answers", () => expect(correctRecallTypo("123456", "123457")).toBeNull());
  it("does not change short terms", () => expect(correctRecallTypo("ion", "iron")).toBeNull());
  it("respects disabled autocorrect", () => expect(correctRecallTypo("photosyntheiss", "photosynthesis", false)).toBeNull());
});