/**
 * Represents the semantic criteria for mapping and finding a DOM element.
 * @interface SemanticTarget
 * @property {string} [ariaLabel] - Matches the `aria-label` attribute on the element.
 * @property {string} [nameAttribute] - Matches the `name` attribute on the element.
 * @property {string} [labelText] - Searches for a `<label>` containing this text to find its associated input.
 * @property {string[]} [cssFallback] - A list of fallback CSS selectors if semantic targets fail.
 */
export interface SemanticTarget {
  ariaLabel?: string;
  nameAttribute?: string;
  labelText?: string;
  cssFallback?: string[];
}

/**
 * Utility to locate DOM elements based on semantic definitions.
 * @class DomLocator
 */
export const DomLocator = {
  /**
   * Executes a chain of responsibility to locate an input field in a fragile or unpredictable DOM.
   * Uses semantic attributes first, labels second, and pure CSS selectors as a fallback.
   *
   * @param {SemanticTarget} target - The semantic criteria used to locate the input.
   * @param {Document | HTMLElement} context - Optional scope to limit the DOM search.
   * @returns {HTMLElement | null} The resolved HTML element, or null if not found.
   */
  locateInput(
    target: SemanticTarget,
    context: Document | HTMLElement = document,
  ): HTMLElement | null {
    const el = this._searchInContext(target, context);
    if (el) return el;

    // Fallback de IFrame: Se não encontrou no documento raiz, procura em iframes de mesma origem
    if (context === document) {
      const iframes = document.querySelectorAll("iframe");
      for (let i = 0; i < iframes.length; i++) {
        try {
          const iframeDoc =
            iframes[i].contentDocument || iframes[i].contentWindow?.document;
          if (iframeDoc) {
            const iframeEl = this._searchInContext(target, iframeDoc);
            if (iframeEl) return iframeEl;
          }
        } catch (e) {
          // Ignora erros de iframes cross-origin
        }
      }
    }

    return null;
  },

  _searchInContext(
    target: SemanticTarget,
    context: Document | HTMLElement,
  ): HTMLElement | null {
    const validTags = "input, select, textarea";

    if (target.nameAttribute) {
      const els = context.querySelectorAll(validTags);
      for (let i = 0; i < els.length; i++) {
        if (els[i].getAttribute("name") === target.nameAttribute)
          return els[i] as HTMLElement;
      }
    }

    if (target.ariaLabel) {
      const els = context.querySelectorAll(validTags);
      for (let i = 0; i < els.length; i++) {
        if (els[i].getAttribute("aria-label") === target.ariaLabel)
          return els[i] as HTMLElement;
      }
    }

    if (target.labelText) {
      const lowerLabel = target.labelText.toLowerCase();
      // Otimização de XPath: Usando .// para buscar a partir do nó de contexto (formulário/painel ativo) em vez de // global
      const xpath = `.//label[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ', 'abcdefghijklmnopqrstuvwxyzáéíóúàèìòùâêîôûãõç'), '${lowerLabel}')]`;

      const doc =
        context.nodeType === 9 ? (context as Document) : context.ownerDocument;

      if (doc) {
        const result = doc.evaluate(
          xpath,
          context,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null,
        );

        for (let i = 0; i < result.snapshotLength; i += 1) {
          const labelElement = result.snapshotItem(i) as HTMLLabelElement;

          const forId = labelElement.getAttribute("for");
          if (forId) {
            const el = doc.getElementById(forId);
            if (
              el &&
              (el.tagName === "INPUT" ||
                el.tagName === "SELECT" ||
                el.tagName === "TEXTAREA")
            )
              return el;
          }

          const nestedInput = labelElement.querySelector(validTags);
          if (nestedInput) return nestedInput as HTMLElement;
        }
      }
    }

    if (target.cssFallback && target.cssFallback.length > 0) {
      for (const selector of target.cssFallback) {
        const el = context.querySelector(selector);
        if (el) return el as HTMLElement;
      }
    }

    return null;
  },
};
