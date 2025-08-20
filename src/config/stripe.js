import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required in environment variables');
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe pricing configuration
export const STRIPE_PLANS = {
  starter: {
    name: 'Starter Plan',
    price: 9900, // $99.00 in cents
    interval: 'month',
    features: [
      'Up to 50 Properties',
      'Full CRM Access',
      'Basic Support'
    ]
  },
  pro: {
    name: 'Pro Plan',
    price: 19900, // $199.00 in cents
    interval: 'month',
    features: [
      'Up to 150 Properties',
      'Priority Support',
      'Advanced Reporting'
    ]
  },
  enterprise: {
    name: 'Enterprise Plan',
    price: 0, // Custom pricing
    interval: 'month',
    features: [
      'Unlimited Properties',
      'Custom Features',
      'Dedicated Account Manager'
    ]
  }
};

export { stripe };
export default stripe;