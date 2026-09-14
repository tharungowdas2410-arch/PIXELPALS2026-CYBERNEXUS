import { apiData, setStoredToken, clearStoredToken } from "@/lib/api/client";
import type { TokenResponse, User } from "@/lib/types/api";

export async function login(email: string, password: string): Promise<TokenResponse> {
  const token = await apiData<TokenResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  setStoredToken(token.access_token);
  return token;
}

export async function registerAccount(input: {
  organization_name: string;
  email: string;
  password: string;
  full_name: string;
  industry?: string;
  country?: string;
  role?: string;
}): Promise<TokenResponse> {
  const token = await apiData<TokenResponse>("/auth/register", {
    method: "POST",
    body: input,
    auth: false,
  });
  setStoredToken(token.access_token);
  return token;
}

export async function getMe(): Promise<User> {
  return apiData<User>("/auth/me");
}

export function logout(): void {
  clearStoredToken();
}
