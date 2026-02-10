import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  buildReceiptWhatsAppText,
  buildWhatsAppUrl,
  toWhatsAppPhone,
} from "@/lib/whatsapp";

export default function Receipts() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: receipts, isLoading } = trpc.receipts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Recibos</h1>
        </div>
        <Button onClick={() => setLocation("/admin/receipts/new")}>
          Novo recibo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Recibos</CardTitle>
          <CardDescription>
            Recibos emitidos e links para enviar ao cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : receipts && receipts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Nº</th>
                    <th className="text-left py-3 px-4 font-semibold">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 font-semibold">Valor</th>
                    <th className="text-left py-3 px-4 font-semibold">Data</th>
                    <th className="text-left py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r: any) => (
                    <tr
                      key={r.id}
                      className="border-b border-border hover:bg-muted/50"
                    >
                      <td className="py-3 px-4 font-mono">{r.id}</td>
                      <td className="py-3 px-4">{r.clientName}</td>
                      <td className="py-3 px-4">R$ {r.amount}</td>
                      <td className="py-3 px-4 text-foreground/70">
                        {new Date(r.issuedAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              window.open(
                                `/r/${r.id}`,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const phone = toWhatsAppPhone(r.clientPhone);
                              if (!phone) {
                                toast.error("Telefone do cliente inválido.");
                                return;
                              }
                              const text = buildReceiptWhatsAppText({
                                clientName: r.clientName,
                                receiptId: r.id,
                                amount: r.amount,
                                paymentMethod: r.paymentMethod ?? null,
                                origin: window.location.origin,
                              });
                              const url = buildWhatsAppUrl(phone, text);
                              window.open(url, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              const link = `${window.location.origin}/r/${r.id}`;
                              await navigator.clipboard.writeText(link);
                              toast.success("Link copiado.");
                            }}
                          >
                            Copiar link
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-foreground/50">
              <p>Nenhum recibo emitido ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
