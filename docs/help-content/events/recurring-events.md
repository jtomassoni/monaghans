---
title: Creating Recurring Events
feature: events
route: /admin
keywords:
  - recurring event
  - repeating event
  - weekly event
  - monthly event
  - rrule
aliases:
  - repeat event
  - recurring schedule
relatedFeatures:
  - events
  - creating-events
version: 1.0.0
lastUpdated: 2025-01-27
---

# Creating Recurring Events

Create events that repeat automatically. Perfect for weekly trivia, monthly events, or any regular schedule.

## Create Recurring Event

1. Create new event (see [One-Time Events](./creating-events.md))
2. Find **"Recurrence"** section
3. Select pattern:
   - **None**: One-time (default)
   - **Weekly**: Repeats every week
   - **Monthly**: Repeats every month

## Weekly Recurring Events

Specify which days:

1. Select **"Weekly"** pattern
2. Check days when event occurs:
   - Monday through Sunday
3. Optionally set **End Date** to stop recurrence
4. Save

**Example**: "Trivia Night" every Tuesday and Thursday—select Weekly, check Tuesday and Thursday.

## Monthly Recurring Events

Choose how it repeats:

1. Select **"Monthly"** pattern
2. Choose:
   - **Same day of month**: Same date each month (e.g., 15th)
   - **Same weekday**: Same weekday each month (e.g., first Monday)
3. Optionally set **End Date**
4. Save

**Example**: "Monthly Special" on 15th—select Monthly, set day to 15.

## End Date

Limit how long event continues:

1. Check **"End Date"** in recurrence section
2. Select stop date
3. Event recurs until this date

**Note**: Without end date, event recurs indefinitely.

## Editing Recurring Events

Options when editing:
- **Edit this occurrence**: Changes this instance only
- **Edit all occurrences**: Changes entire series
- **Delete this occurrence**: Removes this instance (creates exception)
- **Delete all occurrences**: Deletes entire series

## Exceptions

Skip or modify single occurrence:

1. Click specific occurrence in calendar
2. Choose **edit** or **delete**
3. System creates exception for that date
4. Pattern continues for other dates

**Example**: Skip weekly trivia on holiday—delete that occurrence only.

## Troubleshooting

### Event Not Appearing
- Check event is **Active**
- Verify recurrence pattern
- Ensure start date is today or future
- Check if end date passed

### Wrong Days Showing
- Verify selected days for weekly events
- Check day of month/weekday for monthly events

### Can't Edit Single Occurrence
- Click specific occurrence (not series)
- Use "Edit this occurrence" in modal

## RRULE Patterns

System uses RRULE (Recurrence Rule) patterns automatically. No need to understand RRULE—pattern visible in event details if familiar with standard.

## Next Steps

- [Organize with tags and venue areas](./event-organization.md)
- [Edit and manage events](./editing-events.md)

