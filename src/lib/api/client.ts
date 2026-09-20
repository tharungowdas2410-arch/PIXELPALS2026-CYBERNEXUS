import type { ApiErrorBody, DataEnvelope, Paginated } from "@/lib/types/api";

export const TOKEN_KEY = "cybernexus_access_token";

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  return url && url.length > 0 ? url.replace(/\/$/, "") : "http://127.0.0.1:8000/api/v1";
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
};

function buildQuery(query?: RequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, query } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = options.token ?? (auth ? getStoredToken() : null);
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${getApiBaseUrl()}${path}${buildQuery(query)}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = { error: { code: "parse_error", message: text } };
    }
  }

  if (!response.ok) {
    const err = parsed as ApiErrorBody | null;
    const message = err?.error?.message ?? `Request failed (${response.status})`;
    if (response.status === 401 && typeof window !== "undefined") {
      clearStoredToken();
    }
    throw new ApiError(response.status, err?.error?.code ?? "http_error", message, err?.error?.details);
  }

  return parsed as T;
}

export async function apiData<T>(path: string, options?: RequestOptions): Promise<T> {
  const payload = await apiRequest<any>(path, options);
  if (payload !== null && typeof payload === "object" && "data" in payload && payload.data !== undefined) {
    return payload.data as T;
  }
  return (payload ?? null) as T;
}

export async function apiPaginated<T>(path: string, options?: RequestOptions): Promise<Paginated<T>> {
  return apiRequest<Paginated<T>>(path, options);
}
