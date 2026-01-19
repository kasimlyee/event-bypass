import type { ElementWithShadow, ShadowDOMResult } from "../types";
import { hasShadowRoot, isHTMLElement } from "../types";
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
        }
    }
}