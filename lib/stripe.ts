
import Stripe from 'stripe';

// Use a dummy key for build/development if env var is missing to prevent crashes.
// In production, this should throw or be handled by environment validation.
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build';

// No apiVersion override: let the SDK use its own pinned default, which matches
// the installed stripe@20 types. Pinning a mismatched (older) version made
// Stripe serve the pre-Basil object shape, where current_period_end lived on
// the subscription object instead of items.data[0], breaking the webhook read.
export const stripe = new Stripe(stripeKey, {
    typescript: true,
});
