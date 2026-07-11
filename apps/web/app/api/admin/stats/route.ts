import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/supabase/server';

// Use service role to bypass RLS for admin aggregate queries
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function GET(request: Request) {
  try {
    // Verify admin access
    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = getServiceClient();

    // Check admin status
    const { data: profile } = await service
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Aggregate counts in parallel
    const [
      { count: totalUsers },
      { count: premiumUsers },
      { count: adminUsers },
      { count: totalResumes },
      { count: totalApplications },
      { count: totalInterviews },
      { count: totalCoverLetters },
      { count: totalTranslations },
      { count: totalSyncedJobs },
      { count: totalCalendarEvents },
    ] = await Promise.all([
      service.from('profiles').select('*', { count: 'exact', head: true }),
      service.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true),
      service.from('profiles').select('*', { count: 'exact', head: true }).eq('is_admin', true),
      service.from('resumes').select('*', { count: 'exact', head: true }),
      service.from('applications').select('*', { count: 'exact', head: true }),
      service.from('interview_sessions').select('*', { count: 'exact', head: true }),
      service.from('cover_letters').select('*', { count: 'exact', head: true }),
      service.from('translation_logs').select('*', { count: 'exact', head: true }),
      service.from('synced_jobs').select('*', { count: 'exact', head: true }),
      service.from('calendar_events').select('*', { count: 'exact', head: true }),
    ]);

    // New users this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const { count: newUsersThisWeek } = await service
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo.toISOString());

    // New users this month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const { count: newUsersThisMonth } = await service
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneMonthAgo.toISOString());

    // Recent signups (last 10)
    const { data: recentUsers } = await service
      .from('profiles')
      .select('id, full_name, avatar_url, created_at, is_premium, is_admin')
      .order('created_at', { ascending: false })
      .limit(10);

    // Daily signup counts for last 30 days (for chart)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentSignups } = await service
      .from('profiles')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Group signups by day
    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      dailyCounts[d.toISOString().split('T')[0]] = 0;
    }
    recentSignups?.forEach((u) => {
      const day = new Date(u.created_at).toISOString().split('T')[0];
      if (dailyCounts[day] !== undefined) {
        dailyCounts[day]++;
      }
    });
    const signupChart = Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      premiumUsers: premiumUsers || 0,
      adminUsers: adminUsers || 0,
      totalResumes: totalResumes || 0,
      totalApplications: totalApplications || 0,
      totalInterviews: totalInterviews || 0,
      totalCoverLetters: totalCoverLetters || 0,
      totalTranslations: totalTranslations || 0,
      totalSyncedJobs: totalSyncedJobs || 0,
      totalCalendarEvents: totalCalendarEvents || 0,
      newUsersThisWeek: newUsersThisWeek || 0,
      newUsersThisMonth: newUsersThisMonth || 0,
      recentUsers: recentUsers || [],
      signupChart,
    });
  } catch (err) {
    console.error('[Admin Stats]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
