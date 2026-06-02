const API_BASE = import.meta.env.VITE_API_URL || "";

export interface AnalyzeRequest {
  prompt: string;
}

export interface AnalyzeResponse {
  analysis: string;
}

export async function analyzeMarket(request: AnalyzeRequest): Promise<string> {
  const res = await fetch(`${API_BASE}/api/ai/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }

  const data: AnalyzeResponse = await res.json();
  return data.analysis;
}
