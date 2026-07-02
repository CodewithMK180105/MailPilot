import { auth } from '@/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getAuthToken(): Promise<string | null> {
  try {
    // Server-side: use NextAuth session
    if (typeof window === 'undefined') {
      const session = await auth();
      return (session as Record<string, unknown>)?.['accessToken'] as string | null;
    }
    // Client-side: read from session via /api/auth/session
    const res = await fetch('/api/auth/session');
    if (!res.ok) return null;
    const session = (await res.json()) as Record<string, unknown>;
    return session?.['accessToken'] as string | null;
  } catch {
    return null;
  }
}

type RequestOptions = {
  headers?: Record<string, string>;
  token?: string; // Override token for specific requests
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const token = options?.token ?? (await getAuthToken());

  const headers: Record<string, string> = {
    ...options?.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData — browser sets it with boundary
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    method,
    headers,
    body: body
      ? body instanceof FormData
        ? body
        : JSON.stringify(body)
      : undefined,
  });

  let data: unknown;
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    // For file downloads, return the response itself
    return response as T;
  }

  if (!response.ok) {
    const errorData = data as {
      error?: { message?: string; details?: unknown };
      message?: string;
    };
    const message =
      errorData?.error?.message ?? errorData?.message ?? `HTTP ${response.status}`;
    throw new ApiError(response.status, message, errorData?.error?.details);
  }

  // Unwrap {success, data} envelope
  const envelope = data as { success: boolean; data?: T };
  if (envelope && typeof envelope === 'object' && 'success' in envelope) {
    return envelope.data as T;
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),

  upload: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    request<T>('POST', path, formData, options),
};

// Client-side only version that reads token from session endpoint
export const createClientApiClient = (accessToken: string) => ({
  get: <T>(path: string) =>
    request<T>('GET', path, undefined, { token: accessToken }),

  post: <T>(path: string, body?: unknown) =>
    request<T>('POST', path, body, { token: accessToken }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>('PATCH', path, body, { token: accessToken }),

  put: <T>(path: string, body?: unknown) =>
    request<T>('PUT', path, body, { token: accessToken }),

  delete: <T>(path: string) =>
    request<T>('DELETE', path, undefined, { token: accessToken }),

  upload: <T>(path: string, formData: FormData) =>
    request<T>('POST', path, formData, { token: accessToken }),
});
