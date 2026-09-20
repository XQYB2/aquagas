# AquaGas database migrations

Migrations in this directory are the source of truth. Supabase records applied files in
`supabase_migrations.schema_migrations`, so a deployment never relies on manually
remembering which columns were added.

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration list
npx supabase db push
```

Never edit an already-deployed migration. Add a new timestamped SQL file instead.

## Order notification webhook

After deploying the website, create a Supabase Database Webhook for `public.orders`:

- Events: `INSERT` and `UPDATE`
- Method: `POST`
- URL: `https://www.aquagas.shop/api/notifications/order-event`
- Header: `x-webhook-secret: <ORDER_NOTIFICATION_WEBHOOK_SECRET>`

The same long random value must be configured in Vercel as
`ORDER_NOTIFICATION_WEBHOOK_SECRET`.
