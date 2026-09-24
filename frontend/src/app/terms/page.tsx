import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Terms & Conditions</h1>
      <p className="mb-8 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Acceptance of Terms</h2>
          <p className="mt-2 text-sm leading-relaxed">
            By creating an account or using CabBook, you agree to these terms. If you do not agree, please do not use the service.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. User Accounts</h2>
          <p className="mt-2 text-sm leading-relaxed">
            You are responsible for keeping your login credentials secure. Provide accurate information during registration and keep your profile up to date.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. Rides & Payments</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Fares are calculated based on distance, vehicle type, and applicable surcharges. Payments may be made via wallet, UPI, card, or cash where supported.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Cancellations & Refunds</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Cancellation fees may apply after a driver is assigned. Refund requests are reviewed by our support team within 3–5 business days.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Driver Partners</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Drivers must maintain valid documents, vehicle registration, and insurance. CabBook reserves the right to suspend accounts that violate safety or compliance requirements.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">6. Contact</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Questions about these terms? Visit our{' '}
            <Link href="/help" className="text-amber-600 hover:underline">Help & Support</Link> page.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/register" className="text-sm font-medium text-amber-600 hover:underline">
          ← Back to registration
        </Link>
      </div>
    </div>
  );
}
