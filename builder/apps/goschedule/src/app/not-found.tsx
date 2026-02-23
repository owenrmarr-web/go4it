import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto">
          <span className="text-white font-bold text-2xl">?</span>
        </div>
        <h1 className="text-2xl font-bold text-fg">Page Not Found</h1>
        <p className="text-fg-muted max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="px-4 py-2 text-sm font-semibold text-white gradient-brand rounded-lg hover:opacity-90"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/book"
            className="px-4 py-2 text-sm font-semibold text-accent-fg bg-accent-soft rounded-lg hover:opacity-80"
          >
            Book an Appointment
          </Link>
        </div>
      </div>
    </div>
  );
}
