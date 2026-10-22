export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${url}`, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Permintaan belum berhasil.");
  return data as T;
}
export const post = <T>(url: string, body: unknown = {}) => api<T>(url, { method: "POST", body: JSON.stringify(body) });
export const put = <T>(url: string, body: unknown) => api<T>(url, { method: "PUT", body: JSON.stringify(body) });
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Terjadi kesalahan. Coba kembali.";
export const dateLabel = (date: string, short = false) => new Intl.DateTimeFormat("id-ID", {
  day: "numeric", month: short ? "short" : "long", ...(short ? {} : { year: "numeric" }), timeZone: "Asia/Jakarta",
}).format(new Date(date));
