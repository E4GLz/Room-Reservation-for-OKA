export async function readErrorMessage(
  response: Response,
  fallbackMessage: string,
  extractor?: (payload: unknown) => string | null | undefined
) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const payload = await response.json();
      const extracted = extractor?.(payload);

      if (extracted) {
        return extracted;
      }

      if (typeof payload === "string" && payload.trim()) {
        return payload;
      }

      if (payload && typeof payload === "object" && "error" in payload) {
        const error = (payload as { error?: unknown }).error;
        const nested = extractor?.(error);
        if (nested) {
          return nested;
        }

        if (typeof error === "string" && error.trim()) {
          return error;
        }
      }
    } catch {
      return fallbackMessage;
    }
  }

  try {
    const text = await response.text();
    return text.trim() || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export function extractFlattenedFormError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ("formErrors" in payload) {
    const formErrors = (payload as { formErrors?: unknown }).formErrors;
    if (Array.isArray(formErrors) && typeof formErrors[0] === "string") {
      return formErrors[0];
    }
  }

  if ("fieldErrors" in payload) {
    const fieldErrors = (payload as { fieldErrors?: Record<string, unknown> }).fieldErrors;
    if (fieldErrors && typeof fieldErrors === "object") {
      for (const value of Object.values(fieldErrors)) {
        if (Array.isArray(value) && typeof value[0] === "string") {
          return value[0];
        }
      }
    }
  }

  return null;
}
