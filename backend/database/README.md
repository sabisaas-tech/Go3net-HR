# Database Setup Instructions

## Manual Setup (Recommended)

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the entire contents of `schema.sql` 
4. Click "Run" to execute all statements

## Key Points

- All tables are created in the `public` schema
- Foreign key constraints are properly ordered
- Indexes are created for performance
- Triggers handle `updated_at` timestamps automatically

## Tables Created

1. **departments** - Company departments
2. **positions** - Job positions  
3. **users** - Employee records (main table)
4. **user_roles** - Role-based access control
5. **check_in_records** - Time tracking
6. **tasks** - Task management
7. **task_comments** - Task collaboration
8. **password_reset_tokens** - Password recovery

## Supabase Edge Function

The email service function is located in `supabase/functions/email-service/`

To deploy:
```bash
supabase functions deploy email-service
```

Set environment variables in Supabase dashboard:
- `EMAIL_HOST` - Your SMTP host (e.g., smtp.gmail.com)
- `EMAIL_PORT` - Your SMTP port (e.g., 587)
- `EMAIL_USER` - Your SMTP username/email
- `EMAIL_PASS` - Your SMTP password/app password

## Verification

After running the schema, verify tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```