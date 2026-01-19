import type { BrowserAPI, BrowserName } from "../types";

export function getBrowserAPI(): BrowserAPI{
    if(typeof browser !== 'undefined'){
        return browser as unknown as BrowserAPI;
    }

    if(typeof chrome !== 'undefined'){
        return chrome as unknown as BrowserAPI;
    }

    return {} as BrowserAPI;
}

export function isChrome(): boolean{
    return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined' && !isFirefox();
}

export function isFirefox(): boolean{
    return typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined' && typeof browser.runtime.getBrowserInfo === 'function';
}

export function getBrowserName(): BrowserName{
   if(isFirefox()) return 'firefox';
   if(isChrome()) return 'chrome';
   return 'unknown';
}

export function isContentScriptContext(): boolean{
    try{
        const api = getBrowserAPI();
        return typeof api.runtime !== 'undefined' && typeof api.runtime.id !== 'undefined';
    }catch{
        return false;
    }
}

export function debugLog(message: string, data?: unknown): void{
    if(process.env.DEBUG){
        console.log(`[EVENT-BYPASS]     [DEBUG]     ${message}`, data ?? '');
    }
}

export function errorLog(message: string, error: unknown): void{
    console.error(`[EVENT-BYPASS]     [ERROR]     ${message}`, error);
}