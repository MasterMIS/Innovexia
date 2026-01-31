# Lead Stages Implementation Guide

## Backend Structure Recommendation

### Option 1: Separate Sheet (RECOMMENDED)
Create a new sheet named "LeadStages" within the same spreadsheet with the following columns:

#### Sheet: "LeadStages"
| Column | Description | Example |
|--------|-------------|---------|
| LeadID | Reference to lead (from Lead to Sales sheet) | LEAD-1767898740577 |
| StageNumber | Stage sequence (1-12) | 1 |
| StageName | Name of the stage | Select Assigned Language Person & CRM Person |
| PlannedDate | Auto-calculated planned completion date | 2026-01-10T09:00:00Z |
| ActualDate | When stage was actually completed | 2026-01-10T14:30:00Z |
| TimeDelay | Delay in hours (calculated) | 5.5 |
| Status | Current status | completed / in-progress / pending |
| LanguagePerson | (Step 1 specific) | John Doe |
| CRMPerson | (Step 1 specific) | Jane Smith |
| LeadType | (Step 2 specific) | Hot / Warm / Cold |
| EmailSentDate | (Step 3 specific) | 2026-01-11T10:00:00Z |
| CustomerDetails | (Step 4 specific) JSON string | {"contactEmail": "...", "phone": "..."} |
| CallDoneDate | (Step 5 specific) | 2026-01-12T11:00:00Z |
| EnquiryDetails | (Step 6 specific) | Customer wants Product A |
| ConnectionStage | (Step 7 specific) | Initial Contact / Follow-up / Negotiation |
| MeetingDate | (Step 8 specific) | 2026-01-15T14:00:00Z |
| MeetingLocation | (Step 8 specific) | Office / Online / Client Location |
| Priority | (Step 9 specific) | High / Medium / Low |
| ZOHOCRMLink | (Step 10 specific) | https://crm.zoho.com/... |
| CurrentStatus | (Step 11 specific) | Negotiation / Proposal Sent / Awaiting Response |
| FinalStatus | (Step 12 specific) | Won / Lost / On Hold |
| Remarks | Notes for this stage | Discussed pricing details |
| CreatedAt | When stage was created | 2026-01-10T09:00:00Z |
| UpdatedAt | Last updated timestamp | 2026-01-10T14:30:00Z |

### Why Separate Sheet is Better:
1. **Scalability**: Each lead can have 12 stages = 12 rows per lead
2. **Easy Queries**: Filter by LeadID to get all stages for a specific lead
3. **Historical Tracking**: Can track multiple iterations if lead is reopened
4. **Clean Data Structure**: Main lead sheet remains clean with basic info
5. **Performance**: Better than adding 50+ columns to main sheet

### Alternative: Single Sheet with Many Columns
If you prefer single sheet, add these column groups to "Lead to Sales" sheet:
- Stage1_PlannedDate, Stage1_ActualDate, Stage1_Status, Stage1_Details, Stage1_Remarks
- Stage2_PlannedDate, Stage2_ActualDate, Stage2_Status, Stage2_Details, Stage2_Remarks
- ... (repeat for all 12 stages)

**Cons**: 60+ new columns, harder to maintain, less flexible

---

## Stage-Specific Details

### Step 1: Select Assigned Language Person & CRM Person
**Fields:**
- Language Person Name (dropdown from Users)
- CRM Person Name (dropdown from Users)
- Assignment Date
- Remarks

### Step 2: Lead Type
**Fields:**
- Lead Type (Hot / Warm / Cold)
- Lead Score (1-10)
- Lead Source Verification
- Remarks

### Step 3: Email Sent
**Fields:**
- Email Sent Date & Time
- Email Template Used
- Recipient Email
- Email Subject
- Follow-up Required (Yes/No)
- Remarks

### Step 4: Customer & Company Details
**Fields:**
- Customer Contact Email
- Customer Contact Phone
- Company Website
- Company Size (Small / Medium / Large / Enterprise)
- Industry
- Decision Maker Name
- Decision Maker Role
- Remarks

### Step 5: Call Done
**Fields:**
- Call Date & Time
- Call Duration (minutes)
- Call Status (Connected / Not Answered / Busy)
- Discussion Summary
- Next Call Scheduled
- Remarks

### Step 6: Enquiry Received
**Fields:**
- Enquiry Date
- Enquiry Type (Formal / Informal)
- Products/Services Interested
- Estimated Budget
- Expected Closure Date
- Remarks

### Step 7: Stage of Connection
**Fields:**
- Connection Stage (Initial Contact / Follow-up / Negotiation / Proposal)
- Customer Response (Positive / Neutral / Negative)
- Next Action Required
- Remarks

### Step 8: Meeting
**Fields:**
- Meeting Date & Time
- Meeting Type (Online / In-Person / Phone)
- Meeting Location
- Attendees from Our Side
- Attendees from Customer Side
- Meeting Agenda
- Meeting Outcome
- Next Meeting Scheduled
- Remarks

### Step 9: Priority of Lead
**Fields:**
- Priority Level (High / Medium / Low)
- Priority Reason
- Revenue Potential
- Closing Probability (%)
- Competitor Info
- Remarks

### Step 10: Updated on ZOHO CRM
**Fields:**
- ZOHO CRM ID
- ZOHO Deal Link
- Update Date
- Updated By
- Sync Status
- Remarks

### Step 11: Current Status
**Fields:**
- Current Stage (Prospecting / Qualification / Proposal / Negotiation / Closing)
- Status Description
- Blockers/Issues
- Required Actions
- Remarks

### Step 12: Final Lead Status
**Fields:**
- Final Status (Won / Lost / On Hold / Cancelled)
- Win/Loss Reason
- Deal Value (if won)
- Closure Date
- Lessons Learned
- Remarks

---

## API Endpoints Needed

### 1. Initialize Stages for Lead
```
POST /api/lead-to-sales/stages/initialize
Body: { leadId: "LEAD-1767898740577" }
```

### 2. Get Stages for Lead
```
GET /api/lead-to-sales/stages?leadId=LEAD-1767898740577
```

### 3. Update Stage
```
PUT /api/lead-to-sales/stages/update
Body: {
  leadId: "LEAD-1767898740577",
  stageNumber: 1,
  actualDate: "2026-01-10T14:30:00Z",
  status: "completed",
  details: { languagePerson: "John Doe", crmPerson: "Jane Smith" },
  remarks: "Assigned successfully"
}
```

### 4. Mark Stage Complete
```
POST /api/lead-to-sales/stages/complete
Body: {
  leadId: "LEAD-1767898740577",
  stageNumber: 1
}
```

---

## Date Calculation Logic

```javascript
// Skip Sundays when calculating planned dates
function getNextBusinessDay(date, daysToAdd = 1) {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < daysToAdd) {
    result.setDate(result.getDate() + 1);
    // Skip Sunday (0)
    if (result.getDay() !== 0) {
      addedDays++;
    }
  }
  
  return result;
}

// Initialize stages with 1 day gap (skipping Sundays)
function initializeStages(leadCreatedDate) {
  const baseDate = new Date(leadCreatedDate);
  const stages = [];
  
  for (let i = 0; i < 12; i++) {
    const plannedDate = getNextBusinessDay(baseDate, i + 1);
    stages.push({
      stageNumber: i + 1,
      plannedDate: plannedDate.toISOString(),
      status: i === 0 ? 'in-progress' : 'pending'
    });
  }
  
  return stages;
}
```

---

## Implementation Steps

1. **Create "LeadStages" Sheet** in the Lead to Sales spreadsheet
2. **Add Column Headers** as specified above
3. **Create API Route** at `app/api/lead-to-sales/stages/route.ts`
4. **Implement GET** method to fetch stages for a lead
5. **Implement POST** method to initialize/update stages
6. **Add Sheet Operations** in `lib/sheets.ts` for stage CRUD
7. **Test Stage Flow** with sample lead

---

## Sheet Structure Example

### Lead to Sales Sheet
| ID | Company | Contact | ... | Created At |
|----|---------|---------|-----|------------|
| LEAD-001 | ABC Corp | John | ... | 2026-01-09T09:00:00Z |

### LeadStages Sheet
| LeadID | StageNumber | StageName | PlannedDate | ActualDate | Status | Remarks |
|--------|-------------|-----------|-------------|------------|--------|---------|
| LEAD-001 | 1 | Select Assigned... | 2026-01-10 | 2026-01-10 | completed | Done |
| LEAD-001 | 2 | Lead Type | 2026-01-11 | - | in-progress | - |
| LEAD-001 | 3 | Email Sent | 2026-01-13 | - | pending | - |
| ... | ... | ... | ... | ... | ... | ... |

This structure allows efficient querying and maintains data integrity!
