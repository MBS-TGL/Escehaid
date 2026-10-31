"use client";

import { useState } from "react";
import { BookmarkSimple, CaretDown, Checks, Plus, Trash, Users } from "@/components/Icons";
import { MenuPanel, MenuItem, useMenu } from "@/components/admin/mobile";
import { Modal } from "@/components/ui";
import { saveViewAction, deleteViewAction } from "@/app/admin/saved-views/actions";
import type { AdminSavedView } from "@/lib/queries/saved-views";

export function SavedViewsDropdown({
  module,
  currentParams,
  views,
  activeViewId,
  onSelectView,
  onRefresh,
}: {
  module: string;
  currentParams: Record<string, unknown>;
  views: AdminSavedView[];
  activeViewId?: string | null;
  onSelectView: (view: AdminSavedView | null) => void;
  onRefresh?: () => void;
}) {
  const { open, toggle, triggerRef, menuRef, menuId, panelStyle, onMenuKeyDown } = useMenu({
    menuMinWidth: 220,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeView = views.find((v) => v.id === activeViewId);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewName.trim()) return;
    setSaving(true);
    setErrorMsg(null);

    const res = await saveViewAction({
      module,
      name: viewName.trim(),
      params: currentParams,
      isShared,
    });

    setSaving(false);
    if (!res.success) {
      setErrorMsg(res.error || "Gagal menyimpan tampilan.");
      return;
    }

    setModalOpen(false);
    setViewName("");
    setIsShared(false);
    if (onRefresh) onRefresh();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Hapus tampilan tersimpan ini?")) return;
    const res = await deleteViewAction(id, module);
    if (res.success) {
      if (activeViewId === id) onSelectView(null);
      if (onRefresh) onRefresh();
    }
  };

  return (
    <>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label={`Tampilan tersimpan: ${activeView?.name ?? "Bawaan"}`}
          onClick={toggle}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 pl-2.5 pr-2 text-xs font-semibold text-slate-700 transition-colors hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] sm:gap-2 sm:pl-3 sm:pr-2.5"
        >
          <BookmarkSimple className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="max-w-[8rem] truncate">
            {activeView ? activeView.name : "Tampilan"}
          </span>
          <CaretDown className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        <MenuPanel id={menuId} label="Tampilan tersimpan" innerRef={menuRef} style={panelStyle} onKeyDown={onMenuKeyDown}>
          {/* Opsi Tampilan Default */}
          <MenuItem
            active={!activeViewId}
            onClick={() => {
              toggle();
              onSelectView(null);
            }}
          >
            <span className="flex-1">Semua / Bawaan</span>
            {!activeViewId && <Checks className="h-3.5 w-3.5 shrink-0 text-[var(--brand-accent)]" />}
          </MenuItem>

          {views.length > 0 && (
            <div className="my-1 border-t border-slate-100" />
          )}

          {views.map((v) => (
            <MenuItem
              key={v.id}
              active={v.id === activeViewId}
              onClick={() => {
                toggle();
                onSelectView(v);
              }}
            >
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                {v.is_shared && (
                  <span title="Dibagikan ke admin lain">
                    <Users className="h-3 w-3 shrink-0 text-slate-400" />
                  </span>
                )}
                <span className="truncate">{v.name}</span>
              </span>
              <button
                type="button"
                onClick={(e) => handleDelete(e, v.id)}
                className="ml-2 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
                title="Hapus tampilan"
              >
                <Trash className="h-3 w-3" />
              </button>
            </MenuItem>
          ))}

          <div className="my-1 border-t border-slate-100" />
          <MenuItem
            onClick={() => {
              toggle();
              setModalOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5 shrink-0 text-[var(--brand-accent)]" />
            <span className="font-semibold text-[var(--brand-accent)]">Simpan filter saat ini…</span>
          </MenuItem>
        </MenuPanel>
      </div>

      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Simpan Tampilan Filter"
        >
          <form onSubmit={handleSave} className="space-y-4">
            <p className="text-xs text-slate-500">
              Simpan kombinasi pencarian, status, dan filter yang sedang aktif agar mudah dibuka kembali.
            </p>

            <div>
              <label htmlFor="view-name-input" className="block text-xs font-semibold text-slate-700">
                Nama Tampilan <span className="text-red-500">*</span>
              </label>
              <input
                id="view-name-input"
                type="text"
                required
                maxLength={80}
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="Mis. Pending > 3 Hari, Draft Saya..."
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[var(--brand-accent)]"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[var(--brand-accent)] focus:ring-[var(--brand-accent)]"
              />
              <span>Bagikan tampilan ini dengan admin / staf lain</span>
            </label>

            {errorMsg && (
              <p className="rounded-lg bg-red-50 p-2 text-xs font-medium text-red-600">
                {errorMsg}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || !viewName.trim()}
                className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Menyimpan…" : "Simpan Tampilan"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
