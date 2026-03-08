const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("edugen_token");
}

export function setToken(token: string) {
  localStorage.setItem("edugen_token", token);
}

export function clearToken() {
  localStorage.removeItem("edugen_token");
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    throw new Error("Sesja wygasła. Zaloguj się ponownie.");
  }
  if (!response.ok) {
    let detail = "Błąd API";
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      detail = await response.text();
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function apiUrl(path: string) {
  return `${API_URL}${path}`;
}
