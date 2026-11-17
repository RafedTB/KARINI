import { describe, expect, it } from "vitest";
import type { User } from "@/domain/entities/user";
import { displayName } from "./display-name";

function user(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: "learner@example.com",
    ...overrides,
  } as User;
}

describe("displayName", () => {
  it("prefers a trimmed username", () => {
    expect(displayName(user({ username: "  Ada  ", firstname: "Ada" }))).toBe("Ada");
  });

  it("falls back to a trimmed firstname", () => {
    expect(displayName(user({ firstname: "  Lin  " }))).toBe("Lin");
  });

  it("falls back to the email prefix", () => {
    expect(displayName(user())).toBe("learner");
  });
});
