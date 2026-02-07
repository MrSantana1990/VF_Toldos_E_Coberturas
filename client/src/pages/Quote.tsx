import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";


export default function Quote() {
  const [, setLocation] = useLocation();
  const { data: driveLogo } = trpc.gallery.logo.useQuery();
  const logoSrc = driveLogo?.url || import.meta.env.VITE_LOGO_URL || "/logo.png";
  const [resolvedLogoSrc, setResolvedLogoSrc] = useState(logoSrc);
  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    toldoType: "",
    material: "",
    width: "",
    projection: "",
    notes: "",
  });

  const createQuoteMutation = trpc.quotes.create.useMutation({
    onSuccess: () => {
      toast.success("Orçamento enviado com sucesso! Entraremos em contato em breve.");
      setFormData({
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        toldoType: "",
        material: "",
        width: "",
        projection: "",
        notes: "",
      });
      setTimeout(() => setLocation("/"), 2000);
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar orçamento: " + (error?.message || "Erro desconhecido"));
    },
  });

  const calculateArea = () => {
    const w = parseFloat(formData.width);
    const p = parseFloat(formData.projection);
    if (!isNaN(w) && !isNaN(p)) {
      return (w * p).toFixed(2);
    }
    return "0.00";
  };

  useEffect(() => {
    setResolvedLogoSrc(logoSrc);
  }, [logoSrc]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName || !formData.clientEmail || !formData.clientPhone || !formData.toldoType || !formData.width || !formData.projection) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    const area = calculateArea();

    createQuoteMutation.mutate({
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      clientPhone: formData.clientPhone,
      toldoType: formData.toldoType as any,
      material: formData.material || null,
      width: parseFloat(formData.width),
      projection: parseFloat(formData.projection),
      areaM2: parseFloat(area),
      notes: formData.notes || null,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <img
              src={resolvedLogoSrc}
              alt="VF Toldos & Coberturas"
              className="h-10 w-auto"
              referrerPolicy="no-referrer"
              onError={() => setResolvedLogoSrc("/logo.png")}
            />
            <span className="text-lg font-bold text-foreground">VF Toldos & Coberturas</span>
          </div>
          <Button variant="ghost" onClick={() => setLocation("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Solicitar Orçamento</CardTitle>
              <CardDescription>
                Preencha o formulário abaixo com as informações do seu projeto. Analisaremos e entraremos em contato em breve.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Seção: Dados Pessoais */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Seus Dados</h3>

                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="clientName">Nome Completo *</Label>
                      <Input
                        id="clientName"
                        placeholder="João Silva"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="clientEmail">Email *</Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        placeholder="joao@example.com"
                        value={formData.clientEmail}
                        onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="clientPhone">Telefone *</Label>
                      <Input
                        id="clientPhone"
                        placeholder="(11) 9999-9999"
                        value={formData.clientPhone}
                        onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Seção: Tipo de Toldo */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Tipo de Toldo</h3>

                  <div>
                    <Label htmlFor="toldoType">Tipo de Toldo *</Label>
                    <Select value={formData.toldoType} onValueChange={(value) => setFormData({ ...formData, toldoType: value })}>
                      <SelectTrigger id="toldoType">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixo">Toldo Fixo</SelectItem>
                        <SelectItem value="retratil">Toldo Retrátil</SelectItem>
                        <SelectItem value="cortina">Cortina Rolo</SelectItem>
                        <SelectItem value="policarbonato">Policarbonato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="material">Material (Opcional)</Label>
                    <Select value={formData.material} onValueChange={(value) => setFormData({ ...formData, material: value })}>
                      <SelectTrigger id="material">
                        <SelectValue placeholder="Selecione o material" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lona-pvc">Lona PVC</SelectItem>
                        <SelectItem value="lona-acrilica">Lona Acrílica</SelectItem>
                        <SelectItem value="policarbonato-alveolar">Policarbonato Alveolar</SelectItem>
                        <SelectItem value="policarbonato-compacto">Policarbonato Compacto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Seção: Medidas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Medidas do Projeto</h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="width">Largura (metros) *</Label>
                      <Input
                        id="width"
                        type="number"
                        placeholder="3.50"
                        step="0.01"
                        min="0"
                        value={formData.width}
                        onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                        required
                      />
                      <p className="text-xs text-foreground/50 mt-1">Medida horizontal ao longo da parede</p>
                    </div>

                    <div>
                      <Label htmlFor="projection">Projeção/Altura (metros) *</Label>
                      <Input
                        id="projection"
                        type="number"
                        placeholder="2.50"
                        step="0.01"
                        min="0"
                        value={formData.projection}
                        onChange={(e) => setFormData({ ...formData, projection: e.target.value })}
                        required
                      />
                      <p className="text-xs text-foreground/50 mt-1">Distância de projeção ou altura vertical</p>
                    </div>
                  </div>

                  {/* Área Calculada */}
                  {formData.width && formData.projection && (
                    <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                      <p className="text-sm text-foreground/70">
                        <strong>Área Estimada:</strong> {calculateArea()} m²
                      </p>
                    </div>
                  )}
                </div>

                {/* Seção: Observações */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Observações Adicionais</h3>

                  <div>
                    <Label htmlFor="notes">Notas (Opcional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Descreva qualquer detalhe adicional sobre seu projeto..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                    />
                  </div>
                </div>

                {/* Botões */}
                <div className="flex gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/")}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createQuoteMutation.isPending}
                    className="flex-1 gap-2"
                  >
                    {createQuoteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Enviar Orçamento
                  </Button>
                </div>

                <p className="text-xs text-foreground/50 text-center">
                  * Campos obrigatórios. Seus dados serão utilizados apenas para contato sobre o orçamento.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
