interface CalendarCaseInfo {
  caseNumber: string;
  court: string;
}

interface CalendarExportEvent {
  id: string;
  date?: string;
  time?: string;
  name?: string;
  location?: string;
  recurrence?: {
    frequency?: 'daily' | 'weekly' | 'monthly';
    until?: string;
  };
  caseNumber?: string;
  court?: string;
  [key: string]: any;
}

export function expandCalendarEvents(
  events: CalendarExportEvent[],
  caseInfo?: CalendarCaseInfo
) {
  return events.flatMap((event) => {
    if (!event.date) return [];

    const baseEvent = { ...event, ...caseInfo };
    const occurrences = [];
    const startDateParts = baseEvent.date.split('.');

    if (startDateParts.length !== 3) return [];

    const startDate = new Date(`${startDateParts[2]}-${startDateParts[1]}-${startDateParts[0]}`);
    if (isNaN(startDate.getTime())) return [];

    occurrences.push({
      ...baseEvent,
      date: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`,
    });

    if (baseEvent.recurrence && baseEvent.recurrence.until) {
      const endDate = new Date(baseEvent.recurrence.until);
      const currentDate = new Date(startDate);

      while (true) {
        if (baseEvent.recurrence.frequency === 'daily') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (baseEvent.recurrence.frequency === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (baseEvent.recurrence.frequency === 'monthly') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        } else {
          break;
        }

        if (currentDate > endDate) break;

        occurrences.push({
          ...baseEvent,
          date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`,
          isOccurrence: true,
        });
      }
    }

    return occurrences;
  });
}

export function getStartOfWeek(date: Date) {
  const normalizedDate = new Date(date);
  const day = normalizedDate.getDay();
  const diff = normalizedDate.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(normalizedDate.setDate(diff));
}

function toIcsUtcString(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function generateCalendarIcsContent(eventsToExport: CalendarExportEvent[], userName: string) {
  let icsString = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sud.app//Calendar Export//RU
CALSCALE:GREGORIAN
NAME:Календарь дел (${userName})
X-WR-CALNAME:Календарь дел (${userName})
DESCRIPTION:События по судебным делам из Sud.app
`;

  for (const event of eventsToExport) {
    if (!event.date) continue;

    const eventDate = new Date(event.date);
    if (isNaN(eventDate.getTime())) continue;

    const time = event.time || '09:00';
    const [hours, minutes] = time.split(':');

    const startDateTimeUTC = new Date(Date.UTC(
      eventDate.getUTCFullYear(),
      eventDate.getUTCMonth(),
      eventDate.getUTCDate(),
      Number(hours),
      Number(minutes)
    ));

    const endDateTimeUTC = new Date(startDateTimeUTC.getTime() + (60 * 60 * 1000));

    const uid = `${event.id}-${event.date}@sud.app`;
    const created = new Date().toISOString().replace(/[-:.]/g, '') + 'Z';
    const summary = `${event.name}: ${event.caseNumber || 'Личное'}`;
    const description = `Дело: ${event.caseNumber || 'Личное событие'}\\nСуд: ${event.court || ''}\\nСобытие: ${event.name}${event.time ? `\\nВремя: ${event.time}` : ''}`;
    const location = event.location || event.court || '';

    icsString += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${created}
DTSTART:${toIcsUtcString(startDateTimeUTC)}
DTEND:${toIcsUtcString(endDateTimeUTC)}
SUMMARY:${summary}
DESCRIPTION:${description}
LOCATION:${location}
END:VEVENT
`;
  }

  icsString += 'END:VCALENDAR';
  return icsString;
}
