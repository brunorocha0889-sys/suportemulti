import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, Timer, Smile, Gauge, TrendingUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CANONICAL = "https://suportemulti.lovable.app/blog/kpis-helpdesk-hospitalar";
const TITLE = "Indicadores de desempenho para HelpDesk hospitalar: guia de KPIs";
const DESCRIPTION =
  "Guia prático de KPIs de HelpDesk para hospitais: FRT, MTTR, CSAT, SLA e taxa de reabertura, com fórmulas e metas para gestores de saúde.";

export const Route = createFileRoute("/blog/kpis-helpdesk-hospitalar")({
  component: Page,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          inLanguage: "pt-BR",
          mainEntityOfPage: CANONICAL,
          author: { "@type": "Organization", name: "SuporteMulti" },
          publisher: { "@type": "Organization", name: "SuporteMulti" },
        }),
      },
    ],
  }),
});

const kpis = [
  {
    icon: Clock,
    sigla: "FRT",
    nome: "First Response Time (Tempo da 1ª resposta)",
    formula: "Média(tempo entre abertura e primeira resposta da equipe)",
    meta: "Até 15 min para urgências clínicas; até 1h para chamados administrativos.",
    porque:
      "Em hospitais, cada minuto de espera pode afetar a assistência ao paciente. Um FRT baixo mostra que o HelpDesk absorve rapidamente demandas de UTI, centro cirúrgico e enfermarias.",
  },
  {
    icon: Timer,
    sigla: "MTTR",
    nome: "Mean Time to Resolution (Tempo médio de resolução)",
    formula: "Soma(tempo de fechamento − tempo de abertura) / total de chamados finalizados",
    meta: "Manutenção predial: até 24h. TI clínica (prontuário, PACS): até 4h. Refrigeração/climatização crítica: até 2h.",
    porque:
      "MTTR alto costuma indicar falta de peças, gargalos entre turnos ou setores mal dimensionados. Segmente por setor solicitante para agir na causa raiz.",
  },
  {
    icon: Smile,
    sigla: "CSAT",
    nome: "Customer Satisfaction (Satisfação do solicitante)",
    formula: "(Avaliações positivas / total de avaliações) × 100",
    meta: "≥ 90% para setores assistenciais.",
    porque:
      "Enfermagem e corpo clínico raramente têm tempo para reclamar formalmente. Uma pesquisa de 1 clique após o fechamento do chamado revela problemas invisíveis nos relatórios operacionais.",
  },
  {
    icon: ShieldCheck,
    sigla: "SLA %",
    nome: "Taxa de cumprimento de SLA",
    formula: "(Chamados dentro do SLA / total no período) × 100",
    meta: "≥ 95% para chamados classificados como críticos.",
    porque:
      "Em hospitais, o SLA precisa ser diferenciado por criticidade — um ar-condicionado de sala cirúrgica não pode competir na fila com uma troca de lâmpada administrativa.",
  },
  {
    icon: TrendingUp,
    sigla: "Reabertura",
    nome: "Taxa de reabertura",
    formula: "(Chamados reabertos em 7 dias / chamados finalizados) × 100",
    meta: "≤ 5%.",
    porque:
      "Reaberturas frequentes indicam soluções paliativas. Em equipamentos médicos, isso é risco assistencial e deve gerar plano de ação com a engenharia clínica.",
  },
  {
    icon: Gauge,
    sigla: "Backlog",
    nome: "Backlog e tempo em espera",
    formula: "Chamados abertos há mais de X dias + tempo médio parado por falta de peça",
    meta: "Backlog < 10% do volume mensal; tempo em espera monitorado semanalmente.",
    porque:
      "Chamados 'em espera' escondem falhas de compras e almoxarifado. Acompanhe o motivo da pausa para justificar orçamento de peças estratégicas.",
  },
];

function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/40">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft className="size-4 mr-2" />
            Voltar para o início
          </Link>
        </Button>

        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Guia prático · Gestão hospitalar
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            Indicadores de desempenho para HelpDesk hospitalar
          </h1>
          <p className="text-lg text-muted-foreground">
            KPIs essenciais — FRT, MTTR, CSAT, SLA e reabertura — adaptados à realidade de
            hospitais, com fórmulas, metas e leitura clínica de cada número.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Por que medir o HelpDesk em um hospital?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Um HelpDesk hospitalar cruza áreas críticas: manutenção predial, climatização,
            engenharia clínica, TI, patrimônio e infraestrutura assistencial. Sem indicadores,
            o setor vira uma caixa preta — muitos chamados, pouca previsibilidade e nenhuma
            base para negociar orçamento, contratar equipe ou justificar peças de reposição.
            Os KPIs abaixo transformam operação em decisão gerencial.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Os 6 KPIs que todo gestor hospitalar deve acompanhar</h2>
          <div className="grid gap-4">
            {kpis.map((k) => (
              <Card key={k.sigla}>
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                    <k.icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">{k.sigla}</p>
                    <CardTitle className="text-lg">{k.nome}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="font-semibold">Fórmula: </span>
                    <span className="text-muted-foreground">{k.formula}</span>
                  </p>
                  <p>
                    <span className="font-semibold">Meta sugerida: </span>
                    <span className="text-muted-foreground">{k.meta}</span>
                  </p>
                  <p>
                    <span className="font-semibold">Leitura hospitalar: </span>
                    <span className="text-muted-foreground">{k.porque}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Como estruturar a coleta desses indicadores</h2>
          <ol className="list-decimal pl-5 space-y-2 text-muted-foreground leading-relaxed">
            <li>
              <strong className="text-foreground">Padronize a abertura:</strong> exija setor
              solicitante, ramal e descrição — sem isso, MTTR e ranking por setor ficam
              inconsistentes.
            </li>
            <li>
              <strong className="text-foreground">Diferencie criticidade:</strong> configure
              SLAs distintos por tipo de chamado (assistencial crítico, assistencial padrão,
              administrativo).
            </li>
            <li>
              <strong className="text-foreground">Registre pausas:</strong> ao aguardar peça
              ou fornecedor, use o status "em espera" com motivo — assim o MTTR não pune
              injustamente a equipe.
            </li>
            <li>
              <strong className="text-foreground">Revise semanalmente:</strong> reuniões
              curtas de 15 min com o gestor de manutenção e o gestor assistencial usando os
              gráficos de status, ranking de setores e SLA.
            </li>
            <li>
              <strong className="text-foreground">Feche o ciclo com o solicitante:</strong>
              CSAT só funciona se a equipe recebe o retorno. Compartilhe os resultados
              mensais com as chefias de enfermaria.
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Erros comuns em HelpDesks hospitalares</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground leading-relaxed">
            <li>Medir apenas volume total de chamados, sem segmentar por criticidade ou setor.</li>
            <li>Confundir "chamado fechado" com "problema resolvido" — sem CSAT nem reabertura, o número é falso.</li>
            <li>Ignorar o tempo em espera por peça, inflando o MTTR e desmotivando a equipe técnica.</li>
            <li>Não separar KPIs por hospital quando a operação é multi-unidade.</li>
          </ul>
        </section>

        <section className="rounded-lg border bg-card p-6 space-y-3">
          <h2 className="text-xl font-semibold">Pronto para acompanhar esses indicadores?</h2>
          <p className="text-sm text-muted-foreground">
            O SuporteMulti já traz relatórios de SLA, ranking de setores, tempo médio de
            atendimento e tempo em espera prontos para uso em cada hospital cadastrado.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/">Abrir a plataforma</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/acompanhar" search={{ os: "" }}>
                Acompanhar um chamado
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
