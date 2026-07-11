import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const userId = formData.get('user_id') as string;

    if (!userId) {
      return new Response('Missing user_id', { status: 400 });
    }

    const supabase = await createClient();

    // Check if current authenticated user matches the userId to prevent spoofing
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return new Response('Unauthorized spoofing check failed', { status: 403 });
    }

    // Update profiles table setting is_premium to true
    const { error } = await supabase
      .from('profiles')
      .update({
        is_premium: true,
        stripe_customer_id: 'cus_mock_' + Math.random().toString(36).substring(7),
        stripe_subscription_id: 'sub_mock_' + Math.random().toString(36).substring(7),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    // Redirect to dashboard with premium checkout status success
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    return NextResponse.redirect(`${origin}/dashboard?premium_status=activated`, { status: 303 });
  } catch (err) {
    console.error('Simulated checkout complete error:', err);
    return new Response('Update failed: ' + (err as Error).message, { status: 500 });
  }
}
