// creates a Stripe Checkout Session for the cart, so multi-item card orders work.
// needs STRIPE_SECRET_KEY set in Vercel project env vars (the site owner adds it in
// the Vercel dashboard - it is never exposed to the browser).

const ALLOWED_PRICES = new Set([
  'price_1U5aMWH7FooXMM91vzo24eNq', // signature
  'price_1U5aMkH7FooXMM913ShzlTUr', // basic
  'price_1U5aWBH7FooXMM91QjonZ8K8', // machine only
  'price_1U5aMyH7FooXMM91QyQjUqKR', // cans blank
  'price_1U5aNCH7FooXMM910AuFuNyY', // cans branded
]);

// prices whose products include a machine - these carts get the colour picker
const MACHINE_PRICES = new Set([
  'price_1U5aMWH7FooXMM91vzo24eNq',
  'price_1U5aMkH7FooXMM913ShzlTUr',
  'price_1U5aWBH7FooXMM91QjonZ8K8',
]);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(503).json({ error: 'not-configured' });

  const items = (req.body && req.body.items) || [];
  if (!Array.isArray(items) || items.length < 1 || items.length > 10) {
    return res.status(400).json({ error: 'bad-items' });
  }
  for (const it of items) {
    if (!ALLOWED_PRICES.has(it.price)) return res.status(400).json({ error: 'bad-price' });
  }

  const origin = req.headers.origin || 'https://sealedandco.ca';
  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('success_url', origin + '/#thanks');
  p.set('cancel_url', origin + '/#cart');
  p.set('phone_number_collection[enabled]', 'true');
  p.set('shipping_address_collection[allowed_countries][0]', 'CA');
  p.set('payment_method_types[0]', 'card');
  p.set('payment_method_types[1]', 'link');
  p.set('payment_intent_data[statement_descriptor]', 'SEALED AND CO');
  p.set('payment_intent_data[description]', 'sealed & co. - online order');
  p.set('invoice_creation[enabled]', 'true');
  p.set('invoice_creation[invoice_data][description]',
    "thanks for building your brand with sealed & co. - your order is confirmed and we'll reach out within 24 hours.");
  p.set('invoice_creation[invoice_data][footer]',
    'sealed & co. · toronto · sealedandco.ca · leokat97@gmail.com · no fees, no contracts - you own it.');
  p.set('custom_fields[0][key]', 'business_name');
  p.set('custom_fields[0][label][type]', 'custom');
  p.set('custom_fields[0][label][custom]', 'business name');
  p.set('custom_fields[0][type]', 'text');

  let hasMachine = false;
  items.forEach((it, i) => {
    if (MACHINE_PRICES.has(it.price)) hasMachine = true;
    const qty = Math.min(99, Math.max(1, it.qty | 0));
    p.set(`line_items[${i}][price]`, it.price);
    p.set(`line_items[${i}][quantity]`, String(qty));
  });

  if (hasMachine) {
    p.set('custom_fields[1][key]', 'machine_colour');
    p.set('custom_fields[1][label][type]', 'custom');
    p.set('custom_fields[1][label][custom]', 'machine colour');
    p.set('custom_fields[1][type]', 'dropdown');
    p.set('custom_fields[1][dropdown][options][0][label]', 'white');
    p.set('custom_fields[1][dropdown][options][0][value]', 'white');
    p.set('custom_fields[1][dropdown][options][1][label]', 'black');
    p.set('custom_fields[1][dropdown][options][1][value]', 'black');
  }

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: p.toString(),
    });
    const d = await r.json();
    if (d && d.url) return res.status(200).json({ url: d.url });
    return res.status(502).json({ error: 'stripe', detail: d.error && d.error.message });
  } catch (e) {
    return res.status(502).json({ error: 'network' });
  }
};
