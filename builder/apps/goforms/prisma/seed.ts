import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const d = (s: string) => new Date(s);

async function main() {
  const password = await hash(
    process.env.GO4IT_ADMIN_PASSWORD || crypto.randomUUID(),
    12
  );
  const admin = await prisma.user.upsert({
    where: { email: "admin@go4it.live" },
    update: {},
    create: {
      id: "preview",
      email: "admin@go4it.live",
      name: "Evergreen Admin",
      password,
      role: "admin",
    },
  });
  console.log("Seeded admin user.");

  // ── Form 1: Client Intake Form ──────────────────────────────────────────
  const form1 = await prisma.form.create({
    data: {
      userId: admin.id,
      title: "Client Intake Form",
      description: "Please complete this form before your first appointment so we can provide the best experience.",
      type: "FORM",
      status: "ACTIVE",
      slug: "client-intake-form",
      requireName: true,
      requireEmail: true,
      allowMultiple: false,
      createdAt: d("2025-12-01"),
    },
  });

  const [f1n, f1e, f1p, f1d, f1a, f1s, f1fv, f1r] = await Promise.all([
    prisma.formField.create({ data: { userId: admin.id, formId: form1.id, label: "Full Name", type: "TEXT", required: true, placeholder: "Your full name", order: 0 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form1.id, label: "Email Address", type: "EMAIL", required: true, placeholder: "your@email.com", order: 1 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form1.id, label: "Phone Number", type: "TEXT", required: false, placeholder: "(555) 000-0000", order: 2 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form1.id, label: "Date of Birth", type: "DATE", required: false, order: 3 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form1.id, label: "Allergies & Health Conditions", type: "TEXTAREA", required: false, placeholder: "List any allergies, skin conditions, or health concerns", order: 4 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form1.id, label: "Preferred Services", type: "MULTI_SELECT", required: false, options: JSON.stringify(["Massage", "Facial", "Body Wrap", "Aromatherapy"]), order: 5 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form1.id, label: "Is this your first visit?", type: "CHECKBOX", required: false, order: 6 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form1.id, label: "How did you hear about us?", type: "SELECT", required: false, options: JSON.stringify(["Google", "Friend", "Social Media", "Other"]), order: 7 } }),
  ]);

  // ── Form 2: Post-Visit Satisfaction Survey ──────────────────────────────
  const form2 = await prisma.form.create({
    data: {
      userId: admin.id,
      title: "Post-Visit Satisfaction Survey",
      description: "We value your feedback! Please take a moment to share your experience with us.",
      type: "SURVEY",
      status: "ACTIVE",
      slug: "post-visit-satisfaction-survey",
      requireName: false,
      requireEmail: false,
      allowMultiple: true,
      createdAt: d("2025-12-01"),
    },
  });

  const [g1, g2, g3, g4, g5, g6] = await Promise.all([
    prisma.formField.create({ data: { userId: admin.id, formId: form2.id, label: "Overall Experience", type: "RATING", required: true, order: 0 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form2.id, label: "Staff Friendliness", type: "RATING", required: false, order: 1 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form2.id, label: "Facility Cleanliness", type: "RATING", required: false, order: 2 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form2.id, label: "Value for Money", type: "RATING", required: false, order: 3 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form2.id, label: "Would you recommend us?", type: "RADIO", required: false, options: JSON.stringify(["Yes", "No", "Maybe"]), order: 4 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form2.id, label: "Additional Feedback", type: "TEXTAREA", required: false, placeholder: "Share any other thoughts or suggestions...", order: 5 } }),
  ]);

  // ── Form 3: Event Planning Checklist ────────────────────────────────────
  const form3 = await prisma.form.create({
    data: {
      userId: admin.id,
      title: "Event Planning Checklist",
      description: "Internal checklist for preparing wellness events and workshops.",
      type: "CHECKLIST",
      status: "DRAFT",
      slug: "event-planning-checklist",
      requireName: true,
      requireEmail: false,
      allowMultiple: false,
      createdAt: d("2026-01-15"),
    },
  });

  await Promise.all([
    prisma.formField.create({ data: { userId: admin.id, formId: form3.id, label: "Venue confirmed", type: "CHECKBOX", required: false, order: 0 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form3.id, label: "Catering ordered", type: "CHECKBOX", required: false, order: 1 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form3.id, label: "Invitations sent", type: "CHECKBOX", required: false, order: 2 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form3.id, label: "Decorations ready", type: "CHECKBOX", required: false, order: 3 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form3.id, label: "Notes", type: "TEXTAREA", required: false, placeholder: "Any additional notes or reminders...", order: 4 } }),
  ]);

  // ── Form 4: Monthly Newsletter Signup ───────────────────────────────────
  const form4 = await prisma.form.create({
    data: {
      userId: admin.id,
      title: "Monthly Newsletter Signup",
      description: "Stay up to date with our latest wellness tips, promotions, and new services.",
      type: "FORM",
      status: "ARCHIVED",
      slug: "monthly-newsletter-signup",
      requireName: true,
      requireEmail: true,
      allowMultiple: false,
      createdAt: d("2025-11-01"),
    },
  });

  const [h1, h2, h3] = await Promise.all([
    prisma.formField.create({ data: { userId: admin.id, formId: form4.id, label: "Full Name", type: "TEXT", required: true, placeholder: "Your full name", order: 0 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form4.id, label: "Email Address", type: "EMAIL", required: true, placeholder: "your@email.com", order: 1 } }),
    prisma.formField.create({ data: { userId: admin.id, formId: form4.id, label: "Topics of Interest", type: "MULTI_SELECT", required: false, options: JSON.stringify(["Wellness Tips", "Promotions", "New Services", "Seasonal Events"]), order: 2 } }),
  ]);

  console.log("Seeded forms and fields.");

  const mkResp = (fieldId: string, value: string) => ({ fieldId, value, userId: admin.id });

  // ── Submissions: Client Intake Form (6) ─────────────────────────────────
  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form1.id,
      respondentName: "Sarah Johnson", respondentEmail: "sarah.johnson@email.com",
      status: "REVIEWED", createdAt: d("2026-02-01"),
      fieldResponses: { create: [
        mkResp(f1n.id, "Sarah Johnson"), mkResp(f1e.id, "sarah.johnson@email.com"),
        mkResp(f1p.id, "(555) 010-1234"), mkResp(f1d.id, "1985-03-15"),
        mkResp(f1a.id, "Nut allergy — please use nut-free oils and products"),
        mkResp(f1s.id, JSON.stringify(["Massage", "Facial"])),
        mkResp(f1fv.id, "true"), mkResp(f1r.id, "Google"),
      ]},
    },
  });

  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form1.id,
      respondentName: "Mike Chen", respondentEmail: "mike.chen@email.com",
      status: "COMPLETE", createdAt: d("2026-02-03"),
      fieldResponses: { create: [
        mkResp(f1n.id, "Mike Chen"), mkResp(f1e.id, "mike.chen@email.com"),
        mkResp(f1p.id, "(555) 020-5678"), mkResp(f1d.id, "1978-07-22"),
        mkResp(f1a.id, "None"),
        mkResp(f1s.id, JSON.stringify(["Body Wrap", "Aromatherapy"])),
        mkResp(f1fv.id, "false"), mkResp(f1r.id, "Friend"),
      ]},
    },
  });

  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form1.id,
      respondentName: "Emma Williams", respondentEmail: "emma.williams@email.com",
      status: "COMPLETE", createdAt: d("2026-02-05"),
      fieldResponses: { create: [
        mkResp(f1n.id, "Emma Williams"), mkResp(f1e.id, "emma.williams@email.com"),
        mkResp(f1p.id, "(555) 030-9012"), mkResp(f1d.id, "1992-11-08"),
        mkResp(f1a.id, "Sensitive skin — please use gentle, fragrance-free products"),
        mkResp(f1s.id, JSON.stringify(["Facial"])),
        mkResp(f1fv.id, "true"), mkResp(f1r.id, "Social Media"),
      ]},
    },
  });

  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form1.id,
      respondentName: "David Rodriguez", respondentEmail: "d.rodriguez@email.com",
      status: "FLAGGED",
      notes: "Latex allergy flagged — ensure all staff are notified before appointment",
      createdAt: d("2026-02-08"),
      fieldResponses: { create: [
        mkResp(f1n.id, "David Rodriguez"), mkResp(f1e.id, "d.rodriguez@email.com"),
        mkResp(f1p.id, "(555) 040-3456"), mkResp(f1d.id, "1966-04-30"),
        mkResp(f1a.id, "Latex allergy — CRITICAL, please ensure no latex gloves are used"),
        mkResp(f1s.id, JSON.stringify(["Massage", "Aromatherapy"])),
        mkResp(f1fv.id, "false"), mkResp(f1r.id, "Google"),
      ]},
    },
  });

  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form1.id,
      respondentName: "Jennifer Lee", respondentEmail: "j.lee@email.com",
      status: "COMPLETE", createdAt: d("2026-02-12"),
      fieldResponses: { create: [
        mkResp(f1n.id, "Jennifer Lee"), mkResp(f1e.id, "j.lee@email.com"),
        mkResp(f1p.id, "(555) 050-7890"), mkResp(f1d.id, "1990-09-12"),
        mkResp(f1a.id, "No known allergies"),
        mkResp(f1s.id, JSON.stringify(["Body Wrap", "Facial"])),
        mkResp(f1fv.id, "true"), mkResp(f1r.id, "Friend"),
      ]},
    },
  });

  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form1.id,
      respondentName: "Robert Taylor", respondentEmail: "r.taylor@email.com",
      status: "REVIEWED", createdAt: d("2026-02-20"),
      fieldResponses: { create: [
        mkResp(f1n.id, "Robert Taylor"), mkResp(f1e.id, "r.taylor@email.com"),
        mkResp(f1p.id, "(555) 060-2345"), mkResp(f1d.id, "1975-01-25"),
        mkResp(f1a.id, "None"),
        mkResp(f1s.id, JSON.stringify(["Massage"])),
        mkResp(f1fv.id, "false"), mkResp(f1r.id, "Other"),
      ]},
    },
  });

  // ── Submissions: Post-Visit Satisfaction Survey (8) ─────────────────────
  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form2.id,
      respondentName: "Alice Brown", respondentEmail: "alice.brown@email.com",
      status: "COMPLETE", createdAt: d("2026-02-10"),
      fieldResponses: { create: [
        mkResp(g1.id, "4"), mkResp(g2.id, "5"), mkResp(g3.id, "5"), mkResp(g4.id, "4"),
        mkResp(g5.id, "Yes"), mkResp(g6.id, "Wonderful experience, the staff was so welcoming!"),
      ]},
    },
  });

  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form2.id,
      respondentName: "Tom Davis", respondentEmail: "tom.davis@email.com",
      status: "COMPLETE", createdAt: d("2026-02-14"),
      fieldResponses: { create: [
        mkResp(g1.id, "5"), mkResp(g2.id, "5"), mkResp(g3.id, "5"), mkResp(g4.id, "5"),
        mkResp(g5.id, "Yes"), mkResp(g6.id, "Absolutely amazing, will definitely be back soon!"),
      ]},
    },
  });

  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form2.id,
      respondentName: "Maria Garcia", respondentEmail: "maria.garcia@email.com",
      status: "REVIEWED", createdAt: d("2026-02-14"),
      fieldResponses: { create: [
        mkResp(g1.id, "3"), mkResp(g2.id, "4"), mkResp(g3.id, "4"), mkResp(g4.id, "3"),
        mkResp(g5.id, "Maybe"), mkResp(g6.id, "Service was good but wait time was over 20 minutes past my appointment"),
      ]},
    },
  });

  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form2.id,
      respondentName: "James Wilson", respondentEmail: "j.wilson@email.com",
      status: "COMPLETE", createdAt: d("2026-02-18"),
      fieldResponses: { create: [
        mkResp(g1.id, "4"), mkResp(g2.id, "4"), mkResp(g3.id, "5"), mkResp(g4.id, "4"),
        mkResp(g5.id, "Yes"), mkResp(g6.id, "Very relaxing session, exactly what I needed"),
      ]},
    },
  });

  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form2.id,
      respondentName: "Patricia Moore", respondentEmail: "p.moore@email.com",
      status: "COMPLETE", createdAt: d("2026-02-20"),
      fieldResponses: { create: [
        mkResp(g1.id, "5"), mkResp(g2.id, "5"), mkResp(g3.id, "5"), mkResp(g4.id, "4"),
        mkResp(g5.id, "Yes"), mkResp(g6.id, "Best spa experience I've had in years, exceptional service"),
      ]},
    },
  });

  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form2.id,
      respondentName: "Chris Anderson", respondentEmail: "c.anderson@email.com",
      status: "FLAGGED",
      notes: "Very low rating — flagged for follow-up regarding cleanliness and service quality",
      createdAt: d("2026-02-22"),
      fieldResponses: { create: [
        mkResp(g1.id, "2"), mkResp(g2.id, "3"), mkResp(g3.id, "3"), mkResp(g4.id, "2"),
        mkResp(g5.id, "No"), mkResp(g6.id, "Disappointed with the cleanliness standards and felt the staff seemed rushed and inattentive"),
      ]},
    },
  });

  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form2.id,
      respondentName: "Linda Martinez", respondentEmail: "l.martinez@email.com",
      status: "COMPLETE", createdAt: d("2026-02-25"),
      fieldResponses: { create: [
        mkResp(g1.id, "4"), mkResp(g2.id, "5"), mkResp(g3.id, "4"), mkResp(g4.id, "4"),
        mkResp(g5.id, "Yes"), mkResp(g6.id, "Lovely staff and very professional service"),
      ]},
    },
  });

  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form2.id,
      respondentName: "Kevin Jackson", respondentEmail: "k.jackson@email.com",
      status: "COMPLETE", createdAt: d("2026-02-28"),
      fieldResponses: { create: [
        mkResp(g1.id, "5"), mkResp(g2.id, "4"), mkResp(g3.id, "5"), mkResp(g4.id, "5"),
        mkResp(g5.id, "Yes"), mkResp(g6.id, "Exceptional service and beautiful facility, highly recommend"),
      ]},
    },
  });

  // ── Submissions: Monthly Newsletter Signup (1) ───────────────────────────
  await prisma.submission.create({
    data: {
      userId: admin.id, formId: form4.id,
      respondentName: "Anna Thompson", respondentEmail: "anna.thompson@email.com",
      status: "COMPLETE", createdAt: d("2026-03-01"),
      fieldResponses: { create: [
        mkResp(h1.id, "Anna Thompson"), mkResp(h2.id, "anna.thompson@email.com"),
        mkResp(h3.id, JSON.stringify(["Wellness Tips", "Seasonal Events"])),
      ]},
    },
  });

  // ── Update denormalized submission counts ────────────────────────────────
  await Promise.all([
    prisma.form.update({ where: { id: form1.id }, data: { submissionCount: 6 } }),
    prisma.form.update({ where: { id: form2.id }, data: { submissionCount: 8 } }),
    prisma.form.update({ where: { id: form3.id }, data: { submissionCount: 0 } }),
    prisma.form.update({ where: { id: form4.id }, data: { submissionCount: 1 } }),
  ]);

  console.log("Seeded 15 submissions with field responses.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
