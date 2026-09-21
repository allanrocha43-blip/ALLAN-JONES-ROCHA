import { cn } from '../lib/utils';
import { AuditResult } from '../types/tiss';
import { isCritico } from '../utils/severidade';

export function ResumoSimples({ audit }: { audit?: AuditResult | null }) {
  if (!audit) return null;
  const numCrit = audit.inconsistencias.filter(i => isCritico(i)).length;
  const numWarn = audit.inconsistencias.length - numCrit;
  
  return (
    <div className="min-h-0 flex-1 overflow-auto p-6">
      <h1 className="font-display text-xl font-semibold tracking-tight">
        Lote atual — revisão necessária
      </h1>
      <p className="mt-2 max-w-[62ch] text-[13px] text-muted-foreground">
        Encontramos {audit.inconsistencias.length} pontos para revisar. Comece
        pelos {numCrit} itens críticos: eles impedem o envio.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <CartaoResumo valor={numCrit.toString()} rotulo="Impedem o envio" tone="critico" />
        <CartaoResumo valor={numWarn.toString()} rotulo="Recomendamos revisar" tone="aviso" />
        <CartaoResumo valor={audit.guias.length.toString()} rotulo="Total de Guias" tone="info" />
      </div>
    </div>
  );
}

export function CartaoResumo({
  valor,
  rotulo,
  tone,
}: {
  valor: string;
  rotulo: string;
  tone: 'critico' | 'aviso' | 'info' | 'ok';
}) {
  const sevToken = {
    critico: { text: "text-crit", bg: "bg-crit-surface/20", border: "border-crit/20" },
    aviso: { text: "text-warn", bg: "bg-warn-surface/20", border: "border-warn/20" },
    info: { text: "text-info", bg: "bg-info-surface/20", border: "border-info/20" },
    ok: { text: "text-ok", bg: "bg-ok-surface/20", border: "border-ok/20" }
  };
  const t = sevToken[tone];
  return (
    <div className={cn("rounded-lg border p-4", t.border, t.bg)}>
      <div className={cn("font-display text-2xl font-semibold", t.text)}>{valor}</div>
      <div className="mt-1 text-[12px] text-muted-foreground">{rotulo}</div>
    </div>
  );
}
