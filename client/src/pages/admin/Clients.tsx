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
import { Loader2, ArrowLeft, MessageCircle, Receipt, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { buildWhatsAppUrl, toWhatsAppPhone } from "@/lib/whatsapp";

function buildNewReceiptUrlFromClient(client: any) {
  const params = new URLSearchParams();
  params.set("clientName", client.name ?? "");
  if (client.email) params.set("clientEmail", client.email);
  if (client.phone) params.set("clientPhone", client.phone);
  return `/admin/receipts/new?${params.toString()}`;
}

function buildNewAppointmentUrlFromClient(client: any) {
  const params = new URLSearchParams();
  params.set("clientName", client.name ?? "");
  if (client.phone) params.set("clientPhone", client.phone);
  return `/admin/appointments?${params.toString()}`;
}

export default function Clients() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: clients, isLoading } = trpc.clients.list.useQuery(undefined, {
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de clientes</CardTitle>
          <CardDescription>
            Gerado automaticamente a partir de orçamentos, agendamentos e recibos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : clients && clients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Cliente</th>
                    <th className="text-left py-3 px-4 font-semibold">Telefone</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Orç.</th>
                    <th className="text-left py-3 px-4 font-semibold">Ag.</th>
                    <th className="text-left py-3 px-4 font-semibold">Rec.</th>
                    <th className="text-left py-3 px-4 font-semibold">Última</th>
                    <th className="text-left py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c: any) => (
                    <tr
                      key={c.id}
                      className="border-b border-border hover:bg-muted/50"
                    >
                      <td className="py-3 px-4 font-medium">{c.name}</td>
                      <td className="py-3 px-4">{c.phone ?? "-"}</td>
                      <td className="py-3 px-4">{c.email ?? "-"}</td>
                      <td className="py-3 px-4">{c.quotesCount}</td>
                      <td className="py-3 px-4">{c.appointmentsCount}</td>
                      <td className="py-3 px-4">{c.receiptsCount}</td>
                      <td className="py-3 px-4 text-foreground/70">
                        {new Date(c.lastActivityAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const phone = c.phone
                                ? toWhatsAppPhone(String(c.phone))
                                : "";
                              if (!phone) {
                                toast.error("Telefone do cliente inválido.");
                                return;
                              }
                              const url = buildWhatsAppUrl(
                                phone,
                                `Olá ${c.name || "cliente"}!`
                              );
                              window.open(url, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp
                          </Button>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setLocation(buildNewAppointmentUrlFromClient(c))
                            }
                          >
                            <CalendarPlus className="h-4 w-4 mr-2" />
                            Agendar
                          </Button>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setLocation(buildNewReceiptUrlFromClient(c))
                            }
                          >
                            <Receipt className="h-4 w-4 mr-2" />
                            Recibo
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
              <p>Nenhum cliente encontrado ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

