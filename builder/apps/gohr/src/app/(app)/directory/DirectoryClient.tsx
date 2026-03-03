"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import UserAvatar from "@/components/UserAvatar";
import FormField from "@/components/FormField";
import UnassignedBadge from "@/components/UnassignedBadge";
import {
  UsersIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
} from "@/components/Icons";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Department {
  id: string;
  name: string;
  color: string;
}

interface ProfileUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  profileColor: string | null;
  profileEmoji: string | null;
  isAssigned: boolean;
}

interface EmployeeProfile {
  id: string;
  employeeId: string;
  jobTitle: string;
  hireDate: string;
  employmentType: string;
  departmentId: string | null;
  managerId: string | null;
  phone: string | null;
  emergencyContact: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  hourlyRate: number | null;
  salary: number | null;
  status: string;
  staffUserId: string;
  user: ProfileUser;
  department: Department | null;
}

interface StaffUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  profileColor: string | null;
  profileEmoji: string | null;
  isAssigned: boolean;
  employeeProfile: { id: string } | null;
}

interface DirectoryClientProps {
  profiles: EmployeeProfile[];
  departments: Department[];
  allUsers: StaffUser[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TABS = ["All", "Active", "On Leave", "Terminated"] as const;

const STATUS_BADGE_VARIANT: Record<string, "success" | "warning" | "error"> = {
  ACTIVE: "success",
  ON_LEAVE: "warning",
  TERMINATED: "error",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On Leave",
  TERMINATED: "Terminated",
};

const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERN", label: "Intern" },
];

const TAB_TO_STATUS: Record<string, string> = {
  All: "",
  Active: "ACTIVE",
  "On Leave": "ON_LEAVE",
  Terminated: "TERMINATED",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyForm() {
  return {
    staffUserId: "",
    employeeId: "",
    jobTitle: "",
    hireDate: "",
    employmentType: "FULL_TIME",
    departmentId: "",
    managerId: "",
    phone: "",
    emergencyContact: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    hourlyRate: "",
    salary: "",
  };
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent";

const selectClass =
  "w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DirectoryClient({
  profiles,
  departments,
  allUsers,
}: DirectoryClientProps) {
  const router = useRouter();

  // Filters
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [activeTab, setActiveTab] = useState<string>("All");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editProfile, setEditProfile] = useState<EmployeeProfile | null>(null);
  const [terminateProfile, setTerminateProfile] =
    useState<EmployeeProfile | null>(null);

  // Form state
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [terminating, setTerminating] = useState(false);

  // -----------------------------------------------------------------------
  // Filtering
  // -----------------------------------------------------------------------

  const statusFilter = TAB_TO_STATUS[activeTab] || "";

  const filtered = profiles.filter((p) => {
    // Status filter
    if (statusFilter && p.status !== statusFilter) return false;

    // Department filter
    if (departmentFilter && p.departmentId !== departmentFilter) return false;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      const matchName = (p.user.name || "").toLowerCase().includes(q);
      const matchTitle = p.jobTitle.toLowerCase().includes(q);
      const matchDept = (p.department?.name || "").toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchDept) return false;
    }

    return true;
  });

  // Users that don't have an employee profile yet (for create dropdown)
  const availableUsers = allUsers.filter((u) => !u.employeeProfile);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  function openCreateModal() {
    setForm(emptyForm());
    setShowCreateModal(true);
  }

  function openEditModal(profile: EmployeeProfile) {
    setForm({
      staffUserId: profile.staffUserId,
      employeeId: profile.employeeId,
      jobTitle: profile.jobTitle,
      hireDate: profile.hireDate ? profile.hireDate.slice(0, 10) : "",
      employmentType: profile.employmentType,
      departmentId: profile.departmentId || "",
      managerId: profile.managerId || "",
      phone: profile.phone || "",
      emergencyContact: profile.emergencyContact || "",
      address: profile.address || "",
      city: profile.city || "",
      state: profile.state || "",
      zip: profile.zip || "",
      hourlyRate: profile.hourlyRate != null ? String(profile.hourlyRate) : "",
      salary: profile.salary != null ? String(profile.salary) : "",
    });
    setEditProfile(profile);
  }

  function closeModals() {
    setShowCreateModal(false);
    setEditProfile(null);
    setTerminateProfile(null);
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staffUserId || !form.jobTitle || !form.hireDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          departmentId: form.departmentId || null,
          managerId: form.managerId || null,
          hourlyRate: form.hourlyRate || null,
          salary: form.salary || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create employee profile");
      }
      toast.success("Employee profile created");
      closeModals();
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create employee profile";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editProfile) return;
    if (!form.jobTitle || !form.hireDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${editProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          jobTitle: form.jobTitle,
          hireDate: form.hireDate,
          employmentType: form.employmentType,
          departmentId: form.departmentId || null,
          managerId: form.managerId || null,
          phone: form.phone || null,
          emergencyContact: form.emergencyContact || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          zip: form.zip || null,
          hourlyRate: form.hourlyRate || null,
          salary: form.salary || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update employee profile");
      }
      toast.success("Employee profile updated");
      closeModals();
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update employee profile";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTerminate() {
    if (!terminateProfile) return;
    setTerminating(true);
    try {
      const res = await fetch(`/api/employees/${terminateProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "TERMINATED",
          terminatedDate: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to terminate employee");
      }
      toast.success("Employee terminated");
      closeModals();
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to terminate employee";
      toast.error(message);
    } finally {
      setTerminating(false);
    }
  }

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function renderForm(mode: "create" | "edit") {
    const onSubmit = mode === "create" ? handleCreate : handleEdit;
    const existingProfiles = profiles.map((p) => p.staffUserId);

    return (
      <form onSubmit={onSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Staff User (only for create) */}
        {mode === "create" && (
          <FormField label="Staff User" required htmlFor="staffUserId">
            <select
              id="staffUserId"
              value={form.staffUserId}
              onChange={(e) => updateField("staffUserId", e.target.value)}
              className={selectClass}
              required
            >
              <option value="">Select a user...</option>
              {availableUsers
                .filter((u) => !existingProfiles.includes(u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
            </select>
          </FormField>
        )}

        {/* Row: Employee ID + Job Title */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Employee ID" htmlFor="employeeId">
            <input
              id="employeeId"
              type="text"
              value={form.employeeId}
              onChange={(e) => updateField("employeeId", e.target.value)}
              placeholder="EMP-001"
              className={inputClass}
            />
          </FormField>
          <FormField label="Job Title" required htmlFor="jobTitle">
            <input
              id="jobTitle"
              type="text"
              value={form.jobTitle}
              onChange={(e) => updateField("jobTitle", e.target.value)}
              placeholder="Software Engineer"
              className={inputClass}
              required
            />
          </FormField>
        </div>

        {/* Row: Hire Date + Employment Type */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Hire Date" required htmlFor="hireDate">
            <input
              id="hireDate"
              type="date"
              value={form.hireDate}
              onChange={(e) => updateField("hireDate", e.target.value)}
              className={inputClass}
              required
            />
          </FormField>
          <FormField label="Employment Type" htmlFor="employmentType">
            <select
              id="employmentType"
              value={form.employmentType}
              onChange={(e) => updateField("employmentType", e.target.value)}
              className={selectClass}
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Row: Department + Manager */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Department" htmlFor="departmentId">
            <select
              id="departmentId"
              value={form.departmentId}
              onChange={(e) => updateField("departmentId", e.target.value)}
              className={selectClass}
            >
              <option value="">No department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Manager" htmlFor="managerId">
            <select
              id="managerId"
              value={form.managerId}
              onChange={(e) => updateField("managerId", e.target.value)}
              className={selectClass}
            >
              <option value="">No manager</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.name || p.user.email}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Row: Phone + Emergency Contact */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Phone" htmlFor="phone">
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="(555) 123-4567"
              className={inputClass}
            />
          </FormField>
          <FormField label="Emergency Contact" htmlFor="emergencyContact">
            <input
              id="emergencyContact"
              type="text"
              value={form.emergencyContact}
              onChange={(e) => updateField("emergencyContact", e.target.value)}
              placeholder="Jane Doe - (555) 987-6543"
              className={inputClass}
            />
          </FormField>
        </div>

        {/* Address */}
        <FormField label="Address" htmlFor="address">
          <input
            id="address"
            type="text"
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="123 Main St"
            className={inputClass}
          />
        </FormField>

        {/* Row: City + State + Zip */}
        <div className="grid grid-cols-3 gap-4">
          <FormField label="City" htmlFor="city">
            <input
              id="city"
              type="text"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="New York"
              className={inputClass}
            />
          </FormField>
          <FormField label="State" htmlFor="state">
            <input
              id="state"
              type="text"
              value={form.state}
              onChange={(e) => updateField("state", e.target.value)}
              placeholder="NY"
              className={inputClass}
            />
          </FormField>
          <FormField label="Zip" htmlFor="zip">
            <input
              id="zip"
              type="text"
              value={form.zip}
              onChange={(e) => updateField("zip", e.target.value)}
              placeholder="10001"
              className={inputClass}
            />
          </FormField>
        </div>

        {/* Row: Hourly Rate + Salary */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Hourly Rate" htmlFor="hourlyRate">
            <input
              id="hourlyRate"
              type="number"
              step="0.01"
              value={form.hourlyRate}
              onChange={(e) => updateField("hourlyRate", e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </FormField>
          <FormField label="Salary" htmlFor="salary">
            <input
              id="salary"
              type="number"
              step="0.01"
              value={form.salary}
              onChange={(e) => updateField("salary", e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </FormField>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={closeModals}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {mode === "create" ? "Create Profile" : "Save Changes"}
          </Button>
        </div>
      </form>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Directory"
        subtitle={`${profiles.length} employee${profiles.length !== 1 ? "s" : ""}`}
        action={
          <Button onClick={openCreateModal}>
            <PlusIcon className="w-4 h-4" />
            Add Employee
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, job title, or department..."
          className="flex-1"
        />
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className={`${selectClass} sm:w-48`}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 border-b border-edge">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-accent text-accent-fg"
                  : "border-transparent text-fg-muted hover:text-fg hover:border-edge-strong"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Card Grid or Empty State */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          message="No employees found"
          description={
            profiles.length === 0
              ? "Add your first employee to get started."
              : "Try adjusting your search or filters."
          }
          actionLabel={profiles.length === 0 ? "Add Employee" : undefined}
          onAction={profiles.length === 0 ? openCreateModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((profile) => (
            <div
              key={profile.id}
              className="relative bg-card border border-edge rounded-xl p-4 hover:border-edge-strong transition-colors group"
            >
              {/* Action buttons */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    openEditModal(profile);
                  }}
                  className="p-1.5 rounded-lg hover:bg-hover text-fg-muted hover:text-fg transition-colors"
                  title="Edit"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                {profile.status !== "TERMINATED" && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setTerminateProfile(profile);
                    }}
                    className="p-1.5 rounded-lg hover:bg-hover text-fg-muted hover:text-status-red-fg transition-colors"
                    title="Terminate"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              <Link href={`/directory/${profile.id}`} className="block">
                {/* Avatar + Name + Title */}
                <div className="flex items-start gap-3 mb-3">
                  <UserAvatar
                    name={profile.user.name || profile.user.email}
                    image={profile.user.image}
                    profileColor={profile.user.profileColor}
                    profileEmoji={profile.user.profileEmoji}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-fg truncate">
                        {profile.user.name || profile.user.email}
                      </h3>
                      {!profile.user.isAssigned && <UnassignedBadge />}
                    </div>
                    <p className="text-xs text-fg-muted truncate">
                      {profile.jobTitle}
                    </p>
                  </div>
                </div>

                {/* Department Badge */}
                {profile.department && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-secondary bg-elevated rounded-full px-2.5 py-0.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: profile.department.color }}
                      />
                      {profile.department.name}
                    </span>
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-xs text-fg-muted">
                    <EnvelopeIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{profile.user.email}</span>
                  </div>
                  {profile.phone && (
                    <div className="flex items-center gap-2 text-xs text-fg-muted">
                      <PhoneIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{profile.phone}</span>
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <Badge
                  variant={STATUS_BADGE_VARIANT[profile.status] || "neutral"}
                >
                  {STATUS_LABEL[profile.status] || profile.status}
                </Badge>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={closeModals}
        title="Add Employee Profile"
        size="lg"
      >
        {renderForm("create")}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editProfile}
        onClose={closeModals}
        title="Edit Employee Profile"
        size="lg"
      >
        {renderForm("edit")}
      </Modal>

      {/* Terminate Confirm Dialog */}
      <ConfirmDialog
        open={!!terminateProfile}
        onClose={closeModals}
        onConfirm={handleTerminate}
        title="Terminate Employee"
        message={`Are you sure you want to terminate ${
          terminateProfile?.user.name || terminateProfile?.user.email || "this employee"
        }? This will change their status to Terminated.`}
        confirmLabel="Terminate"
        destructive
        loading={terminating}
      />
    </div>
  );
}
