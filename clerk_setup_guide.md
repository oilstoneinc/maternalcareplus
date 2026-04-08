# Clerk & Database Seamless Sync Guide

Follow these steps to finish connecting your database to Clerk. Once this is done, all user changes in Clerk will automatically reflect in your local database.

### Phase 1: Create the Webhook in Clerk
1.  Go to your **[Clerk Dashboard](https://dashboard.clerk.com/)**.
2.  Navigate to **Webhooks** in the sidebar.
3.  Click **Add Endpoint**.
4.  In the **Endpoint URL** field, paste:
    `https://maternalcareplus.vercel.app/api/webhooks/clerk`
    *(Note: If you are testing locally, you can use a tool like `ngrok` to get a public URL).*
5.  Under **Message filtering**, select the following events:
    - `user.created`
    - `user.updated`
    - `user.deleted`
6.  Click **Create**.

### Phase 2: Secure Your Connection
1.  After creating the endpoint, you will see a **Signing Secret** (starts with `whsec_`).
2.  Copy this secret.
3.  Go to your project's **Environment Variables** (in `.env` or Vercel Settings).
4.  Add a new variable:
    `WEBHOOK_SECRET=whsec_your_secret_here`

### Phase 3: Verify the Connection
1.  In the Clerk Webhook page, click the **Testing** tab.
2.  Select `user.created` and click **Send Test**.
3.  If the status is `200 Success`, your connection is seamless!

> [!TIP]
> **Why this is seamless:** 
> - If you change a user's name or email in Clerk, it updates in the DB instantly.
> - If you delete a user in Clerk, they are deactivated in the DB but their medical records remain safe.
