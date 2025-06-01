import { log } from './logging';

interface GoatCounterEvent {
    /** e.g. `Searched: 'football clubbing'` or `Copied: '/episode/354?q=corridor&start=1693780'` */
    eventName: string;
    eventType: 'Search Performed' | 'Share Link Copied';
}

/**
 * Instead of tracking page views, we only care about a few events.
 * We do this using goatcounter, initialized in index.html.
 * 
 * DOCS: https://www.goatcounter.com/help/events
 */
export const trackEvent = ({ eventName, eventType }: GoatCounterEvent) => {
    const goatcounter = (window as any).goatcounter;
    if (!goatcounter?.count) {
        log.debug(`
    Cannot find goatcounter script. Is it missing from index.html? 
    Would have sent event: ${eventName} with type: ${eventType}`);
        return;
    }

    // DOCS: https://www.goatcounter.com/help/events
    goatcounter.count({
        path: eventName,
        title: eventType,
        event: true,
    });
}