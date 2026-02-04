"use client";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center">
        <span className="text-6xl">🚀</span>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          Coming Soon!
        </h2>
        <p className="mt-3 text-gray-600 leading-relaxed">
          Full AI-powered app generation is coming soon. We&apos;re building
          deep integration with Claude Code to turn your idea into a deployable
          app in minutes.
        </p>
        <button
          onClick={onClose}
          className="mt-6 gradient-brand text-white px-8 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Close
        </button>
      </div>
    </div>
  );
}
