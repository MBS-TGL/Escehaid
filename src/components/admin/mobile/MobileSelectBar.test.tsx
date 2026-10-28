import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileSelectBar } from "./MobileSelectBar";

describe("MobileSelectBar", () => {
  it("satu baris: tanpa flex-wrap, aksi bisa digeser horizontal", () => {
    const { container } = render(
      <MobileSelectBar count={3} onCancel={vi.fn()} onDelete={vi.fn()}>
        <button type="button">Terbitkan</button>
        <button type="button">Draft</button>
      </MobileSelectBar>
    );
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.className).toContain("bottom-0");
    expect(bar.className).toContain("lg:hidden");
    expect(bar.dataset.adminBottomBar).toBe("");

    const actions = bar.querySelector("[class*='overflow-x-auto']") as HTMLElement;
    expect(actions).toBeTruthy();
    expect(actions.className).not.toContain("flex-wrap");
  });

  it("tombol Batal memanggil onCancel dan punya label aksesibel", () => {
    const onCancel = vi.fn();
    render(<MobileSelectBar count={1} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /selesai memilih/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Hapus disembunyikan tanpa izin; hitungan diumumkan ke pembaca layar", () => {
    render(<MobileSelectBar count={2} onCancel={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Hapus" })).toBeNull();
    expect(screen.getByText("dipilih")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });
});
