import { log } from './logging';

interface GoatCounterEvent {
    eventName: 'search-performed' | 'copy-share-link-clicked';
    /** e.g. `Query: 'corridor'` or `Copied Link: /episode/354?q=corridor&start=1693780` */
    eventData: string;
}

/**
 * Instead of tracking page views, we only care about a few events.
 * We do this using goatcounter, initialized in index.html.
 * 
 * DOCS: https://www.goatcounter.com/help/events
 */
export const trackEvent = ({ eventName, eventData }: GoatCounterEvent) => {
    const goatcounter = (window as any).goatcounter;
    if (!goatcounter?.count) {
        log.debug(`
    Cannot find goatcounter script. Is it missing from index.html? 
    Would have sent event: ${eventName} with data: ${eventData}`);
        return;
    }

    // DOCS: https://www.goatcounter.com/help/events
    goatcounter.count({
        path: eventName,
        title: eventData,
        event: true,
    });
}