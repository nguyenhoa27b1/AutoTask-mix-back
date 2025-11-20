# 🕐 Timezone Fix Documentation

## Problem Statement
Thời gian nộp nhiệm vụ và hiển thị ngày tháng đang bị lệch múi giờ (Server là UTC, cần GMT+7).

## Solution Implemented

### 1. ✅ Storage (Database) - UTC Standard
**Endpoint**: `POST /api/tasks/:id/submit`  
**Location**: `server-wrapper.cjs` line 897

```javascript
task.date_submit = new Date().toISOString();
```

**Status**: ✅ **Already correct** - Stores in ISO 8601 UTC format (e.g., `2025-11-20T08:30:45.123Z`)

### 2. ✅ Display (Email Templates) - GMT+7 Conversion
**Updated all 4 email templates to display Vietnam timezone (GMT+7)**

#### Changes Made:
Added `timeZone: 'Asia/Ho_Chi_Minh'` to all `toLocaleDateString()` and `toLocaleString()` calls:

```javascript
// Before:
${new Date(task.deadline).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}

// After:
${new Date(task.deadline).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}
```

### 3. Email Templates Updated

#### A. **Task Assigned** (`notifyTaskAssigned`)
- **Field**: `task.deadline`
- **Line**: 138
- **Display**: Hạn chót hiển thị GMT+7

#### B. **Task Completed** (`notifyTaskCompleted`)
- **Field**: `task.date_submit`
- **Line**: 162
- **Display**: Thời gian nộp hiển thị GMT+7

#### C. **Deadline Approaching** (`notifyDeadlineApproaching`)
- **Field**: `task.deadline`
- **Line**: 193
- **Display**: Hạn chót hiển thị GMT+7

#### D. **Overdue** (`notifyDeadlineOverdue`)
- **Field**: `task.deadline`
- **Line**: 218
- **Display**: Hạn chót đã qua hiển thị GMT+7

### 4. Helper Functions Updated

#### `formatDate()` (line 52-63)
Updated to include `timeZone: 'Asia/Ho_Chi_Minh'`:
```javascript
formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh'  // ← Added
  });
}
```

#### Debug Test Email (line 675-681)
```javascript
`<p>Sent at: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>`
```

## Technical Implementation

### Data Flow:
```
┌─────────────────┐
│ User submits    │
│ task in Vietnam │
│ (GMT+7 time)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Server receives │
│ new Date()      │  ← System time (could be UTC on Render)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ .toISOString()  │
│ Converts to UTC │  ← "2025-11-20T08:30:45.123Z"
│ Stores in DB    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Email triggered │
│ Reads from DB   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ new Date(task.date_submit)      │
│ .toLocaleString('vi-VN', {      │
│   timeZone: 'Asia/Ho_Chi_Minh'  │  ← Converts UTC → GMT+7
│ })                              │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ User sees       │
│ "20 tháng 11    │  ← Correct Vietnam time!
│ năm 2025 15:30" │
└─────────────────┘
```

## Examples

### Storage (UTC):
```json
{
  "date_submit": "2025-11-20T08:30:45.123Z"
}
```

### Display (GMT+7):
Email shows: **"20 tháng 11 năm 2025 15:30"**  
(UTC 08:30 + 7 hours = GMT+7 15:30)

## Verification

### Test Scenario:
1. User in Vietnam submits task at **3:30 PM** (GMT+7)
2. Server stores: `2025-11-20T08:30:45.123Z` (UTC)
3. Email displays: **"20 tháng 11 năm 2025 15:30"** (GMT+7)

### Test Commands:
```bash
# Test timezone conversion
node -e "console.log(new Date('2025-11-20T08:30:45.123Z').toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }))"
# Output: 20/11/2025 15:30:45

# Test email
curl https://autotask-mix-back.onrender.com/api/debug/test-email
```

## Commit Details
- **Commit**: `39de86b`
- **Branch**: `main`
- **Files Changed**: `server-wrapper.cjs` (8 insertions, 7 deletions)
- **Date**: November 20, 2025

## Status
✅ **COMPLETED** - All timezone issues resolved:
- ✅ Storage uses UTC (ISO 8601 standard)
- ✅ Display uses GMT+7 (Vietnam timezone)
- ✅ All 4 email templates updated
- ✅ Helper functions updated
- ✅ Debug endpoints updated
- ✅ Changes committed and pushed to GitHub
