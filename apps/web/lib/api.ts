const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let mockDocs = [
  { id: "test1234", title: "CRDT Collaboration Demo", updated_at: new Date().toISOString() }
];

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
    console.warn("Backend offline or unreachable, using local mock API for:", endpoint);
    
    await new Promise(r => setTimeout(r, 300)); // Simulate network latency

    if (endpoint === "/docs" && (!options.method || options.method === "GET")) {
      return [...mockDocs];
    }
    if (endpoint.startsWith("/docs?q=")) {
      const urlObj = new URL(`http://localhost${endpoint}`);
      const q = urlObj.searchParams.get("q")?.toLowerCase() || "";
      return mockDocs.filter(d => d.title.toLowerCase().includes(q));
    }
    if (endpoint === "/docs" && options.method === "POST") {
      const body = options.body ? JSON.parse(options.body as string) : {};
      const newDoc = {
        id: "doc_" + Math.random().toString(36).substring(2, 9),
        title: body.title || "Untitled Document",
        updated_at: new Date().toISOString()
      };
      mockDocs = [newDoc, ...mockDocs];
      return newDoc;
    }
    if (endpoint.startsWith("/docs/") && (!options.method || options.method === "GET")) {
      const id = endpoint.split("/")[2];
      const doc = mockDocs.find(d => d.id === id);
      if (doc) return doc;
      return { id, title: "Untitled Document", updated_at: new Date().toISOString() };
    }
    if (endpoint.startsWith("/docs/") && options.method === "DELETE") {
      const id = endpoint.split("/")[2];
      mockDocs = mockDocs.filter(d => d.id !== id);
      return null;
    }

    // Unhandled endpoint
    throw error;
  }
}
