# Calendar Integration Documentation

## Overview

The RentalEase CRM system now includes comprehensive calendar integration for technicians, allowing them to:
- View their job schedules in mobile calendar apps
- Download calendar files (.ics format)
- Sync work schedules automatically with their mobile devices
- Get specific time slots for each job shift

## Backend API Endpoints

### 1. Get Technician Calendar (JSON Format)

**Endpoint:** `GET /api/v1/calendar/technician/:technicianId`

**Authentication:** SuperUser, Agency, or Technician

**Query Parameters:**
- `startDate` (optional): Start date for calendar range (ISO format)
- `endDate` (optional): End date for calendar range (ISO format)
- `status` (optional): Filter by job status (Pending, Scheduled, Completed, Overdue)
- `format` (optional): Response format ('json' or 'ics')

**Example Request:**
```bash
GET /api/v1/calendar/technician/60f7b3b3b3b3b3b3b3b3b3b3?startDate=2025-08-16&endDate=2025-09-16&format=json
```

**Example Response:**
```json
{
  "status": "success",
  "message": "Calendar events retrieved successfully",
  "data": {
    "technician": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "name": "John Smith"
    },
    "events": [
      {
        "id": "60f7b3b3b3b3b3b3b3b3b3b4",
        "jobId": "J-123456",
        "title": "Gas - 123 Main Street",
        "description": "Annual gas safety inspection",
        "startTime": "2025-08-20T09:00:00.000Z",
        "endTime": "2025-08-20T12:00:00.000Z",
        "allDay": false,
        "jobType": "Gas",
        "priority": "Medium",
        "status": "Scheduled",
        "shift": "morning",
        "estimatedDuration": 2,
        "location": {
          "street": "123 Main Street",
          "city": "Sydney",
          "state": "NSW",
          "zipCode": "2000"
        },
        "property": {
          "id": "60f7b3b3b3b3b3b3b3b3b3b5",
          "type": "Residential"
        }
      }
    ],
    "summary": {
      "totalEvents": 1,
      "dateRange": {
        "start": "2025-08-16T00:00:00.000Z",
        "end": "2025-09-16T23:59:59.999Z"
      },
      "statusCounts": {
        "Scheduled": 1
      }
    }
  }
}
```

### 2. Get My Calendar (Current Technician)

**Endpoint:** `GET /api/v1/calendar/my-calendar`

**Authentication:** Technician only

**Query Parameters:** Same as above

**Description:** Returns calendar events for the currently authenticated technician.

### 3. Download Calendar File (.ics)

**Endpoint:** `GET /api/v1/calendar/technician/:technicianId/download`

**Authentication:** SuperUser, Agency, or Technician

**Description:** Downloads an .ics calendar file that can be imported into any calendar application.

**Example Request:**
```bash
GET /api/v1/calendar/technician/60f7b3b3b3b3b3b3b3b3b3b3/download
```

**Response:** Downloads a file named `John_Smith_schedule.ics`

### 4. Get Calendar Feed URL

**Endpoint:** `GET /api/v1/calendar/technician/:technicianId/feed-url`

**Authentication:** SuperUser, Agency, or Technician

**Description:** Generates a calendar feed URL for mobile app subscription.

**Example Response:**
```json
{
  "status": "success",
  "message": "Calendar feed URL generated successfully",
  "data": {
    "feedUrl": "https://api.rentalease.com/api/v1/calendar/technician/60f7b3b3b3b3b3b3b3b3b3b3?format=ics",
    "instructions": {
      "ios": "Open Settings > Calendar > Accounts > Add Account > Other > Add Subscribed Calendar and paste the feed URL",
      "android": "Open Google Calendar app > Settings > Add calendar > From URL and paste the feed URL",
      "outlook": "In Outlook, go to Calendar > Add calendar > Subscribe from web and paste the feed URL"
    }
  }
}
```

### 5. Update Job Schedule

**Endpoint:** `PUT /api/v1/calendar/jobs/:jobId/schedule`

**Authentication:** SuperUser, Agency, or Technician

**Request Body:**
```json
{
  "scheduledStartTime": "2025-08-20T10:00:00.000Z",
  "scheduledEndTime": "2025-08-20T12:00:00.000Z",
  "shift": "morning"
}
```

**Description:** Updates specific start and end times for a job.

## Mobile App Integration (React Native/Expo)

### Required Dependencies

Install the following packages in your Expo project:

```bash
npm install expo-calendar expo-permissions @react-native-async-storage/async-storage
```

### 1. Calendar Permission Management

```javascript
// utils/calendarPermissions.js
import * as Calendar from 'expo-calendar';
import { Alert } from 'react-native';

export const requestCalendarPermissions = async () => {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Calendar access is required to sync your work schedule. Please enable it in settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting calendar permissions:', error);
    return false;
  }
};

export const getDefaultCalendar = async () => {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars.find(cal => cal.source.name === 'Default') || calendars[0];
};
```

### 2. Calendar Service

```javascript
// services/calendarService.js
import * as Calendar from 'expo-calendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestCalendarPermissions, getDefaultCalendar } from '../utils/calendarPermissions';

class CalendarService {
  constructor() {
    this.calendarId = null;
    this.eventIds = new Map(); // Track created events
  }

  async initialize() {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) return false;

    // Get or create RentalEase calendar
    this.calendarId = await this.getOrCreateRentalEaseCalendar();
    return true;
  }

  async getOrCreateRentalEaseCalendar() {
    try {
      // Check if we already have a calendar ID stored
      const storedCalendarId = await AsyncStorage.getItem('rentalease_calendar_id');
      if (storedCalendarId) {
        // Verify the calendar still exists
        try {
          const calendars = await Calendar.getCalendarsAsync();
          const exists = calendars.find(cal => cal.id === storedCalendarId);
          if (exists) return storedCalendarId;
        } catch (error) {
          // Calendar doesn't exist anymore, create a new one
        }
      }

      // Create new calendar
      const defaultCalendar = await getDefaultCalendar();
      const newCalendar = {
        title: 'RentalEase Work Schedule',
        color: '#2196F3',
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultCalendar.source.id,
        source: defaultCalendar.source,
        name: 'RentalEase Work Schedule',
        ownerAccount: defaultCalendar.ownerAccount,
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      };

      const calendarId = await Calendar.createCalendarAsync(newCalendar);
      await AsyncStorage.setItem('rentalease_calendar_id', calendarId);
      return calendarId;
    } catch (error) {
      console.error('Error creating calendar:', error);
      return null;
    }
  }

  async syncJobsToCalendar(jobs) {
    if (!this.calendarId) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      // Clear existing events
      await this.clearExistingEvents();

      // Add new events
      for (const job of jobs) {
        await this.createCalendarEvent(job);
      }

      return true;
    } catch (error) {
      console.error('Error syncing jobs to calendar:', error);
      return false;
    }
  }

  async createCalendarEvent(job) {
    if (!this.calendarId) return null;

    try {
      const eventDetails = {
        title: job.title,
        startDate: new Date(job.startTime),
        endDate: new Date(job.endTime),
        notes: job.description,
        location: job.location ? `${job.location.street}, ${job.location.city}` : '',
        alarms: [
          { relativeOffset: -60 }, // 1 hour before
          { relativeOffset: -15 }   // 15 minutes before
        ],
        calendarId: this.calendarId,
      };

      const eventId = await Calendar.createEventAsync(this.calendarId, eventDetails);
      this.eventIds.set(job.id, eventId);
      return eventId;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }
  }

  async clearExistingEvents() {
    try {
      const storedEventIds = await AsyncStorage.getItem('rentalease_event_ids');
      if (storedEventIds) {
        const eventIds = JSON.parse(storedEventIds);
        for (const eventId of eventIds) {
          try {
            await Calendar.deleteEventAsync(eventId);
          } catch (error) {
            // Event might already be deleted, continue
          }
        }
      }
      await AsyncStorage.removeItem('rentalease_event_ids');
      this.eventIds.clear();
    } catch (error) {
      console.error('Error clearing events:', error);
    }
  }

  async saveEventIds() {
    try {
      const eventIds = Array.from(this.eventIds.values());
      await AsyncStorage.setItem('rentalease_event_ids', JSON.stringify(eventIds));
    } catch (error) {
      console.error('Error saving event IDs:', error);
    }
  }
}

export default new CalendarService();
```

### 3. API Service for Calendar Data

```javascript
// services/calendarApiService.js
import { API_BASE_URL } from '../config/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

class CalendarApiService {
  async getAuthHeaders() {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async getTechnicianCalendar(startDate, endDate, status = null) {
    try {
      const headers = await this.getAuthHeaders();
      let url = `${API_BASE_URL}/calendar/my-calendar?startDate=${startDate}&endDate=${endDate}`;
      
      if (status) {
        url += `&status=${status}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data.events;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  async updateJobSchedule(jobId, scheduledStartTime, scheduledEndTime, shift) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/calendar/jobs/${jobId}/schedule`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          scheduledStartTime,
          scheduledEndTime,
          shift
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating job schedule:', error);
      throw error;
    }
  }

  async getCalendarFeedUrl() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/calendar/my-calendar/feed-url`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting feed URL:', error);
      throw error;
    }
  }
}

export default new CalendarApiService();
```

### 4. Calendar Screen Component

```javascript
// screens/CalendarScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import calendarService from '../services/calendarService';
import calendarApiService from '../services/calendarApiService';

const CalendarScreen = () => {
  const [events, setEvents] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 2); // Next 2 months

      const calendarEvents = await calendarApiService.getTechnicianCalendar(
        startDate.toISOString(),
        endDate.toISOString()
      );

      setEvents(calendarEvents);
      generateMarkedDates(calendarEvents);
    } catch (error) {
      Alert.alert('Error', 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const generateMarkedDates = (events) => {
    const marked = {};
    events.forEach(event => {
      const date = new Date(event.startTime).toISOString().split('T')[0];
      marked[date] = {
        marked: true,
        dotColor: getStatusColor(event.status),
        selectedColor: '#2196F3',
      };
    });
    setMarkedDates(marked);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled': return '#4CAF50';
      case 'Pending': return '#FF9800';
      case 'Completed': return '#2196F3';
      case 'Overdue': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime).toISOString().split('T')[0];
      return eventDate === date;
    });
  };

  const syncToPhoneCalendar = async () => {
    Alert.alert(
      'Sync to Phone Calendar',
      'This will add all your work events to your phone\'s calendar app. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync',
          onPress: async () => {
            try {
              const success = await calendarService.syncJobsToCalendar(events);
              if (success) {
                Alert.alert('Success', 'Events synced to your phone calendar!');
              } else {
                Alert.alert('Error', 'Failed to sync events to calendar');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to sync events to calendar');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCalendarData();
    setRefreshing(false);
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const dayEvents = getEventsForDate(selectedDate);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Schedule</Text>
        <TouchableOpacity style={styles.syncButton} onPress={syncToPhoneCalendar}>
          <Text style={styles.syncButtonText}>Sync to Phone</Text>
        </TouchableOpacity>
      </View>

      <Calendar
        current={selectedDate}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={{
          ...markedDates,
          [selectedDate]: {
            ...markedDates[selectedDate],
            selected: true,
            selectedColor: '#2196F3',
          },
        }}
        theme={{
          selectedDayBackgroundColor: '#2196F3',
          todayTextColor: '#2196F3',
          arrowColor: '#2196F3',
        }}
      />

      <ScrollView
        style={styles.eventsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.dayTitle}>
          {new Date(selectedDate).toLocaleDateString([], {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        {dayEvents.length === 0 ? (
          <Text style={styles.noEvents}>No events scheduled for this day</Text>
        ) : (
          dayEvents.map((event, index) => (
            <View key={index} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) }]}>
                  <Text style={styles.statusText}>{event.status}</Text>
                </View>
              </View>
              <Text style={styles.eventTime}>
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </Text>
              <Text style={styles.eventType}>{event.jobType} • {event.priority} Priority</Text>
              {event.location && (
                <Text style={styles.eventLocation}>📍 {event.location.street}, {event.location.city}</Text>
              )}
              {event.description && (
                <Text style={styles.eventDescription}>{event.description}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  syncButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  eventsContainer: {
    flex: 1,
    padding: 16,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  noEvents: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 32,
  },
  eventCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventTime: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 12,
    color: '#333',
    fontStyle: 'italic',
  },
});

export default CalendarScreen;
```

### 5. App.js Integration

```javascript
// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import JobsScreen from './screens/JobsScreen';
import CalendarScreen from './screens/CalendarScreen';
import ProfileScreen from './screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Jobs') {
              iconName = focused ? 'briefcase' : 'briefcase-outline';
            } else if (route.name === 'Calendar') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Jobs" component={JobsScreen} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

## Time Slot Configuration

The system uses these default time slots for shifts:

- **Morning**: 9:00 AM - 12:00 PM
- **Afternoon**: 1:00 PM - 5:00 PM  
- **Evening**: 6:00 PM - 9:00 PM

You can customize these by updating the `getTimeSlotFromShift` function in the calendar routes.

## Calendar Integration Features

1. **Automatic Sync**: Events are automatically synchronized to the mobile calendar
2. **Reminders**: Events include 1-hour and 15-minute reminders
3. **Location Integration**: Property addresses are included in calendar events
4. **Status Colors**: Different colors for different job statuses
5. **ICS Export**: Standard calendar format for cross-platform compatibility
6. **Feed URLs**: Subscribe to calendar feeds for automatic updates

## Security Considerations

- Calendar feeds require proper authentication
- Technicians can only access their own calendar events
- Feed URLs should be kept secure and not shared publicly
- Consider implementing feed URL expiration for enhanced security

## Testing

Test the calendar integration using these steps:

1. Create a technician account
2. Assign jobs to the technician
3. Access the calendar endpoints
4. Download the .ics file and import into a calendar app
5. Test mobile app calendar synchronization
6. Verify event reminders and notifications work correctly
