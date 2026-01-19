import type {  ShadowDOMResult } from "../types";
import { hasShadowRoot } from "../types";
import { debugLog, errorLog } from "./browser";

type Root = Document | Element | ShadowRoot;

export function querySelectorDeep(
    root: Root,
    selector: string = '*'
): Element[]{
    const results: Element[] = [];
    const queue: Array<Root> = [root];
    const processed = new WeakSet<Omit<Root, 'Document'>>();

    while(queue.length >  0){
        const current = queue.shift();
        if(!current) continue;

        //Like we should avoid processing same node twice
        if(processed.has(current as Omit<Root, 'Document'>)) continue;
        processed.add(current as Omit<Root, 'Document'>);

        try{
            //we query the current context
            const elements = current.querySelectorAll(selector);
            results.push(...Array.from(elements));

            //so lets find these shadow roots in current context
            const allElements = Array.from(current.querySelectorAll("*"));
            for(const el of allElements){
                if(hasShadowRoot(el) && el.shadowRoot !== null){
                    queue.push(el.shadowRoot);
                }
            }
        }catch(err){
            errorLog("Error in querySelectorDeep", err);
        }
    }
    return results
}

export function processShadowRoots(
    callback: (shadowRoot: ShadowRoot) => void,
    root: Root = document
): ShadowDOMResult{
    let processed = 0;
    let failed = 0;
    let maxDepth = 0;

    const process = (node: Root, depth: number): void => {
        maxDepth = Math.max(maxDepth, depth);

        try{
            const elements = Array.from(node.querySelectorAll('*'));

            for(const el of elements){
                if(hasShadowRoot(el) && el.shadowRoot !== null){
                    try{
                        callback(el.shadowRoot);
                        processed++

                        process(el.shadowRoot, depth+1);
                    }catch(err){
                        failed++
                        errorLog("Failed to process shadow root", err)
                    }
                }
            }
        }catch(err){
            errorLog("Error processing shadow roots", err);
        }
    };
    process(root, 0)

    return {processed, failed, depth: maxDepth};
}

export function isElementConnected(element: Element):boolean{
    return element.isConnected;
}

export function getSameOriginIframes(): Document[]{
    const iframes: Document[] = [];

    const processiframe = (frame: HTMLIFrameElement): void => {
        try{
            const doc = frame.contentDocument;

            if(doc){
                iframes.push(doc);
            }

            const nestedFrames = doc?.querySelectorAll('iframe');
            nestedFrames?.forEach(nested =>{
                if(nested instanceof HTMLIFrameElement){
                    processiframe(nested);
                }
            })
        } catch{
            debugLog("Cross-Origin iframe - silently skip. This maybe expected and not an error")
        }
    };

    const allFrames = document.querySelectorAll('iframe');
    allFrames.forEach(frame => {
        if(frame instanceof HTMLIFrameElement){
            processiframe(frame);
        }
    });

    return iframes;
}

export function debounce<T extends (...args: Parameters<T>)  => void>(
    fn: T,
    delayMs: number
): (...args: Parameters<T>) => void{
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return function debounced(...args: Parameters<T>): void {
        if(timeoutId !== null){
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, delayMs);
    }
}


export function throttle<T extends (...args: Parameters<T>)  => void>(
    fn: T,
    limitMs: number
): (...args: Parameters<T>) => void{
    let lastRun = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return function throttled(...args: Parameters<T>): void {
        const now = Date.now();
        const timeSinceLastRun = now - lastRun;

        if(timeSinceLastRun >= limitMs){
            fn(...args);
            lastRun = now;
        }else{
            if(timeoutId !== null){
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
                fn(...args);
                timeoutId = null;
            }, limitMs - timeSinceLastRun);
        }
    }
}

export function batchRead<T>(readFn: () => T): Promise<T>{
    return new Promise(resolve => {
        requestAnimationFrame(() =>{
            resolve(readFn());
        })
    })
}

export function batchWrite(writeFn: () => void): Promise<void>{
    return new Promise(resolve => {
        requestAnimationFrame(() =>{
            writeFn()
            resolve();
        })
    })
}