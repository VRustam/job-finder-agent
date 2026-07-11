import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import 'package:mobile/services/notification_service.dart';

class CalendarAgendaScreen extends StatefulWidget {
  const CalendarAgendaScreen({super.key});

  @override
  State<CalendarAgendaScreen> createState() => _CalendarAgendaScreenState();
}

class _CalendarAgendaScreenState extends State<CalendarAgendaScreen> {
  final _supabase = Supabase.instance.client;
  List<Map<String, dynamic>> _events = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    setState(() => _loading = true);
    try {
      final response = await _supabase
          .from('calendar_events')
          .select('*, applications:application_id (company_name, job_title)')
          .order('start_time', ascending: true);

      setState(() {
        _events = List<Map<String, dynamic>>.from(response);
      });
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load events: $err')),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _setEventReminder(Map<String, dynamic> event) async {
    try {
      final String startTimeStr = event['start_time'];
      final DateTime startTime = DateTime.parse(startTimeStr);
      final DateTime notificationTime = startTime.subtract(const Duration(minutes: 15));

      final now = DateTime.now();
      if (notificationTime.isBefore(now)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cannot set reminder. Event is starting within 15 minutes!')),
        );
        return;
      }

      // Schedule notification
      final notificationService = NotificationService();
      await notificationService.requestPermissions();

      if (!mounted) return;

      // Convert event id UUID hash string to integer id
      final int notificationId = event['id'].toString().hashCode;

      await notificationService.scheduleNotification(
        id: notificationId,
        title: 'Upcoming Event: ${event['title']}',
        body: 'Starts in 15 minutes! (${DateFormat('hh:mm a').format(startTime)})',
        scheduledTime: notificationTime,
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Reminder set for 15 minutes before start! (${DateFormat('MMM d, hh:mm a').format(notificationTime)})',
          ),
        ),
      );
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to set reminder: $err')),
      );
    }
  }

  Color _getEventColor(String type) {
    switch (type) {
      case 'interview':
        return Colors.red;
      case 'mock_practice':
        return Colors.purple;
      case 'deadline':
        return Colors.green;
      default:
        return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final upcomingEvents = _events.where((e) {
      final start = DateTime.tryParse(e['start_time']) ?? now;
      return start.isAfter(now.subtract(const Duration(hours: 2)));
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Calendar Agenda'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadEvents,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : upcomingEvents.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.calendar_today_outlined, size: 48, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      const Text(
                        'No upcoming events scheduled',
                        style: TextStyle(color: Colors.grey, fontSize: 14),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: upcomingEvents.length,
                  itemBuilder: (context, index) {
                    final event = upcomingEvents[index];
                    final startTime = DateTime.tryParse(event['start_time']) ?? now;
                    final eventColor = _getEventColor(event['event_type'] ?? 'other');
                    final companyName = event['applications']?['company_name'];
                    final jobTitle = event['applications']?['job_title'];

                    return Card(
                      margin: const EdgeInsets.only(bottom: 16),
                      elevation: 1,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: eventColor.withOpacity(0.2), width: 1),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: eventColor.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    (event['event_type'] ?? 'other').toString().toUpperCase(),
                                    style: TextStyle(
                                      color: eventColor,
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.notifications_active_outlined, size: 20),
                                  color: Colors.purple[650],
                                  tooltip: 'Set 15m Reminder',
                                  onPressed: () => _setEventReminder(event),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              event['title'] ?? '',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.access_time, size: 14, color: Colors.grey),
                                const SizedBox(width: 4),
                                Text(
                                  '${DateFormat('MMM d, y').format(startTime)} @ ${DateFormat('hh:mm a').format(startTime)}',
                                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                                ),
                              ],
                            ),
                            if (companyName != null && jobTitle != null) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.grey.withOpacity(0.05),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.link, size: 14, color: Colors.grey),
                                    const SizedBox(width: 6),
                                    Text(
                                      '$companyName • $jobTitle',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.grey,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            if (event['description'] != null) ...[
                              const SizedBox(height: 12),
                              Text(
                                event['description'],
                                style: const TextStyle(fontSize: 12, height: 1.4),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddEventBottomSheet,
        icon: const Icon(Icons.add),
        label: const Text('Add Event'),
        backgroundColor: Colors.purple,
        foregroundColor: Colors.white,
      ),
    );
  }

  void _showAddEventBottomSheet() {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    String selectedType = 'interview';
    DateTime selectedStart = DateTime.now().add(const Duration(hours: 1));
    DateTime selectedEnd = DateTime.now().add(const Duration(hours: 2));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            top: 24,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Icon(Icons.calendar_today, color: Colors.purple, size: 22),
                  const SizedBox(width: 8),
                  const Text(
                    'Schedule New Event',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.5),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: titleController,
                decoration: InputDecoration(
                  labelText: 'Event Title *',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descController,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'Description (Optional)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: selectedType,
                decoration: InputDecoration(
                  labelText: 'Event Type',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                items: const [
                  DropdownMenuItem(value: 'interview', child: Text('Interview')),
                  DropdownMenuItem(value: 'mock_practice', child: Text('Mock Practice')),
                  DropdownMenuItem(value: 'deadline', child: Text('Deadline')),
                  DropdownMenuItem(value: 'other', child: Text('Other')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setModalState(() => selectedType = val);
                  }
                },
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: selectedStart,
                          firstDate: DateTime.now().subtract(const Duration(days: 365)),
                          lastDate: DateTime.now().add(const Duration(days: 365)),
                        );
                        if (date != null) {
                          final time = await showTimePicker(
                            context: context,
                            initialTime: TimeOfDay.fromDateTime(selectedStart),
                          );
                          if (time != null) {
                            setModalState(() {
                              selectedStart = DateTime(date.year, date.month, date.day, time.hour, time.minute);
                              selectedEnd = selectedStart.add(const Duration(hours: 1));
                            });
                          }
                        }
                      },
                      child: Text('Start: ${DateFormat('MMM d, hh:mm a').format(selectedStart)}'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: selectedEnd,
                          firstDate: DateTime.now().subtract(const Duration(days: 365)),
                          lastDate: DateTime.now().add(const Duration(days: 365)),
                        );
                        if (date != null) {
                          final time = await showTimePicker(
                            context: context,
                            initialTime: TimeOfDay.fromDateTime(selectedEnd),
                          );
                          if (time != null) {
                            setModalState(() {
                              selectedEnd = DateTime(date.year, date.month, date.day, time.hour, time.minute);
                            });
                          }
                        }
                      },
                      child: Text('End: ${DateFormat('MMM d, hh:mm a').format(selectedEnd)}'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () async {
                  final title = titleController.text.trim();
                  if (title.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Title is required')),
                    );
                    return;
                  }

                  try {
                    final user = _supabase.auth.currentUser;
                    if (user == null) throw Exception('User not logged in');

                    await _supabase.from('calendar_events').insert({
                      'user_id': user.id,
                      'title': title,
                      'description': descController.text.trim().isEmpty ? null : descController.text.trim(),
                      'start_time': selectedStart.toIso8601String(),
                      'end_time': selectedEnd.toIso8601String(),
                      'event_type': selectedType,
                    });

                    if (!mounted) return;
                    Navigator.pop(context);
                    _loadEvents();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Event scheduled successfully!')),
                    );
                  } catch (err) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Failed to save event: $err')),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.purple,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Schedule Event'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
