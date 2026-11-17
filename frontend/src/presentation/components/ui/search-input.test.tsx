import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SearchInput } from "./search-input";

describe("SearchInput", () => {
  it("renders controlled value and reports edits", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    function ControlledSearch() {
      const [value, setValue] = useState("");
      return (
        <SearchInput
          value={value}
          onChange={(nextValue) => {
            setValue(nextValue);
            onChange(nextValue);
          }}
          placeholder="Search courses"
        />
      );
    }

    render(<ControlledSearch />);

    const input = screen.getByPlaceholderText("Search courses");
    await user.type(input, "Math");
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange).toHaveBeenLastCalledWith("Math");
    expect(input).toHaveValue("Math");
  });

  it("uses the default placeholder", () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Rechercher...")).toBeInTheDocument();
  });
});
