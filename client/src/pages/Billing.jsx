import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { QRCodeSVG } from 'qrcode.react';
import { Check, CheckCircle2 } from 'lucide-react';

const Billing = () => {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [pricingInfo, setPricingInfo] = useState(null);
  
  const [step, setStep] = useState('select'); // select, upi, success
  const [upiDetails, setUpiDetails] = useState(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlan();
  }, []);

  const fetchPlan = async () => {
    try {
      const res = await apiClient.get('/payment/status');
      if (res.success) setCurrentPlan(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan, price) => {
    setSelectedPlan(plan);
    setPricingInfo({ finalAmount: price, originalAmount: price, discountAmount: 0 });
    setStep('select');
    setError('');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const res = await apiClient.post('/payment/initiate', { plan: selectedPlan, couponCode });
      if (res.success) {
        setPricingInfo(res.data.pricing);
        setError('');
      }
    } catch (err) {
      setError(err.message || 'Invalid coupon');
    }
  };

  const handleProceedUpi = async () => {
    try {
      const res = await apiClient.post('/payment/initiate', { plan: selectedPlan, couponCode: couponCode || undefined });
      if (res.success) {
        setUpiDetails(res.data.upi);
        setPricingInfo(res.data.pricing);
        setStep('upi');
      }
    } catch (err) {
      setError(err.message || 'Failed to initiate payment');
    }
  };

  const handleSubmitUtr = async () => {
    if (!utrNumber || utrNumber.length < 6) {
      setError('Enter a valid UTR number');
      return;
    }
    try {
      const res = await apiClient.post('/payment/submit-utr', {
        plan: selectedPlan,
        couponCode: couponCode || undefined,
        utrNumber,
        paidAmount: pricingInfo.finalAmount
      });
      if (res.success) {
        setStep('success');
      }
    } catch (err) {
      setError(err.message || 'Submission failed');
    }
  };

  if (loading) return <div className="p-10 text-center"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Billing & Plans</h1>
        <p className="text-slate-400 mt-1">Upgrade to monitor more websites</p>
      </div>

      {currentPlan && (
        <div className="card mb-8 bg-blue-50 border-blue-200">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="text-sm text-slate-400 mb-1">Current Status</div>
              <div className="flex items-center gap-3">
                <span className={`badge badge-${currentPlan.plan.type}`}>{currentPlan.plan.type.toUpperCase()}</span>
                <span className={`badge badge-${currentPlan.plan.status === 'active' ? 'approved' : 'pending'}`}>
                  {currentPlan.plan.status.toUpperCase()}
                </span>
                {currentPlan.plan.expiresAt && (
                  <span className="text-sm text-slate-400">Expires: {new Date(currentPlan.plan.expiresAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            {currentPlan.latestPayment && (
              <div className="text-right text-sm text-slate-400">
                Last payment: <strong className="text-white">₹{currentPlan.latestPayment.finalAmount}</strong> ({currentPlan.latestPayment.plan})<br />
                Status: <span className={`badge badge-${currentPlan.latestPayment.status}`}>{currentPlan.latestPayment.status}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Basic */}
        <div 
          className={`card cursor-pointer transition-all ${selectedPlan === 'basic' ? 'ring-2 ring-blue-500 border-blue-500 scale-105' : 'hover:border-blue-500/50'}`}
          onClick={() => handleSelectPlan('basic', 299)}
        >
          <h3 className="text-lg font-bold">Basic</h3>
          <div className="text-3xl font-bold my-4">₹299<span className="text-sm font-normal text-slate-400">/mo</span></div>
          <p className="text-sm mb-6">Up to <strong>3 websites</strong></p>
          <ul className="text-sm text-slate-400 space-y-3">
            <li className="flex gap-2"><Check size={16} className="text-blue-500"/> Uptime monitoring (5 min)</li>
            <li className="flex gap-2"><Check size={16} className="text-blue-500"/> AI root-cause analysis</li>
            <li className="flex gap-2"><Check size={16} className="text-blue-500"/> SEO/PageSpeed audits</li>
          </ul>
        </div>

        {/* Pro */}
        <div 
          className={`card cursor-pointer transition-all border-purple-500/50 relative ${selectedPlan === 'pro' ? 'ring-2 ring-purple-500 border-purple-500 scale-105' : 'hover:border-purple-500'}`}
          onClick={() => handleSelectPlan('pro', 599)}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
          <h3 className="text-lg font-bold text-purple-400">Pro</h3>
          <div className="text-3xl font-bold text-purple-400 my-4">₹599<span className="text-sm font-normal text-slate-400">/mo</span></div>
          <p className="text-sm mb-6">Up to <strong>10 websites</strong></p>
          <ul className="text-sm text-slate-400 space-y-3">
            <li className="flex gap-2"><Check size={16} className="text-purple-500"/> Everything in Basic</li>
            <li className="flex gap-2"><Check size={16} className="text-purple-500"/> Telegram notifications</li>
            <li className="flex gap-2"><Check size={16} className="text-purple-500"/> Detailed analytics</li>
          </ul>
        </div>

        {/* Elite */}
        <div 
          className={`card cursor-pointer transition-all border-orange-500/50 ${selectedPlan === 'elite' ? 'ring-2 ring-orange-500 border-orange-500 scale-105' : 'hover:border-orange-500'}`}
          onClick={() => handleSelectPlan('elite', 1499)}
        >
          <h3 className="text-lg font-bold text-orange-400">Elite</h3>
          <div className="text-3xl font-bold text-orange-400 my-4">₹1499<span className="text-sm font-normal text-slate-400">/mo</span></div>
          <p className="text-sm mb-6">Up to <strong>15 websites</strong></p>
          <ul className="text-sm text-slate-400 space-y-3">
            <li className="flex gap-2"><Check size={16} className="text-orange-500"/> Everything in Pro</li>
            <li className="flex gap-2"><Check size={16} className="text-orange-500"/> Priority support</li>
            <li className="flex gap-2"><Check size={16} className="text-orange-500"/> Custom reports</li>
          </ul>
        </div>
      </div>

      {/* Payment Flow */}
      {selectedPlan && (
        <div className="card mt-8 animate-[fadeIn_0.3s_ease-out]">
          {step === 'select' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Complete Your Payment</h2>
              
              <div className="bg-slate-100 p-5 rounded-lg mb-6">
                <div className="flex justify-between mb-2"><span>Plan</span><span className="font-bold uppercase">{selectedPlan}</span></div>
                <div className="flex justify-between mb-2"><span>Original Price</span><span>₹{pricingInfo?.originalAmount}</span></div>
                {pricingInfo?.discountAmount > 0 && (
                  <div className="flex justify-between mb-2 text-green-400"><span>Discount</span><span>-₹{pricingInfo.discountAmount}</span></div>
                )}
                <div className="border-t border-slate-200 my-3"></div>
                <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-blue-500">₹{pricingInfo?.finalAmount}</span></div>
              </div>

              <div className="mb-6">
                <label className="form-label">Coupon Code (optional)</label>
                <div className="flex gap-2">
                  <input type="text" className="form-input uppercase" placeholder="e.g. SAVE20" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}/>
                  <button className="btn btn-ghost" onClick={handleApplyCoupon}>Apply</button>
                </div>
                {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
              </div>

              <button className="btn btn-primary w-full" onClick={handleProceedUpi}>Proceed to Payment →</button>
            </div>
          )}

          {step === 'upi' && upiDetails && (
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div className="text-center bg-white p-4 rounded-xl shrink-0">
                <QRCodeSVG value={upiDetails.upiString} size={200} />
                <p className="text-slate-600 text-sm mt-3 font-medium">Scan with any UPI app</p>
              </div>
              
              <div className="flex-1 w-full">
                <div className="bg-slate-100 p-5 rounded-lg mb-6 leading-loose text-sm">
                  <div><strong>UPI ID:</strong> {upiDetails.id}</div>
                  <div><strong>Payee:</strong> {upiDetails.payeeName}</div>
                  <div><strong>Amount:</strong> <span className="text-green-500 text-lg font-bold ml-1">₹{pricingInfo.finalAmount}</span></div>
                </div>

                <div className="mb-4">
                  <label className="form-label">Enter UTR Number after payment</label>
                  <input type="text" className="form-input uppercase" placeholder="e.g. 406123456789" value={utrNumber} onChange={e => setUtrNumber(e.target.value)} />
                  {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
                </div>

                <div className="flex gap-3">
                  <button className="btn btn-success flex-1" onClick={handleSubmitUtr}>✅ Submit Payment</button>
                  <button className="btn btn-ghost flex-1" onClick={() => setStep('select')}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-10">
              <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Payment Submitted!</h2>
              <p className="text-slate-400">Admin will verify your UTR and activate the plan shortly. You will receive an email confirmation.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Billing;
