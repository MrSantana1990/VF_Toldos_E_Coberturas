import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Finances() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: transactions, isLoading } = trpc.transactions.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, loading, setLocation]);

  const totalEntradas = transactions
    ?.filter((t: any) => t.type === "entrada")
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0) || 0;

  const totalSaidas = transactions
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
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Controle Financeiro</h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/70">Total de Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">R$ {totalEntradas.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/70">Total de Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">R$ {totalSaidas.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/70">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
              R$ {saldo.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
          <CardDescription>Todas as entradas e saídas registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={tx.type === "entrada" ? "default" : "destructive"}>
                        {tx.type === "entrada" ? "Entrada" : "Saída"}
                      </Badge>
                      <span className="font-medium text-foreground">{tx.category}</span>
                    </div>
                    <p className="text-sm text-foreground/70 mt-1">{tx.description}</p>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${tx.type === "entrada" ? "text-green-600" : "text-red-600"}`}>
                      {tx.type === "entrada" ? "+" : "-"} R$ {parseFloat(tx.amount).toFixed(2)}
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
