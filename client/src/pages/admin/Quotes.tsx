import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function digitsOnly(value: string) {
  return (value || "").replace(/\D+/g, "");
}

function toWhatsAppPhone(input: string) {
  const digits = digitsOnly(input);
  if (!digits) return "";

  // Heurística simples para BR: se tiver 10/11 dígitos (DDD+numero), prefixa 55.
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  return digits;
}

function buildWhatsAppText(quote: any) {
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

export default function Quotes() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: quotes, isLoading } = trpc.quotes.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updateStatusMutation = trpc.quotes.updateStatus.useMutation({
    onSuccess: async () => {
      toast.success("Status atualizado.");
      await utils.quotes.list.invalidate();
      await utils.quotes.stats.invalidate();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Falha ao atualizar status.");
    },
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "completed":
        return "Concluído";
      case "rejected":
        return "Rejeitado";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Orçamentos Recebidos</CardTitle>
          <CardDescription>Todos os orçamentos solicitados pelos clientes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : quotes && quotes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Cliente</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Telefone</th>
                    <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold">Medidas</th>
                    <th className="text-left py-3 px-4 font-semibold">Área (m²)</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Data</th>
                    <th className="text-left py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">{quote.clientName}</td>
                      <td className="py-3 px-4 text-foreground/70">{quote.clientEmail}</td>
                      <td className="py-3 px-4">{quote.clientPhone}</td>
                      <td className="py-3 px-4 capitalize">{quote.toldoType}</td>
                      <td className="py-3 px-4">
                        {quote.width} x {quote.projection}m
                      </td>
                      <td className="py-3 px-4">{quote.areaM2}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(quote.status)}>
                            {getStatusLabel(quote.status)}
                          </Badge>
                          <Select
                            value={quote.status}
                            onValueChange={(value) =>
                              updateStatusMutation.mutate({
                                id: quote.id,
                                status: value as any,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 w-[140px]">
                              <SelectValue placeholder="Alterar..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="completed">Concluído</SelectItem>
                              <SelectItem value="rejected">Rejeitado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-foreground/70">
                        {new Date(quote.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const phone = toWhatsAppPhone(quote.clientPhone);
                              if (!phone) {
                                toast.error("Telefone do cliente inválido.");
                                return;
                              }
                              const text = buildWhatsAppText(quote);
                              const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
                              window.open(url, "_blank", "noopener,noreferrer");
                            }}
                          >
                            WhatsApp
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              const text = buildWhatsAppText(quote);
                              await navigator.clipboard.writeText(text);
                              toast.success("Texto copiado.");
                            }}
                          >
                            Copiar
                          </Button>

                          {"driveFileId" in quote && quote.driveFileId ? (
                            <a
                              className="inline-flex items-center justify-center rounded-md px-3 h-9 text-sm border border-border hover:bg-muted transition-colors"
                              href={`https://drive.google.com/file/d/${quote.driveFileId}/view`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Drive
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-foreground/50">
              <p>Nenhum orçamento recebido ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
