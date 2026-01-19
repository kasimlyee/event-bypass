export type InterceptedEventType = 'contextmenu' | 'selectstart' | 'mousedowm'|'mouseup' | 'copy' | 'cut'| 'keydown';

export interface HostileCSS{
    userSelect: string;
    webkitUserSelect: string;
    mozUserSelect: string;
    msUserSelect: string;
    pointerEvents: string;
}

export interface EventInterceptorConfig{
    readonly captureEvents: readonly InterceptedEventType[];
    readonly useStopImmediate: boolean;
    readonly maxDepth: number;
}

export interface CSSRestoreConfig{
    readonly applyGlobally: boolean;
    readonly priority: 'normal' | 'important';
    readonly observeMutations: boolean;
}

export interface MutationGuardConfig{
    readonly attributes: boolean;
    readonly childList: boolean;
    readonly subtree: boolean;
    readonly debounceMs: number;
}

export interface RestorationResult{
    readonly success: boolean;
    readonly elementsAffected: number;
    readonly techniquesApplied: readonly string[];
    readonly errors: readonly string[];
}

export interface ShadowDOMResult{
    readonly processed: number;
    readonly failed: number;
    readonly depth: number;
}

export interface PerformanceMetrics{
    readonly initTime: number;
    readonly eventInterceptions: number;
    readonly cssOverrides: number;
    readonly mutationsHandled: number;
    readonly shadowRootsProcessed:number;
}

export interface ElementWithShadow extends Element{
    shadowRoot: ShadowRoot | null;
}

export function hasShadowRoot(element: Element): element is ElementWithShadow{
    return 'shadowRoot' in element && element.shadowRoot !== null;
}

export function isHTMLElement(node: Node): node is HTMLElement{
    return node.nodeType === Node.ELEMENT_NODE;
}

export type BrowserAPI = typeof chrome | typeof browser;

export type BrowserName = 'chrome' | 'firefox' | 'unknown';