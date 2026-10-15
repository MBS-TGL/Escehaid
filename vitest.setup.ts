import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Next.js modules that are used in server components/actions
vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/headers", () => ({
  cookies: () => ({
    getAll: () => [],
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// Mock Supabase client
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getClaims: vi.fn().mockResolvedValue({ data: { claims: null } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
    storage: {
      from: vi.fn(() => ({
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "" } }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "" }, error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  })),
}));

// Mock Supabase server client
vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getClaims: vi.fn().mockResolvedValue({ data: { claims: null } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// Suppress console.error in tests unless needed
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.("Warning:") || args[0]?.includes?.("act(...)")) {
    return;
  }
  originalError.apply(console, args);
};