import { log } from './logging';

/**
 * TODO: Re-enable when traffic comes down a bit.
 * 
 * Currently getting rate limited during initial launch.
 */
const GOATCOUNTER_ENABLED = false;

interface GoatCounterEvent {
    /** e.g. `Searched: 'football clubbing'` or `Share Link Copied` or `Result Clicked` or `Play Button Clicked`  */
    eventName: string;
    eventType: 'Search Performed' | 'Share Link Copied' | 'Result Clicked' | 'Play Button Clicked';
}

/**
 * Instead of tracking page views throughout the SPA (e.g. when navigating between routes), 
 * we only care about a few events.
 * We do this using goatcounter, initialized in index.html.
 * 
 * DOCS: https://www.goatcounter.com/help/events
 */
export const trackEvent = ({ eventName, eventType }: GoatCounterEvent) => {
    if (!GOATCOUNTER_ENABLED) {
        return;
    }

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
