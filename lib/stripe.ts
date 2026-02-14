
import Stripe from 'stripe';

// Use a dummy key for build/development if env var is missing to prevent crashes.
// In production, this should throw or be handled by environment validation.
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build';

export const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-02-24.acacia' as any,
    typescript: true,
});
