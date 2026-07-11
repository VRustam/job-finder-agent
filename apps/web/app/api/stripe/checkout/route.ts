import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId } = await request.json(); // optional

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    if (!stripeSecret) {
      // If Stripe keys are not configured, simulate checkout locally
      console.log('[Stripe API] Stripe secret key is missing. Simulating checkout...');
      
      // Return a local mock portal link that allows the user to trigger premium state activation
      const mockCheckoutUrl = `${origin}/api/stripe/checkout/simulate?user_id=${user.id}`;
      return NextResponse.json({ url: mockCheckoutUrl });
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2025-01-27.acacia' as any, // fallback standard api version
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId || process.env.STRIPE_PRICE_ID || 'price_1Q5X...', // dummy or env
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/dashboard?checkout_status=success`,
      cancel_url: `${origin}/dashboard?checkout_status=cancel`,
      metadata: {
        user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
