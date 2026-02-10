import { toWhatsAppPhone } from "@/lib/whatsapp";

function digitsOnly(value: string) {
  return (value || "").replace(/\D+/g, "");
}

function formatBrPhoneDisplay(raw: string) {
  const digits = digitsOnly(raw);
  if (!digits) return raw;

  // Remove country code for display if present.
  let local = digits;
  if (local.startsWith("55") && (local.length === 12 || local.length === 13)) {
    local = local.slice(2);
  }

  // Remove trunk prefix 0 (011..., 021..., etc.)
  if (local.startsWith("0") && (local.length === 11 || local.length === 12)) {
    local = local.slice(1);
  }

  if (local.length === 10) {
    const ddd = local.slice(0, 2);
    const first = local.slice(2, 6);
    const last = local.slice(6);
    return `(${ddd}) ${first}-${last}`;
  }

  if (local.length === 11) {
    const ddd = local.slice(0, 2);
    const first = local.slice(2, 7);
    const last = local.slice(7);
    return `(${ddd}) ${first}-${last}`;
  }

  return raw;
}

export const ADMIN_LOGIN_PATH = "/admin/login";

export const CONTACT_EMAIL =
  import.meta.env.VITE_CONTACT_EMAIL || "1990mrsantana@gmail.com";

export const CONTACT_PHONE_RAW =
  import.meta.env.VITE_CONTACT_PHONE ||
  import.meta.env.VITE_WHATSAPP_COMPANY_PHONE ||
  "+5519988720017";

export const CONTACT_PHONE_DISPLAY = formatBrPhoneDisplay(CONTACT_PHONE_RAW);

export const CONTACT_PHONE_TEL = (() => {
  const digits = digitsOnly(CONTACT_PHONE_RAW);
  if (!digits) return "";
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
})();

export const CONTACT_WHATSAPP_PHONE = toWhatsAppPhone(CONTACT_PHONE_RAW);
