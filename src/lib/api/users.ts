import { apiRequest } from "./client";
import type { DataEnvelope } from "@/lib/types/api";

export interface UserItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_locked: boolean;
  failed_login_attempts: number;
  organization_id: string;
  created_at: string;
}

export interface UserCreatePayload {
  email: string;
  password: string;
  full_name: string;
  role: string;
}

export interface UserUpdatePayload {
  full_name?: string;
  role?: string;
  is_active?: boolean;
}

export async function getUsers(): Promise<UserItem[]> {
  const res = await apiRequest<DataEnvelope<UserItem[]>>("/users");
  return res.data;
}

export async function createUser(payload: UserCreatePayload): Promise<UserItem> {
  const res = await apiRequest<DataEnvelope<UserItem>>("/users", {
    method: "POST",
    body: payload,
  });
  return res.data;
}

export async function updateUser(userId: string, payload: UserUpdatePayload): Promise<UserItem> {
  const res = await apiRequest<DataEnvelope<UserItem>>(`/users/${userId}`, {
    method: "PATCH",
    body: payload,
  });
  return res.data;
}

export async function resetUserPassword(userId: string, newPassword?: string): Promise<{ temporary_password?: string; message: string }> {
  const res = await apiRequest<DataEnvelope<{ temporary_password?: string; message: string }>>(`/users/${userId}/reset-password`, {
    method: "POST",
    body: newPassword ? { new_password: newPassword } : {},
  });
  return res.data;
}
