const configuredApiUrl = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
export const apiUrl = import.meta.env.DEV
  ? (configuredApiUrl.length > 0 ? configuredApiUrl : "http://localhost:8080")
  : "";

function resolveSwaggerUrl(): string {
  const publicApi = (import.meta.env.VITE_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
  if (publicApi.length > 0) {
    return `${publicApi}/swagger`;
  }

  if (import.meta.env.DEV) {
    return `${apiUrl}/swagger`;
  }

  if (configuredApiUrl.length > 0) {
    return `${configuredApiUrl}/swagger`;
  }

  return "/swagger";
}

export const swaggerUrl = resolveSwaggerUrl();

export type InvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  createdAt: string;
  clientId: string;
  clientName: string;
  clientDocument: string;
  clientEmail?: string | null;
  lines?: InvoiceLine[];
};

export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type LoginResponse = {
  accessToken: string;
  displayName: string;
  role: string;
  expiresAt: string;
};

export type CreateInvoiceRequest = {
  clientName: string;
  clientDocument: string;
  clientEmail?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  lines: InvoiceLine[];
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail?: string,
    public fieldErrors?: Record<string, string[]>
  ) {
    super(detail ?? title);
    this.name = "ApiError";
  }
}

const SESSION_KEY = "invoicehub.session";

export type Session = {
  accessToken: string;
  displayName: string;
  role: string;
  expiresAt: string;
};

export function readSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.accessToken) {
      return null;
    }
    if (parsed.expiresAt && Date.parse(parsed.expiresAt) <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function writeSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = readSession()?.accessToken;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Sin conexión", "No se pudo contactar la API. ¿Está corriendo en :8080?");
  }

  if (response.status === 401 && !path.includes("/auth/login")) {
    clearSession();
    window.dispatchEvent(new Event("invoicehub:unauthorized"));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await readJson(response);

  if (!response.ok) {
    throw toApiError(response.status, payload);
  }

  return payload as T;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return api<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function listInvoices(page = 1, pageSize = 50): Promise<PagedResult<Invoice>> {
  return api<PagedResult<Invoice>>(`/api/v1/invoices?page=${page}&pageSize=${pageSize}`);
}

export function searchInvoices(client: string): Promise<Invoice[]> {
  return api<Invoice[]>(`/api/v1/invoices/search?client=${encodeURIComponent(client)}`);
}

export function getInvoice(id: string): Promise<Invoice> {
  return api<Invoice>(`/api/v1/invoices/${id}`);
}

export function createInvoice(body: CreateInvoiceRequest, idempotencyKey: string): Promise<Invoice> {
  return api<Invoice>("/api/v1/invoices", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body)
  });
}

export function updateInvoiceStatus(id: string, status: string): Promise<Invoice> {
  return api<Invoice>(`/api/v1/invoices/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function invoiceNumberExists(number: string): Promise<boolean> {
  return api<{ exists: boolean }>(`/api/v1/invoices/exists?number=${encodeURIComponent(number)}`).then(
    (payload) => payload.exists
  );
}

export function friendlyApiMessage(error: ApiError): string {
  const detail = error.detail ?? error.title;
  if (/already exists/i.test(detail)) {
    return "Este número de factura ya existe.";
  }
  return detail;
}

function toApiError(status: number, payload: unknown): ApiError {
  const problem = asRecord(payload);
  const title = stringValue(problem?.title) ?? `Error ${status}`;
  const detail = stringValue(problem?.detail);
  const fieldErrors = normalizeFieldErrors(problem?.errors);
  return new ApiError(status, title, detail, fieldErrors);
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return { title: "Unexpected response", detail: text };
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function normalizeFieldErrors(value: unknown): Record<string, string[]> | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const result: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(record)) {
    if (Array.isArray(messages)) {
      result[key] = messages.filter((item): item is string => typeof item === "string");
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
