# Checklist Grouped View Implementation Guide

## Features to Implement

### 1. View Toggle (✅ DONE)
- Added switch between "Table" and "Grouped" view
- Toggle buttons added in header

### 2. Grouped View Layout
Replace the table section with conditional rendering:

```tsx
{viewMode === 'table' ? (
  // Existing table code here
) : (
  // New grouped view here - see below
)}
```

### 3. Grouped View Component (Add after table section)

```tsx
{/* Grouped View */}
<div className="space-y-4">
  {Array.from(groupedChecklists.entries()).map(([question, tasks]) => {
    const isExpanded = expandedGroups.has(question);
    const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'completed_with_delay').length;
    
    return (
      <motion.div
        key={question}
        className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-[#f4d24a]/20 overflow-hidden"
      >
        {/* Group Header */}
        <div
          className="px-6 py-4 bg-gradient-to-r from-[#f4d24a]/10 to-[#e5c33a]/10 cursor-pointer hover:from-[#f4d24a]/20 hover:to-[#e5c33a]/20 transition-colors"
          onClick={() => toggleGroup(question)}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {question}
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  📋 {tasks.length} tasks
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  ✅ {completedCount} completed
                </span>
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium">
                  {tasks[0].frequency}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(tasks[0].priority)}`}>
                  {tasks[0].priority?.toUpperCase()}
                </span>
              </div>
            </div>
            <svg
              className={`w-6 h-6 text-gray-600 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Expanded Task List */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-6 py-4 space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-700 rounded-lg border border-[#f4d24a]/10"
                  >
                    <div className="flex-1 grid grid-cols-5 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Due Date</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDateToLocalTimezone(task.due_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assignee</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{task.assignee}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Doer</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{task.doer_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                          {task.status?.toUpperCase().replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {/* Complete Button */}
                        {(task.status === 'pending' || task.status === 'planned' || task.status === 'approval_waiting') && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openCompleteModal(task)}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
                            title={task.status === 'approval_waiting' ? 'Approve Task' : 'Complete Task'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </motion.button>
                        )}
                        {/* Edit Button */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openEditModal(task)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </motion.button>
                        {/* Delete Button */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openDeleteModal(task.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  })}
</div>
```

### 4. Complete Task Modal (Add after existing modals)

```tsx
{/* Complete Task Modal */}
<AnimatePresence>
  {showCompleteModal && completingTask && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={() => setShowCompleteModal(false)}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {completingTask.status === 'approval_waiting' ? '✅ Approve Task' : '📝 Complete Task'}
          </h2>
          <button
            onClick={() => setShowCompleteModal(false)}
            className="p-2 hover:bg-black/10 rounded-lg transition"
          >
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Task Details */}
          <div className="bg-[#f4d24a]/10 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{completingTask.question}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Due Date</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatDateToLocalTimezone(completingTask.due_date)}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Assignee</p>
                <p className="font-medium text-gray-900 dark:text-white">{completingTask.assignee}</p>
              </div>
            </div>
          </div>

          {/* File Upload (if attachment required) */}
          {completingTask.attachment_required && completingTask.status !== 'approval_waiting' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                📎 Attach Proof *
              </label>
              <input
                type="file"
                onChange={(e) => setCompletionFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none"
              />
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              💬 Remarks
            </label>
            <textarea
              value={completionRemarks}
              onChange={(e) => setCompletionRemarks(e.target.value)}
              placeholder="Add any remarks or notes..."
              rows={4}
              className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-[#f4d24a]/30 rounded-xl focus:ring-2 focus:ring-[#f4d24a] outline-none text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowCompleteModal(false)}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-slate-600 transition"
            >
              Cancel
            </button>
            <button
              onClick={completingTask.status === 'approval_waiting' ? handleApproveTask : handleCompleteTask}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] text-gray-900 rounded-xl font-semibold hover:shadow-lg transition"
            >
              {completingTask.status === 'approval_waiting' ? '✅ Approve' : '📤 Complete'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

### 5. Database Updates Needed

Add these columns to the `checklists` table:

```sql
ALTER TABLE checklists
ADD COLUMN IF NOT EXISTS completion_remarks TEXT,
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS verifier_remarks TEXT,
ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
```

### 6. API Route Updates

Update `/api/checklists/route.ts` PUT endpoint to handle new status values:
- `approval_waiting`
- `completed_with_delay`

And accept new fields:
- `completion_remarks`
- `attachment_url`
- `completed_by`
- `completed_at`
- `verifier_remarks`
- `verified_by`
- `verified_at`

### 7. Status Color Helper

Update `getStatusColor` function to include new statuses:

```tsx
const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'overdue': return 'bg-red-500 text-white';
    case 'pending': return 'bg-yellow-500 text-white';
    case 'planned': return 'bg-blue-500 text-white';
    case 'completed': return 'bg-green-500 text-white';
    case 'completed_with_delay': return 'bg-orange-500 text-white';
    case 'approval_waiting': return 'bg-purple-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};
```

## Implementation Steps

1. ✅ View toggle button added
2. ✅ State variables and handlers added
3. Add grouped view component (replace table conditionally)
4. Add complete task modal
5. Update database schema
6. Update API route
7. Test all flows:
   - Complete without verification
   - Complete with verification → approval
   - Complete with attachment
   - Status changes based on due date

## Notes

- The grouped view shows tasks organized by question
- Each group shows task count and completion status
- Clicking group header expands/collapses tasks
- Pencil icon in action column opens complete modal
- Status logic determines if verification is needed
- File upload only shown when attachment_required = true
- Verifier sees different UI for approval
