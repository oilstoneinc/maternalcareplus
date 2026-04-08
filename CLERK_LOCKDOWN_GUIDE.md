# Clerk Lockdown & Hospital Onboarding Guide

You are now the **Gatekeeper**. Public registration is disabled on the website. To provide a hospital with access, you must manually "invite" them or create their account.

---

### Phase 1: Close the Main Entrance (Clerk Dashboard)
1. Log into your **[Clerk Dashboard](https://dashboard.clerk.com/)**.
2. Go to **Configure > User & Auth > Webhooks**.
3. Go to **Configure > User & Auth > Email, Phone, and Username**.
4. Scroll down to **Sign-up settings**.
5. **DISABLE the "Allow users to sign up" toggle**.
   * *This ensures the only way into the system is through an action YOU take.*

---

### Phase 2: How to "Create" a Hospital Account
Since you want to create the account and send it to them, follow this workflow:

#### Method A: The Identity Invitation (Highest Security)
1. In Clerk Dashboard, go to **Users**.
2. Click **Invitations** > **Create Invitation**.
3. Enter the hospital's email.
4. **IMPORTANT**: Click "Public Metadata" (or Unsafe Metadata) and enter:
   ```json
   { "role": "hospital_staff" }
   ```
5. Click **Send Invitation**.
6. The Hospital receives an email, clicks the link, and sets their own secure password. They are automatically logged in as `hospital_staff`.

#### Method B: Manual Creation (If you want to set their password)
1. In Clerk Dashboard, go to **Users** > **Create User**.
2. Enter their email and a temporary password (e.g., `HSP_Maternal2026`).
3. After creating, go to that user's profile in Clerk.
4. Go to **Metadata** > **Public Metadata**.
5. Type: `{ "role": "hospital_staff" }`.
6. Send the email and password to the hospital.

---

### Phase 3: What happens next?
* When the hospital logs in for the first time, our **Seamless Webhook** (already active) will detect them and automatically create their record in your **Neon Database**.
* Our system will also "provision" their specific Hospital/Clinic profile in the `hospitals` table.
* The hospital can then use their dashboard to onboard **Pregnant Women, Nurses, and Midwives**.

---

> [!TIP]
> **Why this is better than manual DB entry:**
> - You don't have to manage plain-text passwords (security risk).
> - Hospitals get professional "Welcome" emails automatically.
> - You maintain 100% control over who gets in.
