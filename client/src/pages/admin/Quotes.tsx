import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  buildAdminQuoteWhatsAppText,
  buildQuoteWhatsAppText,
  buildWhatsAppUrl,
  getCompanyWhatsAppPhone,
  getDevWhatsAppPhone,
  toWhatsAppPhone,
} from "@/lib/whatsapp";

function buildThanksWhatsAppText(quote: any) {
  return [
    `Olá ${quote.clientName}!`,
    "",
    "Seu atendimento foi concluído ✅",
    "Obrigado pela preferência.",
    "",
    "VF Toldos & Coberturas",
  ].join("\n");
}

function buildReceiptNewUrlFromQuote(quote: any) {
  const params = new URLSearchParams();
  params.set("quoteId", String(quote.id));
  params.set("clientName", quote.clientName ?? "");
  params.set("clientEmail", quote.clientEmail ?? "");
  params.set("clientPhone", quote.clientPhone ?? "");
  params.set(
    "serviceDescription",
    `Serviço relacionado ao orçamento #${quote.id}`
  );
  return `/admin/receipts/new?${params.toString()}`;
}

export default function Quotes() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<any | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

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

  const updateMutation = trpc.quotes.update.useMutation({
    onSuccess: async () => {
      toast.success("Orçamento atualizado.");
      setEditOpen(false);
      setEditDraft(null);
      await utils.quotes.list.invalidate();
      await utils.quotes.stats.invalidate();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Falha ao atualizar orçamento.");
    },
  });

  const deleteMutation = trpc.quotes.delete.useMutation({
    onSuccess: async () => {
      toast.success("Orçamento excluído.");
      setDeleteOpen(false);
      setDeleteTarget(null);
      await utils.quotes.list.invalidate();
      await utils.quotes.stats.invalidate();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Falha ao excluir orçamento.");
    },
  });

  const editAreaM2String = useMemo(() => {
    if (!editDraft) return "";
    const v = editDraft.areaM2;
    return v === null || v === undefined ? "" : String(v);
  }, [editDraft]);

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
          <CardDescription>
            Todos os orçamentos solicitados pelos clientes
          </CardDescription>
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
                    <th className="text-left py-3 px-4 font-semibold">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">
                      Telefone
                    </th>
                    <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold">
                      Medidas
                    </th>
                    <th className="text-left py-3 px-4 font-semibold">
                      Área (m²)
                    </th>
                    <th className="text-left py-3 px-4 font-semibold">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold">Data</th>
                    <th className="text-left py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map(quote => (
                    <tr
                      key={quote.id}
                      className="border-b border-border hover:bg-muted/50"
                    >
                      <td className="py-3 px-4">{quote.clientName}</td>
                      <td className="py-3 px-4 text-foreground/70">
                        {quote.clientEmail}
                      </td>
                      <td className="py-3 px-4">{quote.clientPhone}</td>
                      <td className="py-3 px-4 capitalize">
                        {quote.toldoType}
                      </td>
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
                            onValueChange={value =>
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
                              <SelectItem value="completed">
                                Concluído
                              </SelectItem>
                              <SelectItem value="rejected">
                                Rejeitado
                              </SelectItem>
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
                              const text = buildQuoteWhatsAppText(quote);
                              const url = buildWhatsAppUrl(phone, text);
                              window.open(url, "_blank", "noopener,noreferrer");
                            }}
                          >
                            WhatsApp cliente
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              const text = buildQuoteWhatsAppText(quote);
                              await navigator.clipboard.writeText(text);
                              toast.success("Texto copiado.");
                            }}
                          >
                            Copiar
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const phone = getCompanyWhatsAppPhone();
                              if (!phone) {
                                toast.error(
                                  "WhatsApp da empresa não configurado."
                                );
                                return;
                              }
                              const text = buildAdminQuoteWhatsAppText(quote);
                              const url = buildWhatsAppUrl(phone, text);
                              window.open(url, "_blank", "noopener,noreferrer");
                            }}
                          >
                            Cópia VS
                          </Button>

                          {getDevWhatsAppPhone() ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const phone = getDevWhatsAppPhone();
                                if (!phone) return;
                                const text = buildAdminQuoteWhatsAppText(quote);
                                const url = buildWhatsAppUrl(phone, text);
                                window.open(
                                  url,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              }}
                            >
                              Cópia dev
                            </Button>
                          ) : null}

                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setLocation(buildReceiptNewUrlFromQuote(quote))
                            }
                          >
                            Emitir recibo
                          </Button>

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
                              const text = buildThanksWhatsAppText(quote);
                              const url = buildWhatsAppUrl(phone, text);
                              window.open(url, "_blank", "noopener,noreferrer");
                            }}
                          >
                            Agradecer
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

                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditDraft({
                                ...quote,
                                width: String(quote.width ?? ""),
                                projection: String(quote.projection ?? ""),
                                areaM2:
                                  quote.areaM2 === undefined ? null : quote.areaM2,
                                material:
                                  quote.material === undefined
                                    ? null
                                    : quote.material,
                                notes: quote.notes === undefined ? null : quote.notes,
                              });
                              setEditOpen(true);
                            }}
                          >
                            Editar
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setDeleteTarget(quote);
                              setDeleteOpen(true);
                            }}
                          >
                            Excluir
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
              <p>Nenhum orçamento recebido ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editOpen}
        onOpenChange={open => {
          setEditOpen(open);
          if (!open) setEditDraft(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar orçamento</DialogTitle>
            <DialogDescription>Ajuste os dados do orçamento.</DialogDescription>
          </DialogHeader>

          {editDraft ? (
            <form
              className="grid gap-4"
              onSubmit={e => {
                e.preventDefault();
                if (!editDraft.clientName?.trim()) {
                  toast.error("Informe o nome do cliente.");
                  return;
                }
                if (!editDraft.clientEmail?.trim()) {
                  toast.error("Informe o email do cliente.");
                  return;
                }
                if (!editDraft.clientPhone?.trim()) {
                  toast.error("Informe o telefone do cliente.");
                  return;
                }
                if (!editDraft.width?.toString().trim()) {
                  toast.error("Informe a largura.");
                  return;
                }
                if (!editDraft.projection?.toString().trim()) {
                  toast.error("Informe a projeção/altura.");
                  return;
                }

                const areaM2Raw = String(
                  editDraft.areaM2String ?? editAreaM2String ?? ""
                ).trim();
                const areaM2 = areaM2Raw ? areaM2Raw : null;

                updateMutation.mutate({
                  id: Number(editDraft.id),
                  clientName: editDraft.clientName,
                  clientEmail: editDraft.clientEmail,
                  clientPhone: editDraft.clientPhone,
                  toldoType: editDraft.toldoType,
                  material: editDraft.material?.trim() ? editDraft.material : null,
                  width: editDraft.width,
                  projection: editDraft.projection,
                  areaM2,
                  notes: editDraft.notes?.trim() ? editDraft.notes : null,
                  status: editDraft.status,
                });
              }}
            >
              <div className="grid gap-2">
                <Label>Cliente</Label>
                <Input
                  value={editDraft.clientName ?? ""}
                  onChange={e =>
                    setEditDraft((d: any) => ({ ...d, clientName: e.target.value }))
                  }
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    value={editDraft.clientEmail ?? ""}
                    onChange={e =>
                      setEditDraft((d: any) => ({ ...d, clientEmail: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input
                    value={editDraft.clientPhone ?? ""}
                    onChange={e =>
                      setEditDraft((d: any) => ({ ...d, clientPhone: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <Select
                    value={editDraft.toldoType}
                    onValueChange={value =>
                      setEditDraft((d: any) => ({ ...d, toldoType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixo">Toldo Fixo</SelectItem>
                      <SelectItem value="retratil">Toldo Retrátil</SelectItem>
                      <SelectItem value="cortina">Cortina Rolo</SelectItem>
                      <SelectItem value="policarbonato">Policarbonato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={editDraft.status}
                    onValueChange={value =>
                      setEditDraft((d: any) => ({ ...d, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Largura (m)</Label>
                  <Input
                    value={editDraft.width ?? ""}
                    onChange={e =>
                      setEditDraft((d: any) => ({ ...d, width: e.target.value }))
                    }
                    placeholder="Ex.: 3.50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Projeção/Altura (m)</Label>
                  <Input
                    value={editDraft.projection ?? ""}
                    onChange={e =>
                      setEditDraft((d: any) => ({
                        ...d,
                        projection: e.target.value,
                      }))
                    }
                    placeholder="Ex.: 2.50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Área (m²)</Label>
                  <Input
                    value={editDraft.areaM2String ?? editAreaM2String}
                    onChange={e =>
                      setEditDraft((d: any) => ({
                        ...d,
                        areaM2String: e.target.value,
                      }))
                    }
                    placeholder="Ex.: 8.75"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Material (opcional)</Label>
                <Input
                  value={editDraft.material ?? ""}
                  onChange={e =>
                    setEditDraft((d: any) => ({ ...d, material: e.target.value }))
                  }
                  placeholder="Ex.: Lona acrílica"
                />
              </div>

              <div className="grid gap-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={editDraft.notes ?? ""}
                  onChange={e =>
                    setEditDraft((d: any) => ({ ...d, notes: e.target.value }))
                  }
                  placeholder="Detalhes adicionais..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditOpen(false);
                    setEditDraft(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={open => {
          setDeleteOpen(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteOpen(false);
                setDeleteTarget(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget?.id) return;
                deleteMutation.mutate({ id: Number(deleteTarget.id) });
              }}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
