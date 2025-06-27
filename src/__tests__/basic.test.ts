describe("Basic Jest Setup", () => {
  it("should run a basic test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should handle async operations", async () => {
    const promise = Promise.resolve("test");
    const result = await promise;
    expect(result).toBe("test");
  });

  it("should work with arrays", () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  it("should work with objects", () => {
    const obj = { name: "test", value: 42 };
    expect(obj).toHaveProperty("name");
    expect(obj.name).toBe("test");
  });

  it("should handle mock functions", () => {
    const mockFn = jest.fn();
    mockFn("test");

    expect(mockFn).toHaveBeenCalled();
    expect(mockFn).toHaveBeenCalledWith("test");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
