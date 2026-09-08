const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { ChaosInjector } = require('../chaos/ChaosInjector');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 9090;
const chaos = new ChaosInjector();

const quotes = new Map();
const payments = new Map();
const policies = new Map();

// Quote endpoint (Insurance Quoter)
app.post('/v1/quotes', async (req, res) => {
  await chaos.injectLatency();
  
  if (chaos.shouldFail()) {
    return res.status(500).json({ error: 'Insurance service unavailable' });
  }
  
  if (chaos.shouldReturnInvalid()) {
    return res.status(200).json({ invalid: 'format' });
  }

  const { plate, vehicleYear, cityCode, documentId } = req.body;
  
  const quoteId = `Q-${uuidv4().substring(0, 8).toUpperCase()}`;
  const premium = Math.floor(Math.random() * 500000) + 200000;
  const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  quotes.set(quoteId, { quoteId, premium, currency: 'COP', validUntil, plate, vehicleYear });
  
  console.log(`[QUOTE] Generated quote ${quoteId} for plate ${plate}`);
  res.json({ quoteId, premium, currency: 'COP', validUntil });
});

// Payment endpoint (PSP)
app.post('/v1/payments', async (req, res) => {
  await chaos.injectLatency();
  
  if (chaos.shouldFail()) {
    return res.status(500).json({ error: 'Payment service unavailable' });
  }

  const { quoteId, amount, currency, customerRef } = req.body;
  
  const paymentId = `PAY-${uuidv4().substring(0, 8).toUpperCase()}`;
  payments.set(paymentId, { paymentId, quoteId, amount, currency, customerRef, status: 'PENDING' });
  
  console.log(`[PAYMENT] Created payment ${paymentId} for quote ${quoteId}`);
  
  setTimeout(() => {
    sendPaymentWebhook(paymentId, 'APPROVED');
  }, 2000);
  
  res.status(202).json({ paymentId, status: 'PENDING' });
});

function sendPaymentWebhook(paymentId, status) {
  const payment = payments.get(paymentId);
  if (!payment) return;
  
  payment.status = status;
  payments.set(paymentId, payment);
  
  const webhookPayload = {
    paymentId,
    status,
    occurredAt: new Date().toISOString(),
    signature: 'mock-hmac-signature'
  };
  
  console.log(`[WEBHOOK] Sending payment ${status} for ${paymentId}`);
  
  fetch('http://orchestrator:8080/webhooks/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload)
  }).catch(err => console.error('[WEBHOOK] Failed:', err.message));
}

// Issue endpoint (Legacy Issuer)
app.post('/issue', async (req, res) => {
  await chaos.injectIssuerLatency();
  
  if (chaos.shouldIssuerFail()) {
    return res.status(500).json({ error: 'Issuer service unavailable' });
  }
  
  if (chaos.shouldTimeout()) {
    setTimeout(() => {
      processIssuance(req.body, true);
    }, 10000);
    return res.status(408).json({ error: 'Request timeout' });
  }
  
  if (chaos.shouldReturnInvalid()) {
    return res.status(200).json({ invalid: 'format' });
  }

  const result = processIssuance(req.body, false);
  res.json(result);
});

function processIssuance(data, wasTimeout) {
  const { orderId, plate, correlationId } = data;
  
  if (chaos.shouldBusinessError()) {
    return {
      result: 'ERROR',
      code: 'BUSINESS_RULE_VIOLATION',
      message: 'Vehicle does not meet minimum age requirements'
    };
  }
  
  const policyNumber = `POL-${uuidv4().substring(0, 8).toUpperCase()}`;
  const externalRef = orderId;
  
  policies.set(orderId, { policyNumber, externalRef, issuedAt: new Date().toISOString() });
  
  console.log(`[ISSUER] Issued policy ${policyNumber} for order ${orderId}${wasTimeout ? ' (delayed)' : ''}`);
  
  return {
    policy_number: policyNumber,
    external_reference: externalRef,
    issued_date: new Date().toISOString(),
    legacy_status: 'ACTIVE'
  };
}

// Policy query endpoint
app.get('/policies', (req, res) => {
  const { externalRef } = req.query;
  const policy = policies.get(externalRef);
  
  if (policy) {
    res.json(policy);
  } else {
    res.status(404).json({ error: 'Policy not found' });
  }
});

// Chaos control endpoints
app.post('/chaos/trigger-downtime', (req, res) => {
  const { durationSeconds = 30 } = req.body;
  chaos.triggerDowntime(durationSeconds);
  console.log(`[CHAOS] Issuer downtime triggered for ${durationSeconds}s`);
  res.json({ message: `Issuer downtime for ${durationSeconds}s` });
});

app.post('/chaos/reset', (req, res) => {
  chaos.reset();
  console.log('[CHAOS] Chaos state reset');
  res.json({ message: 'Chaos reset' });
});

app.get('/chaos/status', (req, res) => {
  res.json(chaos.getStatus());
});

app.listen(PORT, () => {
  console.log(`[SIMULATOR] Running on port ${PORT}`);
  console.log(`[CHAOS] Config: duplicate=${chaos.config.duplicateRate}, invalid=${chaos.config.invalidFormatRate}`);
});
