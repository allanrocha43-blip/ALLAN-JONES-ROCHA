import { CircleAlert, AlertTriangle, Info, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { Inconsistency } from '../types/tiss';
import { isCritico } from '../utils/severidade';

export function PainelAuditoria({ 
  avancado, 
  inconsistencias,
  onApplySafe,
  onApplyCorrection,
  onViewInXml,
  className
}: { 
  avancado: boolean, 
  inconsistencias: Inconsistency[],
  onApplySafe: () => void,
  onApplyCorrection: (inc: Inconsistency) => void,
  onViewInXml: (linha: number) => void,
  className?: string
}) {
  const numCrit = inconsistencias.filter(i => isCritico(i)).length;
  const numWarn = inconsistencias.length - numCrit;
  const safeCount = inconsistencias.filter(i => i.seguro).length;

  return (
    <aside className={cn("flex w-full shrink-0 flex-col border-t border-border bg-surface lg:w-96 lg:border-l lg:border-t-0", className)}>
      <div className="border-b border-border px-4 py-3">
        <div className="font-display text-[15px] font-semibold tracking-tight">
          {avancado ? "Inconsistências & Auditoria" : "O que precisa da sua atenção"}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">{inconsistencias.length} itens no lote · {numCrit} críticos</div>
      </div>

      <div className="grid grid-cols-3 gap-px border-b border-border bg-border text-center">
        {[
          { v: numCrit.toString(), l: "Críticos", c: "text-crit" },
          { v: numWarn.toString(), l: "Alertas", c: "text-warn" },
          { v: "0", l: "Infos", c: "text-info" },
        ].map((s) => (
          <div key={s.l} className="bg-surface py-2">
            <div className={cn("font-display text-lg font-semibold", s.c)}>{s.v}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {inconsistencias.map((inc) => {
          const sev = isCritico(inc) ? 'critico' : 'aviso';
          const sevToken = {
            critico: { text: "text-crit", bg: "bg-crit-surface/20", border: "border-crit/20" },
            aviso: { text: "text-warn", bg: "bg-warn-surface/20", border: "border-warn/20" },
            info: { text: "text-info", bg: "bg-info-surface/20", border: "border-info/20" },
            ok: { text: "text-ok", bg: "bg-ok-surface/20", border: "border-ok/20" }
          };
          const t = sevToken[sev];
          const iconMap = { critico: CircleAlert, aviso: AlertTriangle, info: Info, ok: Check };
          const Icone = iconMap[sev];
          
          return (
            <div key={inc.id} className={cn("rounded-lg border p-3", t.border, t.bg)}>
              <div className="flex items-center gap-2">
                <Icone className={cn("size-3.5 shrink-0", t.text)} />
                <span className={cn("text-[11px] font-medium", t.text)}>{inc.tipo}</span>
                {avancado && (
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    linha {inc.linha}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[12px] text-foreground/90">
                {inc.desc}
              </p>
              {avancado && inc.original && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">De:</div>
                  <code className="block p-1.5 rounded bg-background/50 border border-border text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
                    {inc.original.trim()}
                  </code>
                </div>
              )}
              {avancado && inc.sugestao && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] text-ok uppercase tracking-wide">Para (sugestão):</div>
                  <code className="block p-1.5 rounded bg-ok-surface/50 border border-ok/30 text-[11px] font-mono text-ok whitespace-pre-wrap">
                    {inc.sugestao.trim()}
                  </code>
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {inc.seguro && (
                  <button onClick={() => onApplyCorrection(inc)} className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground transition-all duration-200 ease-out hover:opacity-90 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.97] active:translate-y-0 active:shadow-sm">
                    Corrigir
                  </button>
                )}
                {avancado && (
                  <button 
                    onClick={() => onViewInXml(inc.linha)}
                    className="rounded border border-border bg-surface-2 px-2 py-1 text-[11px] text-muted-foreground transition-all duration-200 hover:text-foreground active:scale-[0.97]"
                  >
                    Ver no XML
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-3">
        <button 
          onClick={onApplySafe}
          disabled={safeCount === 0}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-ok/40 bg-ok-surface px-3 py-2 text-[12px] font-medium text-ok transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md hover:opacity-90 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none active:scale-[0.98] disabled:active:scale-100"
        >
          <Check className="size-3.5" /> Aplicar todas as correções seguras ({safeCount})
        </button>
      </div>
    </aside>
  );
}
