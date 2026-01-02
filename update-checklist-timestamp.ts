import 'dotenv/config';
import { sql } from '@/lib/db';

async function updateChecklistColumns() {
  try {
    console.log('Updating checklist table columns to timestamp...');

    // Update from_date column to timestamp
    await sql`
      ALTER TABLE checklists 
      ALTER COLUMN from_date TYPE timestamp without time zone 
      USING from_date::timestamp
    `;
    console.log('✓ Updated from_date to timestamp');

    // Update due_date column to timestamp
    await sql`
      ALTER TABLE checklists 
      ALTER COLUMN due_date TYPE timestamp without time zone 
      USING due_date::timestamp
    `;
    console.log('✓ Updated due_date to timestamp');

    console.log('✅ Successfully updated checklist table columns!');
  } catch (error) {
    console.error('❌ Error updating columns:', error);
    throw error;
  }
}

updateChecklistColumns()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
