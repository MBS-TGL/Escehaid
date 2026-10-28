import { describe, expect, it } from "vitest";
import { render, renderHook, act } from "@testing-library/react";
import { AdminChromeProvider, useAdminBottomBar, useAdminChrome } from "./AdminChrome";

function Probe({ active }: { active: boolean }) {
  useAdminBottomBar(active);
  const { bottomBarActive } = useAdminChrome();
  return <span data-testid="state">{String(bottomBarActive)}</span>;
}

describe("AdminChrome", () => {
  it("nav aktif kembali setelah halaman keluar mode pilih", () => {
    const { getByTestId, rerender } = render(
      <AdminChromeProvider>
        <Probe active={false} />
      </AdminChromeProvider>
    );
    expect(getByTestId("state").textContent).toBe("false");

    rerender(
      <AdminChromeProvider>
        <Probe active />
      </AdminChromeProvider>
    );
    expect(getByTestId("state").textContent).toBe("true");

    rerender(
      <AdminChromeProvider>
        <Probe active={false} />
      </AdminChromeProvider>
    );
    expect(getByTestId("state").textContent).toBe("false");
  });

  it("bar yang unmount (route change) melepas status aktif", () => {
    const { getByTestId, rerender } = render(
      <AdminChromeProvider>
        <Probe active />
      </AdminChromeProvider>
    );
    expect(getByTestId("state").textContent).toBe("true");

    rerender(
      <AdminChromeProvider>
        <span data-testid="state">gone</span>
      </AdminChromeProvider>
    );
    expect(getByTestId("state").textContent).toBe("gone");
  });

  it("di luar provider: default nonaktif, register tidak melempar", () => {
    const { result } = renderHook(() => useAdminChrome());
    expect(result.current.bottomBarActive).toBe(false);
    expect(() => act(() => result.current.registerBottomBar()())).not.toThrow();
  });
});
