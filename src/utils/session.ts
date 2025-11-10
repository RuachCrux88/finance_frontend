// src/utils/session.ts
import { apiFetch } from './http';

export async function fetchMe() {
  return apiFetch('/auth/me');
}

export async function doLogout() {
  return apiFetch('/auth/logout', { method: 'POST' });
}
