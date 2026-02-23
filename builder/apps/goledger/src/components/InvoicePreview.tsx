interface LineItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  clientZip?: string;
  lineItems: LineItemData[];
  subtotal: number;
  discountType?: string | null;
  discountValue?: number;
  discountAmount?: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  memo?: string;
  businessName?: string;
  businessAddress?: string;
  businessCity?: string;
  businessState?: string;
  businessZip?: string;
  businessEmail?: string;
  businessPhone?: string;
}

interface InvoicePreviewProps {
  invoice: InvoiceData;
}

export default function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const balanceDue = invoice.total - invoice.amountPaid;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold gradient-brand-text">
            {invoice.businessName || "My Business"}
          </h1>
          {invoice.businessAddress && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{invoice.businessAddress}</p>
          )}
          {(invoice.businessCity || invoice.businessState) && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {[invoice.businessCity, invoice.businessState, invoice.businessZip].filter(Boolean).join(", ")}
            </p>
          )}
          {invoice.businessEmail && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.businessEmail}</p>
          )}
          {invoice.businessPhone && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.businessPhone}</p>
          )}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">INVOICE</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{invoice.invoiceNumber}</p>
        </div>
      </div>

      {/* Bill To + Dates */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Bill To</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{invoice.clientName}</p>
          {invoice.clientEmail && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.clientEmail}</p>
          )}
          {invoice.clientAddress && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.clientAddress}</p>
          )}
          {(invoice.clientCity || invoice.clientState) && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {[invoice.clientCity, invoice.clientState, invoice.clientZip].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Issue Date:</span>
              <span className="text-gray-700 dark:text-gray-300">{new Date(invoice.issueDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Due Date:</span>
              <span className="text-gray-700 dark:text-gray-300">{new Date(invoice.dueDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <table className="w-full mb-6">
        <thead>
          <tr className="border-b-2 border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Description</th>
            <th className="text-right py-2 text-sm font-medium text-gray-500 dark:text-gray-400 w-20">Qty</th>
            <th className="text-right py-2 text-sm font-medium text-gray-500 dark:text-gray-400 w-28">Rate</th>
            <th className="text-right py-2 text-sm font-medium text-gray-500 dark:text-gray-400 w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((item, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
              <td className="py-3 text-sm text-gray-700 dark:text-gray-300">{item.description}</td>
              <td className="py-3 text-sm text-gray-700 dark:text-gray-300 text-right">{item.quantity}</td>
              <td className="py-3 text-sm text-gray-700 dark:text-gray-300 text-right">${item.unitPrice.toFixed(2)}</td>
              <td className="py-3 text-sm font-medium text-gray-900 dark:text-gray-100 text-right">${item.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-700 dark:text-gray-300">${invoice.subtotal.toFixed(2)}</span>
          </div>
          {invoice.discountAmount && invoice.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>
                Discount
                {invoice.discountType === "PERCENTAGE" && invoice.discountValue
                  ? ` (${invoice.discountValue}%)`
                  : ""}
              </span>
              <span>-${invoice.discountAmount.toFixed(2)}</span>
            </div>
          )}
          {invoice.taxRate > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Tax ({invoice.taxRate}%)</span>
              <span className="text-gray-700 dark:text-gray-300">${invoice.taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
            <span>Total</span>
            <span>${invoice.total.toFixed(2)}</span>
          </div>
          {invoice.amountPaid > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Amount Paid</span>
              <span>-${invoice.amountPaid.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t border-gray-300 dark:border-gray-600 pt-2">
            <span>Balance Due</span>
            <span className={balanceDue <= 0 ? "text-green-600" : "text-gray-900 dark:text-gray-100"}>
              ${balanceDue.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Memo */}
      {invoice.memo && (
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{invoice.memo}</p>
        </div>
      )}
    </div>
  );
}
