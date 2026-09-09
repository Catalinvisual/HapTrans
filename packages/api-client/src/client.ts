/**
 * Typed API client (architecture §API).
 *
 * Platform-agnostic fetch-based client usable in web, React Native, and portal
 * apps. Features:
 * - base URL configuration
 * - auth/session handling (Bearer token or cookie mode)
 * - automatic `X-Request-Id` correlation
 * - typed responses and typed errors
 * - timeout handling (AbortController)
 * - safe idempotent retry strategy (only for idempotent GET on network errors)
 */
import type { ApiErrorBody } from '@hapcargo/shared';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiClientOptions {
  baseUrl: string;
  /** Fetch implementation override (React Native / tests). */
  fetchImpl?: typeof fetch;
  /** Access token provider for Bearer mode. */
  getAccessToken?: () => string | null | Promise<string | null>;
  /** Callback when the session is considered expired (401). */
  onUnauthorized?: () => void | Promise<void>;
  defaultHeaders?: Record<string, string>;
  defaultTimeoutMs?: number;
  /** Enable safe retry for idempotent requests on network failure. */
  maxRetries?: number;
}

export interface RequestOptions {
  method?: HttpMethod;
  /** JSON body (serialized automatically). */
  body?: unknown;
  headers?: Record<string, string>;
  /** Use form/raw body instead of JSON. */
  rawBody?: BodyInit;
  timeoutMs?: number;
  /** Explicit idempotency-key for the request. */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorBody['details'] | undefined;
  readonly requestId: string | undefined;
  readonly responseBody: unknown;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    details: ApiErrorBody['details'] | undefined;
    requestId: string | undefined;
    responseBody: unknown;
  }) {
    super(init.message);
    this.name = 'ApiClientError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
    this.requestId = init.requestId;
    this.responseBody = init.responseBody;
  }
}

export class ApiTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms: ${url}`);
    this.name = 'ApiTimeoutError';
  }
}

export class ApiNetworkError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ApiNetworkError';
    this.cause = cause;
  }
}

export class ApiClient {
  private readonly options: ApiClientOptions;

  constructor(options: ApiClientOptions) {
    if (!options.baseUrl) throw new Error('ApiClient: baseUrl is required');
    this.options = { maxRetries: 0, defaultTimeoutMs: 20_000, ...options };
  }

  private newRequestId(): string {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    // Fallback (no crypto.randomUUID), e.g. older environments.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
      const r = (Math.random() * 16) | 0;
      const v = ch === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private buildUrl(path: string): string {
    const base = this.options.baseUrl.replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  }

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      rawBody,
      timeoutMs,
      idempotencyKey,
      signal,
    } = opts;

    const url = this.buildUrl(path);
    const requestId = this.newRequestId();
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const timeout = timeoutMs ?? this.options.defaultTimeoutMs ?? 20_000;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);
    if (signal) {
      if (signal.aborted) ac.abort();
      else signal.addEventListener('abort', () => ac.abort(), { once: true });
    }

    let finalBody: BodyInit | undefined = rawBody;
    if (body !== undefined && rawBody === undefined) {
      finalBody = JSON.stringify(body);
    }

    const finalHeaders: Record<string, string> = {
      Accept: 'application/json',
      'X-Request-Id': requestId,
      ...this.options.defaultHeaders,
      ...headers,
    };
    if (body !== undefined && rawBody === undefined) {
      finalHeaders['Content-Type'] = 'application/json';
    }
    if (idempotencyKey) finalHeaders['Idempotency-Key'] = idempotencyKey;

    const token = await this.options.getAccessToken?.();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;

    const doFetch = () =>
      fetchImpl(url, {
        method,
        headers: finalHeaders,
        body: finalBody ?? null,
        signal: ac.signal,
        credentials: 'include',
      });

    let res: Response;
    try {
      res = await doFetch();
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ApiTimeoutError(url, timeout);
      }
      // Safe retry: idempotent methods on network failure only.
      const retries = this.options.maxRetries ?? 0;
      if (retries > 0 && ['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        for (let i = 1; i <= retries; i++) {
          try {
            res = await doFetch();
            clearTimeout(timer);
            return this.handleResponse<T>(res);
          } catch (retryErr) {
            if (i === retries) {
              clearTimeout(timer);
              throw new ApiNetworkError(`Network error: ${url}`, retryErr);
            }
          }
        }
      }
      clearTimeout(timer);
      throw new ApiNetworkError(`Network error: ${url}`, err);
    }
    clearTimeout(timer);
    return this.handleResponse<T>(res);
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (res.status === 204) return undefined as T;

    if (!res.ok) {
      const errBody = (body ?? {}) as Partial<ApiErrorBody> & { error?: ApiErrorBody };
      // Some servers wrap in { error: {...} }
      const normalized = errBody.error ?? errBody;
      throw new ApiClientError({
        status: res.status,
        code: normalized.code ?? `HTTP_${res.status}`,
        message:
          normalized.message ??
          (typeof body === 'string' ? body : `Request failed with status ${res.status}`),
        details: normalized.details,
        requestId: normalized.requestId ?? res.headers.get('x-request-id') ?? undefined,
        responseBody: body,
      });
    }

    if (res.status === 401 && this.options.onUnauthorized) {
      await this.options.onUnauthorized();
    }

    return body as T;
  }

  get<T>(path: string, opts?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...opts, method: 'GET' });
  }
  post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...opts, method: 'POST', body });
  }
  put<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...opts, method: 'PUT', body });
  }
  patch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...opts, method: 'PATCH', body });
  }
  delete<T>(path: string, opts?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...opts, method: 'DELETE' });
  }
}

export { createApiClient } from './factory';
