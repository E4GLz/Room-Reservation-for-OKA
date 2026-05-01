const DEFAULT_COUNTRY_CODE = "+966";

export const COUNTRY_CODE_OPTIONS = [
  { code: "+966", label: "Saudi Arabia (+966)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+965", label: "Kuwait (+965)" },
  { code: "+973", label: "Bahrain (+973)" },
  { code: "+968", label: "Oman (+968)" },
  { code: "+974", label: "Qatar (+974)" },
  { code: "+20", label: "Egypt (+20)" },
  { code: "+962", label: "Jordan (+962)" },
  { code: "+961", label: "Lebanon (+961)" },
  { code: "+1", label: "United States (+1)" },
  { code: "+44", label: "United Kingdom (+44)" }
] as const;

export function splitPhoneNumber(phoneNumber?: string | null) {
  const raw = (phoneNumber ?? "").trim();
  if (!raw) {
    return {
      countryCode: DEFAULT_COUNTRY_CODE,
      localNumber: ""
    };
  }

  const matchedCountry = [...COUNTRY_CODE_OPTIONS]
    .sort((left, right) => right.code.length - left.code.length)
    .find((option) => raw.startsWith(option.code));

  if (!matchedCountry) {
    return {
      countryCode: DEFAULT_COUNTRY_CODE,
      localNumber: raw.replace(/[^\d]/g, "")
    };
  }

  return {
    countryCode: matchedCountry.code,
    localNumber: raw.slice(matchedCountry.code.length).replace(/[^\d]/g, "")
  };
}

export function combinePhoneNumber(countryCode: string, localNumber: string) {
  const digits = localNumber.replace(/[^\d]/g, "");
  if (!digits) {
    return "";
  }

  return `${countryCode}${digits}`;
}
