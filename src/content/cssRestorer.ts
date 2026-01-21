/**
 * We Inject CSS rules that ovverride styles preventing user interaction.
 * By this CSS specificity + !important allows us to ovverride site styles
 * We inject at document_start. before most site styles load
 * 
 */

import type { CSSRestoreConfig } from "../types";
import { debugLog, errorLog } from "../utils/browser";
import { isElementConnected } from "../utils/dom";

const DEFAULT_CONFIG: CSSRestoreConfig = {
    applyGlobally: true,
    priority: 'important',
    observeMutations: true
} as const

const RESTORABLE_PROPERTIES = [
    'user-select',
    '-webkit-user-select',
    '-moz-user-select',
    '-ms-user-select',
    '-khtml-user-select',
    'pointer-events'
] as const

export class CSSRestorer{
    private readonly config: CSSRestoreConfig;
    private styleElement: HTMLStyleElement | null =null
    private overrideCount = 0;

    constructor(config: Partial<CSSRestoreConfig> = {}){
        this.config = {...DEFAULT_CONFIG, ...config};
    }

    public initialize():void{
        if(this.config.applyGlobally){
            this.injectGlobalStyles();
        }
        debugLog('CSSRestorer initialized')
    }

    private injectGlobalStyles(): void{
        try{
            this.styleElement = document.createElement('style');
            //Will start with this shit rule, right click stuff
            this.styleElement.id = 'unblockright-css-restorer';

            const priority = this.config.priority === 'important' ? ' !important': '';

             const css = `
                /* Restore text selection on all elements */
                * {
                user-select: text${priority};
                -webkit-user-select: text${priority};
                -moz-user-select: text${priority};
                -ms-user-select: text${priority};
                }
                
                /* Ensure pointer events work */
                * {
                pointer-events: auto${priority};
                }
                
                /* High specificity overrides for stubborn sites */
                html *, body *, div *, span *, p *, a *, img * {
                user-select: text${priority};
                -webkit-user-select: text${priority};
                -moz-user-select: text${priority};
                -ms-user-select: text${priority};
                }
                
                /* Preserve intentional non-selectable UI elements */
                button, input, select, textarea {
                user-select: text${priority};
                }
            `.trim();

            this.styleElement.textContent = css;

            this.injectStyleElement(this.styleElement);

            this.overrideCount++;
            debugLog('Global CSS styles injected');
        } catch(err){
            errorLog('Failed to inject global styles', err)
        }
    }

    private injectStyleElement(styleEl: HTMLStyleElement){
        //we first inject into the head
        if(document.head){
            document.head.appendChild(styleEl);
            debugLog('Styles injected into <head>');
            return;
        }

        //We then tey to inject into documentElement
        if(document.documentElement){
            document.documentElement.appendChild(styleEl);
            debugLog('Styles injected into <html>');
            return;
        }

        // We then wait for DOM when  ready and retry
        const injectWhenReady = (): void =>{
            if(document.head){
                document.head.appendChild(styleEl);
                debugLog('Styles injected into <head> (delayed)');
            }else if(document.documentElement){
                document.documentElement.appendChild(styleEl);
                debugLog('Styles injected into <html> (delayed)');
            }
        };

        if(document.readyState === 'loading'){
            document.addEventListener("DOMContentLoaded", injectWhenReady, {once: true})
        }else{
            injectWhenReady();
        }
        
    }

    public restoreElement(element:Element): void{
        if(!isElementConnected(element)) return;
        if(!(element instanceof HTMLElement)) return;

        try{
            const style = element.style;
            const priority = this.config.priority === 'important' ? 'important': '';

            for(const prop of RESTORABLE_PROPERTIES){

                const currentValue = style.getPropertyValue(prop);
                if(this.isBlockedValue(currentValue)){
                    if(prop.includes('user-select')){
                        style.setProperty(prop, 'text', priority);
                    }else if(prop === 'pointer-events'){
                        style.setProperty(prop, 'auto', priority);
                    }

                    this.overrideCount++;
                }
            }
        }catch(err){
                errorLog('Failed to restore element', err)
            }
    }

    public restoreElements(elements: Element[]): void{
        const batchSie = 100;
        let processed = 0;

        const processBatch = (): void => {
            const batch = elements.slice(processed, processed + batchSie);

            for(const element of batch){
                this.restoreElement(element);
            }

            processed += batch.length;

            if(processed < elements.length){
                requestIdleCallback(() => processBatch(), {timeout: 100});
            }
        };

        if(elements.length > 0){
            processBatch();
        }
            
    }

    private isBlockedValue(value: string):boolean{
        const blocked = ['none','auto'];
        return blocked.includes(value.toLowerCase().trim());
    }

    public injectIntoShadowRoot(shadowRoot: ShadowRoot): void {
        try {
            const styleEl = document.createElement('style');
            styleEl.id = 'unblockright-shadow-css';
            
            const priority = this.config.priority === 'important' ? ' !important' : '';
            
            const css = `
                * {
                user-select: text${priority};
                -webkit-user-select: text${priority};
                -moz-user-select: text${priority};
                -ms-user-select: text${priority};
                pointer-events: auto${priority};
                }
            `.trim();

            styleEl.textContent = css;
            shadowRoot.appendChild(styleEl);
            
            this.overrideCount++;
            debugLog('CSS injected into shadow root');
            
        } catch (error) {
            errorLog('Failed to inject into shadow root', error);
        }
  }

  public cleanup(): void {
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
      this.styleElement = null;
      debugLog('CSS restorer cleaned up');
    }
  }
    public getStats(): { overrideCount: number; globalStyleActive: boolean } {
        return {
        overrideCount: this.overrideCount,
        globalStyleActive: this.styleElement !== null && isElementConnected(this.styleElement)
        };
    }
}

export function createCSSRestorer(config?: Partial<CSSRestoreConfig>): CSSRestorer{
    const restorer = new CSSRestorer(config);
    restorer.initialize();
    return restorer;
}