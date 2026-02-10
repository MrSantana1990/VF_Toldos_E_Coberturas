import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocation } from "wouter";
import { ArrowRight, Zap, Shield, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ADMIN_LOGIN_PATH,
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
} from "@/siteConfig";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: galleryImages, isLoading: galleryLoading } =
    trpc.gallery.list.useQuery();
  const { data: driveLogo } = trpc.gallery.logo.useQuery();
  const logoSrc =
    driveLogo?.url || import.meta.env.VITE_LOGO_URL || "/logo.png";
  const [resolvedLogoSrc, setResolvedLogoSrc] = useState(logoSrc);
  const { data: galleryStatus } = trpc.gallery.status.useQuery(undefined, {
    enabled: !galleryLoading && (galleryImages?.length ?? 0) === 0,
  });

  useEffect(() => {
    setResolvedLogoSrc(logoSrc);
  }, [logoSrc]);

  const galleryWithoutLogo = useMemo(() => {
    const items = galleryImages ?? [];
    return items.filter(
      i =>
        i.name?.toLowerCase() !== "logo.png" &&
        i.name?.toLowerCase() !== "logo.webp" &&
        i.name?.toLowerCase() !== "logo.jpg" &&
        i.name?.toLowerCase() !== "logo.jpeg"
    );
  }, [galleryImages]);

  const heroSlides = useMemo(() => {
    return galleryWithoutLogo.slice(0, 10);
  }, [galleryWithoutLogo]);

  const [activeSlide, setActiveSlide] = useState(0);
  const hoverRef = useRef(false);

  useEffect(() => {
    setActiveSlide(0);
  }, [heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;

    const timer = window.setInterval(() => {
      if (hoverRef.current) return;
      setActiveSlide(prev => (prev + 1) % heroSlides.length);
    }, 3500);

    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header/Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <img
              src={resolvedLogoSrc}
              alt="VF Toldos & Coberturas"
              className="h-10 w-auto"
              referrerPolicy="no-referrer"
              onError={() => {
                // Fallback para o logo local se o Drive/CND falhar.
                setResolvedLogoSrc("/logo.png");
              }}
            />
            <span className="text-lg font-bold text-foreground">
              VF Toldos & Coberturas
            </span>
          </div>
          <nav className="hidden gap-6 md:flex">
            <a
              href="#servicos"
              className="text-sm font-medium text-foreground/70 hover:text-foreground"
            >
              Serviços
            </a>
            <a
              href="#portfolio"
              className="text-sm font-medium text-foreground/70 hover:text-foreground"
            >
              Portfolio
            </a>
            <a
              href="#contato"
              className="text-sm font-medium text-foreground/70 hover:text-foreground"
            >
              Contato
            </a>
          </nav>
          <div className="flex gap-2">
            {isAuthenticated ? (
              <Button onClick={() => setLocation("/admin")} variant="default">
                Painel Admin
              </Button>
            ) : (
              <Button onClick={() => setLocation("/quote")} className="gap-2">
                Solicitar Orçamento <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background to-muted py-20 md:py-32">
        <div className="container grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Toldos e Coberturas de Qualidade
            </h1>
            <p className="text-lg text-foreground/70">
              Soluções profissionais em toldos fixos, retráteis, cortinas e
              coberturas em policarbonato. Transformamos seus espaços com estilo
              e durabilidade.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={() => setLocation("/quote")}
                className="gap-2"
              >
                Solicitar Orçamento <ArrowRight className="h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline">
                Conhecer Mais
              </Button>
            </div>
          </div>
          <div className="relative h-80 rounded-lg bg-muted md:h-96">
            <div
              className="absolute inset-0 overflow-hidden rounded-lg"
              onMouseEnter={() => {
                hoverRef.current = true;
              }}
              onMouseLeave={() => {
                hoverRef.current = false;
              }}
            >
              {galleryLoading ? (
                <div className="h-full w-full animate-pulse bg-gradient-to-br from-muted to-muted/60" />
              ) : heroSlides.length > 0 ? (
                <>
                  {heroSlides.map((slide, idx) => (
                    <img
                      key={slide.id}
                      src={slide.url}
                      alt={slide.title}
                      loading={idx === 0 ? "eager" : "lazy"}
                      referrerPolicy="no-referrer"
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                        idx === activeSlide ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  ))}

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <div className="min-w-0 text-sm font-medium text-white truncate">
                      {heroSlides[activeSlide]?.title ?? ""}
                    </div>
                    <div className="flex items-center gap-1">
                      {heroSlides.slice(0, 7).map((s, idx) => (
                        <button
                          key={s.id}
                          type="button"
                          aria-label={`Ir para slide ${idx + 1}`}
                          onClick={() => setActiveSlide(idx)}
                          className={`h-2 w-2 rounded-full transition-opacity ${
                            idx === activeSlide
                              ? "bg-white/95"
                              : "bg-white/40 hover:bg-white/70"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={resolvedLogoSrc}
                    alt="VF Toldos"
                    className="mx-auto h-32 w-auto opacity-50"
                    referrerPolicy="no-referrer"
                    onError={() => setResolvedLogoSrc("/logo.png")}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicos" className="py-16 md:py-24">
        <div className="container space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Nossos Serviços
            </h2>
            <p className="text-lg text-foreground/70">
              Oferecemos soluções completas em toldos e coberturas
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Toldos Fixos",
                description:
                  "Estrutura permanente e resistente para áreas que precisam de proteção constante.",
                icon: Shield,
              },
              {
                title: "Toldos Retráteis",
                description:
                  "Flexibilidade total com braços articulados que permitem recolher quando necessário.",
                icon: Zap,
              },
              {
                title: "Cortinas Rolo",
                description:
                  "Proteção vertical ideal para fechamento de áreas e controle de luminosidade.",
                icon: Clock,
              },
              {
                title: "Policarbonato",
                description:
                  "Coberturas em policarbonato alveolar ou compacto com excelente durabilidade.",
                icon: Shield,
              },
            ].map((service, idx) => {
              const Icon = service.icon;
              return (
                <Card
                  key={idx}
                  className="border-border hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <Icon className="h-8 w-8 text-accent mb-2" />
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground/70">
                      {service.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Portfolio Section */}
      <section id="portfolio" className="py-16 md:py-24 bg-muted/50">
        <div className="container space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Nossos Trabalhos
            </h2>
            <p className="text-lg text-foreground/70">
              Conheça alguns dos projetos que realizamos
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {galleryLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="relative h-64 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 border border-border overflow-hidden animate-pulse"
                />
              ))
            ) : galleryWithoutLogo.length > 0 ? (
              galleryWithoutLogo.slice(0, 12).map(img => (
                <div
                  key={img.id}
                  className="relative h-64 rounded-lg border border-border overflow-hidden bg-muted hover:shadow-lg transition-shadow"
                >
                  <img
                    src={img.url}
                    alt={img.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <div className="text-sm font-medium text-white truncate">
                      {img.title}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-foreground/60">
                <div className="space-y-2">
                  <div>Nenhuma imagem cadastrada ainda.</div>
                  {galleryStatus?.folderIdSet ? (
                    <div className="text-sm text-foreground/50">
                      {galleryStatus.configured &&
                      galleryStatus.serviceAccountAccess?.ok === false ? (
                        <>
                          A Service Account não conseguiu acessar a pasta.
                          Compartilhe a pasta do Drive com o e-mail da Service
                          Account (Editor).
                        </>
                      ) : null}
                      {!galleryStatus.configured ? (
                        <>
                          Google Drive não está configurado no backend. Vou
                          tentar modo público, mas o mais confiável é preencher
                          <code className="px-1">
                            GOOGLE_SERVICE_ACCOUNT_EMAIL
                          </code>{" "}
                          e
                          <code className="px-1">
                            GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
                          </code>{" "}
                          no
                          <code className="px-1">.env</code>.
                        </>
                      ) : null}
                      {galleryStatus.publicAccess?.ok === false ? (
                        <div className="mt-1">
                          A pasta não está acessível anonimamente (teste
                          retornou {galleryStatus.publicAccess.status}). Se você
                          quer acesso sem credenciais, a pasta precisa abrir em
                          uma janela anônima/sem login.
                        </div>
                      ) : null}
                      {galleryStatus.publicList &&
                      galleryStatus.publicList.ok === true &&
                      galleryStatus.publicList.count === 0 ? (
                        <div className="mt-1">
                          A pasta abriu publicamente, mas não consegui extrair a
                          lista de arquivos (o Google pode ter mudado o
                          formato). Nesse caso, use Service Account.
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-sm text-foreground/50">
                      Defina{" "}
                      <code className="px-1">
                        GOOGLE_DRIVE_IMAGES_FOLDER_ID
                      </code>{" "}
                      no <code className="px-1">.env</code>.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="contato"
        className="py-16 md:py-24 bg-accent text-accent-foreground"
      >
        <div className="container text-center space-y-6">
          <h2 className="text-3xl font-bold md:text-4xl">
            Pronto para Transformar Seu Espaço?
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Solicite um orçamento gratuito e sem compromisso. Nossos
            especialistas analisarão seu projeto e apresentarão a melhor
            solução.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setLocation("/quote")}
            className="gap-2"
          >
            Solicitar Orçamento Agora <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h3 className="font-bold text-foreground mb-4">
                VF Toldos & Coberturas
              </h3>
              <p className="text-sm text-foreground/70">
                Qualidade, durabilidade e profissionalismo em cada projeto.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Serviços</h4>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li>
                  <a href="#servicos" className="hover:text-foreground">
                    Toldos Fixos
                  </a>
                </li>
                <li>
                  <a href="#servicos" className="hover:text-foreground">
                    Toldos Retráteis
                  </a>
                </li>
                <li>
                  <a href="#servicos" className="hover:text-foreground">
                    Cortinas Rolo
                  </a>
                </li>
                <li>
                  <a href="#servicos" className="hover:text-foreground">
                    Policarbonato
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li>
                  <a href="#sobre" className="hover:text-foreground">
                    Sobre Nós
                  </a>
                </li>
                <li>
                  <a href="#portfolio" className="hover:text-foreground">
                    Portfolio
                  </a>
                </li>
                <li>
                  <a href="#contato" className="hover:text-foreground">
                    Contato
                  </a>
                </li>
                <li>
                  <a href={ADMIN_LOGIN_PATH} className="hover:text-foreground">
                    Área do administrador
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Contato</h4>
              <p className="text-sm text-foreground/70">
                <strong>Email:</strong>{" "}
                <a
                  className="hover:text-foreground"
                  href={`mailto:${CONTACT_EMAIL}`}
                >
                  {CONTACT_EMAIL}
                </a>
                <br />
                <strong>Telefone:</strong>{" "}
                {CONTACT_PHONE_TEL ? (
                  <a
                    className="hover:text-foreground"
                    href={`tel:${CONTACT_PHONE_TEL}`}
                  >
                    {CONTACT_PHONE_DISPLAY}
                  </a>
                ) : (
                  CONTACT_PHONE_DISPLAY
                )}
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-foreground/50">
            <p>
              &copy; 2026 VF Toldos & Coberturas. Todos os direitos reservados.
            </p>
            {__BUILD_COMMIT_REF__ ? (
              <p className="mt-2">
                Build: {__BUILD_COMMIT_REF__}
                {__BUILD_CONTEXT__ ? ` (${__BUILD_CONTEXT__})` : ""}
              </p>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
