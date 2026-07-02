'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { createClientApiClient } from '@/lib/api-client';

export function useApiClient() {
  const { data: session, status } = useSession();
  const accessToken = (session as Record<string, unknown>)?.['accessToken'] as string ?? '';

  const api = useMemo(() => createClientApiClient(accessToken), [accessToken]);

  return { api, status };
}
