// api/verify-payment.js
// Vercel serverless function (CommonJS). Drops into the /api folder.

const axios = require('axios');

/**
 * Helper: normalize client amount input and compare against Paystack's tx.amount
 * Accepts:
 *  - amount sent as smallest unit (integer, e.g. 7500000)
 *  - amount sent as main unit (float, e.g. 75000 or 75000.00), will be multiplied by 100
 * Returns true if a match; false otherwise.
 */
function amountsMatch(clientAmountRaw, txAmount) {
  if (typeof clientAmountRaw === 'undefined' || clientAmountRaw === null) return true;

  const parsed = Number(clientAmountRaw);
  if (Number.isNaN(parsed)) return false;

  const asSmallest = Math.round(parsed);            // treat as already smallest unit if integer
  const asMainTimes100 = Math.round(parsed * 100);  // treat as main currency * 100

  if (Number(txAmount) === asSmallest) return true;
  if (Number(txAmount) === asMainTimes100) return true;
  return false;
}

module.exports = async (req, res) => {
  // Allow preflight
  if (req.method === 'OPTIONS') {
    // Vercel functions are same-origin by default; return minimal OK for preflight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ verified: false, error: 'Method Not Allowed' });
  }

  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      console.error('PAYSTACK_SECRET_KEY not set in environment');
      return res.status(500).json({ verified: false, error: 'Server misconfiguration' });
    }

    const { reference, email, currency, amount } = req.body || {};

    if (!reference) {
      return res.status(400).json({ verified: false, error: 'Missing reference' });
    }

    // Call Paystack verify endpoint
    const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      timeout: 10000,
    });

    const paystackData = response.data;
    if (!paystackData || !paystackData.data) {
      console.warn('Invalid response structure from Paystack:', paystackData);
      return res.status(500).json({ verified: false, error: 'Invalid response from Paystack' });
    }

    const tx = paystackData.data;
    let verified = tx.status === 'success';

    // optional checks
    if (typeof amount !== 'undefined' && amount !== null) {
      const match = amountsMatch(amount, tx.amount);
      if (!match) {
        console.warn('Amount mismatch: client sent', amount, 'paystack reported', tx.amount);
        verified = false;
      }
    }

    if (currency && tx.currency && currency.toUpperCase() !== tx.currency.toUpperCase()) {
      console.warn('Currency mismatch: client', currency, 'tx', tx.currency);
      verified = false;
    }

    // Return standardized JSON (keeps parity with your previous server)
    return res.status(200).json({ verified, data: tx });
  } catch (err) {
    console.error('verify-payment error:', err.response?.data || err.message || err);
    const payload = err.response?.data || err.message || 'Unknown error';
    return res.status(500).json({ verified: false, error: payload });
  }
};
