import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { handler } from "./index.ts";

Deno.test("handler returns 400 if email is missing", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({}),
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.error, "Email is required");
});

Deno.test("handler returns 400 if email format is invalid", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ email: "invalid-email" }),
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.error, "Invalid email format");
});

Deno.test("handler returns 200 on success with mocked dependencies", async () => {
  // Mock fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));

  // Mock Supabase client
  const mockSupabaseClient = {
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ error: null })
      })
    })
  };

  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ email: "test@example.com" }),
  });

  try {
    const res = await handler(req, mockSupabaseClient);
    assertEquals(res.status, 200);
    const data = await res.json();
    assertEquals(data.success, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
