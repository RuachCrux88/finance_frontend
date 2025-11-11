// src/utils/session.ts
import { api } from '@/lib/api';

export async function fetchMe() {
  return api('/auth/me');
}

export async function doLogout() {
  return api('/auth/logout', { method: 'POST' });
}
