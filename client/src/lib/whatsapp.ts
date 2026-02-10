function digitsOnly(value: string) {
  return (value || "").replace(/\D+/g, "");
}

export function toWhatsAppPhone(input: string) {
  let digits = digitsOnly(input);
  if (!digits) return "";

  // Remove trunk prefix 0 (ex.: 01199998888 -> 1199998888)
  if (digits.startsWith("0") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(1);
  }

  // If already includes country code 55, keep it.
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Heurística BR: se tiver 10/11 dígitos (DDD + número), prefixa 55.
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Fallback: retorna como está (pode funcionar em alguns casos).
  return digits;
}

export function getCompanyWhatsAppPhone() {
  // Número da empresa (fallback definido para este projeto).
  return toWhatsAppPhone(import.meta.env.VITE_WHATSAPP_COMPANY_PHONE || "5519988720017");
}

export function getDevWhatsAppPhone() {
  const raw = import.meta.env.VITE_WHATSAPP_DEV_PHONE;
  return raw ? toWhatsAppPhone(raw) : "";
}

export function buildQuoteWhatsAppText(quote: {
  clientName: string;
  toldoType: string;
  width: string | number;
  projection: string | number;
  areaM2?: string | number | null;
  material?: string | null;
  notes?: string | null;
}) {
  const parts = [
    `Olá ${quote.clientName}!`,
    "",
    "Recebemos sua solicitação de orçamento:",
    `- Tipo: ${quote.toldoType}`,
    `- Medidas: ${quote.width} x ${quote.projection} m`,
    quote.areaM2 ? `- Área estimada: ${quote.areaM2} m²` : null,
    quote.material ? `- Material: ${quote.material}` : null,
    quote.notes ? `- Observações: ${quote.notes}` : null,
    "",
    "Se quiser, pode responder por aqui com fotos do local e endereço para agilizar.",
    "",
    "VF Toldos & Coberturas",
  ].filter(Boolean);

  return parts.join("\n");
}

export function buildAdminQuoteWhatsAppText(quote: {
  id?: number | string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  toldoType: string;
  width: string | number;
  projection: string | number;
  areaM2?: string | number | null;
  material?: string | null;
  notes?: string | null;
  createdAt?: string | number | Date;
  driveFileId?: string | null;
}) {
  const createdAt = quote.createdAt ? new Date(quote.createdAt).toLocaleString("pt-BR") : null;
  const driveUrl = quote.driveFileId ? `https://drive.google.com/file/d/${quote.driveFileId}/view` : null;

  const parts = [
    "Novo orçamento recebido ✅",
    quote.id !== undefined ? `ID: ${quote.id}` : null,
    createdAt ? `Data: ${createdAt}` : null,
    "",
    `Cliente: ${quote.clientName}`,
    quote.clientPhone ? `Telefone: ${quote.clientPhone}` : null,
    quote.clientEmail ? `Email: ${quote.clientEmail}` : null,
    "",
    `Tipo: ${quote.toldoType}`,
    `Medidas: ${quote.width} x ${quote.projection} m`,
    quote.areaM2 ? `Área estimada: ${quote.areaM2} m²` : null,
    quote.material ? `Material: ${quote.material}` : null,
    quote.notes ? `Observações: ${quote.notes}` : null,
    driveUrl ? `Drive: ${driveUrl}` : null,
    "",
    "VF Toldos & Coberturas",
  ].filter(Boolean);

  return parts.join("\n");
}

export function buildWhatsAppUrl(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
