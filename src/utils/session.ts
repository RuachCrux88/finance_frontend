// src/utils/session.ts
import { api } from '@/lib/api';
import type { User } from '@/types';

export async function fetchMe(): Promise<User> {
  return api<User>('/auth/me');
}

export async function doLogout() {
  return api('/auth/logout', { method: 'POST' });
}
