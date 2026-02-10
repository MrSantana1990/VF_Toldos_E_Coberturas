import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Loader2 } from "lucide-react";

export default function Admin() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = trpc.quotes.stats.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
    }
  );

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

  const chartData = stats
    ? [
        { name: "Pendentes", value: stats.pending },
        { name: "Concluídos", value: stats.completed },
      ]
    : [];

  const COLORS = ["#e74c3c", "#27ae60"];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-foreground/70 mt-2">Visão geral do seu negócio</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground/70">
                Total de Orçamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  stats?.total || 0
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground/70">
                Orçamentos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  stats?.pending || 0
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground/70">
                Orçamentos Concluídos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  stats?.completed || 0
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Orçamentos</CardTitle>
              <CardDescription>Status dos orçamentos recebidos</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-foreground/50">
                  Sem dados para exibir
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo de Atividades</CardTitle>
              <CardDescription>Últimas ações do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <span className="text-sm text-foreground/70">
                    Orçamentos Recebidos
                  </span>
                  <span className="font-semibold">{stats?.total || 0}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <span className="text-sm text-foreground/70">
                    Aguardando Resposta
                  </span>
                  <span className="font-semibold text-accent">
                    {stats?.pending || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/70">Conversões</span>
                  <span className="font-semibold text-green-600">
                    {stats?.completed || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <button
                type="button"
                onClick={() => setLocation("/admin/quotes")}
                className="p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left"
              >
                <h3 className="font-semibold text-foreground">Orçamentos</h3>
                <p className="text-sm text-foreground/70">
                  Gerenciar orçamentos recebidos
                </p>
              </button>
              <button
                type="button"
                onClick={() => setLocation("/admin/receipts")}
                className="p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left"
              >
                <h3 className="font-semibold text-foreground">Recibos</h3>
                <p className="text-sm text-foreground/70">
                  Emitir e enviar recibos
                </p>
              </button>
              <button
                type="button"
                onClick={() => setLocation("/admin/appointments")}
                className="p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left"
              >
                <h3 className="font-semibold text-foreground">Agenda</h3>
                <p className="text-sm text-foreground/70">
                  Agendar visitas e instalações
                </p>
              </button>
              <button
                type="button"
                onClick={() => setLocation("/admin/finances")}
                className="p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left"
              >
                <h3 className="font-semibold text-foreground">Finanças</h3>
                <p className="text-sm text-foreground/70">
                  Controlar entradas e saídas
                </p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
