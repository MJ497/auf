// server.js
require('dotenv').config(); // load .env into process.env

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Read CORS setting from env
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// Robust CORS handling (supports '*' or comma-separated origins)
let allowedOrigins = [];
if (ALLOWED_ORIGIN && ALLOWED_ORIGIN.trim() !== '*') {
  allowedOrigins = ALLOWED_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
  console.log('CORS allowed origins:', allowedOrigins);
} else {
  console.log('CORS allowed origins: * (open)');
}

app.use(cors({
  origin: function(origin, callback) {
    // allow non-browser clients (curl, server-to-server) which don't send an Origin header
    if (!origin) return callback(null, true);

    // allow all
    if (ALLOWED_ORIGIN && ALLOWED_ORIGIN.trim() === '*') {
      return callback(null, true);
    }

    // allow when origin matches one of allowedOrigins
    if (allowedOrigins.length && allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // deny other origins
    const msg = `CORS policy: Origin ${origin} is not allowed`;
    return callback(new Error(msg), false);
  },
  optionsSuccessStatus: 200,
}));

// Note: removed app.options('*', cors()); because '*' triggers path-to-regexp error in some versions

app.use(bodyParser.json({ limit: '10mb' }));

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY; // loaded from .env

if (!PAYSTACK_SECRET_KEY) {
  console.error('PAYSTACK_SECRET_KEY environment variable not set! Please add it to your .env or environment.');
  process.exit(1); // fail fast to avoid running without credentials
}

/**
 * Helper: normalize client amount input and compare against Paystack's tx.amount
 */
function amountsMatch(clientAmountRaw, txAmount) {
  if (typeof clientAmountRaw === 'undefined' || clientAmountRaw === null) return true;

  const parsed = Number(clientAmountRaw);
  if (Number.isNaN(parsed)) return false;

  const asSmallest = Math.round(parsed);
  const asMainTimes100 = Math.round(parsed * 100);

  if (Number(txAmount) === asSmallest) return true;
  if (Number(txAmount) === asMainTimes100) return true;

  return false;
}

app.post('/verify-payment', async (req, res) => {
  try {
    console.log('Incoming /verify-payment body:', JSON.stringify(req.body));

    const { reference, email, currency, amount } = req.body;
    if (!reference) return res.status(400).json({ verified: false, error: 'Missing reference' });

    const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
      timeout: 10000, // 10s
    });

    console.log('Paystack verify raw response:', JSON.stringify(response.data, null, 2));

    const paystackData = response.data;
    if (!paystackData || !paystackData.data) {
      console.warn('Invalid response structure from Paystack:', paystackData);
      return res.status(500).json({ verified: false, error: 'Invalid response from Paystack' });
    }

    const tx = paystackData.data;
    let verified = (tx.status === 'success');

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

    console.log('Transaction reference:', tx.reference);
    console.log('Transaction status:', tx.status);
    console.log('Transaction amount (smallest unit):', tx.amount);
    console.log('Transaction currency:', tx.currency);
    console.log('Gateway response:', tx.gateway_response);
    console.log('Paid at:', tx.paid_at);

    return res.json({ verified, data: tx });
  } catch (err) {
    console.error('verify-payment error:', err.response?.data || err.message || err);
    return res.status(500).json({ verified: false, error: err.response?.data || err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Paystack verify server listening on ${PORT} (CORS origin: ${ALLOWED_ORIGIN})`));
