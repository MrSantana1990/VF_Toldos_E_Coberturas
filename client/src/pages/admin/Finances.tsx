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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Finances() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [type, setType] = useState<"entrada" | "saida">("saida");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const { data: transactions, isLoading } = trpc.transactions.list.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
    }
  );

  const createMutation = trpc.transactions.create.useMutation({
    onSuccess: async () => {
      toast.success("Transação registrada.");
      setType("saida");
      setCategory("");
      setDescription("");
      setAmount("");
      setPaymentMethod("");
      await utils.transactions.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Falha ao registrar transação.");
    },
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, loading, setLocation]);

  const totalEntradas =
    transactions
      ?.filter((t: any) => t.type === "entrada")
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0) || 0;

  const totalSaidas =
    transactions
      ?.filter((t: any) => t.type === "saida")
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0) || 0;

  const saldo = totalEntradas - totalSaidas;

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
            Controle Financeiro
          </h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/70">
              Total de Entradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              R$ {totalEntradas.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/70">
              Total de Saídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              R$ {totalSaidas.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/70">
              Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${saldo >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              R$ {saldo.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
          <CardDescription>
            Todas as entradas e saídas registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 border border-border rounded-lg bg-muted/30">
            <p className="text-sm text-foreground/70">
              Dica: ao <strong>emitir um recibo</strong> no painel, o sistema
              registra automaticamente uma <strong>entrada</strong> aqui (se
              você marcar essa opção no recibo).
            </p>

            <form
              className="mt-4 grid gap-3 md:grid-cols-5 items-end"
              onSubmit={e => {
                e.preventDefault();
                if (!category.trim()) {
                  toast.error("Informe a categoria.");
                  return;
                }
                if (!amount.trim()) {
                  toast.error("Informe o valor.");
                  return;
                }

                createMutation.mutate({
                  type,
                  category,
                  description: description || undefined,
                  amount,
                  paymentMethod: paymentMethod || undefined,
                });
              }}
            >
              <div className="grid gap-2 md:col-span-1">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={v => setType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 md:col-span-1">
                <Label>Categoria</Label>
                <Input
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="Ex.: Material, Combustível..."
                />
              </div>

              <div className="grid gap-2 md:col-span-1">
                <Label>Valor</Label>
                <Input
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Ex.: 120.00"
                />
              </div>

              <div className="grid gap-2 md:col-span-1">
                <Label>Pagamento (opcional)</Label>
                <Input
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  placeholder="PIX, dinheiro..."
                />
              </div>

              <div className="grid gap-2 md:col-span-1">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Adicionar"
                  )}
                </Button>
              </div>

              <div className="grid gap-2 md:col-span-5">
                <Label>Descrição (opcional)</Label>
                <Input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Detalhes da transação..."
                />
              </div>
            </form>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          tx.type === "entrada" ? "default" : "destructive"
                        }
                      >
                        {tx.type === "entrada" ? "Entrada" : "Saída"}
                      </Badge>
                      <span className="font-medium text-foreground">
                        {tx.category}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/70 mt-1">
                      {tx.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-semibold ${tx.type === "entrada" ? "text-green-600" : "text-red-600"}`}
                    >
                      {tx.type === "entrada" ? "+" : "-"} R${" "}
                      {parseFloat(tx.amount).toFixed(2)}
                    </div>
                    <p className="text-xs text-foreground/50">
                      {new Date(tx.transactionDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-foreground/50">
              <p>Nenhuma transação registrada ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
