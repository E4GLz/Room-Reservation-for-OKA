export type StoredAttachment = {
  name: string;
  url: string;
  contentType?: string | null;
};

function normalizeLegacyValue(value: string) {
  return value.trim();
}

export function parseStoredAttachments(value: string | null | undefined): StoredAttachment[] {
  if (!value) {
    return [];
  }

  const normalized = value.trim();
  if (!normalized) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is StoredAttachment =>
          Boolean(item) &&
          typeof item === "object" &&
          "name" in item &&
          "url" in item &&
          typeof item.name === "string" &&
          typeof item.url === "string"
      );
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      "name" in parsed &&
      "url" in parsed &&
      typeof parsed.name === "string" &&
      typeof parsed.url === "string"
    ) {
      return [parsed as StoredAttachment];
    }
  } catch {
    // Fall through to legacy plain-text support.
  }

  return normalized
    .split(",")
    .map((part) => normalizeLegacyValue(part))
    .filter(Boolean)
    .map((name) => ({
      name,
      url: ""
    }));
}

export function serializeStoredAttachments(attachments: StoredAttachment[]) {
  if (!attachments.length) {
    return "";
  }

  return JSON.stringify(
    attachments.map((attachment) => ({
      name: attachment.name,
      url: attachment.url,
      contentType: attachment.contentType ?? null
    }))
  );
}

export function serializeSingleStoredAttachment(attachment: StoredAttachment | null | undefined) {
  if (!attachment) {
    return "";
  }

  return serializeStoredAttachments([attachment]);
}
