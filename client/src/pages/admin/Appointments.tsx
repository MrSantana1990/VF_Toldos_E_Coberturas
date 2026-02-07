import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Appointments() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: appointments, isLoading } = trpc.appointments.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Agenda de Agendamentos</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agendamentos Próximos</CardTitle>
          <CardDescription>Visitas técnicas, instalações e manutenções agendadas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : appointments && appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.map((apt: any) => (
                <div key={apt.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{apt.clientName}</h3>
                      <p className="text-sm text-foreground/70">{apt.clientPhone}</p>
                      <p className="text-sm text-foreground/70 mt-1">{apt.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(apt.status)}>
                        {apt.status === "agendado" ? "Agendado" : apt.status === "concluido" ? "Concluído" : "Cancelado"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="flex gap-4 text-sm text-foreground/70">
                      <span>{getTypeLabel(apt.appointmentType)}</span>
                      <span>{new Date(apt.appointmentDate).toLocaleString("pt-BR")}</span>
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
    </div>
  );
}
