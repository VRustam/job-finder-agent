'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/app/components/DashboardShell';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, 
  Trash2, Link as LinkIcon, Clock, AlertCircle, X, Loader2, MapPin
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  event_type: 'interview' | 'mock_practice' | 'deadline' | 'other';
  application_id: string | null;
  applications?: {
    company_name: string;
    job_title: string;
  } | null;
}

interface JobApplication {
  id: string;
  company_name: string;
  job_title: string;
}

const EVENT_TYPE_COLORS: Record<CalendarEvent['event_type'], { dot: string; bg: string; text: string; border: string }> = {
  interview: {
    dot: 'bg-red-500',
    bg: 'bg-red-500/5',
    text: 'text-red-650 dark:text-red-400',
    border: 'border-red-500/20'
  },
  mock_practice: {
    dot: 'bg-purple-500',
    bg: 'bg-purple-500/5',
    text: 'text-purple-650 dark:text-purple-400',
    border: 'border-purple-500/20'
  },
  deadline: {
    dot: 'bg-green-500',
    bg: 'bg-green-500/5',
    text: 'text-green-650 dark:text-green-400',
    border: 'border-green-500/20'
  },
  other: {
    dot: 'bg-neutral-500',
    bg: 'bg-neutral-500/5',
    text: 'text-neutral-600 dark:text-neutral-400',
    border: 'border-neutral-500/20'
  }
};

export default function CalendarPage() {
  const router = useRouter();
  const supabase = createClient();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState('');

  // Event form states
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<CalendarEvent['event_type']>('interview');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [linkedAppId, setLinkedAppId] = useState('');

  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/sign-in');
        return;
      }
      setUserEmail(user.email || '');

      // Load calendar events with application info
      const { data: eventsData } = await supabase
        .from('calendar_events')
        .select('*, applications:application_id (company_name, job_title)')
        .order('start_time', { ascending: true });

      if (eventsData) {
        setEvents(eventsData as CalendarEvent[]);
      }

      // Load active applications for selection
      const { data: appsData } = await supabase
        .from('applications')
        .select('id, company_name, job_title')
        .order('updated_at', { ascending: false });

      if (appsData) {
        setApplications(appsData as JobApplication[]);
      }

      setLoading(false);
    }
    loadData();
  }, [supabase, router]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev.getFullYear(), prev.getMonth() + (direction === 'next' ? 1 : -1), 1);
      return newDate;
    });
  };

  const handleOpenAddModal = (day: number) => {
    setSelectedEvent(null);
    setError(null);

    // Format current date + clicked day
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    
    setSelectedDateStr(dateStr);
    
    // Default start/end times
    setEventTitle('');
    setEventType('interview');
    setEventStartTime(`${dateStr}T10:00`);
    setEventEndTime(`${dateStr}T11:00`);
    setEventDescription('');
    setLinkedAppId('');
    
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setError(null);

    // Convert stored dates to datetime-local input format
    const formatToInput = (isoStr: string) => {
      const d = new Date(isoStr);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day}T${h}:${min}`;
    };

    setEventTitle(event.title);
    setEventType(event.event_type);
    setEventStartTime(formatToInput(event.start_time));
    setEventEndTime(formatToInput(event.end_time));
    setEventDescription(event.description || '');
    setLinkedAppId(event.application_id || '');

    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventStartTime || !eventEndTime) {
      setError('Title and start/end times are required.');
      return;
    }

    setSavingEvent(true);
    setError(null);

    const eventPayload = {
      title: eventTitle.trim(),
      event_type: eventType,
      start_time: new Date(eventStartTime).toISOString(),
      end_time: new Date(eventEndTime).toISOString(),
      description: eventDescription.trim() || null,
      application_id: linkedAppId || null
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (selectedEvent) {
        // Edit existing
        const { error: dbError } = await supabase
          .from('calendar_events')
          .update({
            ...eventPayload,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedEvent.id);

        if (dbError) throw dbError;

        // Update local state
        setEvents(prev =>
          prev.map(item => (item.id === selectedEvent.id ? { 
            ...item, 
            ...eventPayload,
            applications: applications.find(a => a.id === linkedAppId) 
              ? { 
                  company_name: applications.find(a => a.id === linkedAppId)!.company_name,
                  job_title: applications.find(a => a.id === linkedAppId)!.job_title
                }
              : null
          } : item))
        );
      } else {
        // Create new
        const { data, error: dbError } = await supabase
          .from('calendar_events')
          .insert({
            ...eventPayload,
            user_id: user.id
          })
          .select('*, applications:application_id (company_name, job_title)')
          .single();

        if (dbError) throw dbError;

        if (data) {
          setEvents(prev => [...prev, data as CalendarEvent]);
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to save event.');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (!confirm('Are you sure you want to delete this event?')) return;

    setDeletingEvent(true);
    setError(null);

    try {
      const { error: dbError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', selectedEvent.id);

      if (dbError) throw dbError;

      setEvents(prev => prev.filter(item => item.id !== selectedEvent.id));
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete event.');
    } finally {
      setDeletingEvent(false);
    }
  };

  // --- CALENDAR GRID CALCULATIONS ---
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const days: { day: number; isCurrentMonth: boolean; date: Date }[] = [];
    
    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, d);
      days.push({ day: d, isCurrentMonth: false, date: prevDate });
    }
    
    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const currDate = new Date(year, month, d);
      days.push({ day: d, isCurrentMonth: true, date: currDate });
    }
    
    // Trailing days from next month to complete the row
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, d);
      days.push({ day: d, isCurrentMonth: false, date: nextDate });
    }
    
    return days;
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(e => {
      const eventStart = new Date(e.start_time);
      return (
        eventStart.getFullYear() === date.getFullYear() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getDate() === date.getDate()
      );
    });
  };

  const daysGrid = getDaysInMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filter upcoming agenda events (today and future)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingEvents = events.filter(e => new Date(e.start_time) >= todayStart);

  return (
    <DashboardShell userEmail={userEmail}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Calendar Scheduler</h2>
          <p className="text-sm text-neutral-500 mt-1">Coordinate interview availabilities and mock interview practices.</p>
        </div>
        <button
          onClick={() => handleOpenAddModal(new Date().getDate())}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 font-bold rounded-lg hover:bg-neutral-850 dark:hover:bg-neutral-200 active:scale-[0.98] transition-all text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Grid: Calendar Grid */}
          <div className="lg:col-span-3 space-y-4">
            {/* Calendar Controls */}
            <div className="flex justify-between items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl shadow-xs">
              <h3 className="font-bold text-sm text-neutral-850 dark:text-neutral-200">
                {monthName}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-805 rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                </button>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-805 rounded-lg transition"
                >
                  <ChevronRight className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
              {/* Day header row */}
              <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/20 text-center py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Days cells */}
              <div className="grid grid-cols-7 grid-rows-5 divide-x divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-l border-neutral-200 dark:border-neutral-800">
                {daysGrid.map((cell, idx) => {
                  const dayEvents = getEventsForDay(cell.date);
                  const isToday = 
                    new Date().getDate() === cell.date.getDate() &&
                    new Date().getMonth() === cell.date.getMonth() &&
                    new Date().getFullYear() === cell.date.getFullYear();

                  return (
                    <div
                      key={idx}
                      onClick={() => handleOpenAddModal(cell.day)}
                      className={`min-h-[100px] p-2 hover:bg-neutral-50/40 dark:hover:bg-neutral-950/10 cursor-pointer flex flex-col justify-between transition-colors ${
                        cell.isCurrentMonth ? '' : 'bg-neutral-50/30 dark:bg-neutral-950/5 text-neutral-400'
                      }`}
                    >
                      {/* Day number */}
                      <span className={`text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900' : 'text-neutral-700 dark:text-neutral-300'
                      }`}>
                        {cell.day}
                      </span>

                      {/* Day Events list */}
                      <div className="mt-2 space-y-1 overflow-hidden">
                        {dayEvents.map(e => {
                          const config = EVENT_TYPE_COLORS[e.event_type];

                          return (
                            <div
                              key={e.id}
                              onClick={(event) => handleOpenEditModal(e, event)}
                              className={`px-1.5 py-0.5 border rounded-md text-[9px] font-bold truncate flex items-center gap-1 transition ${config.bg} ${config.text} ${config.border} hover:scale-[1.02]`}
                              title={e.title}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
                              <span className="truncate">{e.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel: Agenda Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
              Upcoming Agenda
            </h3>

            <div className="space-y-4">
              {upcomingEvents.map(e => {
                const config = EVENT_TYPE_COLORS[e.event_type];
                const eventTime = new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const eventDate = new Date(e.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' });

                return (
                  <div
                    key={e.id}
                    onClick={(event) => handleOpenEditModal(e, event)}
                    className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:border-neutral-350 dark:hover:border-neutral-700 transition shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-3">
                        <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-md ${config.bg} ${config.text}`}>
                          {e.event_type}
                        </span>
                        <span className="text-[9px] font-bold text-neutral-400 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {eventDate} @ {eventTime}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-neutral-900 dark:text-white mt-2 leading-snug">
                        {e.title}
                      </h4>
                      {e.description && (
                        <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                          {e.description}
                        </p>
                      )}
                    </div>

                    {e.applications && (
                      <div className="mt-3.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-1.5 text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>{e.applications.company_name} • {e.applications.job_title}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {upcomingEvents.length === 0 && (
                <div className="p-8 text-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/20 text-xs text-neutral-400">
                  No upcoming events scheduled
                </div>
              )}
            </div>
          </div>
          
        </div>
      )}

      {/* Interactive Add/Edit Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-full max-w-md rounded-2xl shadow-xl flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200 dark:border-neutral-850">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-neutral-500" />
                {selectedEvent ? 'Edit Event Details' : 'Schedule Event'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              {error && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg text-xs text-red-650 dark:text-red-400 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Event Title */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Google Interview Prep / Technical Panel"
                  className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                />
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none"
                >
                  <option value="interview">Interview Invitation</option>
                  <option value="mock_practice">Mock Practice Session</option>
                  <option value="deadline">Application/Task Deadline</option>
                  <option value="other">Other Event</option>
                </select>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Link to Job Application */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                  Link Job Application (Optional)
                </label>
                <select
                  value={linkedAppId}
                  onChange={(e) => setLinkedAppId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none"
                >
                  <option value="">-- Select Active Job Tracker --</option>
                  {applications.map(app => (
                    <option key={app.id} value={app.id}>
                      {app.company_name} • {app.job_title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                  Description / Event Notes
                </label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Meeting URLs, panel details, prep files link..."
                  rows={3}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-850">
                {selectedEvent ? (
                  <button
                    type="button"
                    onClick={handleDeleteEvent}
                    disabled={deletingEvent}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:text-red-705 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-805 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEvent}
                    className="px-4 py-2 text-xs font-bold bg-neutral-900 dark:bg-neutral-50 hover:bg-neutral-850 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl active:scale-[0.98] disabled:opacity-50 transition"
                  >
                    {savingEvent ? 'Saving...' : 'Save Event'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
