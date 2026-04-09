import { pgTable, foreignKey, unique, pgEnum, uuid, text, timestamp, boolean, integer, json, numeric } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const userRole = pgEnum("user_role", ['admin', 'hospital_staff', 'midwife', 'father', 'pregnant_woman'])
export const pregnancyStatus = pgEnum("pregnancy_status", ['terminated', 'complicated', 'completed', 'active'])
export const appointmentStatus = pgEnum("appointment_status", ['missed', 'cancelled', 'completed', 'scheduled'])
export const labStatus = pgEnum("lab_status", ['critical', 'abnormal', 'completed', 'pending'])
export const messageStatus = pgEnum("message_status", ['read', 'delivered', 'sent'])


export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	clerkId: text("clerk_id").notNull(),
	email: text("email").notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	phone: text("phone"),
	role: userRole("role").notNull(),
	dateOfBirth: timestamp("date_of_birth", { mode: 'string' }),
	address: text("address"),
	region: text("region"),
	city: text("city"),
	emergencyContact: text("emergency_contact"),
	emergencyPhone: text("emergency_phone"),
	isVerified: boolean("is_verified").default(false),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	hospitalId: uuid("hospital_id").references(() => hospitals.id),
},
(table) => {
	return {
		usersClerkIdUnique: unique("users_clerk_id_unique").on(table.clerkId),
	}
});

export const hospitals = pgTable("hospitals", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	code: text("code").notNull(),
	address: text("address").notNull(),
	region: text("region").notNull(),
	city: text("city").notNull(),
	phone: text("phone").notNull(),
	email: text("email"),
	type: text("type").notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		hospitalsCodeUnique: unique("hospitals_code_unique").on(table.code),
	}
});

export const pregnancies = pgTable("pregnancies", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull().references(() => users.id),
	hospitalId: uuid("hospital_id").notNull().references(() => hospitals.id),
	gravidity: integer("gravidity").notNull(),
	parity: integer("parity").notNull(),
	lmp: timestamp("lmp", { mode: 'string' }).notNull(),
	edd: timestamp("edd", { mode: 'string' }).notNull(),
	gestationalAge: integer("gestational_age"),
	status: pregnancyStatus("status").default('active'),
	riskFactors: json("risk_factors"),
	medications: json("medications"),
	allergies: json("allergies"),
	medicalHistory: text("medical_history"),
	surgicalHistory: text("surgical_history"),
	familyHistory: text("family_history"),
	socialHistory: text("social_history"),
	bloodType: text("blood_type"),
	rhesusFactor: text("rhesus_factor"),
	height: numeric("height", { precision: 5, scale:  2 }),
	prePregnancyWeight: numeric("pre_pregnancy_weight", { precision: 5, scale:  2 }),
	fatherJoinCode: text("father_join_code"),
	fatherJoinCodeExpires: timestamp("father_join_code_expires", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		pregnanciesFatherJoinCodeUnique: unique("pregnancies_father_join_code_unique").on(table.fatherJoinCode),
	}
});

export const appointments = pgTable("appointments", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	pregnancyId: uuid("pregnancy_id").notNull().references(() => pregnancies.id),
	hospitalId: uuid("hospital_id").notNull().references(() => hospitals.id),
	midwifeId: uuid("midwife_id").references(() => users.id),
	scheduledDate: timestamp("scheduled_date", { mode: 'string' }).notNull(),
	actualDate: timestamp("actual_date", { mode: 'string' }),
	weight: numeric("weight", { precision: 5, scale:  2 }),
	bloodPressure: text("blood_pressure"),
	fundalHeight: numeric("fundal_height", { precision: 5, scale:  2 }),
	fetalHeartRate: integer("fetal_heart_rate"),
	presentation: text("presentation"),
	findings: text("findings"),
	recommendations: text("recommendations"),
	nextVisitDate: timestamp("next_visit_date", { mode: 'string' }),
	status: appointmentStatus("status").default('scheduled'),
	notes: text("notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	gestationalAge: integer("gestational_age"),
	edema: text("edema"),
	proteinuria: text("proteinuria"),
	glucose: text("glucose"),
	hemoglobin: numeric("hemoglobin", { precision: 5, scale:  2 }),
});

export const labTests = pgTable("lab_tests", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	pregnancyId: uuid("pregnancy_id").notNull().references(() => pregnancies.id),
	testName: text("test_name").notNull(),
	testCode: text("test_code"),
	isMandatory: boolean("is_mandatory").default(false),
	dueGestationalAge: integer("due_gestational_age"),
	orderedDate: timestamp("ordered_date", { mode: 'string' }),
	sampleDate: timestamp("sample_date", { mode: 'string' }),
	resultDate: timestamp("result_date", { mode: 'string' }),
	resultValue: text("result_value"),
	normalRange: text("normal_range"),
	status: labStatus("status").default('pending'),
	interpretation: text("interpretation"),
	orderedBy: uuid("ordered_by").references(() => users.id),
	performedBy: uuid("performed_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const educationalResources = pgTable("educational_resources", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	title: text("title").notNull(),
	content: text("content").notNull(),
	category: text("category").notNull(),
	gestationalAgeStart: integer("gestational_age_start"),
	gestationalAgeEnd: integer("gestational_age_end"),
	language: text("language").default('english'),
	isPublished: boolean("is_published").default(true),
	authorId: uuid("author_id").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const partnerAccess = pgTable("partner_access", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	pregnantWomanId: uuid("pregnant_woman_id").notNull().references(() => users.id),
	partnerId: uuid("partner_id").notNull().references(() => users.id),
	pregnancyId: uuid("pregnancy_id").notNull().references(() => pregnancies.id),
	canViewAppointments: boolean("can_view_appointments").default(true),
	canViewLabResults: boolean("can_view_lab_results").default(true),
	canViewProgress: boolean("can_view_progress").default(true),
	canReceiveNotifications: boolean("can_receive_notifications").default(true),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const vitalSigns = pgTable("vital_signs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	pregnancyId: uuid("pregnancy_id").notNull().references(() => pregnancies.id),
	recordedDate: timestamp("recorded_date", { mode: 'string' }).notNull(),
	weight: numeric("weight", { precision: 5, scale:  2 }),
	bloodPressureSystolic: integer("blood_pressure_systolic"),
	bloodPressureDiastolic: integer("blood_pressure_diastolic"),
	heartRate: integer("heart_rate"),
	temperature: numeric("temperature", { precision: 4, scale:  2 }),
	oxygenSaturation: integer("oxygen_saturation"),
	recordedBy: uuid("recorded_by").references(() => users.id),
	notes: text("notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const mandatoryLabTests = pgTable("mandatory_lab_tests", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	testName: text("test_name").notNull(),
	testCode: text("test_code").notNull(),
	description: text("description"),
	dueGestationalAge: integer("due_gestational_age").notNull(),
	normalRange: text("normal_range"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const notifications = pgTable("notifications", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull().references(() => users.id),
	pregnancyId: uuid("pregnancy_id").references(() => pregnancies.id),
	title: text("title").notNull(),
	message: text("message").notNull(),
	type: text("type").notNull(),
	scheduledFor: timestamp("scheduled_for", { mode: 'string' }),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	isRead: boolean("is_read").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const riskFactors = pgTable("risk_factors", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	description: text("description"),
	category: text("category"),
	severity: text("severity"),
	managementProtocol: text("management_protocol"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const messages = pgTable("messages", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	senderId: uuid("sender_id").notNull().references(() => users.id),
	receiverId: uuid("receiver_id").notNull().references(() => users.id),
	pregnancyId: uuid("pregnancy_id").references(() => pregnancies.id),
	content: text("content").notNull(),
	messageType: text("message_type").default('text'),
	status: messageStatus("status").default('sent'),
	isUrgent: boolean("is_urgent").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	readAt: timestamp("read_at", { mode: 'string' }),
});