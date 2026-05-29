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
  ghanaCardId: text('ghana_card_id').unique(),
  nhisNumber: text('nhis_number'),
  nhisExpiryDate: timestamp('nhis_expiry_date'),
  emergencyContact: text('emergency_contact'),
  emergencyPhone: text('emergency_phone'),
  isVerified: boolean('is_verified').default(false),
  isActive: boolean('is_active').default(true),
  hospitalId: uuid('hospital_id').references(() => hospitals.id),
  lastShiftCodeVerified: text('last_shift_code_verified'),
  lastShiftCodeVerifiedAt: timestamp('last_shift_code_verified_at'),
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
  latitude: decimal('latitude', { precision: 9, scale: 6 }),
  longitude: decimal('longitude', { precision: 9, scale: 6 }),
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  shiftCode: text('shift_code'),
  shiftCodeExpiresAt: timestamp('shift_code_expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Staff Login and Audit Logs
export const staffLoginLogs = pgTable('staff_login_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  hospitalId: uuid('hospital_id').references(() => hospitals.id).notNull(),
  loginTime: timestamp('login_time').defaultNow().notNull(),
  logoutTime: timestamp('logout_time'),
  sessionDuration: integer('session_duration'), // in seconds
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  status: text('status').default('active').notNull(), // 'active', 'expired', 'logged_out'
})

// Pregnancies table
export const pregnancies = pgTable('pregnancies', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  hospitalId: uuid('hospital_id').references(() => hospitals.id).notNull(),
  midwifeId: uuid('midwife_id').references(() => users.id), // Assigned primary midwife
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
  iptpDoses: integer('iptp_doses').default(0), // Malaria prevention doses
  ttDoses: integer('tt_doses').default(0), // Tetanus Toxoid doses
  itnDistributed: boolean('itn_distributed').default(false), // Mosquito net
  mchData: json('mch_data').$type<any>(), // MCH Book counselling checklists and extra data
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
  attachmentUrl: text('attachment_url'),
  attachmentName: text('attachment_name'),
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

// MCH Book specific tables
export const previousPregnancies = pgTable('previous_pregnancies', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  year: integer('year').notNull(),
  pregnancyDuration: integer('pregnancy_duration'), // Weeks
  modeOfDelivery: text('mode_of_delivery'), // SVD, C-Section, etc.
  birthWeight: decimal('birth_weight', { precision: 5, scale: 2 }), // kg
  sex: text('sex'), // Male, Female
  alive: boolean('alive').default(true),
  complications: text('complications'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const deliveries = pgTable('deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  pregnancyId: uuid('pregnancy_id').references(() => pregnancies.id).notNull(),
  hospitalId: uuid('hospital_id').references(() => hospitals.id).notNull(),
  deliveryDate: timestamp('delivery_date').notNull(),
  modeOfDelivery: text('mode_of_delivery').notNull(),
  apgarScore1Min: integer('apgar_score_1min'),
  apgarScore5Min: integer('apgar_score_5min'),
  bloodLoss: integer('blood_loss'), // ml
  maternalComplications: text('maternal_complications'),
  neonatalComplications: text('neonatal_complications'),
  deliveredBy: uuid('delivered_by').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const postnatalCare = pgTable('postnatal_care', {
  id: uuid('id').defaultRandom().primaryKey(),
  pregnancyId: uuid('pregnancy_id').references(() => pregnancies.id).notNull(),
  visitPeriod: text('visit_period').notNull(), // '48hours', '1week', '6weeks'
  visitDate: timestamp('visit_date').notNull(),
  maternalCondition: text('maternal_condition'),
  lochia: text('lochia'),
  perineum: text('perineum'),
  breastfeedingStatus: text('breastfeeding_status'),
  babyCondition: text('baby_condition'),
  umbilicalCord: text('umbilical_cord'),
  familyPlanningMethod: text('family_planning_method'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const children = pgTable('children', {
  id: uuid('id').defaultRandom().primaryKey(),
  pregnancyId: uuid('pregnancy_id').references(() => pregnancies.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(), // The mother's ID
  firstName: text('first_name'),
  lastName: text('last_name'),
  dateOfBirth: timestamp('date_of_birth').notNull(),
  sex: text('sex').notNull(),
  birthWeight: decimal('birth_weight', { precision: 5, scale: 2 }), // kg
  birthLength: decimal('birth_length', { precision: 5, scale: 2 }), // cm
  createdAt: timestamp('created_at').defaultNow(),
})

export const immunizations = pgTable('immunizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  childId: uuid('child_id').references(() => children.id).notNull(),
  vaccineName: text('vaccine_name').notNull(), // BCG, OPV0, Penta1, etc.
  doseNumber: integer('dose_number').default(1),
  targetAge: text('target_age'), // 'Birth', '6 Weeks', etc.
  dateAdministered: timestamp('date_administered'),
  batchNumber: text('batch_number'),
  administeredBy: uuid('administered_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
})

export const childGrowth = pgTable('child_growth', {
  id: uuid('id').defaultRandom().primaryKey(),
  childId: uuid('child_id').references(() => children.id).notNull(),
  recordDate: timestamp('record_date').notNull(),
  ageInMonths: integer('age_in_months').notNull(),
  weight: decimal('weight', { precision: 5, scale: 2 }), // kg
  height: decimal('height', { precision: 5, scale: 2 }), // cm
  headCircumference: decimal('head_circumference', { precision: 5, scale: 2 }), // cm
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

export type PreviousPregnancy = typeof previousPregnancies.$inferSelect
export type Delivery = typeof deliveries.$inferSelect
export type PostnatalCare = typeof postnatalCare.$inferSelect
export type Child = typeof children.$inferSelect
export type Immunization = typeof immunizations.$inferSelect
export type ChildGrowth = typeof childGrowth.$inferSelect

// Hospital Invites table
export const hospitalInvites = pgTable('hospital_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  token: text('token').unique().notNull(),
  hospitalName: text('hospital_name').notNull(),
  status: text('status').default('pending'), // 'pending', 'accepted', 'expired'
  sentAt: timestamp('sent_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
})

export type HospitalInvite = typeof hospitalInvites.$inferSelect
export type NewHospitalInvite = typeof hospitalInvites.$inferInsert

/** National MCH trail when a mother receives care at multiple facilities */
export const hospitalCareEncounters = pgTable('hospital_care_encounters', {
  id: uuid('id').defaultRandom().primaryKey(),
  pregnancyId: uuid('pregnancy_id').references(() => pregnancies.id).notNull(),
  patientUserId: uuid('patient_user_id').references(() => users.id).notNull(),
  hospitalId: uuid('hospital_id').references(() => hospitals.id).notNull(),
  homeHospitalId: uuid('home_hospital_id').references(() => hospitals.id).notNull(),
  isVisitingFacility: boolean('is_visiting_facility').default(false).notNull(),
  staffUserId: uuid('staff_user_id').references(() => users.id),
  action: text('action').notNull(),
  summary: text('summary').notNull(),
  metadata: json('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow(),
})

export type HospitalCareEncounter = typeof hospitalCareEncounters.$inferSelect
export type NewHospitalCareEncounter = typeof hospitalCareEncounters.$inferInsert

// Partnership requests from hospitals seeking access
export const partnershipRequests = pgTable('partnership_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  hospitalName: text('hospital_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  city: text('city'),
  region: text('region'),
  notes: text('notes'),
  status: text('status').default('pending'), // 'pending', 'approved', 'contacted'
  createdAt: timestamp('created_at').defaultNow(),
})

export type PartnershipRequest = typeof partnershipRequests.$inferSelect
export type NewPartnershipRequest = typeof partnershipRequests.$inferInsert

