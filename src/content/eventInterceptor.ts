/**
 * We intercept event listeners in the capture phase before they are executed:
 * The Idea is:
 * - Events flow through three phases, capture -> target -> bubble
 * so by listening in capture phase, we execute BEFORE site's handlers
 * see, stopImmediatePropagation() prevents subsequent handlers (guess even capture phase)
 * So we must register before site scripts. 
 * 
 */

import type { InterceptedEventType, EventInterceptorConfig } from "../types";
import { debugLog, errorLog } from "../utils/browser";

const DEFAULT_CONFIG: EventInterceptorConfig = {
    captureEvents:[
        'contextmenu',
        'selectstart',
        'mousedowm',
        'mouseup',
        'copy',
        'cut',
        'keydown'
    ],
    useStopImmediate: true,
    maxDepth:10
} as const;


export class EventInterceptor{
    private readonly config: EventInterceptorConfig;
    private readonly activeListeners = new Map<InterceptedEventType, EventListener>()
    private interceptionCount = 0;

    constructor(config: Partial<EventInterceptorConfig> = {}){
        this.config = {...DEFAULT_CONFIG, ...config};
    }

    public initialize(target: EventTarget = document): void{
        for(const eventType of this.config.captureEvents){
            this.interceptEvent(eventType, target);
        }

        debugLog(`EventInterceptor initialized on target with ${this.config.captureEvents.length} events`);
    }

    private interceptEvent(eventType: InterceptedEventType, target:EventTarget): void{
        const handler = this.createInterceptHandler(eventType);

        this.activeListeners.set(eventType, handler);

        try{
            target.addEventListener(eventType, handler, {
                capture: true,
                passive: false
            });
            debugLog(`Intercepting ${eventType} in capture phase`);
        } catch(err){
            errorLog(`Failed to intercept ${eventType}`, err);
        }
    }

    private createInterceptHandler(eventType: InterceptedEventType): EventListener{
        return (event: Event): void => {
            try{
                this.interceptionCount++;

                if(this.config.useStopImmediate){
                    event.stopImmediatePropagation();
                }else{
                    event.stopPropagation();
                }

                if(eventType === 'keydown' && event instanceof KeyboardEvent){
                    //Lets only intercept copy/cut shortcuts, allow everything else
                    const isCopyShortCut = (event.ctrlKey || event.metaKey) && (event.key === 'c' || event.key === 'C');
                    const isCutShortCut = (event.ctrlKey || event.metaKey) && (event.key === 'x' || event.key === 'X');

                    if(!isCopyShortCut && !isCutShortCut){
                        return;
                    }
                }
            }catch(err){
                errorLog(`Error in ${eventType} intercept handler`, err)
            }
        }
    }

    public cleanInlineHandlers(element: Element): void{
        const inlineHandlers = [
        'oncontextmenu',
        'onselectstart',
        'onmousedowm',
        'onmouseup',
        'oncopy',
        'oncut',
        'onkeydown']

        for(const attr of inlineHandlers){
            if(element.hasAttribute(attr)){
                try{
                    element.removeAttribute(attr);
                    debugLog(`Removed inline handler: ${attr}`);
                }catch(err){
                    errorLog(`Failed to remove inline handler: ${attr}`, err);
                }
            }
        }

        if(element instanceof HTMLElement){
            const htmlEl = element;

            const eventProps = [
                'oncontextmenu',
                'onselectstart',
                'onmousedowm',
                'onmouseup',
                'oncopy',
                'oncut',
                'onkeydown'
            ] as const

            for(const prop of eventProps){
                try{
                    if((htmlEl as any)[prop]){
                        (htmlEl as any)[prop] = null;
                    }
                }catch{
                    //what do you think, lets ignore for now
                }
            }
        }
    }

    public cleanup(target: EventTarget = document): void{
        for(const [eventType, handler] of this.activeListeners.entries()){
            try{
                target.removeEventListener(eventType, handler, {capture: true});
            }catch(err){
                errorLog(`Failed to remove listener for ${eventType}`, err);
            }
        }
        this.activeListeners.clear();
        debugLog(`EventInterceptor cleaned up`);
    }

    public getStats(): {interceptionCount: number, activeListeners: number}{
        return{
            interceptionCount: this.interceptionCount,
            activeListeners: this.activeListeners.size
        }
    }

}

export function createEventListener(config?: Partial<EventInterceptorConfig>): EventInterceptor{
    const interceptor = new EventInterceptor(config);
    interceptor.initialize();
    return interceptor;
}