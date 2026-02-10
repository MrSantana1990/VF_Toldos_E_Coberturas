import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Printer } from "lucide-react";
import { useLocation } from "wouter";

function getReceiptIdFromPath(path: string) {
  const cleaned = path.split("?")[0]?.split("#")[0] ?? "";
  const parts = cleaned.split("/").filter(Boolean);
  const idx = parts.indexOf("r");
  if (idx === -1) return "";
  return parts[idx + 1] ?? "";
}

export default function ReceiptPublic() {
  const [location] = useLocation();
  const id = getReceiptIdFromPath(location);

  const { data, isLoading, error } = trpc.receipts.publicGet.useQuery(
    { id },
    { enabled: Boolean(id) }
  );

  const { data: logoData } = trpc.gallery.logo.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const fallbackLogoUrl =
    import.meta.env.VITE_LOGO_URL?.trim() || "/logo.png";

  const logoUrl = logoData?.url || fallbackLogoUrl;

  if (!id) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Recibo</CardTitle>
          </CardHeader>
          <CardContent>Link inválido.</CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Recibo</CardTitle>
          </CardHeader>
          <CardContent>
            Falha ao carregar recibo: {String((error as any)?.message || error)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Recibo</CardTitle>
          </CardHeader>
          <CardContent>Recibo não encontrado.</CardContent>
        </Card>
      </div>
    );
  }

  const issuedAt = new Date(data.issuedAt);
  const issuedAtLabel = issuedAt.toLocaleString("pt-BR");
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL?.trim();
  const contactPhone = import.meta.env.VITE_CONTACT_PHONE?.trim();

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-container { padding: 0 !important; margin: 0 !important; max-width: none !important; }
          .print-card { border: 1px solid #ddd !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="container py-10 space-y-6 print-container">
        <div className="flex items-center justify-between gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Recibo</h1>
            <p className="text-sm text-foreground/60">
              Nº {data.id} • Emitido em {issuedAtLabel}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir / PDF
          </Button>
        </div>

        <Card className="print-card">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-center gap-4">
                  <img
                    src={logoUrl}
                    alt="Logo VF Toldos & Coberturas"
                    className="h-14 w-auto object-contain"
                    loading="eager"
                  />
                  <div>
                    <div className="text-lg font-bold leading-tight">
                      VF Toldos & Coberturas
                    </div>
                    <div className="text-sm text-foreground/70">
                      {contactPhone ? `Telefone: ${contactPhone}` : null}
                      {contactPhone && contactEmail ? " • " : null}
                      {contactEmail ? `Email: ${contactEmail}` : null}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-foreground/60">
                    Recibo
                  </div>
                  <div className="text-2xl font-bold leading-tight">
                    {data.id}
                  </div>
                  <div className="text-sm text-foreground/70">
                    Emitido em {issuedAtLabel}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 grid gap-4 border-b border-border">
              <div className="grid gap-1">
                <div className="text-xs uppercase tracking-wide text-foreground/60">
                  Cliente
                </div>
                <div className="text-lg font-semibold">{data.clientName}</div>
                <div className="text-sm text-foreground/70">
                  {data.clientPhone}
                </div>
                {data.clientEmail ? (
                  <div className="text-sm text-foreground/70">
                    {data.clientEmail}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="p-6 border-b border-border">
              <div className="text-xs uppercase tracking-wide text-foreground/60 mb-2">
                Descrição do serviço
              </div>

              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">
                        Item
                      </th>
                      <th className="text-right py-3 px-4 font-semibold w-[90px]">
                        Qtde
                      </th>
                      <th className="text-right py-3 px-4 font-semibold w-[140px]">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-3 px-4">
                        <div className="font-medium">Serviço</div>
                        <div className="text-foreground/70 whitespace-pre-wrap">
                          {data.serviceDescription}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">1</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        R$ {data.amount}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4" />
                      <td className="py-3 px-4 text-right font-semibold">
                        Total
                      </td>
                      <td className="py-3 px-4 text-right text-lg font-bold">
                        R$ {data.amount}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {data.paymentMethod ? (
                <div className="mt-4 text-sm text-foreground/70">
                  Forma de pagamento:{" "}
                  <span className="font-medium">{data.paymentMethod}</span>
                </div>
              ) : null}
            </div>

            {data.notes ? (
              <div className="p-6 border-b border-border">
                <div className="text-xs uppercase tracking-wide text-foreground/60 mb-2">
                  Observações
                </div>
                <div className="text-sm whitespace-pre-wrap">{data.notes}</div>
              </div>
            ) : null}

            <div className="p-6 grid gap-4">
              <div className="text-sm text-foreground/70">
                Este documento é um <span className="font-medium">recibo</span>{" "}
                de serviço/pagamento.
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="border-t border-border pt-2 text-sm">
                  Assinatura do responsável
                </div>
                <div className="border-t border-border pt-2 text-sm text-right">
                  Assinatura do cliente
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
