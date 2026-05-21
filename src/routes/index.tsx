import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Snowflake, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/40">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <header className="text-center mb-14">
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-3">
            Central de Chamados
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground">
            HelpDesk
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Escolha o setor para abrir, acompanhar e gerenciar seus chamados.
          </p>
        </header>

        <div className="grid sm:grid-cols-2 gap-6">
          <SetorCard
            to="/auth/patrimonio"
            title="Patrimônio"
            description="Solicitações de bens, mobiliário, transferências e manutenção patrimonial."
            icon={<Package className="size-8" />}
            accent="patrimonio"
          />
          <SetorCard
            to="/auth/refrigeracao"
            title="Refrigeração"
            description="Manutenção, instalação e atendimento de equipamentos de refrigeração."
            icon={<Snowflake className="size-8" />}
            accent="refrigeracao"
          />
        </div>

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          Cada setor opera de forma totalmente independente.
        </footer>
      </div>
    </div>
  );
}

function SetorCard({
  to, title, description, icon, accent,
}: {
  to: string; title: string; description: string; icon: React.ReactNode;
  accent: "patrimonio" | "refrigeracao";
}) {
  const bg = accent === "patrimonio" ? "bg-patrimonio" : "bg-refrigeracao";
  const fg = accent === "patrimonio" ? "text-patrimonio-foreground" : "text-refrigeracao-foreground";
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border bg-card p-8 transition-all hover:shadow-xl hover:-translate-y-1"
    >
      <div className={`size-16 rounded-xl ${bg} ${fg} grid place-items-center mb-5 shadow-md`}>
        {icon}
      </div>
      <h2 className="text-2xl font-semibold text-card-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
      <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary">
        Acessar setor
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
