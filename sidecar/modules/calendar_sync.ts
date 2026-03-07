
import { StateManager } from './state_manager';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: number;
  endTime: number;
  location?: string;
  attendees?: string[];
  isRecurring: boolean;
  recurrenceRule?: string;
  reminders: number[]; // minutes before
  color: string;
  calendarId: string;
}

export interface Meeting {
  id: string;
  title: string;
  platform: 'google_meet' | 'zoom' | 'teams' | 'other';
  url?: string;
  startTime: number;
  endTime: number;
  attendees: string[];
  isRecurring: boolean;
}

export class CalendarSync {
  private stateManager: StateManager;
  private connected: boolean = false;
  private provider: 'google' | 'outlook' | null = null;
  private events: CalendarEvent[] = [];
  private meetings: Meeting[] = [];

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  async connect(provider: 'google' | 'outlook', credentials: any): Promise<{ success: boolean; error?: string }> {
    this.connected = true;
    this.provider = provider;
    this.stateManager.addAuditEntry(`Calendar connected to ${provider}`, 'calendar_sync');
    return { success: true };
  }

  async fetchEvents(startDate: number, endDate: number): Promise<CalendarEvent[]> {
    if (!this.connected) throw new Error('Calendar not connected');
    return this.events.filter(e => e.startTime >= startDate && e.startTime <= endDate);
  }

  async getTodayEvents(): Promise<CalendarEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.fetchEvents(today.getTime(), tomorrow.getTime());
  }

  async getUpcomingMeetings(minutes: number = 30): Promise<Meeting[]> {
    const now = Date.now();
    const cutoff = now + (minutes * 60 * 1000);
    return this.meetings.filter(m => m.startTime > now && m.startTime <= cutoff);
  }

  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<{ success: boolean; eventId?: string; error?: string }> {
    if (!this.connected) return { success: false, error: 'Calendar not connected' };
    
    const id = `evt_${Date.now()}`;
    this.events.push({ ...event, id });
    this.stateManager.addAuditEntry(`Event created: ${event.title}`, 'calendar_sync');
    return { success: true, eventId: id };
  }

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<{ success: boolean; error?: string }> {
    if (!this.connected) return { success: false, error: 'Calendar not connected' };
    
    const idx = this.events.findIndex(e => e.id === eventId);
    if (idx === -1) return { success: false, error: 'Event not found' };
    
    this.events[idx] = { ...this.events[idx], ...updates };
    this.stateManager.addAuditEntry(`Event updated: ${this.events[idx].title}`, 'calendar_sync');
    return { success: true };
  }

  async deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.connected) return { success: false, error: 'Calendar not connected' };
    
    const idx = this.events.findIndex(e => e.id === eventId);
    if (idx === -1) return { success: false, error: 'Event not found' };
    
    const title = this.events[idx].title;
    this.events.splice(idx, 1);
    this.stateManager.addAuditEntry(`Event deleted: ${title}`, 'calendar_sync');
    return { success: true };
  }

  async addMeeting(meeting: Omit<Meeting, 'id'>): Promise<string> {
    const id = `mtg_${Date.now()}`;
    this.meetings.push({ ...meeting, id });
    return id;
  }

  async findFreeSlots(durationMinutes: number, date: Date, startHour: number = 9, endHour: number = 18): Promise<{ start: number; end: number }[]> {
    const slots: { start: number; end: number }[] = [];
    const dayStart = new Date(date);
    dayStart.setHours(startHour, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(endHour, 0, 0, 0);
    
    const dayEvents = this.events.filter(e => 
      new Date(e.startTime).toDateString() === date.toDateString()
    ).sort((a, b) => a.startTime - b.startTime);
    
    let currentTime = dayStart.getTime();
    
    for (const event of dayEvents) {
      if (currentTime + durationMinutes * 60000 <= event.startTime) {
        slots.push({ start: currentTime, end: event.startTime });
      }
      currentTime = Math.max(currentTime, event.endTime);
    }
    
    if (currentTime + durationMinutes * 60000 <= dayEnd.getTime()) {
      slots.push({ start: currentTime, end: dayEnd.getTime() });
    }
    
    return slots;
  }

  async getDailyBriefing(): Promise<string> {
    const events = await this.getTodayEvents();
    const upcoming = await this.getUpcomingMeetings(60);
    
    let briefing = `**Today's Schedule (${events.length} events)**\n\n`;
    
    if (events.length === 0) {
      briefing += 'No events scheduled for today.\n';
    } else {
      events.forEach(e => {
        const time = new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        briefing += `- ${time}: ${e.title}${e.location ? ` @ ${e.location}` : ''}\n`;
      });
    }
    
    if (upcoming.length > 0) {
      briefing += `\n**Upcoming Meetings:**\n`;
      upcoming.forEach(m => {
        const mins = Math.round((m.startTime - Date.now()) / 60000);
        briefing += `- ${m.title} in ${mins} minutes\n`;
      });
    }
    
    return briefing;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
