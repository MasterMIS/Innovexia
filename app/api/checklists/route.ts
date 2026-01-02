import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Helper function to get day of week in IST (0=Sunday, 1=Monday, etc.)
function getISTDayOfWeek(date: Date): number {
  const istDateStr = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istDateStr);
  return istDate.getDay();
}

// Helper function to add IST offset for database storage
function addISTOffset(date: Date): Date {
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  return new Date(date.getTime() + istOffset);
}

// Helper function to calculate status based on due date
function calculateStatus(dueDate: string): string {
  if (!dueDate) return 'pending';
  
  const now = new Date();
  const due = new Date(dueDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  if (dueDay < today) {
    return 'overdue';
  } else if (dueDay.getTime() === today.getTime()) {
    return 'pending';
  } else {
    return 'planned';
  }
}

// Helper function to generate dates based on frequency
function generateDatesFromFrequency(
  fromDate: Date, 
  frequency: string, 
  weeklyDays?: number[], 
  selectedDates?: string[]
): Date[] {
  const dates: Date[] = [];
  
  // Get the time components from the original fromDate
  const originalTime = {
    hours: fromDate.getHours(),
    minutes: fromDate.getMinutes(),
    seconds: fromDate.getSeconds(),
    milliseconds: fromDate.getMilliseconds()
  };
  
  const currentYear = fromDate.getFullYear();
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);
  
  let currentDate = new Date(fromDate);
  // Reset time to start of day for date iteration only
  currentDate.setHours(0, 0, 0, 0);
  
  switch (frequency.toLowerCase()) {
    case 'daily':
      // Generate daily tasks from start date to end of year
      const endDate = new Date(yearEnd);
      endDate.setHours(0, 0, 0, 0);
      
      while (currentDate <= endDate) {
        // Skip Sunday dates for daily frequency (check in IST)
        const dayOfWeek = getISTDayOfWeek(currentDate);
        if (dayOfWeek !== 0) { // 0 = Sunday
          // Create a new date with the original time from fromDate
          const taskDate = new Date(currentDate);
          taskDate.setHours(originalTime.hours, originalTime.minutes, originalTime.seconds, originalTime.milliseconds);
          dates.push(taskDate);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      break;
      
    case 'weekly':
      // Generate tasks for selected weekdays only
      const weekEndDate = new Date(yearEnd);
      weekEndDate.setHours(0, 0, 0, 0);
      
      if (!weeklyDays || weeklyDays.length === 0) {
        // If no days selected, default to weekly from start date
        while (currentDate <= weekEndDate) {
          const taskDate = new Date(currentDate);
          taskDate.setHours(originalTime.hours, originalTime.minutes, originalTime.seconds, originalTime.milliseconds);
          dates.push(taskDate);
          currentDate.setDate(currentDate.getDate() + 7);
        }
      } else {
        // Generate tasks for each selected weekday
        // weeklyDays: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        currentDate = new Date(startDate);
        
        while (currentDate <= weekEndDate) {
          const currentDayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
          // Convert to our format (0=Monday)
          const ourDayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
          
          // Check if current day is in selected days (and it's not Sunday since we only go Mon-Sat)
          if (currentDayOfWeek !== 0 && weeklyDays.includes(ourDayIndex)) {
            const taskDate = new Date(currentDate);
            taskDate.setHours(originalTime.hours, originalTime.minutes, originalTime.seconds, originalTime.milliseconds);
            dates.push(taskDate);
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      break;
      
    case 'monthly':
      // Generate tasks for selected dates each month
      const monthEndDate = new Date(yearEnd);
      monthEndDate.setHours(0, 0, 0, 0);
      
      if (!selectedDates || selectedDates.length === 0) {
        // If no dates selected, default to monthly from start date
        while (currentDate <= monthEndDate) {
          const taskDate = new Date(currentDate);
          // If date falls on Sunday, shift to Saturday (check in IST)
          const dayOfWeek = getISTDayOfWeek(taskDate);
          if (dayOfWeek === 0) { // 0 = Sunday
            taskDate.setDate(taskDate.getDate() - 1);
          }
          taskDate.setHours(originalTime.hours, originalTime.minutes, originalTime.seconds, originalTime.milliseconds);
          dates.push(taskDate);
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      } else {
        // Extract day numbers from selected dates
        const dayNumbers = selectedDates.map(d => new Date(d).getDate());
        
        // Generate tasks for each selected day in each month from start date to end of year
        const monthStartDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
        monthStartDate.setHours(0, 0, 0, 0);
        let monthDate = new Date(monthStartDate);
        
        while (monthDate.getMonth() <= 11 && monthDate <= monthEndDate) {
          for (const day of dayNumbers) {
            const taskDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day, 0, 0, 0, 0);
            const fromDateOnly = new Date(fromDate);
            fromDateOnly.setHours(0, 0, 0, 0);
            
            // Only add if date is valid, within bounds, and >= fromDate
            if (
              taskDate.getMonth() === monthDate.getMonth() && 
              taskDate >= fromDateOnly && 
              taskDate <= monthEndDate
            ) {
              // If date falls on Sunday, shift to Saturday (check in IST)
              const dayOfWeek = getISTDayOfWeek(taskDate);
              if (dayOfWeek === 0) { // 0 = Sunday
                taskDate.setDate(taskDate.getDate() - 1);
              }
              taskDate.setHours(originalTime.hours, originalTime.minutes, originalTime.seconds, originalTime.milliseconds);
              dates.push(taskDate);
            }
          }
          monthDate.setMonth(monthDate.getMonth() + 1);
        }
      }
      break;
      
    case 'quarterly':
      // Generate tasks for selected dates each quarter
      const quarterEndDate = new Date(yearEnd);
      quarterEndDate.setHours(0, 0, 0, 0);
      
      if (!selectedDates || selectedDates.length === 0) {
        // If no dates selected, default to quarterly from start date
        while (currentDate <= quarterEndDate) {
          const taskDate = new Date(currentDate);
          // If date falls on Sunday, shift to Saturday (check in IST)
          const dayOfWeek = getISTDayOfWeek(taskDate);
          if (dayOfWeek === 0) { // 0 = Sunday
            taskDate.setDate(taskDate.getDate() - 1);
          }
          taskDate.setHours(originalTime.hours, originalTime.minutes, originalTime.seconds, originalTime.milliseconds);
          dates.push(taskDate);
          currentDate.setMonth(currentDate.getMonth() + 3);
        }
      } else {
        // Extract day numbers from selected dates
        const dayNumbers = selectedDates.map(d => new Date(d).getDate());
        
        // Generate tasks for each selected day in each quarter month
        const quarterStartDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
        quarterStartDate.setHours(0, 0, 0, 0);
        let monthDate = new Date(quarterStartDate);
        
        while (monthDate.getMonth() <= 11 && monthDate <= quarterEndDate) {
          for (const day of dayNumbers) {
            const taskDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day, 0, 0, 0, 0);
            const fromDateOnly = new Date(fromDate);
            fromDateOnly.setHours(0, 0, 0, 0);
            
            // Only add if date is valid, within bounds, and >= fromDate
            if (
              taskDate.getMonth() === monthDate.getMonth() && 
              taskDate >= fromDateOnly && 
              taskDate <= quarterEndDate
            ) {
              // If date falls on Sunday, shift to Saturday (check in IST)
              const dayOfWeek = getISTDayOfWeek(taskDate);
              if (dayOfWeek === 0) { // 0 = Sunday
                taskDate.setDate(taskDate.getDate() - 1);
              }
              taskDate.setHours(originalTime.hours, originalTime.minutes, originalTime.seconds, originalTime.milliseconds);
              dates.push(taskDate);
            }
          }
          monthDate.setMonth(monthDate.getMonth() + 3);
        }
      }
      break;
      
    case 'yearly':
      // Generate tasks for selected dates once per year
      const yearEndDate = new Date(yearEnd);
      yearEndDate.setHours(0, 0, 0, 0);
      
      if (!selectedDates || selectedDates.length === 0) {
        // If no dates selected, default to yearly from start date
        if (currentDate <= yearEndDate) {
          const taskDate = new Date(currentDate);
          // If date falls on Sunday, shift to Saturday (check in IST)
          const dayOfWeek = getISTDayOfWeek(taskDate);
          if (dayOfWeek === 0) { // 0 = Sunday
            taskDate.setDate(taskDate.getDate() - 1);
          }
          taskDate.setHours(originalTime.hours, originalTime.minutes, originalTime.seconds, originalTime.milliseconds);
          dates.push(taskDate);
        }
      } else {
        // Generate tasks for each selected date in the year
        const fromDateOnly = new Date(fromDate);
        fromDateOnly.setHours(0, 0, 0, 0);
        
        for (const dateStr of selectedDates) {
          const selectedDate = new Date(dateStr);
          const taskDate = new Date(
            currentYear, 
            selectedDate.getMonth(), 
            selectedDate.getDate(),
            0, 0, 0, 0
          );
          
          // Only add if date is valid, within bounds, and >= fromDate
          if (taskDate >= fromDateOnly && taskDate <= yearEndDate) {
            // If date falls on Sunday, shift to Saturday (check in IST)
            const dayOfWeek = getISTDayOfWeek(taskDate);
            if (dayOfWeek === 0) { // 0 = Sunday
              taskDate.setDate(taskDate.getDate() - 1);
            }
            taskDate.setHours(originalTime.hours, originalTime.minutes, originalTime.seconds, originalTime.milliseconds);
            dates.push(taskDate);
          }
        }
      }
      break;
      
    default:
      break;
  }
  
  // Sort dates chronologically
  return dates.sort((a, b) => a.getTime() - b.getTime());
}

// GET - Fetch all checklists
export async function GET(request: NextRequest) {
  try {
    const checklists = await sql`
      SELECT 
        id,
        question,
        assignee,
        doer_name,
        priority,
        department,
        verification_required,
        verifier_name,
        attachment_required,
        frequency,
        from_date,
        due_date,
        status,
        created_by,
        created_at,
        updated_at,
        weekly_days,
        selected_dates
      FROM checklists
      ORDER BY due_date ASC, created_at DESC
    `;

    // Update status based on due date
    const updatedChecklists = checklists.map((checklist: any) => ({
      ...checklist,
      status: calculateStatus(checklist.due_date),
      weekly_days: checklist.weekly_days ? (typeof checklist.weekly_days === 'string' ? JSON.parse(checklist.weekly_days) : checklist.weekly_days) : null,
      selected_dates: checklist.selected_dates ? (typeof checklist.selected_dates === 'string' ? JSON.parse(checklist.selected_dates) : checklist.selected_dates) : null
    }));

    return NextResponse.json({ checklists: updatedChecklists });
  } catch (error) {
    console.error('Error fetching checklists:', error);
    return NextResponse.json({ error: 'Failed to fetch checklists' }, { status: 500 });
  }
}

// POST - Create new checklist(s) based on frequency
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      question,
      assignee,
      doerName,
      priority,
      department,
      verificationRequired,
      verifierName,
      attachmentRequired,
      frequency,
      fromDateTime,
      createdBy,
      weeklyDays,
      selectedDates
    } = body;

    // Validate required fields
    if (!question || !assignee || !frequency || !fromDateTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Additional validation for weekly frequency
    if (frequency === 'weekly' && (!weeklyDays || weeklyDays.length === 0)) {
      return NextResponse.json(
        { error: 'Please select at least one day for weekly frequency' },
        { status: 400 }
      );
    }

    // Additional validation for monthly/quarterly/yearly frequency
    if (['monthly', 'quarterly', 'yearly'].includes(frequency) && (!selectedDates || selectedDates.length === 0)) {
      return NextResponse.json(
        { error: `Please select at least one date for ${frequency} frequency` },
        { status: 400 }
      );
    }

    // Generate dates based on frequency
    const dates = generateDatesFromFrequency(new Date(fromDateTime), frequency, weeklyDays, selectedDates);
    
    if (dates.length === 0) {
      return NextResponse.json(
        { error: 'No valid dates generated from frequency' },
        { status: 400 }
      );
    }

    // Get from date and add IST offset for database storage
    const fromDateObj = new Date(fromDateTime);
    const adjustedFromDate = addISTOffset(fromDateObj);

    // Insert multiple checklists using Promise.all for parallel execution
    const insertPromises = dates.map(async (dueDate) => {
      // Add IST offset to due date for database storage
      const adjustedDueDate = addISTOffset(dueDate);
      const status = calculateStatus(adjustedDueDate.toISOString());
      
      // Add IST offset to created_at timestamp
      const now = new Date();
      const adjustedCreatedAt = addISTOffset(now);
      
      return sql`
        INSERT INTO checklists (
          question,
          assignee,
          doer_name,
          priority,
          department,
          verification_required,
          verifier_name,
          attachment_required,
          frequency,
          from_date,
          due_date,
          status,
          created_by,
          created_at,
          weekly_days,
          selected_dates
        ) VALUES (
          ${question},
          ${assignee},
          ${doerName || null},
          ${priority || 'medium'},
          ${department || null},
          ${verificationRequired || false},
          ${verifierName || null},
          ${attachmentRequired || false},
          ${frequency},
          ${adjustedFromDate.toISOString()},
          ${adjustedDueDate.toISOString()},
          ${status},
          ${createdBy || null},
          ${adjustedCreatedAt.toISOString()},
          ${weeklyDays ? JSON.stringify(weeklyDays) : null},
          ${selectedDates ? JSON.stringify(selectedDates) : null}
        )
        RETURNING *
      `;
    });

    // Execute all inserts in parallel
    const results = await Promise.all(insertPromises);
    const insertedChecklists = results.map(r => r[0]);

    return NextResponse.json({ 
      checklists: insertedChecklists,
      count: insertedChecklists.length 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating checklists:', error);
    return NextResponse.json({ error: 'Failed to create checklists' }, { status: 500 });
  }
}

// PUT - Update checklist
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      question,
      assignee,
      doerName,
      priority,
      department,
      verificationRequired,
      verifierName,
      attachmentRequired,
      status,
      weeklyDays,
      selectedDates
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Checklist ID is required' }, { status: 400 });
    }

    // Add IST offset to updated_at timestamp
    const now = new Date();
    const adjustedUpdatedAt = addISTOffset(now);

    const result = await sql`
      UPDATE checklists
      SET 
        question = ${question},
        assignee = ${assignee},
        doer_name = ${doerName || null},
        priority = ${priority},
        department = ${department || null},
        verification_required = ${verificationRequired || false},
        verifier_name = ${verifierName || null},
        attachment_required = ${attachmentRequired || false},
        status = ${status || 'pending'},
        weekly_days = ${weeklyDays ? JSON.stringify(weeklyDays) : null},
        selected_dates = ${selectedDates ? JSON.stringify(selectedDates) : null},
        updated_at = ${adjustedUpdatedAt.toISOString()}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
    }

    return NextResponse.json({ checklist: result[0] });
  } catch (error) {
    console.error('Error updating checklist:', error);
    return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 });
  }
}

// DELETE - Delete checklist
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Checklist ID is required' }, { status: 400 });
    }

    await sql`DELETE FROM checklists WHERE id = ${id}`;

    return NextResponse.json({ message: 'Checklist deleted successfully' });
  } catch (error) {
    console.error('Error deleting checklist:', error);
    return NextResponse.json({ error: 'Failed to delete checklist' }, { status: 500 });
  }
}
