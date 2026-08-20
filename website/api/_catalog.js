// single source of truth for what we sell: price, copy, and what each product
// REQUIRES from suppliers. checkout.js prices from here; _suppliers.js routes from
// `needs`, so supplier orders never depend on guessing from a product name.
//
// needs: 'machine' = a sealing machine · 'cans' = blank cans + lids
//        'labels'  = a custom label run (only when the order carries a design)

const CATALOG = {
  'price_1U5aMWH7FooXMM91vzo24eNq': {
    key: 'signature', name: 'signature package', amount: 247100,
    machine: true, needs: ['machine', 'cans', 'labels'],
    img: 'https://sealedandco.ca/img/captain-lineup.jpg',
    desc: 'the machine + cans printed with your logo + lids + label design\nsave 3% by paying e-transfer instead\ncard price includes 3% processing',
  },
  'price_1U5aMkH7FooXMM913ShzlTUr': {
    key: 'basic', name: 'basic package', amount: 175000,
    machine: true, needs: ['machine', 'cans'],
    img: 'https://sealedandco.ca/img/hero-cans.jpg',
    desc: 'the machine + blank cans + lids\nsave $101 vs buying separately\ncard price includes 3% processing',
  },
  'price_1U5aWBH7FooXMM91QjonZ8K8': {
    key: 'machine', name: 'machine only', amount: 144200,
    machine: true, needs: ['machine'],
    img: 'https://sealedandco.ca/img/machine-white.jpg',
    desc: 'fits cans 2.4" to 6.7"\nseals airtight in about 3 seconds\nyou own it outright - no fees, no contracts\ncard price includes 3% processing',
  },
  'price_1U5aMyH7FooXMM91QyQjUqKR': {
    key: 'cans', name: 'cans - 200 pack, blank', amount: 41200,
    machine: false, needs: ['cans'],
    img: 'https://sealedandco.ca/img/apero-ice.jpg',
    desc: 'clear tall cans + aluminum lids\ncard price includes 3% processing',
  },
  'price_1U5aNCH7FooXMM910AuFuNyY': {
    key: 'cans-branded', name: 'cans - 200 pack, your branding', amount: 79800,
    machine: false, needs: ['cans', 'labels'], requiresDesign: true,
    img: 'https://sealedandco.ca/img/steel-matcha.jpg',
    desc: 'clear tall cans + aluminum lids\nyour design printed on 2x2in labels\nwe apply every label before delivery\n5-7 business days from art approval\ncard price includes 3% processing',
  },
  // Leo draws the label for them. included free in signature; a paid add-on with
  // branded cans. PRICE IS A PLACEHOLDER pending Leo's pricing review.
  'svc-design-branded': {
    key: 'svc-design', name: 'label design service', amount: 15500,
    machine: false, needs: [], designService: true,
    img: 'https://sealedandco.ca/img/matcha-box.jpg',
    desc: 'we draw your label for the 2x2in sticker\nyou approve a proof before anything prints\ncard price includes 3% processing',
  },
};

const COLOURS = new Set(['white', 'black']);

module.exports = { CATALOG, COLOURS };
