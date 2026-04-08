# MaternalCare Plus - Professional Antenatal Care System

A comprehensive digital platform for managing antenatal care, replacing traditional paper-based maternity books with a modern, premium web application.

## Features

### For Pregnant Women
- Digital pregnancy tracking and monitoring
- Appointment scheduling and reminders
- Lab results tracking with mandatory test monitoring
- Educational resources and health advice
- Direct chat support from midwives
- Mobile-first design for easy access

### For Hospitals & Healthcare Providers
- Patient onboarding and management
- Complete antenatal record management
- Appointment scheduling system
- Lab results management
- Real-time patient monitoring

### For Fathers/Partners
- Shared access to pregnancy progress
- Appointment tracking
- Educational resources

### For Midwives
- Real-time chat support system
- Patient monitoring
- Appointment management

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Authentication**: Clerk (multi-role authentication)
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Communication**: Twilio (SMS and chat)
- **UI**: Tailwind CSS, Radix UI components
- **Charts**: Recharts for pregnancy tracking visualizations

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Neon, Clerk, and Twilio credentials.

4. Set up the database:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

## Database Schema

The application uses a comprehensive database schema including:
- Users (pregnant women, fathers, midwives, hospital staff)
- Pregnancies and medical records
- Appointments and scheduling
- Lab results and mandatory tests
- Educational content
- Chat messages and support

## Deployment

This application is designed to be deployed on Vercel with Neon as the database provider.

## Contributing

This project aims to improve maternal healthcare access through digital innovation.
