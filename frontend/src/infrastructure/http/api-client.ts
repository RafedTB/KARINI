import { env } from "@/infrastructure/config/env";
import { ApiError, parseApiErrorMessage } from "@/infrastructure/http/api-error";

type RequestOptions = Omit<RequestInit, "headers"> & {
  token?: string;
  headers?: HeadersInit;
  json?: unknown;
};

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, json, headers, ...init } = options;

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : init.body,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await response.json().catch(() => ({})) : null;

  if (!response.ok) {
    throw new ApiError(parseApiErrorMessage(body), response.status);
  }

  if (!isJson) {
    return response as unknown as T;
  }

  return body as T;
}

export async function apiClientBlob(path: string, token: string): Promise<Blob> {
  const response = await fetch(`${env.apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(parseApiErrorMessage(body), response.status);
  }

  return response.blob();
}
