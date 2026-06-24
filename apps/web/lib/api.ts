const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Persistent mock store using localStorage ───────────────────────────────
function getMockDocs() {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("syncpad_mock_docs");
    return stored ? JSON.parse(stored) : [
      { id: "demo_doc_1", title: "CRDT Collaboration Demo", updated_at: new Date().toISOString() }
    ];
  } catch { return []; }
}

function saveMockDocs(docs: any[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("syncpad_mock_docs", JSON.stringify(docs)); } catch {}
}

function getMockUser() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("syncpad_mock_user");
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function saveMockUser(user: any) {
  if (typeof window === "undefined") return;
  try {
    if (user) localStorage.setItem("syncpad_mock_user", JSON.stringify(user));
    else localStorage.removeItem("syncpad_mock_user");
  } catch {}
}

function getMockUsers() {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("syncpad_mock_users");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveMockUsers(users: any[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("syncpad_mock_users", JSON.stringify(users)); } catch {}
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;

  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  };

  try {
    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
      let errorMessage = "An error occurred";
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        errorMessage = response.statusText;
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    // If the backend is offline (Failed to fetch), fallback to local mock store
    if (error instanceof Error && !error.message.includes("Failed to fetch") && !error.message.includes("fetch")) {
      throw error; // Real API error (auth failed etc.), rethrow
    }

    console.warn("Backend offline or unreachable, using local mock API for:", endpoint);
    await new Promise((r) => setTimeout(r, 250)); // Simulate latency

    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body as string) : {};

    // ── AUTH ROUTES ──────────────────────────────────────────────────────────
    if (endpoint === "/auth/register" && method === "POST") {
      const users = getMockUsers();
      if (users.find((u: any) => u.email === body.email)) {
        throw new Error("Email already registered");
      }
      const user = { id: "user_" + Math.random().toString(36).slice(2, 9), email: body.email, password: body.password };
      users.push(user);
      saveMockUsers(users);
      saveMockUser(user);
      return { access_token: "mock_token_" + user.id, token_type: "bearer" };
    }

    if (endpoint === "/auth/login" && method === "POST") {
      const users = getMockUsers();
      const user = users.find((u: any) => u.email === body.email && u.password === body.password);
      if (!user) throw new Error("Incorrect email or password");
      saveMockUser(user);
      return { access_token: "mock_token_" + user.id, token_type: "bearer" };
    }

    if (endpoint === "/auth/logout" && method === "POST") {
      saveMockUser(null);
      return null;
    }

    // ── DOCS ROUTES ──────────────────────────────────────────────────────────
    if (endpoint === "/docs" && method === "GET") {
      return getMockDocs();
    }

    if (endpoint.startsWith("/docs?")) {
      const urlObj = new URL(`http://localhost${endpoint}`);
      const q = urlObj.searchParams.get("q")?.toLowerCase() || "";
      return getMockDocs().filter((d: any) => d.title.toLowerCase().includes(q));
    }

    if (endpoint === "/docs" && method === "POST") {
      const docs = getMockDocs();
      const newDoc = {
        id: "doc_" + Math.random().toString(36).slice(2, 9),
        title: body.title || "Untitled Document",
        owner_id: "mock_user",
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      docs.unshift(newDoc);
      saveMockDocs(docs);
      return newDoc;
    }

    if (endpoint.match(/^\/docs\/([^/]+)$/) && method === "GET") {
      const id = endpoint.split("/")[2];
      const docs = getMockDocs();
      const doc = docs.find((d: any) => d.id === id);
      if (doc) return doc;
      return { id, title: "Untitled Document", owner_id: "mock_user", parent_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    }

    if (endpoint.match(/^\/docs\/([^/]+)$/) && method === "PATCH") {
      const id = endpoint.split("/")[2];
      const docs = getMockDocs();
      const idx = docs.findIndex((d: any) => d.id === id);
      if (idx !== -1) {
        docs[idx] = { ...docs[idx], ...body, updated_at: new Date().toISOString() };
        saveMockDocs(docs);
        return docs[idx];
      }
      return { id, title: body.title || "Untitled Document", owner_id: "mock_user", parent_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    }

    if (endpoint.match(/^\/docs\/([^/]+)$/) && method === "DELETE") {
      const id = endpoint.split("/")[2];
      const docs = getMockDocs().filter((d: any) => d.id !== id);
      saveMockDocs(docs);
      return null;
    }

    if (endpoint.match(/^\/docs\/([^/]+)\/branch$/) && method === "POST") {
      const id = endpoint.split("/")[2];
      const docs = getMockDocs();
      const orig = docs.find((d: any) => d.id === id);
      const newDoc = {
        id: "doc_" + Math.random().toString(36).slice(2, 9),
        title: (orig?.title || "Untitled Document") + " (Branch)",
        owner_id: "mock_user",
        parent_id: id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      docs.unshift(newDoc);
      saveMockDocs(docs);
      return newDoc;
    }

    if (endpoint.match(/^\/docs\/([^/]+)\/snapshots$/) && method === "GET") {
      return []; // Mock: no snapshots
    }

    if (endpoint.match(/^\/docs\/([^/]+)\/snapshot$/) && method === "POST") {
      return { status: "success" };
    }

    // Unhandled endpoint
    console.warn("Unhandled mock endpoint:", endpoint, method);
    return null;
  }
}

/** Check if we're in "offline/demo" mode (no backend).
 *  Returns true if the backend is NOT reachable. */
export async function isOfflineMode(): Promise<boolean> {
  try {
    const resp = await fetch(`${API_URL}/`, { method: "GET", signal: AbortSignal.timeout(2000) });
    return !resp.ok;
  } catch {
    return true;
  }
}

/** Get mock user if logged in offline mode */
export function getMockCurrentUser() {
  return getMockUser();
}
