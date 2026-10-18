import { describe, it, expect } from "vitest";
import {
  parseVideoUrl,
  videoEmbedUrl,
  videoProviderLabel,
} from "@/lib/video-embed";

describe("video-embed: parseVideoUrl", () => {
  it("YouTube: watch?v=, youtu.be, shorts, live", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      provider: "youtube",
      id: "dQw4w9WgXcQ",
      canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      host: "youtube.com",
    });
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ").id).toBe("dQw4w9WgXcQ");
    expect(parseVideoUrl("https://youtube.com/shorts/dQw4w9WgXcQ").id).toBe("dQw4w9WgXcQ");
    expect(parseVideoUrl("https://youtube.com/live/dQw4w9WgXcQ").id).toBe("dQw4w9WgXcQ");
  });

  it("Instagram: /p/, /reel/, /tv/", () => {
    const p = parseVideoUrl("https://www.instagram.com/reel/CxAbCdEfGhI/");
    expect(p.provider).toBe("instagram");
    expect(p.id).toBe("CxAbCdEfGhI");
    expect(p.canonicalUrl).toBe("https://www.instagram.com/reel/CxAbCdEfGhI/");
  });

  it("TikTok: /@user/video/ID dan link pendek (id null)", () => {
    const full = parseVideoUrl("https://www.tiktok.com/@smpmuh4/video/7300000000000000000");
    expect(full.provider).toBe("tiktok");
    expect(full.id).toBe("7300000000000000000");
    const short = parseVideoUrl("https://vt.tiktok.com/ZSabcdef/");
    expect(short.provider).toBe("tiktok");
    expect(short.id).toBeNull();
  });

  it("Vimeo: vimeo.com/ID, /video/ID, player.vimeo.com", () => {
    expect(parseVideoUrl("https://vimeo.com/76979871")).toEqual({
      provider: "vimeo",
      id: "76979871",
      canonicalUrl: "https://vimeo.com/76979871",
      host: "vimeo.com",
    });
    expect(parseVideoUrl("https://player.vimeo.com/video/76979871").id).toBe("76979871");
    expect(parseVideoUrl("https://vimeo.com/video/76979871?h=abc").id).toBe("76979871");
    // ID terlalu pendek → dianggap bukan video
    expect(parseVideoUrl("https://vimeo.com/123").id).toBeNull();
  });

  it("Google Drive: /file/d/ID/view, preview, open?id=ID", () => {
    const view = parseVideoUrl("https://drive.google.com/file/d/1AbC_dEf-123/view");
    expect(view.provider).toBe("googledrive");
    expect(view.id).toBe("1AbC_dEf-123");
    expect(view.canonicalUrl).toBe("https://drive.google.com/file/d/1AbC_dEf-123/view");
    expect(parseVideoUrl("https://drive.google.com/file/d/1AbC_dEf-123/preview").id).toBe(
      "1AbC_dEf-123"
    );
    expect(parseVideoUrl("https://drive.google.com/open?id=1AbC_dEf-123").id).toBe(
      "1AbC_dEf-123"
    );
    // bukan file video — mis. form docs → tetap unknown
    expect(parseVideoUrl("https://docs.google.com/forms/d/e/1FA/viewform").provider).toBe(
      "unknown"
    );
  });

  it("Host tak dikenal tetap terdeteksi (untuk link-out)", () => {
    const p = parseVideoUrl("https://web.facebook.com/watch?v=123");
    expect(p.provider).toBe("unknown");
    expect(p.host).toBe("web.facebook.com");
  });

  it("URL rusak / kosong → unknown aman", () => {
    expect(parseVideoUrl("").provider).toBe("unknown");
    expect(parseVideoUrl("bukan-url").provider).toBe("unknown");
    expect(parseVideoUrl("ftp://contoh.com/video").provider).toBe("unknown");
  });
});

describe("video-embed: videoEmbedUrl", () => {
  it("src embed resmi per penyedia", () => {
    expect(videoEmbedUrl(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ"))).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1"
    );
    expect(videoEmbedUrl(parseVideoUrl("https://www.instagram.com/p/CxAbCdEfGhI/"))).toBe(
      "https://www.instagram.com/p/CxAbCdEfGhI/embed/"
    );
    expect(videoEmbedUrl(parseVideoUrl("https://vimeo.com/76979871"))).toBe(
      "https://player.vimeo.com/video/76979871"
    );
    expect(videoEmbedUrl(parseVideoUrl("https://drive.google.com/open?id=1AbC_dEf-123"))).toBe(
      "https://drive.google.com/file/d/1AbC_dEf-123/preview"
    );
  });

  it("tak bisa di-embed → null (runtime pakai fallback link-out)", () => {
    expect(videoEmbedUrl(parseVideoUrl("https://web.facebook.com/watch?v=123"))).toBeNull();
    expect(videoEmbedUrl(parseVideoUrl("https://vt.tiktok.com/ZSabcdef/"))).toBeNull();
    expect(videoEmbedUrl(parseVideoUrl("https://youtube.com/watch?v=pendek"))).toBeNull();
  });
});

describe("video-embed: videoProviderLabel", () => {
  it("penyedia dikenal memakai label resmi", () => {
    expect(videoProviderLabel(parseVideoUrl("https://vimeo.com/76979871"))).toBe("Vimeo");
    expect(videoProviderLabel(parseVideoUrl("https://drive.google.com/open?id=x"))).toBe(
      "Google Drive"
    );
  });

  it("host tak dikenal memakai hostname bersih", () => {
    expect(videoProviderLabel(parseVideoUrl("https://web.facebook.com/watch?v=123"))).toBe(
      "web.facebook.com"
    );
    expect(videoProviderLabel(parseVideoUrl(""))).toBe("Tidak dikenali");
  });
});
