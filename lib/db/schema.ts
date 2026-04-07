import { pgTable, text, timestamp, uuid, integer, boolean, json, pgEnum, decimal } from 'drizzle-orm/pg-core'

// Enums for user roles and pregnancy status
export const userRoleEnum = pgEnum('user_role', ['pregnant_woman', 'father', 'midwife', 'hospital_staff', 'admin'])
export const pregnancyStatusEnum = pgEnum('pregnancy_status', ['active', 'completed', 'complicated', 'terminated'])
export const appointmentStatusEnum = pgEnum('appointment_status', ['scheduled', 'completed', 'cancelled', 'missed'])
export const labStatusEnum = pgEnum('lab_status', ['pending', 'completed', 'abnormal', 'critical'])
export const messageStatusEnum = pgEnum('message_status', ['sent', 'delivered', 'read'])

// Users table - stores all user types
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  role: userRoleEnum('role').notNull(),
  dateOfBirth: timestamp('date_of_birth'),
  address: text('address'),
  region: text('region'), // Ghana region
  city: text('city'),
  emergencyContact: text('emergency_contact'),
  emergencyPhone: text('emergency_phone'),
  isVerified: boolean('is_verified').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Hospitals/Health Centers
export const hospitals = pgTable('hospitals', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code').unique().notNull(), // Hospital facility code
  address: text('address').notNull(),
  region: text('region').notNull(),
  city: text('city').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  type: text('type').notNull(), // Hospital, Health Center, Clinic
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Pregnancies table
export const pregnancies = pgTable('pregnancies', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  hospitalId: uuid('hospital_id').references(() => hospitals.id).notNull(),
  gravidity: integer('gravidity').notNull(), // Number of pregnancies
  parity: integer('parity').notNull(), // Number of births
  lmp: timestamp('lmp').notNull(), // Last menstrual period
  edd: timestamp('edd').notNull(), // Expected date of delivery
  gestationalAge: integer('gestational_age'), // Current gestational age in weeks
  status: pregnancyStatusEnum('status').default('active'),
  riskFactors: json('risk_factors').$type<string[]>(), // Array of risk factors
  medications: json('medications').$type<string[]>(), // Current medications
  allergies: json('allergies').$type<string[]>(), // Allergies
  medicalHistory: text('medical_history'), // Previous medical conditions
  surgicalHistory: text('surgical_history'), // Previous surgeries
  familyHistory: text('family_history'), // Family medical history
  socialHistory: text('social_history'), // Social history (smoking, alcohol, etc)
  bloodType: text('blood_type'),
  rhesusFactor: text('rhesus_factor'), // Positive or Negative
  height: decimal('height', { precision: 5, scale: 2 }), // in cm
  prePregnancyWeight: decimal('pre_pregnancy_weight', { precision: 5, scale: 2 }), // in kg
  fatherJoinCode: text('father_join_code').unique(),
  fatherJoinCodeExpires: timestamp('father_join_code_expires'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Antenatal visits/appointments
export const appointments = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  pregnancyId: uuid('pregnancy_id').references(() => pregnancies.id).notNull(),
  hospitalId: uuid('hospital_id').references(() => hospitals.id).notNull(),
  midwifeId: uuid('midwife_id').references(() => users.id), // Assigned midwife
  scheduledDate: timestamp('scheduled_date').notNull(),
  actualDate: timestamp('actual_date'), // When the visit actually happened
  gestationalAge: integer('gestational_age'), // Gestational age at time of visit
  weight: decimal('weight', { precision: 5, scale: 2 }), // Current weight
  bloodPressure: text('blood_pressure'), // e.g., "120/80"
  fundalHeight: decimal('fundal_height', { precision: 5, scale: 2 }), // in cm
  fetalHeartRate: integer('fetal_heart_rate'), // bpm
  presentation: text('presentation'), // Fetal presentation
  edema: text('edema'), // Edema assessment
  proteinuria: text('proteinuria'), // Protein in urine
  glucose: text('glucose'), // Glucose levels
  hemoglobin: decimal('hemoglobin', { precision: 5, scale: 2 }), // g/dL
  findings: text('findings'), // Clinical findings
  recommendations: text('recommendations'), // Recommendations given
  nextVisitDate: timestamp('next_visit_date'),
  status: appointmentStatusEnum('status').default('scheduled'),
  notes: text('notes'), // Additional notes
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Lab tests and results
export const labTests = pgTable('lab_tests', {
  id: uuid('id').defaultRandom().primaryKey(),
  pregnancyId: uuid('pregnancy_id').references(() => pregnancies.id).notNull(),
  testName: text('test_name').notNull(),
  testCode: text('test_code'), // Standard test code
  isMandatory: boolean('is_mandatory').default(false), // Whether this is a mandatory test
  dueGestationalAge: integer('due_gestational_age'), // When this test should be done
  orderedDate: timestamp('ordered_date'),
  sampleDate: timestamp('sample_date'),
  resultDate: timestamp('result_date'),
  resultValue: text('result_value'), // The actual result
  normalRange: text('normal_range'), // Normal reference range
  status: labStatusEnum('status').default('pending'),
  interpretation: text('interpretation'), // Clinical interpretation
  orderedBy: uuid('ordered_by').references(() => users.id), // Who ordered the test
  performedBy: uuid('performed_by').references(() => users.id), // Who performed the test
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Mandatory lab tests template
export const mandatoryLabTests = pgTable('mandatory_lab_tests', {
  id: uuid('id').defaultRandom().primaryKey(),
  testName: text('test_name').notNull(),
  testCode: text('test_code').notNull(),
  description: text('description'),
  dueGestationalAge: integer('due_gestational_age').notNull(), // When this should be done
  normalRange: text('normal_range'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

// Educational resources
export const educationalResources = pgTable('educational_resources', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull(), // nutrition, exercise, warning signs, etc
  gestationalAgeStart: integer('gestational_age_start'), // Relevant from this week
  gestationalAgeEnd: integer('gestational_age_end'), // Relevant until this week
  language: text('language').default('english'),
  isPublished: boolean('is_published').default(true),
  authorId: uuid('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Chat messages between patients and midwives
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  receiverId: uuid('receiver_id').references(() => users.id).notNull(),
  pregnancyId: uuid('pregnancy_id').references(() => pregnancies.id),
  content: text('content').notNull(),
  messageType: text('message_type').default('text'), // text, image, document
  status: messageStatusEnum('status').default('sent'),
  isUrgent: boolean('is_urgent').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  readAt: timestamp('read_at'),
})

// Father/partner access permissions
export const partnerAccess = pgTable('partner_access', {
  id: uuid('id').defaultRandom().primaryKey(),
  pregnantWomanId: uuid('pregnant_woman_id').references(() => users.id).notNull(),
  partnerId: uuid('partner_id').references(() => users.id).notNull(),
  pregnancyId: uuid('pregnancy_id').references(() => pregnancies.id).notNull(),
  canViewAppointments: boolean('can_view_appointments').default(true),
  canViewLabResults: boolean('can_view_lab_results').default(true),
  canViewProgress: boolean('can_view_progress').default(true),
  canReceiveNotifications: boolean('can_receive_notifications').default(true),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Notifications and reminders
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  pregnancyId: uuid('pregnancy_id').references(() => pregnancies.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(), // appointment_reminder, lab_result, educational, etc
  scheduledFor: timestamp('scheduled_for'),
  sentAt: timestamp('sent_at'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
})

// Risk factors tracking
export const riskFactors = pgTable('risk_factors', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'), // medical, obstetric, social
  severity: text('severity'), // low, medium, high
  managementProtocol: text('management_protocol'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

// Vital signs tracking
export const vitalSigns = pgTable('vital_signs', {
  id: uuid('id').defaultRandom().primaryKey(),
  pregnancyId: uuid('pregnancy_id').references(() => pregnancies.id).notNull(),
  recordedDate: timestamp('recorded_date').notNull(),
  weight: decimal('weight', { precision: 5, scale: 2 }),
  bloodPressureSystolic: integer('blood_pressure_systolic'),
  bloodPressureDiastolic: integer('blood_pressure_diastolic'),
  heartRate: integer('heart_rate'),
  temperature: decimal('temperature', { precision: 4, scale: 2 }),
  oxygenSaturation: integer('oxygen_saturation'),
  recordedBy: uuid('recorded_by').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Pregnancy = typeof pregnancies.$inferSelect
export type NewPregnancy = typeof pregnancies.$inferInsert
export type Appointment = typeof appointments.$inferSelect
export type NewAppointment = typeof appointments.$inferInsert
export type LabTest = typeof labTests.$inferSelect
export type NewLabTest = typeof labTests.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type EducationalResource = typeof educationalResources.$inferSelect
export type NewEducationalResource = typeof educationalResources.$inferInsert
export type PartnerAccess = typeof partnerAccess.$inferSelect
export type NewPartnerAccess = typeof partnerAccess.$inferInsert
export type VitalSign = typeof vitalSigns.$inferSelect
export type NewVitalSign = typeof vitalSigns.$inferInsert
