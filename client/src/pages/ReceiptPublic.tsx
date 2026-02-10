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

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recibo</h1>
          <p className="text-sm text-foreground/60">
            Nº {data.id} • Emitido em{" "}
            {new Date(data.issuedAt).toLocaleString("pt-BR")}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir / PDF
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-2">
            <div className="text-sm text-foreground/60">Cliente</div>
            <div className="text-lg font-semibold">{data.clientName}</div>
            <div className="text-sm text-foreground/70">{data.clientPhone}</div>
            {data.clientEmail ? (
              <div className="text-sm text-foreground/70">
                {data.clientEmail}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <div className="text-sm text-foreground/60">Serviço</div>
            <div className="text-base">{data.serviceDescription}</div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm text-foreground/60">Valor</div>
            <div className="text-2xl font-bold">R$ {data.amount}</div>
            {data.paymentMethod ? (
              <div className="text-sm text-foreground/70">
                Pagamento: {data.paymentMethod}
              </div>
            ) : null}
          </div>

          {data.notes ? (
            <div className="grid gap-2">
              <div className="text-sm text-foreground/60">Observações</div>
              <div className="text-base whitespace-pre-wrap">{data.notes}</div>
            </div>
          ) : null}

          <div className="pt-4 border-t border-border text-sm text-foreground/70">
            VF Toldos & Coberturas
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
