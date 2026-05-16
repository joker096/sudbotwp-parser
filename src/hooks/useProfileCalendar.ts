import { useState } from 'react';
import { Gavel, Hourglass, Bell, Pencil } from 'lucide-react';

export interface ProfileCalendarEventType {
  id: string;
  label: string;
  color: string;
  icon: typeof Gavel;
}

export interface HoveredEventDetails {
  details: {
    caseNumber: string;
    eventName: string;
    time: string;
  };
  x: number;
  y: number;
}

export interface SelectedEventDetails {
  caseNumber: string;
  court: string;
  eventName: string;
  date: string;
  time: string;
  location: string;
  result: string;
}

export function useProfileCalendar() {
  const eventTypesForFilter: ProfileCalendarEventType[] = [
    { id: 'hearing', label: 'Заседания', color: 'bg-blue-500', icon: Gavel },
    { id: 'deadline', label: 'Сроки', color: 'bg-red-500', icon: Hourglass },
    { id: 'reminder', label: 'Напоминания', color: 'bg-yellow-500', icon: Bell },
    { id: 'custom', label: 'Личные', color: 'bg-purple-500', icon: Pencil },
  ];

  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week'>('month');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventInitialDate, setNewEventInitialDate] = useState('');
  const [newEventInitialTime, setNewEventInitialTime] = useState('');
  const [customEvents, setCustomEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [calendarFilters, setCalendarFilters] = useState<Set<string>>(
    new Set(eventTypesForFilter.map((type) => type.id))
  );
  const [draggedEvent, setDraggedEvent] = useState<{ caseId: string; eventId: string } | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null);
  const [selectedEventDetails, setSelectedEventDetails] = useState<SelectedEventDetails | null>(null);
  const [hoveredEventDetails, setHoveredEventDetails] = useState<HoveredEventDetails | null>(null);

  const openEventModal = (eventToEdit?: any, caseId?: string) => {
    setEditingEvent(eventToEdit ? { ...eventToEdit, caseId } : null);
    setShowAddEventModal(true);
  };

  const prepareNewEvent = (date: string, time = '') => {
    setNewEventInitialDate(date);
    setNewEventInitialTime(time);
    setEditingEvent(null);
    setShowAddEventModal(true);
  };

  const closeEventModal = () => {
    setShowAddEventModal(false);
    setEditingEvent(null);
    setNewEventInitialDate('');
    setNewEventInitialTime('');
  };

  return {
    eventTypesForFilter,
    calendarViewDate,
    setCalendarViewDate,
    calendarViewMode,
    setCalendarViewMode,
    selectedCalendarDate,
    setSelectedCalendarDate,
    editingEvent,
    setEditingEvent,
    showAddEventModal,
    setShowAddEventModal,
    newEventInitialDate,
    setNewEventInitialDate,
    newEventInitialTime,
    setNewEventInitialTime,
    customEvents,
    setCustomEvents,
    isLoadingEvents,
    setIsLoadingEvents,
    calendarFilters,
    setCalendarFilters,
    draggedEvent,
    setDraggedEvent,
    dropTargetDate,
    setDropTargetDate,
    selectedEventDetails,
    setSelectedEventDetails,
    hoveredEventDetails,
    setHoveredEventDetails,
    openEventModal,
    prepareNewEvent,
    closeEventModal,
  };
}
