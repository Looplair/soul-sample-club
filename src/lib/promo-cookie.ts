// Cookie names and rules for promo links, shared with the middleware (edge
// runtime, so this file must not import Stripe). See src/lib/promo.ts.
export const PROMO_COOKIE = "ssc_promo";
export const UTM_COOKIE = "ssc_utm";
export const PROMO_MAX_AGE = 60 * 60 * 24 * 30;
export const PROMO_CODE_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;
