import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If the request doesn't contain a valid session cookie, return unauthorized
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to Job Finder Agent first.' },
        { status: 401 }
      );
    }

    const { companyName, jobTitle, jobLink, notes, status } = await request.json();

    if (!companyName || !jobTitle) {
      return NextResponse.json(
        { error: 'Missing company name or job title' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        company_name: companyName,
        job_title: jobTitle,
        status: status || 'applied',
        job_link: jobLink || '',
        notes: notes || '',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, application: data });

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to sync application from extension' },
      { status: 500 }
    );
  }
}
