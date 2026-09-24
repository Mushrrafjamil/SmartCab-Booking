import { Payment } from '@/types';
import { IndianRupee, Download } from 'lucide-react';

interface PaymentCardProps {
  payment: Payment;
}

const statusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-blue-100 text-blue-700',
};

export default function PaymentCard({ payment }: PaymentCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Invoice #{payment.invoiceNumber}</p>
          <p className="mt-1 flex items-center text-2xl font-bold text-slate-900">
            <IndianRupee className="h-5 w-5" />{payment.amount}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[payment.status]}`}>
          {payment.status}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
        <span className="capitalize">{payment.method.replace(/_/g, ' ')}</span>
        {payment.paidAt && <span>{new Date(payment.paidAt).toLocaleDateString()}</span>}
      </div>
      <button className="mt-3 flex items-center gap-1 text-sm font-medium text-amber-600 hover:underline">
        <Download className="h-4 w-4" /> Download Invoice
      </button>
    </div>
  );
}
