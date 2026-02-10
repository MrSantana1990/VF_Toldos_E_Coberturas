import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildWhatsAppUrl, toWhatsAppPhone } from "@/lib/whatsapp";

export default function Appointments() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [appointmentType, setAppointmentType] = useState<
    "visita_tecnica" | "instalacao" | "manutencao"
  >("visita_tecnica");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  const { data: appointments, isLoading } = trpc.appointments.list.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
    }
  );

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: async () => {
      toast.success("Agendamento criado.");
      setDialogOpen(false);
      setClientName("");
      setClientPhone("");
      setAppointmentType("visita_tecnica");
      setAppointmentDate("");
      setAddress("");
      setDescription("");
      await utils.appointments.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Falha ao criar agendamento.");
    },
  });

  const updateStatusMutation = trpc.appointments.updateStatus.useMutation({
    onSuccess: async () => {
      toast.success("Status atualizado.");
      await utils.appointments.list.invalidate();
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
      case "agendado":
        return "bg-blue-100 text-blue-800";
      case "concluido":
        return "bg-green-100 text-green-800";
      case "cancelado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "visita_tecnica":
        return "Visita Técnica";
      case "instalacao":
        return "Instalação";
      case "manutencao":
        return "Manutenção";
      default:
        return type;
    }
  };

  function buildNewReceiptUrlFromAppointment(apt: any) {
    const params = new URLSearchParams();
    params.set("clientName", apt.clientName ?? "");
    params.set("clientPhone", apt.clientPhone ?? "");
    params.set(
      "serviceDescription",
      `${getTypeLabel(apt.appointmentType)} - ${apt.description || ""}`.trim()
    );
    return `/admin/receipts/new?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            Agenda de Agendamentos
          </h1>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Novo agendamento</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agendamentos Próximos</CardTitle>
          <CardDescription>
            Visitas técnicas, instalações e manutenções agendadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : appointments && appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.map((apt: any) => (
                <div
                  key={apt.id}
                  className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {apt.clientName}
                      </h3>
                      <p className="text-sm text-foreground/70">
                        {apt.clientPhone}
                      </p>
                      {apt.address ? (
                        <p className="text-sm text-foreground/70 mt-1">
                          {apt.address}
                        </p>
                      ) : null}
                      <p className="text-sm text-foreground/70 mt-1">
                        {apt.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(apt.status)}>
                        {apt.status === "agendado"
                          ? "Agendado"
                          : apt.status === "concluido"
                            ? "Concluído"
                            : "Cancelado"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="flex gap-4 text-sm text-foreground/70">
                      <span>{getTypeLabel(apt.appointmentType)}</span>
                      <span>
                        {new Date(apt.appointmentDate).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={apt.status}
                        onValueChange={value =>
                          updateStatusMutation.mutate({
                            id: apt.id,
                            status: value as any,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-[150px]">
                          <SelectValue placeholder="Alterar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agendado">Agendado</SelectItem>
                          <SelectItem value="concluido">Concluído</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const phone = toWhatsAppPhone(apt.clientPhone);
                          if (!phone) {
                            toast.error("Telefone do cliente inválido.");
                            return;
                          }
                          const text = [
                            `Olá ${apt.clientName}!`,
                            "",
                            "Confirmando seu agendamento:",
                            `Tipo: ${getTypeLabel(apt.appointmentType)}`,
                            `Data/Hora: ${new Date(
                              apt.appointmentDate
                            ).toLocaleString("pt-BR")}`,
                            apt.address ? `Endereço: ${apt.address}` : null,
                            apt.description ? `Obs.: ${apt.description}` : null,
                            "",
                            "VF Toldos & Coberturas",
                          ]
                            .filter(Boolean)
                            .join("\n");
                          const url = buildWhatsAppUrl(phone, text);
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                      >
                        WhatsApp
                      </Button>

                      {apt.status === "concluido" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setLocation(buildNewReceiptUrlFromAppointment(apt))
                          }
                        >
                          Emitir recibo
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-foreground/50">
              <p>Nenhum agendamento criado ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo agendamento</DialogTitle>
            <DialogDescription>
              Crie uma visita técnica, instalação ou manutenção.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={e => {
              e.preventDefault();
              if (!clientName.trim()) {
                toast.error("Informe o nome do cliente.");
                return;
              }
              if (!clientPhone.trim()) {
                toast.error("Informe o telefone do cliente.");
                return;
              }
              if (!appointmentDate) {
                toast.error("Informe a data e hora.");
                return;
              }

              createMutation.mutate({
                clientName,
                clientPhone,
                appointmentType,
                appointmentDate: new Date(appointmentDate).toISOString(),
                address: address || undefined,
                description: description || undefined,
              });
            }}
          >
            <div className="grid gap-2">
              <Label>Cliente</Label>
              <Input
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="(99) 99999-9999"
                />
              </div>
              <div className="grid gap-2">
                <Label>Data e hora</Label>
                <Input
                  type="datetime-local"
                  value={appointmentDate}
                  onChange={e => setAppointmentDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={appointmentType}
                onValueChange={value => setAppointmentType(value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visita_tecnica">Visita técnica</SelectItem>
                  <SelectItem value="instalacao">Instalação</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Endereço (opcional)</Label>
              <Input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Rua, número, bairro..."
              />
            </div>

            <div className="grid gap-2">
              <Label>Descrição/observações (opcional)</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex.: medir largura/altura, fotos, portão..."
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
