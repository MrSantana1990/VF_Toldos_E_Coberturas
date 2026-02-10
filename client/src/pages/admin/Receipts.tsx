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
import { Loader2, ArrowLeft, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  buildReceiptWhatsAppText,
  buildWhatsAppUrl,
  toWhatsAppPhone,
} from "@/lib/whatsapp";

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Receipts() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<any | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const { data: receipts, isLoading } = trpc.receipts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updateMutation = trpc.receipts.update.useMutation({
    onSuccess: async () => {
      toast.success("Recibo atualizado.");
      setEditOpen(false);
      setEditDraft(null);
      await utils.receipts.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Falha ao atualizar recibo.");
    },
  });

  const deleteMutation = trpc.receipts.delete.useMutation({
    onSuccess: async () => {
      toast.success("Recibo excluído.");
      setDeleteOpen(false);
      setDeleteTarget(null);
      await utils.receipts.list.invalidate();
      await utils.transactions.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Falha ao excluir recibo.");
    },
  });

  const editIssuedAtLocal = useMemo(() => {
    if (!editDraft?.issuedAt) return "";
    return toDatetimeLocalValue(editDraft.issuedAt);
  }, [editDraft?.issuedAt]);

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

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditDraft({ ...r });
                              setEditOpen(true);
                            }}
                          >
                            Editar
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setDeleteTarget(r);
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
              <p>Nenhum recibo emitido ainda.</p>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar recibo</DialogTitle>
            <DialogDescription>
              Ajuste dados do recibo e (opcional) sincronize a entrada do financeiro.
            </DialogDescription>
          </DialogHeader>

          {editDraft ? (
            <form
              className="grid gap-4"
              onSubmit={e => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editDraft.id,
                  clientName: editDraft.clientName,
                  clientEmail: editDraft.clientEmail || null,
                  clientPhone: editDraft.clientPhone,
                  serviceDescription: editDraft.serviceDescription,
                  amount: editDraft.amount,
                  paymentMethod: editDraft.paymentMethod || null,
                  notes: editDraft.notes || null,
                  issuedAt: editDraft.issuedAtLocal
                    ? new Date(editDraft.issuedAtLocal).toISOString()
                    : undefined,
                  syncTransaction: true,
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

              <div className="grid gap-2">
                <Label>Email (opcional)</Label>
                <Input
                  value={editDraft.clientEmail ?? ""}
                  onChange={e =>
                    setEditDraft((d: any) => ({ ...d, clientEmail: e.target.value }))
                  }
                  placeholder="cliente@exemplo.com"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input
                    value={editDraft.clientPhone ?? ""}
                    onChange={e =>
                      setEditDraft((d: any) => ({ ...d, clientPhone: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Data/Hora</Label>
                  <Input
                    type="datetime-local"
                    value={editDraft.issuedAtLocal ?? editIssuedAtLocal}
                    onChange={e =>
                      setEditDraft((d: any) => ({ ...d, issuedAtLocal: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Descrição do serviço</Label>
                <Textarea
                  value={editDraft.serviceDescription ?? ""}
                  onChange={e =>
                    setEditDraft((d: any) => ({
                      ...d,
                      serviceDescription: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    value={editDraft.amount ?? ""}
                    onChange={e =>
                      setEditDraft((d: any) => ({ ...d, amount: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Pagamento (opcional)</Label>
                  <Input
                    value={editDraft.paymentMethod ?? ""}
                    onChange={e =>
                      setEditDraft((d: any) => ({
                        ...d,
                        paymentMethod: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={editDraft.notes ?? ""}
                  onChange={e =>
                    setEditDraft((d: any) => ({ ...d, notes: e.target.value }))
                  }
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
            <AlertDialogTitle>Excluir recibo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação também pode remover a entrada relacionada no financeiro.
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
                deleteMutation.mutate({ id: deleteTarget.id });
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
