'use client';

import { useState } from 'react';
import { toast } from '@/components/auth/Toast';
import { Phone, Mail, MessageCircle, HelpCircle } from 'lucide-react';

const FAQ = [
  { q: 'How do I book a ride?', a: 'Go to Book Ride, enter pickup and drop locations, select a vehicle, and confirm.' },
  { q: 'How do I cancel a ride?', a: 'Open ride tracking and tap Cancel. Cancellation fees may apply after driver assignment.' },
  { q: 'What payment methods are supported?', a: 'Cash, UPI, Card, Wallet, and Net Banking.' },
  { q: 'How do I get a refund?', a: 'Go to Payments, find the transaction, and request a refund. Admin will process it.' },
  { q: 'Driver not assigned?', a: 'The system auto-assigns nearby drivers. If none accept, the ride is cancelled automatically.' },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);
  const [message, setMessage] = useState('');

  const submitTicket = () => {
    if (!message.trim()) { toast.error('Please describe your issue'); return; }
    toast.success('Support ticket submitted. We will respond within 24 hours.');
    setMessage('');
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Help & Support</h1>
      <p className="mb-8 text-slate-600">Get help with rides, payments, and your account.</p>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <a href="tel:18001234567" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md">
          <Phone className="h-6 w-6 text-amber-500" />
          <div><p className="font-medium">Call Us</p><p className="text-sm text-slate-500">1800-123-4567</p></div>
        </a>
        <a href="mailto:support@cabbook.com" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md">
          <Mail className="h-6 w-6 text-amber-500" />
          <div><p className="font-medium">Email</p><p className="text-sm text-slate-500">support@cabbook.com</p></div>
        </a>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <MessageCircle className="h-6 w-6 text-amber-500" />
          <div><p className="font-medium">Live Chat</p><p className="text-sm text-slate-500">9 AM – 9 PM</p></div>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><HelpCircle className="h-5 w-5" /> FAQ</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="rounded-lg border border-slate-100">
              <button onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-900">
                {item.q}
                <span className="text-slate-400">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Submit a Ticket</h2>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
          placeholder="Describe your issue..."
          className="mb-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm" />
        <button onClick={submitTicket}
          className="rounded-lg bg-amber-500 px-6 py-2.5 font-medium text-white hover:bg-amber-600">Submit</button>
      </div>
    </div>
  );
}
