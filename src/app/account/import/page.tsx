"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Header from "@/components/Header";

// --- Types ---

interface FieldMapping {
  sourceColumn: string;
  targetField: string | null;
  confidence: number;
  transform: string | null;
}

interface AnalysisResult {
  importId: string;
  targetApp: string;
  targetEntity: string;
  mappings: FieldMapping[];
  qualityNotes: string[];
  missingRequired: string[];
  totalRows: number;
}

interface ImportJob {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  importedRows: number;
  skippedRows: number;
  errorCount: number;
  totalRows: number;
  errors: { row: number; message: string }[];
  appUrl?: string;
}

// --- Step indicator ---

const STEPS = ["Upload", "Analysis", "Importing", "Results"] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const isActive = i === current;
        const isDone = i < current;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-8 sm:w-12 ${
                  isDone ? "bg-purple-500" : "bg-gray-200"
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-purple-600 text-white"
                    : isDone
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive ? "text-purple-700" : isDone ? "text-purple-500" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Confidence badge ---

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 0.8
      ? "bg-green-100 text-green-700"
      : value >= 0.5
        ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {Math.round(value * 100)}%
    </span>
  );
}

// --- File size formatter ---

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Main wizard ---

function ImportWizard() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const orgSlug = searchParams.get("org") || "";

  // Wizard state
  const [step, setStep] = useState(0);

  // Step 1 state
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState("skip");
  const [confirming, setConfirming] = useState(false);

  // Step 3 state
  const [job, setJob] = useState<ImportJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- File handling ---

  const ACCEPTED = ".csv,.xlsx,.xls";
  const ACCEPTED_TYPES = [
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(f.type) && !["csv", "xlsx", "xls"].includes(ext || "")) {
      toast.error("Please upload a CSV, XLSX, or XLS file.");
      return;
    }
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  // --- Step 1: Upload + Analyze ---

  const handleAnalyze = async () => {
    if (!file) return;
    setUploading(true);
    try {
      // Upload file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("org", orgSlug);

      const uploadRes = await fetch("/api/import/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      const uploadData = await uploadRes.json();

      // Analyze
      const analyzeRes = await fetch("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importId: uploadData.importId,
          description,
          org: orgSlug,
        }),
      });
      if (!analyzeRes.ok) {
        const err = await analyzeRes.json().catch(() => ({}));
        throw new Error(err.error || "Analysis failed");
      }
      const analysisData: AnalysisResult = await analyzeRes.json();
      setAnalysis(analysisData);
      setStep(1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  // --- Step 2: Confirm + Execute ---

  const handleConfirmImport = async () => {
    if (!analysis) return;
    setConfirming(true);
    try {
      // Confirm
      const confirmRes = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importId: analysis.importId,
          duplicateStrategy,
          org: orgSlug,
        }),
      });
      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({}));
        throw new Error(err.error || "Confirmation failed");
      }

      // Execute
      const executeRes = await fetch("/api/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importId: analysis.importId,
          org: orgSlug,
        }),
      });
      if (!executeRes.ok) {
        const err = await executeRes.json().catch(() => ({}));
        throw new Error(err.error || "Import execution failed");
      }
      const execData = await executeRes.json();

      setJob({
        id: execData.jobId || analysis.importId,
        status: "RUNNING",
        importedRows: 0,
        skippedRows: 0,
        errorCount: 0,
        totalRows: analysis.totalRows,
        errors: [],
      });
      setStep(2);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setConfirming(false);
    }
  };

  // --- Step 3: Poll progress ---

  useEffect(() => {
    if (step !== 2 || !job) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/import/${job.id}`);
        if (!res.ok) return;
        const data: ImportJob = await res.json();
        setJob(data);
        if (data.status === "COMPLETED" || data.status === "FAILED") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep(3);
        }
      } catch {
        // Silently retry on next poll
      }
    };

    pollRef.current = setInterval(poll, 2000);
    poll(); // Immediate first check
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Reset ---

  const handleReset = () => {
    setStep(0);
    setFile(null);
    setDescription("");
    setAnalysis(null);
    setDuplicateStrategy("skip");
    setJob(null);
  };

  // --- Render ---

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center pt-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 pt-28 pb-16">
        {/* Page header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold gradient-brand-text inline-block mb-2">
            Import Data
          </h1>
          <p className="text-gray-500 text-sm">
            Upload a spreadsheet and we'll map it to the right Go Suite app automatically.
          </p>
        </div>

        <StepIndicator current={step} />

        {/* ==================== STEP 1: UPLOAD ==================== */}
        {step === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Upload your data</h2>

            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-purple-400 bg-purple-50"
                  : file
                    ? "border-green-300 bg-green-50"
                    : "border-gray-300 hover:border-purple-300 hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              {file ? (
                <div className="space-y-1">
                  <svg className="w-10 h-10 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{formatSize(file.size)}</p>
                  <p className="text-xs text-purple-600 mt-1">Click or drop to replace</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="w-10 h-10 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="font-medium text-gray-700">
                    Drag & drop your file here, or <span className="text-purple-600">browse</span>
                  </p>
                  <p className="text-xs text-gray-400">Supports CSV, XLSX, XLS</p>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe your data <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Customer list from Mailchimp export — I want to import these as contacts in GoCRM"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
              />
            </div>

            {/* Analyze button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleAnalyze}
                disabled={!file || uploading}
                className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  !file || uploading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                }`}
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  "Analyze"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 2: ANALYSIS ==================== */}
        {step === 1 && analysis && (
          <div className="space-y-6">
            {/* Target app */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Recommended Destination</h2>
              <p className="text-sm text-gray-500 mb-4">
                We analyzed your data and recommend importing into:
              </p>
              <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-4 py-2">
                <span className="text-lg">&#8594;</span>
                <span className="font-semibold text-purple-800">
                  {analysis.targetApp} &mdash; {analysis.targetEntity}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">{analysis.totalRows} rows detected</p>
            </div>

            {/* Field mapping table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Field Mapping</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 font-medium text-gray-500">Source Column</th>
                      <th className="px-3 py-3 font-medium text-gray-400 text-center w-8">&rarr;</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Target Field</th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-center">Confidence</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Transform</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analysis.mappings.map((m, i) => (
                      <tr
                        key={i}
                        className={!m.targetField ? "opacity-50" : ""}
                      >
                        <td className="px-6 py-3 font-mono text-gray-700">{m.sourceColumn}</td>
                        <td className="px-3 py-3 text-center text-gray-300">&rarr;</td>
                        <td className="px-6 py-3 text-gray-900">
                          {m.targetField || <span className="italic text-gray-400">Unmapped</span>}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {m.targetField ? (
                            <ConfidenceBadge value={m.confidence} />
                          ) : (
                            <span className="text-gray-300">&mdash;</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-500 text-xs">
                          {m.transform || <span className="text-gray-300">&mdash;</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quality notes */}
            {analysis.qualityNotes.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Data Quality Notes
                </h4>
                <ul className="space-y-1">
                  {analysis.qualityNotes.map((note, i) => (
                    <li key={i} className="text-sm text-blue-700">&bull; {note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missing required fields */}
            {analysis.missingRequired.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  Missing Required Fields
                </h4>
                <ul className="space-y-1">
                  {analysis.missingRequired.map((field, i) => (
                    <li key={i} className="text-sm text-amber-700">&bull; {field}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Duplicate strategy + confirm button */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duplicate Handling
                  </label>
                  <select
                    value={duplicateStrategy}
                    onChange={(e) => setDuplicateStrategy(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  >
                    <option value="skip">Skip duplicates</option>
                    <option value="overwrite">Overwrite existing</option>
                    <option value="create">Create new records</option>
                  </select>
                </div>
                <button
                  onClick={handleConfirmImport}
                  disabled={confirming}
                  className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                    confirming
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                  }`}
                >
                  {confirming ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Starting import...
                    </span>
                  ) : (
                    "Confirm & Import"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== STEP 3: IMPORTING ==================== */}
        {step === 2 && job && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Importing your data...</h2>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>
                  {job.importedRows + job.skippedRows + job.errorCount} / {job.totalRows}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${job.totalRows > 0 ? Math.round(((job.importedRows + job.skippedRows + job.errorCount) / job.totalRows) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Live counters */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-700">{job.importedRows}</p>
                <p className="text-xs text-green-600 font-medium">Imported</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-yellow-700">{job.skippedRows}</p>
                <p className="text-xs text-yellow-600 font-medium">Skipped</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-red-700">{job.errorCount}</p>
                <p className="text-xs text-red-600 font-medium">Errors</p>
              </div>
            </div>

            {/* Pulse animation */}
            <div className="flex justify-center mt-6">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500" />
              </span>
            </div>
          </div>
        )}

        {/* ==================== STEP 4: RESULTS ==================== */}
        {step === 3 && job && (
          <div className="space-y-6">
            {/* Summary card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                {job.status === "COMPLETED" ? (
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {job.status === "COMPLETED" ? "Import Complete" : "Import Failed"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {job.status === "COMPLETED"
                      ? "Your data has been imported successfully."
                      : "Something went wrong during the import."}
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-green-700">{job.importedRows}</p>
                  <p className="text-sm text-green-600 font-medium">Imported</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-yellow-700">{job.skippedRows}</p>
                  <p className="text-sm text-yellow-600 font-medium">Skipped</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-red-700">{job.errorCount}</p>
                  <p className="text-sm text-red-600 font-medium">Errors</p>
                </div>
              </div>
            </div>

            {/* Errors table */}
            {job.errors.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900">
                    Errors <span className="text-sm font-normal text-gray-400">(first 20)</span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-6 py-3 font-medium text-gray-500 w-24">Row</th>
                        <th className="px-6 py-3 font-medium text-gray-500">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {job.errors.slice(0, 20).map((err, i) => (
                        <tr key={i}>
                          <td className="px-6 py-3 font-mono text-gray-600">{err.row}</td>
                          <td className="px-6 py-3 text-red-600">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 rounded-lg font-semibold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Import More
              </button>
              {job.appUrl && (
                <a
                  href={job.appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 rounded-lg font-semibold text-sm bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors text-center"
                >
                  View in App
                </a>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Page wrapper with Suspense ---

export default function ImportPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="flex justify-center pt-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
          </div>
        </div>
      }
    >
      <ImportWizard />
    </Suspense>
  );
}
