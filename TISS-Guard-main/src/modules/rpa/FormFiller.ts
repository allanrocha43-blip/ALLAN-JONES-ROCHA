import { DomLocator, SemanticTarget } from "./DomLocator";
import recipeSemantic from "./recipes/recipe-semantic.json";
import { NotificationService } from "./NotificationService";

const WIZARD_STATE_KEY = "TISS_GUARD_WIZARD_STATE";

interface WizardState {
  recipeName: string;
  currentStepIndex: number;
  context: FillContext;
}

/**
 * Context object tracking the state of form filling operations.
 * @interface FillContext
 * @property {any} jsonObj - The JSON parsed from the TISS XML.
 * @property {number} filledCount - Number of fields successfully filled.
 * @property {Array<{ field: string, value: string, reason: string }>} failures - Track failed fill attempts.
 */
export interface FillContext {
  jsonObj: any;
  filledCount: number;
  failures: { field: string; value: string; reason: string }[];
}

/**
 * Strategy interface to handle different form generation techniques.
 * @interface FillStrategy
 */
export interface FillStrategy {
  name: string;
  canHandle(url: string): boolean;
  execute(context: FillContext): Promise<void>;
}

interface ActionRecipe {
  field?: string;
  target: SemanticTarget;
  isClick?: boolean;
}

interface WizardStep {
  name: string;
  triggerCondition?: SemanticTarget;
  actions: ActionRecipe[];
  waitForNextStepMs?: number;
}

interface PortalRecipe {
  portal: string;
  matches: string[];
  actions?: ActionRecipe[];
  steps?: WizardStep[];
}

const findValue = (obj: any, key: string): string | null => {
  if (typeof obj !== "object" || obj === null) return null;
  if (key in obj && typeof obj[key] !== "object") return String(obj[key]);
  for (const k of Object.keys(obj)) {
    const val = findValue(obj[k], key);
    if (val) return val;
  }
  return null;
};

const triggerEvents = (input: HTMLElement) => {
  const events = ["input", "change", "blur", "focus"];
  events.forEach((e) => input.dispatchEvent(new Event(e, { bubbles: true })));
};

/**
 * Force setting the native value bypassing Virtual DOM constraints, ensuring React/Angular pick it up.
 * @param {HTMLElement} element - The input, select, or textarea element to fill.
 * @param {string} value - The intended value of the field.
 */
const setNativeValue = (element: HTMLElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(
    prototype,
    "value",
  )?.set;

  if (valueSetter && valueSetter !== prototypeValueSetter) {
    valueSetter.call(element, value);
  } else if (prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else {
    (element as any).value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const visualizeFill = (input: HTMLElement) => {
  input.style.transition = "all 0.5s";
  input.style.backgroundColor = "#dcfce7";
  input.style.border = "2px solid #22c55e";
};

const waitForElement = (
  target: SemanticTarget,
  timeoutMs = 5000,
): Promise<HTMLElement | null> => {
  return new Promise((resolve) => {
    let el = DomLocator.locateInput(target);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      el = DomLocator.locateInput(target);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });
};

class RecipeStrategy implements FillStrategy {
  name: string;

  private recipe: PortalRecipe;

  constructor(recipe: PortalRecipe) {
    this.name = recipe.portal;
    this.recipe = recipe;
  }

  canHandle(url: string): boolean {
    return this.recipe.matches.some((match) => {
      if (match.includes("*")) {
        const regex = new RegExp(match.replace("*", ".*"));
        return regex.test(url);
      }
      return url.includes(match);
    });
  }

  async execute(ctx: FillContext): Promise<void> {
    console.log(`[RPA] Executing Recipe: ${this.name}`);

    if (this.recipe.steps && this.recipe.steps.length > 0) {
      await this.executeWizard(ctx, this.recipe.steps);
    } else if (this.recipe.actions) {
      await this.executeActions(ctx, this.recipe.actions);
    }
  }

  private async executeWizard(
    ctx: FillContext,
    steps: WizardStep[],
  ): Promise<void> {
    // Check if we are resuming
    let startingStep = 0;
    const savedStateStr = sessionStorage.getItem(WIZARD_STATE_KEY);
    if (savedStateStr) {
      try {
        const savedState: WizardState = JSON.parse(savedStateStr);
        if (savedState.recipeName === this.name) {
          startingStep = savedState.currentStepIndex;
          ctx.filledCount = savedState.context.filledCount;
          ctx.failures = savedState.context.failures;
          console.log(
            `[RPA] Resuming Wizard '${this.name}' at step ${startingStep}`,
          );
        }
      } catch (e) {}
    }

    for (let i = startingStep; i < steps.length; i++) {
      const step = steps[i];
      console.log(`[RPA] Executing Wizard Step: ${step.name}`);

      // Save state before waiting
      sessionStorage.setItem(
        WIZARD_STATE_KEY,
        JSON.stringify({
          recipeName: this.name,
          currentStepIndex: i,
          context: ctx,
        }),
      );

      if (step.triggerCondition) {
        const triggerEl = await waitForElement(step.triggerCondition, 10000);
        if (!triggerEl) {
          console.warn(`[RPA] Timeout waiting for step trigger: ${step.name}`);
          continue;
        }
      }

      await this.executeActions(ctx, step.actions);

      if (step.waitForNextStepMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, step.waitForNextStepMs),
        );
      }
    }

    // Wizard finished, clear state
    sessionStorage.removeItem(WIZARD_STATE_KEY);
  }

  private async executeActions(
    ctx: FillContext,
    actions: ActionRecipe[],
  ): Promise<void> {
    for (const action of actions) {
      if (action.isClick) {
        const el = DomLocator.locateInput(action.target);
        if (el) {
          el.click();
          console.log(`[RPA] Clicked element for target:`, action.target);
        }
        continue;
      }

      if (!action.field) continue;
      const val = findValue(ctx.jsonObj, action.field);
      if (val) {
        // Usa waitForElement ao invés de busca imediata para lidar com atrasos de renderização (React)
        const el = await waitForElement(action.target, 2000);
        if (el) {
          setNativeValue(el, val);
          triggerEvents(el);
          visualizeFill(el);
          ctx.filledCount += 1;
        } else {
          ctx.failures.push({
            field: action.field,
            value: val,
            reason: `Nenhum alvo semântico encontrou o campo na página. (Alvo: ${JSON.stringify(
              action.target,
            )})`,
          });
        }
      }
    }
  }
}

const semanticStrategy = new RecipeStrategy(recipeSemantic as PortalRecipe);

const heuristicStrategy: FillStrategy = {
  name: "Heuristic Fallback Engine",
  canHandle: () => true,
  execute: async (ctx) => {
    const heuristicMap = [
      {
        tiss: "numeroGuiaPrestador",
        labels: ["Número da Guia", "Nr. Guia", "Guia do Prestador"],
      },
      {
        tiss: "dataExecucao",
        labels: ["Data do Atendimento", "Data Execução", "Data Realização"],
      },
      {
        tiss: "dataAtendimento",
        labels: ["Data do Atendimento", "Data Execução", "Data Realização"],
      },
      {
        tiss: "numeroCarteira",
        labels: ["Carteira", "Carteirinha", "Matrícula"],
      },
      {
        tiss: "codigoBeneficiario",
        labels: ["Carteira", "Carteirinha", "Matrícula"],
      },
      { tiss: "valorTotal", labels: ["Valor Total", "Valor Geral"] },
      { tiss: "valorTotalGeral", labels: ["Valor Total", "Valor Geral"] },
      {
        tiss: "codigoPrestadorNaOperadora",
        labels: ["Código do Prestador", "CRM", "Código Executante"],
      },
      {
        tiss: "codigoProcedimento",
        labels: ["Código TUSS", "Procedimento", "Código do Procedimento"],
      },
      {
        tiss: "quantidadeExecutada",
        labels: ["Quantidade", "Qtd", "Qtde"],
      },
      {
        tiss: "indicacaoClinica",
        labels: ["Indicação Clínica", "Motivo", "Observação"],
      },
      {
        tiss: "tipoAcomodacao",
        labels: ["Acomodação", "Tipo de Acomodação", "Leito"],
      },
    ];

    const findInputByLabel = (candidates: string[]) => {
      const labels = Array.from(document.querySelectorAll("label"));
      for (const c of candidates) {
        const match = labels.find((l) =>
          l.textContent?.toLowerCase().includes(c.toLowerCase()),
        );
        if (match) {
          const forId = match.getAttribute("for");
          if (forId) return document.getElementById(forId) as HTMLElement;
          const nested = match.querySelector("input, select, textarea");
          if (nested) return nested as HTMLElement;
        }
      }
      return null;
    };

    heuristicMap.forEach((m) => {
      const val = findValue(ctx.jsonObj, m.tiss);
      if (val) {
        const input = findInputByLabel(m.labels);
        if (input && !(input as any).value) {
          setNativeValue(input, val);
          triggerEvents(input);
          visualizeFill(input);
          ctx.filledCount += 1;
        }
      }
    });
  },
};

/**
 * Main form filling orchestrator managing standard operations and strategy fallbacks.
 * @class FormFiller
 */
export const FormFiller = {
  /**
   * Attempts to fill form fields present on the page based on the parsed XML standard data.
   * @param {any} jsonObj - Parsed structured data to attempt filling into the active form.
   */
  fill: async (jsonObj: any) => {
    console.log("🤖 [TISS Guard RPA] Initializing Strategies...");
    const url = window.location.href;

    const strategies = [semanticStrategy, heuristicStrategy];
    const context: FillContext = { jsonObj, filledCount: 0, failures: [] };

    for (const strategy of strategies) {
      if (strategy.canHandle(url)) {
        console.log(`[RPA] Executing Strategy: ${strategy.name}`);
        await strategy.execute(context);

        if (strategy !== heuristicStrategy) {
          break;
        }
      }
    }

    if (
      context.filledCount > 0 ||
      strategies.some(
        (s) =>
          s.name === "Heuristic Fallback Engine" && context.failures.length > 0,
      )
    ) {
      if (context.failures.length === 0) {
        NotificationService.showSuccessToast(context.filledCount);
      } else {
        NotificationService.showFailurePanel(context.failures);
      }
    } else {
      console.log("⚠️ [TISS Guard RPA] No matching fields found.");
    }
  },

  /**
   * Clears any saved wizard state and unblocks the RPA memory.
   * Call this explicitly when closing the popup or when validation fails.
   */
  clearState: () => {
    sessionStorage.removeItem(WIZARD_STATE_KEY);
    // Explicitly nullify references (Memory Leak Fix)
  },
};
