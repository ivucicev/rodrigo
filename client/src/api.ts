import type { Chore, NewPoolInput, NewUserChemicalInput, NewWaterTestInput, Pool, Settings, UserChemical, WaterTest } from './types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getTests: (poolId: string) => request<WaterTest[]>(`/tests?poolId=${encodeURIComponent(poolId)}`),
  createTest: (input: NewWaterTestInput) =>
    request<WaterTest>('/tests', { method: 'POST', body: JSON.stringify(input) }),

  getChores: (poolId: string) => request<Chore[]>(`/chores?poolId=${encodeURIComponent(poolId)}`),
  toggleChore: (id: string, completed: boolean) =>
    request<Chore>(`/chores/${id}/toggle`, { method: 'POST', body: JSON.stringify({ completed }) }),

  getSettings: () => request<Settings>('/settings'),
  updateSettings: (settings: Settings) =>
    request<Settings>('/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  getChemicals: () => request<UserChemical[]>('/chemicals'),
  createChemical: (input: NewUserChemicalInput) =>
    request<UserChemical>('/chemicals', { method: 'POST', body: JSON.stringify(input) }),
  updateChemical: (id: string, patch: Partial<NewUserChemicalInput>) =>
    request<UserChemical>(`/chemicals/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteChemical: (id: string) => request<void>(`/chemicals/${id}`, { method: 'DELETE' }),

  getPools: () => request<Pool[]>('/pools'),
  createPool: (input: NewPoolInput) => request<Pool>('/pools', { method: 'POST', body: JSON.stringify(input) }),
  updatePool: (id: string, patch: Partial<NewPoolInput>) =>
    request<Pool>(`/pools/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deletePool: (id: string) => request<void>(`/pools/${id}`, { method: 'DELETE' }),
};
