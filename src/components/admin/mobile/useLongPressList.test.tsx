import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, renderHook } from "@testing-library/react";
import { useLongPressList } from "./useLongPressList";

const LONG_PRESS_MS = 500;

function pointer(el: Element, type: string, x = 0, y = 0) {
  const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(e, "pointerId", { value: 1 });
  Object.defineProperty(e, "pointerType", { value: "touch" });
  el.dispatchEvent(e);
}

type Handlers = ReturnType<typeof useLongPressList>;

function handlersOf(h: Handlers) {
  return {
    onPointerDown: h.onPointerDown,
    onPointerMove: h.onPointerMove,
    onPointerUp: h.onPointerUp,
    onPointerCancel: h.onPointerCancel,
    onPointerLeave: h.onPointerLeave,
  };
}

/** Pasang handler hook ke satu baris list beserta kontainer. */
function renderList(h: Handlers) {
  return render(
    <div {...handlersOf(h)}>
      <span data-testid="item" data-longpress-id="a1">
        Item
      </span>
      <span data-testid="locked" data-longpress-id="a2" data-no-longpress="">
        lock
      </span>
      <span data-testid="plain">plain</span>
    </div>
  );
}

describe("useLongPressList", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("hold pada elemen ber-data-longpress-id memicu onLongPress(id)", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPressList({ onLongPress }));
    const { getByTestId } = renderList(result.current);

    pointer(getByTestId("item"), "pointerdown", 5, 5);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLongPress).toHaveBeenCalledWith("a1");
  });

  it("gerak > 10px membatalkan long-press", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPressList({ onLongPress }));
    const { getByTestId } = renderList(result.current);

    pointer(getByTestId("item"), "pointerdown", 5, 5);
    pointer(getByTestId("item"), "pointermove", 30, 5);
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("[data-no-longpress] dan elemen tanpa id diabaikan", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPressList({ onLongPress }));
    const { getByTestId } = renderList(result.current);

    pointer(getByTestId("locked"), "pointerdown", 5, 5);
    pointer(getByTestId("plain"), "pointerdown", 5, 5);
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("consumeClick hanya true sekali setelah long-press", () => {
    const { result } = renderHook(() => useLongPressList({ onLongPress: vi.fn() }));
    const { getByTestId } = renderList(result.current);

    pointer(getByTestId("item"), "pointerdown", 5, 5);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(result.current.consumeClick()).toBe(true);
    expect(result.current.consumeClick()).toBe(false);
  });

  it("enabled=false → tidak ada long-press", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPressList({ onLongPress, enabled: false }));
    const { getByTestId } = renderList(result.current);

    pointer(getByTestId("item"), "pointerdown", 5, 5);
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
