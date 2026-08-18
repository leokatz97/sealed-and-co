// creates a Stripe Checkout Session for the cart. product names, prices, and
// descriptions are defined HERE (inline price_data) so the site and checkout
// can never disagree. colour is chosen on the site and carried into the order.

const CATALOG = {
  'price_1U5aMWH7FooXMM91vzo24eNq': { key: 'signature', name: 'signature package', amount: 247100, machine: true,
    img: 'https://sealedandco.ca/img/captain-lineup.jpg',
    desc: 'the machine + cans printed with your logo + lids + label design\nsave 3% by paying e-transfer instead\ncard price includes 3% processing' },
  'price_1U5aMkH7FooXMM913ShzlTUr': { key: 'basic', name: 'basic package', amount: 175000, machine: true,
    img: 'https://sealedandco.ca/img/hero-cans.jpg',
    desc: 'the machine + blank cans + lids\nsave $101 vs buying separately\ncard price includes 3% processing' },
  'price_1U5aWBH7FooXMM91QjonZ8K8': { key: 'machine', name: 'machine only', amount: 144200, machine: true,
    img: 'https://sealedandco.ca/img/machine-white.jpg',
    desc: 'fits cans 2.4" to 6.7"\nseals airtight in about 3 seconds\nyou own it outright - no fees, no contracts\ncard price includes 3% processing' },
  'price_1U5aMyH7FooXMM91QyQjUqKR': { key: 'cans', name: 'cans - 200 pack', amount: 41200, machine: false,
    img: 'https://sealedandco.ca/img/apero-ice.jpg',
    desc: 'clear tall cans + aluminum lids\ncard price includes 3% processing' },
};
const COLOURS = new Set(['white', 'black']);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(503).json({ error: 'not-configured' });

  const items = (req.body && req.body.items) || [];
  if (!Array.isArray(items) || items.length < 1 || items.length > 10) {
    return res.status(400).json({ error: 'bad-items' });
  }
  for (const it of items) {
    if (!CATALOG[it.price]) return res.status(400).json({ error: 'bad-price' });
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
  p.set('invoice_creation[enabled]', 'true');
  p.set('invoice_creation[invoice_data][description]',
    "thanks for building your brand with sealed & co. - your order is confirmed and we'll reach out within 24 hours.");
  p.set('invoice_creation[invoice_data][footer]',
    'sealed & co. · toronto · sealedandco.ca · leokat97@gmail.com · no fees, no contracts - you own it.');
  p.set('custom_fields[0][key]', 'business_name');
  p.set('custom_fields[0][label][type]', 'custom');
  p.set('custom_fields[0][label][custom]', 'business name');
  p.set('custom_fields[0][type]', 'text');

  const colourNotes = [];
  items.forEach((it, i) => {
    const c = CATALOG[it.price];
    const qty = Math.min(99, Math.max(1, it.qty | 0));
    const colour = c.machine && COLOURS.has(it.colour) ? it.colour : (c.machine ? 'white' : null);
    const name = colour ? c.name + ' \u00b7 ' + colour + ' machine' : c.name;
    if (colour) colourNotes.push(c.name + ': ' + colour);
    p.set(`line_items[${i}][price_data][currency]`, 'cad');
    p.set(`line_items[${i}][price_data][unit_amount]`, String(c.amount));
    p.set(`line_items[${i}][price_data][product_data][name]`, name);
    p.set(`line_items[${i}][price_data][product_data][description]`, c.desc);
    p.set(`line_items[${i}][price_data][product_data][images][0]`, c.img);
    p.set(`line_items[${i}][quantity]`, String(qty));
  });
  const orderDesc = 'sealed & co. - online order' + (colourNotes.length ? ' (' + colourNotes.join(', ') + ')' : '');
  p.set('payment_intent_data[description]', orderDesc.slice(0, 900));
  if (colourNotes.length) p.set('metadata[machine_colour]', colourNotes.join(', ').slice(0, 480));

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
