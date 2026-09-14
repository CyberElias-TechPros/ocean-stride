export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
  requestKey?: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...(requestKey ? { "Idempotency-Key": requestKey } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });
    const contentType = response.headers.get("Content-Type");
    if (!contentType?.includes("application/json"))
      throw new ApiError(
        503,
        "The operations service is unavailable. Please try again shortly.",
      );
    const result = await response.json();
    if (!response.ok)
      throw new ApiError(
        response.status,
        typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
          ? result.error
          : "Request failed",
      );
    return result as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      503,
      "Connection interrupted. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }
}
