/**
 * app.js
 * ------
 * The only place that knows about the DOM. Every business rule lives in
 * /js/models — this file just calls methods and renders results.
 */

import { Admin } from './models/User.js';
import { PhysicalProduct, DigitalProduct, SubscriptionProduct } from './models/Product.js';
import { RegularCustomer, PremiumCustomer, BusinessCustomer } from './models/Customer.js';
import { CreditCard, BankTransfer, DigitalWallet } from './models/PaymentMethod.js';
import { StandardDelivery, ExpressDelivery, SameDayDelivery } from './models/DeliveryMethod.js';
import { PercentageDiscount, FixedAmountDiscount, BuyOneGetOneDiscount, SeasonalDiscount } from './models/Discount.js';
import { ShoppingCart } from './models/ShoppingCart.js';
import { Store } from './models/Store.js';
import { Order } from './models/Order.js';

/* ============ BOOTSTRAP DATA ============ */

const store = new Store('Docket Marketplace');
new Admin('Ops Admin', 'admin@docket.dev'); // demonstrates the User -> Admin branch (not wired to UI)

store.addProduct(new PhysicalProduct('Field Recorder X2', 'Portable 4-track recorder, 32-bit float.', 249.0, 14, 0.6, 'Audio Gear'));
store.addProduct(new PhysicalProduct('Mechanical Keyboard 65%', 'Hot-swappable, gasket-mounted.', 139.0, 8, 0.9, 'Peripherals'));
store.addProduct(new PhysicalProduct('Ceramic Pour-Over Set', 'Hand-thrown dripper + carafe.', 58.0, 22, 1.4, 'Home'));
store.addProduct(new DigitalProduct('Type Foundry License', 'Full family, desktop + web use.', 89.0, 'files.docket.dev/type-foundry', 42, 'Design'));
store.addProduct(new DigitalProduct('Synth Preset Pack Vol. 3', '120 patches for modular racks.', 24.0, 'files.docket.dev/presets-v3', 180, 'Audio Gear'));
store.addProduct(new SubscriptionProduct('Cloud Render Farm — Pro', 'GPU rendering, 500 credits/mo.', 39.0, 12, true, 'Cloud'));
store.addProduct(new SubscriptionProduct('Studio Sample Library', 'New pack streamed monthly.', 15.0, 6, false, 'Audio Gear'));

const demoCustomers = [
  store.registerCustomer(new RegularCustomer('Amara Iqbal', 'amara@example.com', 400)),
  store.registerCustomer(new PremiumCustomer('Farhan Sheikh', 'farhan@example.com', 1200)),
  store.registerCustomer(new BusinessCustomer('Zenith Traders', 'orders@zenith.example', 20000)),
];

const promoCatalog = [
  new PercentageDiscount('SAVE10', 10),
  new FixedAmountDiscount('FLAT15', 15),
  new BuyOneGetOneDiscount('BOGO-PRESET', 'PRD-0005'), // Synth Preset Pack
  new SeasonalDiscount('WINTER20', 20, new Date('2020-01-01'), new Date('2035-12-31')),
];

/* ============ STATE ============ */

const state = {
  customer: demoCustomers[0],
  carts: new Map(demoCustomers.map((c) => [c.id, new ShoppingCart(c)])),
  filter: 'all',
  selectedDelivery: null,
  selectedPayment: null,
  selectedPromo: null,
  openOrderId: null,
};

const cart = () => state.carts.get(state.customer.id);

/* ============ DOM REFS ============ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const catalogGrid = $('#catalogGrid');
const cartLines = $('#cartLines');
const cartEmpty = $('#cartEmpty');
const cartCount = $('#cartCount');
const ordersCount = $('#ordersCount');
const orderList = $('#orderList');
const ordersEmpty = $('#ordersEmpty');
const breakdownList = $('#breakdownList');
const deliveryOptions = $('#deliveryOptions');
const paymentOptions = $('#paymentOptions');
const paymentFields = $('#paymentFields');
const promoSelect = $('#promoSelect');
const promoHint = $('#promoHint');
const customerSelect = $('#customerSelect');
const membershipPill = $('#membershipPill');
const walletBalance = $('#walletBalance');
const syslogBody = $('#syslogBody');
const classMap = $('#classMap');

/* ============ SYSTEM LOG ============ */

function log(message, kind = 'info') {
  const line = document.createElement('div');
  line.className = `log-line log-line--${kind}`;
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  line.innerHTML = `<span class="log-line__time">${time}</span><span class="log-line__msg"></span>`;
  line.querySelector('.log-line__msg').textContent = message;
  syslogBody.appendChild(line);
  syslogBody.scrollTop = syslogBody.scrollHeight;
}

/** Runs a model operation, logging success/failure without letting a
 *  thrown business rule crash the UI — this is where the assignment's
 *  "invalid transitions should be rejected" rules become visible. */
function attempt(successMessage, fn) {
  try {
    fn();
    log(successMessage, 'ok');
    return true;
  } catch (err) {
    log(err.message, 'err');
    return false;
  }
}

$('#clearLogBtn').addEventListener('click', () => { syslogBody.innerHTML = ''; });

/* ============ TABS ============ */

$$('.tab').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(name) {
  $$('.tab').forEach((b) => {
    const active = b.dataset.tab === name;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-selected', String(active));
  });
  $$('.panel').forEach((p) => p.classList.toggle('is-hidden', p.dataset.panel !== name));
  document.querySelector('.syslog')?.classList.remove('is-open');
}

$('#hamburger').addEventListener('click', (e) => {
  const syslog = document.querySelector('.syslog');
  const open = !syslog.classList.contains('is-open');
  syslog.classList.toggle('is-open', open);
  e.currentTarget.setAttribute('aria-expanded', String(open));
});

/* ============ CUSTOMER SWITCHER ============ */

function renderCustomerSelect() {
  customerSelect.innerHTML = demoCustomers
    .map((c) => `<option value="${c.id}">${c.name} — ${c.membershipLevel}</option>`)
    .join('');
  customerSelect.value = state.customer.id;
}

customerSelect.addEventListener('change', () => {
  state.customer = demoCustomers.find((c) => c.id === customerSelect.value);
  state.selectedPromo = null;
  promoSelect.value = '';
  log(`Switched active session to ${state.customer.name} (${state.customer.membershipLevel}).`, 'info');
  renderIdentity();
  renderCart();
});

function renderIdentity() {
  const level = state.customer.membershipLevel;
  membershipPill.textContent = level;
  membershipPill.className = `pill pill--${level.toLowerCase()}`;
  walletBalance.textContent = `$${state.customer.walletBalance.toFixed(2)} wallet`;
}

/* ============ CATALOG ============ */

$$('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    $$('.chip').forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    state.filter = chip.dataset.filter;
    renderCatalog();
  });
});

function renderCatalog() {
  const products = store.listProducts().filter((p) => state.filter === 'all' || p.typeLabel === state.filter);

  catalogGrid.innerHTML = products.map((p) => {
    let metaHtml = '';
    if (p instanceof PhysicalProduct) {
      metaHtml = `<span>📦 ${p.stock} in stock</span><span>${p.weightKg} kg</span>`;
    } else if (p instanceof DigitalProduct) {
      metaHtml = `<span>⬇ ${p.fileSizeMb} MB</span><span>Instant access</span>`;
    } else if (p instanceof SubscriptionProduct) {
      metaHtml = `<span>${p.durationMonths} mo. term</span><span>${p.autoRenew ? 'Auto-renews' : 'One-time term'}</span>`;
    }

    const outOfStock = p instanceof PhysicalProduct && p.stock === 0;

    return `
      <article class="product-card" data-id="${p.id}">
        <div class="product-card__top">
          <span class="product-card__id">${p.id}</span>
          <span class="badge badge--${p.typeLabel}">${p.typeLabel}</span>
        </div>
        <h3 class="product-card__name">${p.name}</h3>
        <p class="product-card__desc">${p.description}</p>
        <div class="product-card__meta">${metaHtml}</div>
        <div class="product-card__foot">
          <span class="price">$${p.basePrice.toFixed(2)} <small>${p instanceof SubscriptionProduct ? '/mo' : ''}</small></span>
          <div class="qty-add">
            <input type="number" min="1" value="1" class="qty-input" data-qty="${p.id}" ${outOfStock ? 'disabled' : ''}>
            <button class="btn btn--primary btn--sm" data-add="${p.id}" ${outOfStock ? 'disabled' : ''}>${outOfStock ? 'Sold out' : 'Add'}</button>
          </div>
        </div>
      </article>`;
  }).join('') || '<p class="empty-state">No products match this filter.</p>';

  $$('[data-add]', catalogGrid).forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.add;
      const qtyInput = $(`[data-qty="${id}"]`, catalogGrid);
      const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
      const product = store.findProduct(id);
      attempt(`Added ${qty} x "${product.name}" to ${state.customer.name}'s cart.`, () => {
        cart().addProduct(product, qty);
      });
      renderCatalog();
      renderCart();
    });
  });
}

/* ============ CART ============ */

function renderCart() {
  const c = cart();
  const lines = c.lines;
  cartCount.textContent = lines.reduce((n, l) => n + l.quantity, 0);

  cartEmpty.classList.toggle('is-hidden', lines.length > 0);
  cartLines.innerHTML = '';
  if (lines.length === 0) {
    cartLines.appendChild(cartEmpty);
  } else {
    lines.forEach(({ product, quantity }) => {
      const row = document.createElement('div');
      row.className = 'cart-line';
      row.innerHTML = `
        <div class="cart-line__info">
          <div class="cart-line__name">${product.name}</div>
          <div class="cart-line__type">${product.typeLabel} · ${product.id}</div>
        </div>
        <div class="cart-line__qty">
          <input type="number" min="1" value="${quantity}" class="qty-input" style="width:56px">
        </div>
        <div class="cart-line__price">$${product.calculatePrice(quantity).toFixed(2)}</div>
        <button class="icon-btn" title="Remove">✕</button>
      `;
      const qtyInput = $('input', row);
      qtyInput.addEventListener('change', () => {
        const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
        attempt(`Updated "${product.name}" to ${qty}.`, () => c.updateQuantity(product.id, qty));
        renderCart();
      });
      $('.icon-btn', row).addEventListener('click', () => {
        c.removeProduct(product.id);
        log(`Removed "${product.name}" from cart.`, 'info');
        renderCart();
      });
      cartLines.appendChild(row);
    });
  }

  renderDeliveryOptions();
  renderPaymentOptions();
  renderBreakdown();
}

/* ---- promo codes ---- */

function renderPromoOptions() {
  promoSelect.innerHTML = '<option value="">No promo code</option>' +
    promoCatalog.map((d) => `<option value="${d.code}">${d.code} — ${d.description}</option>`).join('');
}

$('#applyPromoBtn').addEventListener('click', () => {
  const code = promoSelect.value;
  if (!code) {
    state.selectedPromo = null;
    promoHint.textContent = '';
    renderBreakdown();
    return;
  }
  state.selectedPromo = promoCatalog.find((d) => d.code === code) || null;
  promoHint.textContent = state.selectedPromo ? `Will apply at checkout: ${state.selectedPromo.description}.` : '';
  log(`Promo "${code}" selected for preview.`, 'info');
  renderBreakdown();
});

/* ---- delivery ---- */

const deliveryCatalog = [new StandardDelivery(), new ExpressDelivery(), new SameDayDelivery()];

function renderDeliveryOptions() {
  if (!state.selectedDelivery) state.selectedDelivery = deliveryCatalog[0];

  const preview = buildLiveOrderPreview();

  deliveryOptions.innerHTML = deliveryCatalog.map((d) => {
    const cost = preview ? d.calculateShippingCost(preview) : 0;
    const selected = state.selectedDelivery === d;
    return `
      <div class="option-card ${selected ? 'is-selected' : ''}" data-delivery="${d.label}">
        <div>
          <div class="option-card__label">${d.label}</div>
          <div class="option-card__sub">${d.estimateDeliveryDays() === 0 ? 'Arrives today' : `${d.estimateDeliveryDays()}-day estimate`}</div>
        </div>
        <div class="option-card__price">${cost === 0 ? 'Free' : `$${cost.toFixed(2)}`}</div>
      </div>`;
  }).join('');

  $$('[data-delivery]', deliveryOptions).forEach((el) => {
    el.addEventListener('click', () => {
      state.selectedDelivery = deliveryCatalog.find((d) => d.label === el.dataset.delivery);
      renderDeliveryOptions();
      renderBreakdown();
    });
  });
}

/* ---- payment ---- */

const paymentCatalog = [
  { key: 'CreditCard', label: 'Credit Card', build: () => new CreditCard($('#ccNumber')?.value || '4242424242424242') },
  { key: 'BankTransfer', label: 'Bank Transfer', build: () => new BankTransfer($('#ibanField')?.value || 'PK00DOCKET0000000001') },
  { key: 'DigitalWallet', label: 'Digital Wallet', build: () => new DigitalWallet($('#walletId')?.value || 'wallet_demo_001') },
];

function renderPaymentOptions() {
  if (!state.selectedPayment) state.selectedPayment = paymentCatalog[0];

  paymentOptions.innerHTML = paymentCatalog.map((p) => `
    <div class="option-card ${state.selectedPayment.key === p.key ? 'is-selected' : ''}" data-payment="${p.key}">
      <div class="option-card__label">${p.label}</div>
    </div>`).join('');

  $$('[data-payment]', paymentOptions).forEach((el) => {
    el.addEventListener('click', () => {
      state.selectedPayment = paymentCatalog.find((p) => p.key === el.dataset.payment);
      renderPaymentOptions();
    });
  });

  renderPaymentFields();
}

function renderPaymentFields() {
  const key = state.selectedPayment.key;
  if (key === 'CreditCard') {
    paymentFields.innerHTML = `<label for="ccNumber">Card number</label><input id="ccNumber" type="text" value="4242 4242 4242 4242">`;
  } else if (key === 'BankTransfer') {
    paymentFields.innerHTML = `<label for="ibanField">IBAN</label><input id="ibanField" type="text" value="PK00DOCKET0000000001">`;
  } else {
    paymentFields.innerHTML = `<label for="walletId">Wallet ID</label><input id="walletId" type="text" value="wallet_demo_001">`;
  }
}

/* ---- live preview + breakdown ---- */

/** Builds a disposable, never-persisted Order purely so the UI can call the
 *  real polymorphic pricing methods (product.calculatePrice, customer.
 *  calculateDiscount, deliveryMethod.calculateShippingCost) before checkout. */
function buildLiveOrderPreview() {
  const c = cart();
  if (c.isEmpty()) return null;
  const preview = new Order(state.customer);
  for (const { product, quantity } of c.lines) {
    if (product.hasStockFor && !product.hasStockFor(quantity)) continue;
    preview.addItem(product, quantity);
  }
  if (state.selectedPromo) preview.applyDiscount(state.selectedPromo);
  return preview;
}

function renderBreakdown() {
  const c = cart();
  if (c.isEmpty()) {
    breakdownList.innerHTML = '<p class="empty-state" style="padding:10px 0">Add products to see the live total.</p>';
    $('#placeOrderBtn').disabled = true;
    return;
  }
  $('#placeOrderBtn').disabled = false;

  const preview = buildLiveOrderPreview();
  const shipping = state.selectedDelivery ? state.selectedDelivery.calculateShippingCost(preview) : 0;
  const subtotal = preview.productSubtotal();
  const tax = preview.taxAmount();
  const customerDiscount = preview.customerDiscountAmount();
  const promoDiscount = preview.promoDiscountAmount();
  const total = Math.max(0, subtotal + shipping + tax - customerDiscount - promoDiscount);

  breakdownList.innerHTML = `
    <dt>Product subtotal</dt><dd>$${subtotal.toFixed(2)}</dd>
    <dt>Shipping (${state.selectedDelivery ? state.selectedDelivery.label : '—'})</dt><dd>$${shipping.toFixed(2)}</dd>
    <dt>Tax</dt><dd>$${tax.toFixed(2)}</dd>
    <dt>Customer discount (${state.customer.membershipLevel})</dt><dd class="negative">-$${customerDiscount.toFixed(2)}</dd>
    <dt>Promo discount</dt><dd class="negative">-$${promoDiscount.toFixed(2)}</dd>
    <div class="row-total"><dt>Total due</dt><dd>$${total.toFixed(2)}</dd></div>
  `;
}

/* ============ CHECKOUT ============ */

$('#placeOrderBtn').addEventListener('click', () => {
  const c = cart();
  if (c.isEmpty()) return;

  let order;
  const ok = attempt('Order placed and paid successfully.', () => {
    order = c.checkout(); // ShoppingCart -> Order (empties the cart)
    if (state.selectedPromo) order.applyDiscount(state.selectedPromo);
    order.confirm();
    const paymentMethod = state.selectedPayment.build();
    order.pay(paymentMethod, state.selectedDelivery);
    store.recordOrder(order);
  });

  if (ok) {
    state.selectedPromo = null;
    promoSelect.value = '';
    promoHint.textContent = '';
    state.openOrderId = order.id;
    renderCart();
    renderCatalog();
    renderOrders();
    renderIdentity();
    switchTab('orders');
  } else {
    renderCart();
  }
});

/* ============ ORDERS ============ */

const RAIL_STAGES = ['CREATED', 'CONFIRMED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

function renderOrders() {
  const orders = store.listOrders();
  ordersCount.textContent = orders.length;
  ordersEmpty.classList.toggle('is-hidden', orders.length > 0);
  orderList.innerHTML = '';
  if (orders.length === 0) {
    orderList.appendChild(ordersEmpty);
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement('article');
    card.className = 'order-card' + (state.openOrderId === order.id ? ' is-open' : '');
    card.innerHTML = `
      <div class="order-card__head" data-toggle="${order.id}">
        <span class="order-card__id">${order.id}</span>
        <span class="order-card__customer">${order.customer.name}</span>
        <span class="status-pill status-${order.status}">${order.status}</span>
        <span class="order-card__total">$${order.totalAmount.toFixed(2)}</span>
        <span class="order-card__chevron">⌄</span>
      </div>
      <div class="order-card__body"></div>
    `;
    $('.order-card__body', card).innerHTML = renderOrderBody(order);
    orderList.appendChild(card);

    $('.order-card__head', card).addEventListener('click', () => {
      state.openOrderId = state.openOrderId === order.id ? null : order.id;
      renderOrders();
    });

    wireOrderActions(card, order);
  });
}

function renderOrderBody(order) {
  const isTerminalFail = order.status === 'CANCELLED' || order.status === 'REFUNDED';
  const currentIndex = RAIL_STAGES.indexOf(order.status);

  const rail = RAIL_STAGES.map((stage, i) => {
    let cls = '';
    if (isTerminalFail) {
      cls = i === 0 ? 'is-done' : '';
    } else if (i < currentIndex) cls = 'is-done';
    else if (i === currentIndex) cls = 'is-current';
    return `
      ${i > 0 ? `<div class="rail__line ${cls === 'is-done' || cls === 'is-current' ? 'is-done' : ''}"></div>` : ''}
      <div class="rail__node ${cls}">
        <div class="rail__dot"></div>
        <div class="rail__label">${stage}</div>
      </div>`;
  }).join('');

  const statusBanner = isTerminalFail
    ? `<div class="rail__node is-failed" style="display:inline-flex;margin-left:8px"><div class="rail__dot"></div><div class="rail__label">${order.status}</div></div>`
    : '';

  const b = order.breakdown();
  const itemsHtml = order.items.map((i) => `<li><span>${i.quantity} × ${i.product.name}</span><span>$${i.lineTotal().toFixed(2)}</span></li>`).join('');

  const txn = order.invoice ? `
    <div class="txn-box">
      <div><strong>${order.invoice.id}</strong> · ${order.invoice.transaction.status} · ${order.invoice.transaction.detail}</div>
      <div>Paid $${order.invoice.amountPaid.toFixed(2)} — Refunded $${order.invoice.refundedAmount.toFixed(2)}</div>
      ${order.refunds.map((r) => `<div>↩ ${r.id}: $${r.amount.toFixed(2)} — ${r.reason}</div>`).join('')}
    </div>` : '';

  return `
    <div class="rail">${rail}${statusBanner}</div>
    <div class="order-detail-grid">
      <div>
        <h4 style="margin:0 0 8px;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em">Items</h4>
        <ul class="order-items">${itemsHtml}</ul>
      </div>
      <div>
        <dl class="breakdown__list">
          <dt>Subtotal</dt><dd>$${b.subtotal.toFixed(2)}</dd>
          <dt>Shipping</dt><dd>$${b.shipping.toFixed(2)}</dd>
          <dt>Tax</dt><dd>$${b.tax.toFixed(2)}</dd>
          <dt>Customer discount</dt><dd class="negative">-$${b.customerDiscount.toFixed(2)}</dd>
          <dt>Promo discount</dt><dd class="negative">-$${b.promoDiscount.toFixed(2)}</dd>
          <div class="row-total"><dt>Total</dt><dd>$${b.total.toFixed(2)}</dd></div>
        </dl>
      </div>
    </div>
    ${txn}
    <div class="order-actions" data-actions="${order.id}"></div>
  `;
}

function wireOrderActions(card, order) {
  const actions = $(`[data-actions="${order.id}"]`, card);
  const buttons = [];

  if (order.status === 'PAID') buttons.push(['Process', 'btn--success', () => order.process()]);
  if (order.status === 'PROCESSING') buttons.push(['Ship', 'btn--success', () => order.ship()]);
  if (order.status === 'SHIPPED') buttons.push(['Mark delivered', 'btn--success', () => order.deliver()]);
  if (['CREATED', 'CONFIRMED', 'PAID', 'PROCESSING'].includes(order.status)) {
    buttons.push(['Cancel order', 'btn--danger', () => order.cancel('Cancelled from console')]);
  }
  if (['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) && order.invoice && !order.invoice.isFullyRefunded) {
    buttons.push(['Refund $10', 'btn--danger', () => order.refund(Math.min(10, order.invoice.remainingRefundable), 'Partial goodwill refund')]);
    buttons.push(['Refund in full', 'btn--danger', () => order.refund(order.invoice.remainingRefundable, 'Full refund issued')]);
  }
  // Deliberately try an obviously-illegal transition too, to showcase rule enforcement live.
  if (order.status === 'DELIVERED') {
    buttons.push(['Try cancel (blocked)', 'btn--ghost', () => order.cancel('Attempted after delivery')]);
  }

  buttons.forEach(([label, cls, fn]) => {
    const btn = document.createElement('button');
    btn.className = `btn ${cls} btn--sm`;
    btn.textContent = label;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      attempt(`${order.id}: ${label} succeeded.`, fn);
      renderOrders();
      renderCatalog();
    });
    actions.appendChild(btn);
  });
}

/* ============ CLASS MAP ============ */

const CLASS_MAP_DATA = [
  { title: 'Product', abstract: 'Abstract: id, name, description, basePrice + calculatePrice()', items: ['PhysicalProduct — stock, weight, ships', 'DigitalProduct — download link, bulk pricing', 'SubscriptionProduct — duration, auto-renew'] },
  { title: 'Customer', abstract: 'Abstract: wallet, membershipLevel + calculateDiscount()', items: ['RegularCustomer — 0% off', 'PremiumCustomer — 10% off, free shipping', 'BusinessCustomer — 15% off, threshold shipping'] },
  { title: 'PaymentMethod', abstract: 'Abstract: pay(amount), refund(amount)', items: ['CreditCard', 'BankTransfer', 'DigitalWallet'] },
  { title: 'DeliveryMethod', abstract: 'Abstract: calculateShippingCost(order), estimateDeliveryDays()', items: ['StandardDelivery — $5 / 5 days', 'ExpressDelivery — $15 / 2 days', 'SameDayDelivery — $30 / same day'] },
  { title: 'Discount', abstract: 'Abstract: applyDiscount(order)', items: ['PercentageDiscount', 'FixedAmountDiscount', 'BuyOneGetOneDiscount', 'SeasonalDiscount'] },
  { title: 'Order', abstract: 'Owns OrderItems (composition). Guards status via a transition table.', items: ['addItem() / removeItem()', 'confirm() / pay() / process()', 'ship() / deliver() / cancel() / refund()'] },
  { title: 'Relationships', abstract: 'Object relationships used across the model.', items: ['Composition — Order → OrderItem', 'Association — Customer → Order', 'Aggregation — Store → Product'] },
];

function renderClassMap() {
  classMap.innerHTML = CLASS_MAP_DATA.map((c) => `
    <div class="classmap-card">
      <h4>${c.title}</h4>
      <p class="abstract">${c.abstract}</p>
      <ul>${c.items.map((i) => `<li>${i}</li>`).join('')}</ul>
    </div>`).join('');
}

/* ============ INIT ============ */

function init() {
  renderCustomerSelect();
  renderIdentity();
  renderPromoOptions();
  renderCatalog();
  renderCart();
  renderOrders();
  renderClassMap();
  log('Docket console booted. All state lives in memory for this session.', 'info');
  log(`Loaded ${store.listProducts().length} products across 3 product classes.`, 'info');
}

init();