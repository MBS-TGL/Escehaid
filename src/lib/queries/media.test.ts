import { describe, expect, it } from "vitest";
import { walkStorageFiles, type StorageWalkEntry, type StorageWalkListFn } from "./media";

/**
 * Uji walker rekursif Media Library (dipakai getMediaFiles & server action
 * listMediaFiles) dengan listFn palsu — tanpa jaringan/storage sungguhan.
 */

const FOLDER = (name: string): StorageWalkEntry => ({
  id: null,
  name,
  metadata: null,
  created_at: null,
});

const FILE = (name: string, opts: { size?: number; mimetype?: string } = {}): StorageWalkEntry => ({
  id: `id-${name}`,
  name,
  metadata: { size: opts.size ?? 123, ...(opts.mimetype ? { mimetype: opts.mimetype } : {}) },
  created_at: "2025-01-02T03:04:05.000Z",
});

/** listFn dari peta prefix → entri (prefix "" = root). */
function listFnFrom(map: Record<string, StorageWalkEntry[]>): StorageWalkListFn {
  return async (prefix) => ({ data: map[prefix] ?? [], error: null });
}

describe("walkStorageFiles", () => {
  it("meratakan file root + folder rekursif (path & folder benar, urutan DFS)", async () => {
    const files = await walkStorageFiles(
      "images",
      listFnFrom({
        "": [FILE("a.jpg"), FOLDER("ekskul")],
        ekskul: [FILE("b.png"), FOLDER("sub")],
        "ekskul/sub": [FILE("c.pdf")],
      })
    );
    expect(files.map((f) => f.path)).toEqual(["a.jpg", "ekskul/b.png", "ekskul/sub/c.pdf"]);
    expect(files.map((f) => f.folder)).toEqual(["", "ekskul", "ekskul/sub"]);
    expect(files.every((f) => f.bucket === "images")).toBe(true);
  });

  it("cap depth: folder di depth 4 tidak dibaca isinya", async () => {
    const files = await walkStorageFiles(
      "documents",
      listFnFrom({
        "": [FOLDER("l1")],
        l1: [FOLDER("l2")],
        "l1/l2": [FOLDER("l3")],
        "l1/l2/l3": [FILE("deep.txt"), FOLDER("l4")],
        "l1/l2/l3/l4": [FILE("deeper.txt")],
      })
    );
    const paths = files.map((f) => f.path);
    expect(paths).toContain("l1/l2/l3/deep.txt");
    expect(paths).not.toContain("l1/l2/l3/l4/deeper.txt");
  });

  it("error di root DILEMPAR (pesan ramah), bukan daftar kosong palsu", async () => {
    const denied: StorageWalkListFn = async () => ({
      data: null,
      error: { message: "RBAC ditolak.", status: 403 },
    });
    await expect(walkStorageFiles("images", denied)).rejects.toThrow("RBAC ditolak.");
  });

  it("error folder bawah dilewati — folder lain tetap terbaca", async () => {
    const listFn: StorageWalkListFn = async (prefix) => {
      if (prefix === "bad") return { data: null, error: { message: "folder rusak", status: 403 } };
      return {
        data: prefix === "" ? [FOLDER("ok"), FOLDER("bad")] : [FILE("x.png")],
        error: null,
      };
    };
    const files = await walkStorageFiles("images", listFn);
    expect(files.map((f) => f.path)).toEqual(["ok/x.png"]);
  });

  it("error transient (503) di-retry sampai sukses", async () => {
    let calls = 0;
    const flaky: StorageWalkListFn = async () => {
      calls += 1;
      if (calls === 1) return { data: null, error: { message: "Service Unavailable", status: 503 } };
      return { data: [FILE("retry.jpg")], error: null };
    };
    const files = await walkStorageFiles("images", flaky);
    expect(files.map((f) => f.path)).toEqual(["retry.jpg"]);
    expect(calls).toBe(2);
  });

  it("mimetype jatuh dari ekstensi; metadata yang ada tetap menang", async () => {
    const files = await walkStorageFiles(
      "images",
      listFnFrom({
        "": [
          FILE("foto.webp", { size: 10 }),
          FILE("catatan.docx", { size: 20 }),
          FILE("dengan-mime.jpg", { size: 30, mimetype: "image/custom" }),
        ],
      })
    );
    expect(files[0]).toMatchObject({
      mimetype: "image/webp",
      isImage: true,
      size: 10,
      createdAt: "2025-01-02T03:04:05.000Z",
    });
    expect(files[1]).toMatchObject({
      mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      isImage: false,
    });
    expect(files[2]).toMatchObject({ mimetype: "image/custom", isImage: true });
  });

  it("bucket kosong → daftar kosong (tanpa error)", async () => {
    const files = await walkStorageFiles("spmb-documents", listFnFrom({}));
    expect(files).toEqual([]);
  });
});
