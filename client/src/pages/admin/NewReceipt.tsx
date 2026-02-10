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
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  buildThanksWithReceiptWhatsAppText,
  buildWhatsAppUrl,
  toWhatsAppPhone,
} from "@/lib/whatsapp";

function getQueryDefaults() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const relatedQuoteId = params.get("quoteId");
  return {
    quoteId: relatedQuoteId ? Number(relatedQuoteId) : null,
    clientName: params.get("clientName") || "",
    clientEmail: params.get("clientEmail") || "",
    clientPhone: params.get("clientPhone") || "",
    serviceDescription: params.get("serviceDescription") || "",
    amount: params.get("amount") || "",
    paymentMethod: params.get("paymentMethod") || "",
    notes: params.get("notes") || "",
  };
}

export default function NewReceipt() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const defaults = useMemo(() => getQueryDefaults(), []);

  const [clientName, setClientName] = useState(defaults.clientName || "");
  const [clientEmail, setClientEmail] = useState(defaults.clientEmail || "");
  const [clientPhone, setClientPhone] = useState(defaults.clientPhone || "");
  const [serviceDescription, setServiceDescription] = useState(
    defaults.serviceDescription || ""
  );
  const [amount, setAmount] = useState(defaults.amount || "");
  const [paymentMethod, setPaymentMethod] = useState(
    defaults.paymentMethod || ""
  );
  const [notes, setNotes] = useState(defaults.notes || "");
  const [createTransaction, setCreateTransaction] = useState(true);
  const [createdReceipt, setCreatedReceipt] = useState<any | null>(null);

  const createReceiptMutation = trpc.receipts.create.useMutation({
    onSuccess: receipt => {
      toast.success("Recibo emitido com sucesso.");
      setCreatedReceipt(receipt);
      setTimeout(() => {
        window.open(`/r/${receipt.id}`, "_blank", "noopener,noreferrer");
      }, 250);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Falha ao emitir recibo.");
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

  const normalizedPhone = toWhatsAppPhone(clientPhone);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin/receipts")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Novo recibo</h1>
        </div>
        {normalizedPhone ? (
          <Button
            variant="outline"
            onClick={() => {
              const text = [
                `Olá ${clientName || "cliente"}!`,
                "",
                "Vamos emitir seu recibo. Pode confirmar estes dados?",
                `Serviço: ${serviceDescription || "(descreva)"}`,
                amount ? `Valor: R$ ${amount}` : null,
                paymentMethod ? `Pagamento: ${paymentMethod}` : null,
              ]
                .filter(Boolean)
                .join("\n");
              const url = buildWhatsAppUrl(normalizedPhone, text);
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            Confirmar no WhatsApp
          </Button>
        ) : null}
      </div>

      {createdReceipt ? (
        <Card>
          <CardHeader>
            <CardTitle>Recibo emitido ✅</CardTitle>
            <CardDescription>
              Use os botões abaixo para enviar o link correto ao cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                window.open(
                  `/r/${createdReceipt.id}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              Ver recibo
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const link = `${window.location.origin}/r/${createdReceipt.id}`;
                await navigator.clipboard.writeText(link);
                toast.success("Link do recibo copiado.");
              }}
            >
              Copiar link
            </Button>
            {normalizedPhone ? (
              <Button
                variant="secondary"
                onClick={() => {
                  const url = buildWhatsAppUrl(
                    normalizedPhone,
                    buildThanksWithReceiptWhatsAppText({
                      clientName: createdReceipt.clientName,
                      receiptId: createdReceipt.id,
                      origin: window.location.origin,
                    })
                  );
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                Enviar agradecimento
              </Button>
            ) : null}
            <Button onClick={() => setLocation("/admin/receipts")}>
              Ir para recibos
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Dados do recibo</CardTitle>
          <CardDescription>
            Você pode criar recibo avulso mesmo sem orçamento cadastrado.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              if (!serviceDescription.trim()) {
                toast.error("Informe a descrição do serviço.");
                return;
              }
              if (!amount.trim()) {
                toast.error("Informe o valor.");
                return;
              }

              createReceiptMutation.mutate({
                relatedQuoteId: defaults.quoteId,
                clientName,
                clientEmail: clientEmail || undefined,
                clientPhone,
                serviceDescription,
                amount,
                paymentMethod: paymentMethod || undefined,
                notes: notes || undefined,
                createTransaction,
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
                <Label>Email (opcional)</Label>
                <Input
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="(99) 99999-9999"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Descrição do serviço</Label>
              <Textarea
                value={serviceDescription}
                onChange={e => setServiceDescription(e.target.value)}
                placeholder="Ex.: Instalação de toldo retrátil..."
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setServiceDescription("Instalação de toldo")}
                >
                  Instalação
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setServiceDescription("Manutenção de toldo")}
                >
                  Manutenção
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setServiceDescription("Visita técnica")}
                >
                  Visita técnica
                </Button>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Valor (R$)</Label>
                <Input
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Ex.: 950.00"
                />
              </div>
              <div className="grid gap-2">
                <Label>Forma de pagamento (opcional)</Label>
                <Input
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  placeholder="PIX, dinheiro, cartão..."
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPaymentMethod("PIX")}
                  >
                    PIX
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPaymentMethod("Dinheiro")}
                  >
                    Dinheiro
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPaymentMethod("Cartão")}
                  >
                    Cartão
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex.: Garantia de 90 dias..."
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground/80">
              <input
                type="checkbox"
                checked={createTransaction}
                onChange={e => setCreateTransaction(e.target.checked)}
              />
              Registrar esta entrada no financeiro
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={createReceiptMutation.isPending}>
                {createReceiptMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Emitindo...
                  </>
                ) : (
                  "Emitir recibo"
                )}
              </Button>

              <Button
                type="button"
                variant="secondary"
                disabled={!createdReceipt || !normalizedPhone}
                onClick={() => {
                  if (!createdReceipt) {
                    toast.error("Emita o recibo primeiro.");
                    return;
                  }
                  if (!normalizedPhone) {
                    toast.error("Telefone do cliente inválido.");
                    return;
                  }
                  const url = buildWhatsAppUrl(
                    normalizedPhone,
                    buildThanksWithReceiptWhatsAppText({
                      clientName: createdReceipt.clientName,
                      receiptId: createdReceipt.id,
                      origin: window.location.origin,
                    })
                  );
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                Enviar agradecimento (com link)
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
