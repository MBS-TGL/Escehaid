import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { MobileListRow } from "./MobileListRow";

const LONG_PRESS_MS = 500;

function row(container: HTMLElement) {
  return container.firstElementChild as HTMLElement;
}

/**
 * jsdom tidak punya PointerEvent, dan fireEvent.pointer* membuang koordinat —
 * handler butuh clientX/clientY untuk membatalkan long-press saat scroll.
 */
function pointer(el: Element, type: string, x = 0, y = 0) {
  const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(e, "pointerId", { value: 1 });
  Object.defineProperty(e, "pointerType", { value: "touch" });
  el.dispatchEvent(e);
}

describe("MobileListRow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("long-press 500ms memicu onLongPress", () => {
    const onLongPress = vi.fn();
    const { container } = render(<MobileListRow title="Item" onLongPress={onLongPress} />);
    const el = row(container);

    pointer(el, "pointerdown", 10, 10);
    vi.advanceTimersByTime(LONG_PRESS_MS - 1);
    expect(onLongPress).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("gerak > 10px membatalkan long-press", () => {
    const onLongPress = vi.fn();
    const { container } = render(<MobileListRow title="Item" onLongPress={onLongPress} />);
    const el = row(container);

    pointer(el, "pointerdown", 10, 10);
    pointer(el, "pointermove", 40, 10);
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("long-press lalu pointer up tidak memicu onClick ganda", () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { container } = render(
      <MobileListRow title="Item" onClick={onClick} onLongPress={onLongPress} />
    );
    const el = row(container);

    pointer(el, "pointerdown", 10, 10);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    pointer(el, "pointerup");
    fireEvent.click(el);

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("selectionMode: role checkbox + aria-checked, hold = toggle", () => {
    const onClick = vi.fn();
    const { getByRole } = render(
      <MobileListRow title="Item" selectionMode selected onClick={onClick} />
    );
    const el = getByRole("checkbox");
    expect(el.getAttribute("aria-checked")).toBe("true");
    expect(el.getAttribute("aria-labelledby")).toBeTruthy();

    pointer(el, "pointerdown", 5, 5);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("selectionMode: Space men-toggle tanpa long-press", () => {
    const onClick = vi.fn();
    const { getByRole } = render(<MobileListRow title="Item" selectionMode onClick={onClick} />);
    const el = getByRole("checkbox");
    expect(el.getAttribute("aria-checked")).toBe("false");

    fireEvent.keyDown(el, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("elemen [data-no-longpress] tidak memicu long-press", () => {
    const onLongPress = vi.fn();
    const { container, getByText } = render(
      <MobileListRow
        title="Item"
        onLongPress={onLongPress}
        actions={<span data-no-longpress="">menu</span>}
      />
    );
    void container;

    pointer(getByText("menu"), "pointerdown", 1, 1);
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("tanpa handler long-press & bukan selectionMode → tidak ada long-press", () => {
    const { container } = render(<MobileListRow title="Item" />);
    const el = row(container);
    expect(() => {
      pointer(el, "pointerdown", 1, 1);
      vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    }).not.toThrow();
  });
});
