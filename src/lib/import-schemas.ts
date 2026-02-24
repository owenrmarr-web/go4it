// Hardcoded registry of Go Suite app schemas for the data importer AI analysis.
// Only includes user-facing fields (id, userId, createdAt, updatedAt are auto-set).

export interface FieldDef {
  type: "string" | "number" | "boolean" | "date" | "enum" | "relation";
  required: boolean;
  values?: string[]; // For enum types
  default?: string; // Default value
  target?: string; // For relation types: target model name
  lookupField?: string; // For relation types: field to match on (e.g., "name" or "email")
}

export interface ModelDef {
  description: string;
  fields: Record<string, FieldDef>;
}

export interface AppSchema {
  description: string;
  models: Record<string, ModelDef>;
}

export const APP_SCHEMAS: Record<string, AppSchema> = {
  GoCRM: {
    description:
      "Customer relationship management — contacts, companies, deals, activities, tasks, and tags.",
    models: {
      contact: {
        description: "A person your business interacts with.",
        fields: {
          firstName: { type: "string", required: true },
          lastName: { type: "string", required: true },
          email: { type: "string", required: false },
          phone: { type: "string", required: false },
          mobilePhone: { type: "string", required: false },
          jobTitle: { type: "string", required: false },
          stage: {
            type: "enum",
            required: false,
            values: ["LEAD", "PROSPECT", "CUSTOMER", "INACTIVE", "CHURNED"],
            default: "LEAD",
          },
          source: {
            type: "enum",
            required: false,
            values: [
              "REFERRAL",
              "WEBSITE",
              "WALK_IN",
              "SOCIAL_MEDIA",
              "EVENT",
              "COLD_OUTREACH",
              "OTHER",
            ],
          },
          address: { type: "string", required: false },
          city: { type: "string", required: false },
          state: { type: "string", required: false },
          zip: { type: "string", required: false },
          notes: { type: "string", required: false },
          companyId: {
            type: "relation",
            required: false,
            target: "company",
            lookupField: "name",
          },
        },
      },
      company: {
        description: "A business or organization.",
        fields: {
          name: { type: "string", required: true },
          industry: { type: "string", required: false },
          website: { type: "string", required: false },
          phone: { type: "string", required: false },
          address: { type: "string", required: false },
          city: { type: "string", required: false },
          state: { type: "string", required: false },
          zip: { type: "string", required: false },
          notes: { type: "string", required: false },
        },
      },
      deal: {
        description:
          "A sales opportunity tied to a contact and optionally a company.",
        fields: {
          title: { type: "string", required: true },
          value: { type: "number", required: false, default: "0" },
          stage: {
            type: "enum",
            required: false,
            values: ["INTERESTED", "QUOTED", "COMMITTED", "WON", "LOST"],
            default: "INTERESTED",
          },
          expectedCloseDate: { type: "date", required: false },
          closedDate: { type: "date", required: false },
          notes: { type: "string", required: false },
          contactId: {
            type: "relation",
            required: true,
            target: "contact",
            lookupField: "email",
          },
          companyId: {
            type: "relation",
            required: false,
            target: "company",
            lookupField: "name",
          },
        },
      },
      activity: {
        description:
          "A logged interaction — call, email, meeting, or note — linked to a contact.",
        fields: {
          type: {
            type: "enum",
            required: true,
            values: ["CALL", "EMAIL", "MEETING", "NOTE"],
          },
          subject: { type: "string", required: true },
          description: { type: "string", required: false },
          date: { type: "date", required: false },
          duration: { type: "number", required: false },
          contactId: {
            type: "relation",
            required: true,
            target: "contact",
            lookupField: "email",
          },
          dealId: {
            type: "relation",
            required: false,
            target: "deal",
            lookupField: "title",
          },
        },
      },
      task: {
        description:
          "A to-do item, optionally linked to a contact or deal.",
        fields: {
          title: { type: "string", required: true },
          description: { type: "string", required: false },
          dueDate: { type: "date", required: true },
          priority: {
            type: "enum",
            required: false,
            values: ["LOW", "MEDIUM", "HIGH"],
            default: "MEDIUM",
          },
          completed: { type: "boolean", required: false, default: "false" },
          completedAt: { type: "date", required: false },
          contactId: {
            type: "relation",
            required: false,
            target: "contact",
            lookupField: "email",
          },
          dealId: {
            type: "relation",
            required: false,
            target: "deal",
            lookupField: "title",
          },
        },
      },
      tag: {
        description: "A label that can be applied to contacts for segmentation.",
        fields: {
          name: { type: "string", required: true },
          color: { type: "string", required: false, default: "#9333ea" },
        },
      },
    },
  },

  GoLedger: {
    description:
      "Invoicing and accounting — clients, invoices, estimates, payments, expenses, and categories.",
    models: {
      client: {
        description: "A customer or vendor your business transacts with.",
        fields: {
          name: { type: "string", required: true },
          email: { type: "string", required: false },
          phone: { type: "string", required: false },
          type: {
            type: "enum",
            required: false,
            values: ["BUSINESS", "INDIVIDUAL"],
            default: "BUSINESS",
          },
          role: {
            type: "enum",
            required: false,
            values: ["CUSTOMER", "VENDOR", "BOTH"],
            default: "CUSTOMER",
          },
          contactName: { type: "string", required: false },
          address: { type: "string", required: false },
          city: { type: "string", required: false },
          state: { type: "string", required: false },
          zip: { type: "string", required: false },
          paymentTerms: {
            type: "enum",
            required: false,
            values: ["DUE_ON_RECEIPT", "NET_15", "NET_30", "NET_60"],
          },
          notes: { type: "string", required: false },
        },
      },
      invoice: {
        description:
          "A bill sent to a client. Line items (description, quantity, unitPrice, amount) should be provided as a nested array in a 'lineItems' field.",
        fields: {
          invoiceNumber: { type: "string", required: true },
          clientId: {
            type: "relation",
            required: true,
            target: "client",
            lookupField: "name",
          },
          status: {
            type: "enum",
            required: false,
            values: [
              "DRAFT",
              "SENT",
              "VIEWED",
              "PARTIAL",
              "PAID",
              "OVERDUE",
              "VOID",
            ],
            default: "DRAFT",
          },
          issueDate: { type: "date", required: false },
          dueDate: { type: "date", required: true },
          subtotal: { type: "number", required: false, default: "0" },
          discountType: {
            type: "enum",
            required: false,
            values: ["PERCENTAGE", "FLAT"],
          },
          discountValue: { type: "number", required: false, default: "0" },
          discountAmount: { type: "number", required: false, default: "0" },
          taxRate: { type: "number", required: false, default: "0" },
          taxAmount: { type: "number", required: false, default: "0" },
          total: { type: "number", required: false, default: "0" },
          amountPaid: { type: "number", required: false, default: "0" },
          notes: { type: "string", required: false },
          memo: { type: "string", required: false },
          poNumber: { type: "string", required: false },
          paymentTerms: { type: "string", required: true },
          categoryId: {
            type: "relation",
            required: false,
            target: "category",
            lookupField: "name",
          },
        },
      },
      estimate: {
        description:
          "A quote or proposal sent to a client. Line items (description, quantity, unitPrice, amount) should be provided as a nested array in a 'lineItems' field.",
        fields: {
          estimateNumber: { type: "string", required: true },
          clientId: {
            type: "relation",
            required: true,
            target: "client",
            lookupField: "name",
          },
          status: {
            type: "enum",
            required: false,
            values: ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "CONVERTED"],
            default: "DRAFT",
          },
          issueDate: { type: "date", required: false },
          expiresAt: { type: "date", required: false },
          subtotal: { type: "number", required: false, default: "0" },
          discountType: {
            type: "enum",
            required: false,
            values: ["PERCENTAGE", "FLAT"],
          },
          discountValue: { type: "number", required: false, default: "0" },
          discountAmount: { type: "number", required: false, default: "0" },
          taxRate: { type: "number", required: false, default: "0" },
          taxAmount: { type: "number", required: false, default: "0" },
          total: { type: "number", required: false, default: "0" },
          notes: { type: "string", required: false },
          memo: { type: "string", required: false },
          categoryId: {
            type: "relation",
            required: false,
            target: "category",
            lookupField: "name",
          },
        },
      },
      payment: {
        description: "A payment received against an invoice.",
        fields: {
          invoiceId: {
            type: "relation",
            required: true,
            target: "invoice",
            lookupField: "invoiceNumber",
          },
          clientId: {
            type: "relation",
            required: true,
            target: "client",
            lookupField: "name",
          },
          amount: { type: "number", required: true },
          method: {
            type: "enum",
            required: true,
            values: [
              "CASH",
              "CHECK",
              "ACH",
              "CREDIT_CARD",
              "ZELLE",
              "VENMO",
              "STRIPE",
              "OTHER",
            ],
          },
          reference: { type: "string", required: false },
          date: { type: "date", required: false },
          notes: { type: "string", required: false },
        },
      },
      expense: {
        description: "A business expense or purchase.",
        fields: {
          description: { type: "string", required: true },
          amount: { type: "number", required: true },
          date: { type: "date", required: false },
          categoryId: {
            type: "relation",
            required: false,
            target: "category",
            lookupField: "name",
          },
          clientId: {
            type: "relation",
            required: false,
            target: "client",
            lookupField: "name",
          },
          vendor: { type: "string", required: false },
          method: { type: "string", required: false },
          reference: { type: "string", required: false },
          notes: { type: "string", required: false },
          isBillable: { type: "boolean", required: false, default: "false" },
          isReimbursable: {
            type: "boolean",
            required: false,
            default: "false",
          },
        },
      },
      category: {
        description:
          "A classification for income or expenses (e.g. 'Office Supplies', 'Consulting Revenue').",
        fields: {
          name: { type: "string", required: true },
          type: {
            type: "enum",
            required: true,
            values: ["INCOME", "EXPENSE"],
          },
          color: { type: "string", required: false, default: "#9333ea" },
        },
      },
    },
  },

  GoProject: {
    description:
      "Project management — projects, milestones, tasks, subtasks, and labels.",
    models: {
      project: {
        description: "A top-level project that contains milestones, tasks, and labels.",
        fields: {
          name: { type: "string", required: true },
          description: { type: "string", required: false },
          color: { type: "string", required: false, default: "#9333ea" },
          status: {
            type: "enum",
            required: false,
            values: ["active", "archived"],
            default: "active",
          },
        },
      },
      milestone: {
        description: "A key checkpoint or phase within a project.",
        fields: {
          name: { type: "string", required: true },
          description: { type: "string", required: false },
          dueDate: { type: "date", required: false },
          status: {
            type: "enum",
            required: false,
            values: ["active", "completed"],
            default: "active",
          },
          projectId: {
            type: "relation",
            required: true,
            target: "project",
            lookupField: "name",
          },
        },
      },
      task: {
        description: "A work item within a project, optionally under a milestone.",
        fields: {
          title: { type: "string", required: true },
          description: { type: "string", required: false },
          status: {
            type: "enum",
            required: false,
            values: ["todo", "in_progress", "done"],
            default: "todo",
          },
          startDate: { type: "date", required: false },
          dueDate: { type: "date", required: false },
          estimate: { type: "number", required: false },
          position: { type: "number", required: false, default: "0" },
          projectId: {
            type: "relation",
            required: true,
            target: "project",
            lookupField: "name",
          },
          milestoneId: {
            type: "relation",
            required: false,
            target: "milestone",
            lookupField: "name",
          },
        },
      },
      subtask: {
        description: "A checklist item nested under a task.",
        fields: {
          title: { type: "string", required: true },
          completed: { type: "boolean", required: false, default: "false" },
          position: { type: "number", required: false, default: "0" },
          taskId: {
            type: "relation",
            required: true,
            target: "task",
            lookupField: "title",
          },
        },
      },
      label: {
        description: "A colored tag that can be applied to tasks within a project.",
        fields: {
          name: { type: "string", required: true },
          color: { type: "string", required: true },
          projectId: {
            type: "relation",
            required: true,
            target: "project",
            lookupField: "name",
          },
        },
      },
    },
  },
};
