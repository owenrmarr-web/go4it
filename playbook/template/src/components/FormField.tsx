interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export default function FormField({
  label,
  required,
  error,
  htmlFor,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-fg-secondary mb-1.5"
      >
        {label}
        {required && <span className="text-status-red-fg ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-status-red-fg">{error}</p>
      )}
    </div>
  );
}
