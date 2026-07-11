import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the start of today in UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const startOfTodayIso = today.toISOString();

    const { data: jobs, error } = await supabase
      .from('synced_jobs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startOfTodayIso)
      .order('match_score', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      jobs: jobs || []
    });
  } catch (err) {
    console.error('Daily digest API error:', err);
    return NextResponse.json({ error: (err as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}
