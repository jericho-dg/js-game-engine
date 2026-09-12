export type CloudStoreBackend = 'file' | 'supabase';

export function getCloudStoreBackend(): CloudStoreBackend {
  const value = process.env.CLOUD_STORE?.trim().toLowerCase();
  if (value === 'supabase') return 'supabase';
  return 'file';
}

export function getSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase backend requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return { url, serviceRoleKey };
}

export function getFileDataDir(): string {
  return process.env.CLOUD_DATA_DIR?.trim() || '';
}
