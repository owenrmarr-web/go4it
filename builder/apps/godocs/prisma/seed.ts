import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const SERVICE_AGREEMENT_CONTENT = `PROFESSIONAL SERVICES AGREEMENT

This Professional Services Agreement ("Agreement") is entered into between Cascade Legal Consulting ("Company") and the Client identified herein.

1. SERVICES
Company agrees to provide legal consulting services including contract review, compliance advisory, and legal strategy consulting as mutually agreed in writing.

2. FEES AND PAYMENT
Client agrees to pay Company's standard hourly rate of $350/hour. Invoices are due within 30 days of issuance. Late payments accrue interest at 1.5% per month.

3. TERM AND TERMINATION
This Agreement commences on the Effective Date and continues until completion of the Services or until terminated by either party with 30 days written notice.

4. CONFIDENTIALITY
Both parties agree to maintain confidentiality of all proprietary and sensitive information disclosed during this engagement.

5. LIMITATION OF LIABILITY
Company's total liability shall not exceed the fees paid in the three months preceding the claim.

6. GOVERNING LAW
This Agreement shall be governed by the laws of the State of California.`;

const NDA_CONTENT = `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into between Cascade Legal Consulting ("Disclosing Party") and the Receiving Party identified below.

1. CONFIDENTIAL INFORMATION
"Confidential Information" means any non-public information disclosed by the Disclosing Party, including business plans, client lists, financial data, and proprietary methodologies.

2. OBLIGATIONS
The Receiving Party agrees to: (a) hold Confidential Information in strict confidence; (b) not disclose to third parties without prior written consent; (c) use Confidential Information solely for the stated business purpose.

3. TERM
This Agreement is effective for two (2) years from the date of execution.

4. RETURN OF INFORMATION
Upon request, Receiving Party shall promptly return or destroy all Confidential Information.

5. REMEDIES
The parties acknowledge that breach of this Agreement may cause irreparable harm and that injunctive relief may be appropriate.`;

const PROPOSAL_CONTENT = `CONSULTING PROPOSAL

Prepared by Cascade Legal Consulting

EXECUTIVE SUMMARY
Cascade Legal Consulting proposes to provide comprehensive legal advisory services to support your organization's growth and compliance objectives.

SCOPE OF SERVICES
- Contract drafting and review
- Regulatory compliance assessment
- Risk management advisory
- Ongoing legal counsel (retainer basis)

PROPOSED TIMELINE
Phase 1 (Weeks 1-2): Discovery and assessment
Phase 2 (Weeks 3-6): Contract review and drafting
Phase 3 (Ongoing): Advisory retainer

INVESTMENT
Monthly retainer: $4,500/month
Hourly advisory: $350/hour
Initial assessment: Complimentary

NEXT STEPS
Please review this proposal and contact us at your earliest convenience to discuss terms and begin the engagement.`;

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
      name: "Alex Rivera",
      password,
      role: "admin",
    },
  });

  console.log("Seeded admin user.");

  // Folders
  const [clientContracts, activeProposals, internalDocs] = await Promise.all([
    prisma.folder.create({
      data: {
        name: "Client Contracts",
        description: "Executed and pending client service agreements",
        color: "#3b82f6",
        userId: admin.id,
      },
    }),
    prisma.folder.create({
      data: {
        name: "Active Proposals",
        description: "Proposals currently in development or under review",
        color: "#22c55e",
        userId: admin.id,
      },
    }),
    prisma.folder.create({
      data: {
        name: "Internal Documents",
        description: "Firm policies, procedures, and internal reports",
        color: "#6b7280",
        userId: admin.id,
      },
    }),
  ]);

  const renewalsFolder = await prisma.folder.create({
    data: {
      name: "2024 Renewals",
      description: "Contracts due for renewal in 2024",
      color: "#f59e0b",
      parentId: clientContracts.id,
      userId: admin.id,
    },
  });

  console.log("Seeded 4 folders.");

  const now = new Date();
  const past = (days: number) => new Date(now.getTime() - days * 86400000);
  const future = (days: number) => new Date(now.getTime() + days * 86400000);

  // Documents
  const doc1 = await prisma.document.create({
    data: {
      title: "Summit Partners — Q1 Consulting Proposal",
      type: "PROPOSAL",
      status: "DRAFT",
      content: PROPOSAL_CONTENT,
      description: "Initial consulting proposal for Summit Partners engagement",
      folderId: activeProposals.id,
      clientName: "Summit Partners",
      clientEmail: "legal@summitpartners.com",
      userId: admin.id,
    },
  });

  const doc2 = await prisma.document.create({
    data: {
      title: "Q4 2025 Risk Assessment Report",
      type: "REPORT",
      status: "DRAFT",
      content: "RISK ASSESSMENT REPORT — Q4 2025\n\nPrepared by: Cascade Legal Consulting\n\nEXECUTIVE SUMMARY\nThis report summarizes regulatory and contractual risk factors identified across active client engagements in Q4 2025.\n\nKEY FINDINGS\n1. Three clients have contracts approaching expiration in Q1 2026\n2. Two clients have outstanding compliance documentation requirements\n3. Regulatory changes in financial services sector impact 40% of portfolio\n\nRECOMMENDATIONS\n- Prioritize contract renewal outreach for expiring agreements\n- Schedule compliance review meetings with affected clients\n- Update standard agreement templates to reflect new regulations",
      description: "Quarterly risk assessment for client portfolio",
      folderId: internalDocs.id,
      userId: admin.id,
    },
  });

  const doc3 = await prisma.document.create({
    data: {
      title: "Harbor Technologies — Master Service Agreement",
      type: "CONTRACT",
      status: "IN_REVIEW",
      content: SERVICE_AGREEMENT_CONTENT,
      description: "MSA for Harbor Technologies ongoing advisory services",
      folderId: clientContracts.id,
      clientName: "Harbor Technologies",
      clientEmail: "contracts@harbortechnologies.io",
      expiresAt: future(365),
      userId: admin.id,
    },
  });

  const doc4 = await prisma.document.create({
    data: {
      title: "Meridian Properties — Commercial Lease Advisory",
      type: "AGREEMENT",
      status: "APPROVED",
      content: "COMMERCIAL ADVISORY AGREEMENT\n\nThis Advisory Agreement is entered into between Cascade Legal Consulting and Meridian Properties LLC.\n\n1. ADVISORY SERVICES\nCascade Legal Consulting shall provide advisory services related to commercial real estate transactions, lease negotiations, and property acquisition due diligence.\n\n2. SCOPE\n- Review of commercial lease agreements\n- Due diligence advisory for property acquisitions\n- Regulatory compliance guidance\n\n3. COMPENSATION\nMonthly advisory fee: $3,200, payable on the first of each month.\n\n4. TERM\nInitial term: 12 months, with automatic renewal unless 60 days' notice is provided.",
      description: "Commercial real estate advisory agreement",
      folderId: clientContracts.id,
      clientName: "Meridian Properties",
      clientEmail: "admin@meridianprops.com",
      expiresAt: future(180),
      userId: admin.id,
    },
  });

  const doc5 = await prisma.document.create({
    data: {
      title: "Atlas Ventures — Legal Retainer Agreement",
      type: "CONTRACT",
      status: "APPROVED",
      content: SERVICE_AGREEMENT_CONTENT,
      description: "Monthly legal retainer for Atlas Ventures portfolio companies",
      folderId: clientContracts.id,
      clientName: "Atlas Ventures",
      clientEmail: "legal@atlasventures.co",
      expiresAt: future(90),
      userId: admin.id,
    },
  });

  const doc6 = await prisma.document.create({
    data: {
      title: "Meridian Properties — NDA 2024",
      type: "CONTRACT",
      status: "SIGNED",
      content: NDA_CONTENT,
      description: "Non-disclosure agreement for property acquisition advisory",
      folderId: renewalsFolder.id,
      clientName: "Meridian Properties",
      clientEmail: "admin@meridianprops.com",
      signedAt: past(45),
      signedBy: "Jennifer Walsh, CEO",
      expiresAt: future(320),
      userId: admin.id,
    },
  });

  const doc7 = await prisma.document.create({
    data: {
      title: "Harbor Technologies — Confidentiality Agreement",
      type: "AGREEMENT",
      status: "SIGNED",
      content: NDA_CONTENT,
      description: "Mutual NDA for technology transfer discussions",
      folderId: clientContracts.id,
      clientName: "Harbor Technologies",
      clientEmail: "contracts@harbortechnologies.io",
      signedAt: past(20),
      signedBy: "Marcus Chen, General Counsel",
      expiresAt: future(345),
      userId: admin.id,
    },
  });

  const doc8 = await prisma.document.create({
    data: {
      title: "Summit Partners — 2023 Advisory Agreement",
      type: "CONTRACT",
      status: "EXPIRED",
      content: SERVICE_AGREEMENT_CONTENT,
      description: "Prior year advisory contract — expired, renewal in progress",
      folderId: renewalsFolder.id,
      clientName: "Summit Partners",
      clientEmail: "legal@summitpartners.com",
      expiresAt: past(30),
      userId: admin.id,
    },
  });

  const doc9 = await prisma.document.create({
    data: {
      title: "Atlas Ventures — Seed Round Legal Advisory",
      type: "PROPOSAL",
      status: "ARCHIVED",
      content: PROPOSAL_CONTENT,
      description: "Completed engagement — seed round legal advisory 2023",
      clientName: "Atlas Ventures",
      userId: admin.id,
    },
  });

  const doc10 = await prisma.document.create({
    data: {
      title: "Meridian Properties — 2022 Annual Report",
      type: "REPORT",
      status: "ARCHIVED",
      content: "ANNUAL ENGAGEMENT REPORT 2022\n\nThis report summarizes legal advisory services provided to Meridian Properties during 2022.\n\nSERVICES PROVIDED\n- 14 lease agreements reviewed\n- 3 property acquisition transactions advised\n- Ongoing regulatory compliance guidance\n\nTOTAL VALUE\nTotal advisory hours: 847\nTotal investment: $296,450\n\nCONCLUSION\nSuccessful engagement with strong client satisfaction. Renewal recommended.",
      description: "Annual engagement summary for Meridian Properties",
      clientName: "Meridian Properties",
      folderId: internalDocs.id,
      userId: admin.id,
    },
  });

  console.log("Seeded 10 documents.");

  // Document Versions (15 total)
  const v1_doc1 = await prisma.documentVersion.create({
    data: {
      versionNumber: 1,
      content: PROPOSAL_CONTENT,
      changeNotes: "Initial draft",
      authorId: admin.id,
      documentId: doc1.id,
      userId: admin.id,
    },
  });

  const v1_doc2 = await prisma.documentVersion.create({
    data: {
      versionNumber: 1,
      content: doc2.content ?? "",
      changeNotes: "Initial draft",
      authorId: admin.id,
      documentId: doc2.id,
      userId: admin.id,
    },
  });

  const v1_doc3 = await prisma.documentVersion.create({
    data: {
      versionNumber: 1,
      content: SERVICE_AGREEMENT_CONTENT,
      changeNotes: "Initial draft",
      authorId: admin.id,
      documentId: doc3.id,
      userId: admin.id,
    },
  });

  const v2_doc3 = await prisma.documentVersion.create({
    data: {
      versionNumber: 2,
      content: SERVICE_AGREEMENT_CONTENT + "\n\n7. AMENDMENTS\nAll amendments must be made in writing and signed by both parties.",
      changeNotes: "Added amendments clause per legal review",
      authorId: admin.id,
      documentId: doc3.id,
      userId: admin.id,
    },
  });

  const v1_doc4 = await prisma.documentVersion.create({
    data: {
      versionNumber: 1,
      content: doc4.content ?? "",
      changeNotes: "Initial draft",
      authorId: admin.id,
      documentId: doc4.id,
      userId: admin.id,
    },
  });

  const v2_doc4 = await prisma.documentVersion.create({
    data: {
      versionNumber: 2,
      content: (doc4.content ?? "") + "\n\n5. DISPUTE RESOLUTION\nAny disputes shall be resolved through binding arbitration under AAA rules.",
      changeNotes: "Updated payment terms and added dispute resolution clause",
      authorId: admin.id,
      documentId: doc4.id,
      userId: admin.id,
    },
  });

  const v1_doc5 = await prisma.documentVersion.create({
    data: {
      versionNumber: 1,
      content: SERVICE_AGREEMENT_CONTENT,
      changeNotes: "Initial draft",
      authorId: admin.id,
      documentId: doc5.id,
      userId: admin.id,
    },
  });

  const v2_doc5 = await prisma.documentVersion.create({
    data: {
      versionNumber: 2,
      content: SERVICE_AGREEMENT_CONTENT,
      changeNotes: "Client requested 60-day payment terms instead of 30",
      authorId: admin.id,
      documentId: doc5.id,
      userId: admin.id,
    },
  });

  const v1_doc6 = await prisma.documentVersion.create({
    data: {
      versionNumber: 1,
      content: NDA_CONTENT,
      changeNotes: "Initial draft",
      authorId: admin.id,
      documentId: doc6.id,
      userId: admin.id,
    },
  });

  const v2_doc6 = await prisma.documentVersion.create({
    data: {
      versionNumber: 2,
      content: NDA_CONTENT,
      changeNotes: "Final approved version",
      authorId: admin.id,
      documentId: doc6.id,
      userId: admin.id,
    },
  });

  const v1_doc7 = await prisma.documentVersion.create({
    data: {
      versionNumber: 1,
      content: NDA_CONTENT,
      changeNotes: "Initial draft",
      authorId: admin.id,
      documentId: doc7.id,
      userId: admin.id,
    },
  });

  const v2_doc7 = await prisma.documentVersion.create({
    data: {
      versionNumber: 2,
      content: NDA_CONTENT,
      changeNotes: "Legal review edits — clarified scope of confidential information",
      authorId: admin.id,
      documentId: doc7.id,
      userId: admin.id,
    },
  });

  const v1_doc8 = await prisma.documentVersion.create({
    data: {
      versionNumber: 1,
      content: SERVICE_AGREEMENT_CONTENT,
      changeNotes: "Initial draft",
      authorId: admin.id,
      documentId: doc8.id,
      userId: admin.id,
    },
  });

  const v1_doc9 = await prisma.documentVersion.create({
    data: {
      versionNumber: 1,
      content: PROPOSAL_CONTENT,
      changeNotes: "Initial draft",
      authorId: admin.id,
      documentId: doc9.id,
      userId: admin.id,
    },
  });

  const v1_doc10 = await prisma.documentVersion.create({
    data: {
      versionNumber: 1,
      content: doc10.content ?? "",
      changeNotes: "Initial draft",
      authorId: admin.id,
      documentId: doc10.id,
      userId: admin.id,
    },
  });

  // Update currentVersionId on all documents
  await Promise.all([
    prisma.document.update({ where: { id: doc1.id }, data: { currentVersionId: v1_doc1.id } }),
    prisma.document.update({ where: { id: doc2.id }, data: { currentVersionId: v1_doc2.id } }),
    prisma.document.update({ where: { id: doc3.id }, data: { currentVersionId: v2_doc3.id } }),
    prisma.document.update({ where: { id: doc4.id }, data: { currentVersionId: v2_doc4.id } }),
    prisma.document.update({ where: { id: doc5.id }, data: { currentVersionId: v2_doc5.id } }),
    prisma.document.update({ where: { id: doc6.id }, data: { currentVersionId: v2_doc6.id } }),
    prisma.document.update({ where: { id: doc7.id }, data: { currentVersionId: v2_doc7.id } }),
    prisma.document.update({ where: { id: doc8.id }, data: { currentVersionId: v1_doc8.id } }),
    prisma.document.update({ where: { id: doc9.id }, data: { currentVersionId: v1_doc9.id } }),
    prisma.document.update({ where: { id: doc10.id }, data: { currentVersionId: v1_doc10.id } }),
  ]);

  console.log("Seeded 15 document versions.");

  // Comments (8 across 4 documents)
  await prisma.documentComment.createMany({
    data: [
      {
        content: "Section 3 needs an updated liability clause — current language is too broad.",
        authorId: admin.id,
        documentId: doc3.id,
        userId: admin.id,
      },
      {
        content: "Please confirm the start date before we finalize. Harbor's legal team needs at least 2 weeks.",
        authorId: admin.id,
        documentId: doc3.id,
        userId: admin.id,
      },
      {
        content: "Approved pending signature from the Meridian side. Sending to Jennifer Walsh today.",
        authorId: admin.id,
        documentId: doc4.id,
        userId: admin.id,
      },
      {
        content: "Client requested 60-day payment terms instead of 30. Updated in v2.",
        authorId: admin.id,
        documentId: doc4.id,
        userId: admin.id,
      },
      {
        content: "Signed copy received from Jennifer Walsh on Feb 10. Original filed in Meridian client binder.",
        authorId: admin.id,
        documentId: doc6.id,
        userId: admin.id,
      },
      {
        content: "Two-year term confirmed. Calendar reminder set for renewal 90 days before expiry.",
        authorId: admin.id,
        documentId: doc6.id,
        userId: admin.id,
      },
      {
        content: "Marcus Chen signed on behalf of Harbor Technologies. Fully executed.",
        authorId: admin.id,
        documentId: doc7.id,
        userId: admin.id,
      },
      {
        content: "Mutual NDA — both parties have executed originals. Digital copy archived here.",
        authorId: admin.id,
        documentId: doc7.id,
        userId: admin.id,
      },
    ],
  });

  console.log("Seeded 8 document comments.");

  // Document Templates (3)
  await prisma.documentTemplate.createMany({
    data: [
      {
        name: "Standard Service Agreement",
        type: "CONTRACT",
        content: SERVICE_AGREEMENT_CONTENT,
        description: "General professional services agreement for client engagements",
        userId: admin.id,
      },
      {
        name: "Consulting Proposal",
        type: "PROPOSAL",
        content: PROPOSAL_CONTENT,
        description: "Standard proposal template for new client opportunities",
        userId: admin.id,
      },
      {
        name: "Non-Disclosure Agreement",
        type: "AGREEMENT",
        content: NDA_CONTENT,
        description: "Mutual NDA for confidential discussions and engagements",
        userId: admin.id,
      },
    ],
  });

  console.log("Seeded 3 document templates.");

  // Default settings
  await prisma.userSettings.upsert({
    where: { userId: admin.id },
    create: {
      userId: admin.id,
      companyName: "Cascade Legal Consulting",
      defaultDocumentType: "CONTRACT",
      defaultExpirationDays: 365,
      autoArchiveExpired: false,
    },
    update: {},
  });

  console.log("Seeded user settings.");
  console.log("✅ Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
