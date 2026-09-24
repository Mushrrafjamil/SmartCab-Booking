'use client';

import { useEffect, useState } from 'react';
import { walletService } from '@/services';
import { toast } from '@/components/auth/Toast';
import { WalletTransaction } from '@/types';
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react';

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = async () => {
    try {
      const [balRes, txRes] = await Promise.all([
        walletService.getBalance(),
        walletService.getTransactions(),
      ]);
      setBalance(balRes.data.balance ?? balRes.data.walletBalance ?? 0);
      setTransactions(txRes.data.transactions || []);
    } catch {
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addMoney = async () => {
    const val = Number(amount);
    if (!val || val <= 0) { toast.error('Enter a valid amount'); return; }
    setActing(true);
    try {
      const { data } = await walletService.addMoney(val);
      toast.success(data.message || 'Money added');
      setAmount('');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed';
      toast.error(msg);
    } finally { setActing(false); }
  };

  const withdraw = async () => {
    const val = Number(withdrawAmount);
    if (!val || val <= 0) { toast.error('Enter a valid amount'); return; }
    setActing(true);
    try {
      const { data } = await walletService.withdrawMoney(val);
      toast.success(data.message || 'Withdrawal submitted');
      setWithdrawAmount('');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Withdrawal failed';
      toast.error(msg);
    } finally { setActing(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Wallet</h1>
      <div className="mb-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white shadow-lg">
        <p className="text-sm text-amber-100">Available Balance</p>
        <p className="text-4xl font-bold">₹{balance}</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-green-600">
            <ArrowUpCircle className="h-5 w-5" /><span className="font-medium">Add Money</span>
          </div>
          <div className="flex gap-2">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2" />
            <button disabled={acting} onClick={addMoney}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50">Add</button>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-blue-600">
            <ArrowDownCircle className="h-5 w-5" /><span className="font-medium">Withdraw</span>
          </div>
          <div className="flex gap-2">
            <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Amount"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2" />
            <button disabled={acting} onClick={withdraw}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">Withdraw</button>
          </div>
        </div>
      </div>

      <h2 className="mb-4 font-semibold text-slate-900">Transaction History</h2>
      <div className="space-y-2">
        {transactions.map((tx) => (
          <div key={tx._id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
            <div>
              <p className="font-medium text-slate-900 capitalize">{(tx as { description?: string }).description || tx.type}</p>
              <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <span className={`font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
              </span>
              <p className="text-xs capitalize text-slate-400">{tx.status || 'success'}</p>
            </div>
          </div>
        ))}
        {transactions.length === 0 && <p className="text-center text-slate-500">No transactions yet</p>}
      </div>
    </div>
  );
}
