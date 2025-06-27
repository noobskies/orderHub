import { cn } from "@/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("merges class names correctly", () => {
      expect(cn("class1", "class2")).toBe("class1 class2");
    });

    it("handles conditional classes", () => {
      expect(cn("class1", true && "class2", false && "class3")).toBe(
        "class1 class2",
      );
    });

    it("handles undefined and null values", () => {
      expect(cn("class1", undefined, null, "class2")).toBe("class1 class2");
    });

    it("handles empty input", () => {
      expect(cn()).toBe("");
    });

    it("handles Tailwind class conflicts", () => {
      // This tests the tailwind-merge functionality
      expect(cn("px-2 py-1 bg-red hover:bg-dark-red", "p-3 bg-[#B91C1C]")).toBe(
        "hover:bg-dark-red p-3 bg-[#B91C1C]",
      );
    });

    it("handles array inputs", () => {
      expect(cn(["class1", "class2"], "class3")).toBe("class1 class2 class3");
    });

    it("handles object inputs", () => {
      expect(
        cn({
          class1: true,
          class2: false,
          class3: true,
        }),
      ).toBe("class1 class3");
    });
  });
});
