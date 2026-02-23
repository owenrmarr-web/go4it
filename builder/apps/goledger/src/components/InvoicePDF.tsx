"use client";

import { useEffect } from "react";
import InvoicePreview from "./InvoicePreview";

interface InvoicePDFProps {
  invoice: Parameters<typeof InvoicePreview>[0]["invoice"];
}

export default function InvoicePDF({ invoice }: InvoicePDFProps) {
  useEffect(() => {
    // Auto-trigger print dialog after render
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          @page { margin: 0.5in; }
        }
        @media screen {
          body { background: #f3f4f6; }
          .print-actions { display: flex; }
        }
        @media print {
          .print-actions { display: none !important; }
        }
      `}</style>

      <div className="print-actions fixed top-0 left-0 right-0 bg-white border-b border-gray-200 p-4 z-50 items-center justify-center gap-4 hidden">
        <button
          onClick={() => window.print()}
          className="gradient-brand text-white font-semibold py-2 px-6 rounded-lg hover:opacity-90 text-sm"
        >
          Download / Print PDF
        </button>
        <button
          onClick={() => window.history.back()}
          className="bg-gray-100 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          Back
        </button>
      </div>

      <div className="pt-20 print:pt-0 px-4 print:px-0">
        <InvoicePreview invoice={invoice} />
      </div>
    </>
  );
}
