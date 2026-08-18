/**
 * Order.js
 * --------
 * The heart of the system. Owns OrderItems (COMPOSITION), references a
 * Customer (ASSOCIATION), and orchestrates polymorphic collaborators
 * (Product, PaymentMethod, DeliveryMethod, Discount) without ever
 * branching on their concrete type.
 *
 * Demonstrates: ENCAPSULATION — status/items/totalAmount are only ever
 * read through getters and only ever changed through named operations
 * that enforce the assignment's business rules.
 */

import { OrderItem } from './OrderItem.js';
import { Invoice } from './Invoice.js';
import { Refund } from './Refund.js';

let idCounter = 1;

const TAX_RATE = 0.105; // 10.5% — matches the worked example in the brief

/** Directed graph of legal status transitions. */
const TRANSITIONS = {
  CREATED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export class Order {
  #id;
  #customer;
  #items;
  #status;
  #discounts;
  #deliveryMethod;
  #paymentMethod;
  #invoice;
  #refunds;
  #createdAt;
  #log;

  constructor(customer) {
    this.#id = `ORD-${String(idCounter++).padStart(5, '0')}`;
    this.#customer = customer;
    this.#items = [];
    this.#status = 'CREATED';
    this.#discounts = [];
    this.#deliveryMethod = null;
    this.#paymentMethod = null;
    this.#invoice = null;
    this.#refunds = [];
    this.#createdAt = new Date();
    this.#log = [];
    this.#note(`Order ${this.#id} created for ${customer.name}.`);
  }

  // ---- read-only views (encapsulation: no external code can assign these) ----
  get id() { return this.#id; }
  get customer() { return this.#customer; }
  get status() { return this.#status; }
  get items() { return [...this.#items]; }
  get discounts() { return [...this.#discounts]; }
  get deliveryMethod() { return this.#deliveryMethod; }
  get invoice() { return this.#invoice; }
  get refunds() { return [...this.#refunds]; }
  get createdAt() { return this.#createdAt; }
  get history() { return [...this.#log]; }

  #note(message) {
    this.#log.push({ at: new Date(), message });
  }

  #assertStatus(...allowed) {
    if (!allowed.includes(this.#status)) {
      throw new Error(`Operation not allowed while order is ${this.#status}.`);
    }
  }

  #assertTransition(next) {
    const allowed = TRANSITIONS[this.#status] || [];
    if (!allowed.includes(next)) {
      throw new Error(`Cannot move order from ${this.#status} to ${next}.`);
    }
  }

  // ---- item management ----
  addItem(product, quantity = 1) {
    this.#assertStatus('CREATED');
    if (product.hasStockFor && !product.hasStockFor(quantity)) {
      throw new Error(`"${product.name}" does not have enough stock.`);
    }
    const existing = this.#items.find((i) => i.product.id === product.id);
    if (existing) {
      existing.increaseQuantity(quantity);
    } else {
      this.#items.push(new OrderItem(product, quantity));
    }
    this.#note(`Added ${quantity} x "${product.name}".`);
  }

  removeItem(productId) {
    this.#assertStatus('CREATED');
    const before = this.#items.length;
    this.#items = this.#items.filter((i) => i.product.id !== productId);
    if (this.#items.length === before) {
      throw new Error('That item is not in this order.');
    }
    this.#note(`Removed item ${productId}.`);
  }

  applyDiscount(discount) {
    this.#assertStatus('CREATED', 'CONFIRMED');
    this.#discounts.push(discount);
    this.#note(`Promo code "${discount.code}" applied.`);
  }

  // ---- polymorphic totals: none of this branches on concrete type ----
  hasPhysicalItems() {
    return this.#items.some((i) => i.product.requiresShipping());
  }

  productSubtotal() {
    return this.#items.reduce((sum, item) => sum + item.lineTotal(), 0);
  }

  shippingCost() {
    if (!this.#deliveryMethod) return 0;
    return this.#deliveryMethod.calculateShippingCost(this);
  }

  taxAmount() {
    return this.productSubtotal() * TAX_RATE;
  }

  customerDiscountAmount() {
    return this.#customer.calculateDiscount(this.productSubtotal());
  }

  promoDiscountAmount() {
    return this.#discounts.reduce((sum, d) => sum + d.applyDiscount(this), 0);
  }

  /**
   * Product Subtotal + Shipping + Tax - Customer Discount - Promo Discount
   * Clamped so a stack of discounts can never push the order negative.
   */
  calculateTotal() {
    const subtotal = this.productSubtotal();
    const shipping = this.shippingCost();
    const tax = this.taxAmount();
    const customerDiscount = this.customerDiscountAmount();
    const promoDiscount = this.promoDiscountAmount();

    const raw = subtotal + shipping + tax - customerDiscount - promoDiscount;
    return Math.max(0, raw);
  }

  get totalAmount() { return this.calculateTotal(); }

  breakdown() {
    return {
      subtotal: this.productSubtotal(),
      shipping: this.shippingCost(),
      tax: this.taxAmount(),
      customerDiscount: this.customerDiscountAmount(),
      promoDiscount: this.promoDiscountAmount(),
      total: this.calculateTotal(),
    };
  }

  // ---- lifecycle operations (the only way #status may ever change) ----
  confirm() {
    this.#assertTransition('CONFIRMED');
    if (this.#items.length === 0) {
      throw new Error('An order with no items cannot be confirmed.');
    }
    this.#status = 'CONFIRMED';
    this.#note('Order confirmed.');
  }

  pay(paymentMethod, deliveryMethod) {
    this.#assertTransition('PAID');
    if (deliveryMethod) this.#deliveryMethod = deliveryMethod;
    if (!this.#deliveryMethod) {
      throw new Error('A delivery method must be selected before payment.');
    }
    // Physical stock is only committed at the moment of payment.
    for (const item of this.#items) {
      if (item.product.reduceStock) {
        item.product.reduceStock(item.quantity);
      }
    }
    const total = this.calculateTotal();
    const transaction = paymentMethod.pay(total); // polymorphic — Order never asks "what kind of payment is this?"
    this.#paymentMethod = paymentMethod;
    this.#invoice = new Invoice(this.#id, total, transaction);
    this.#status = 'PAID';
    this.#note(`Paid ${total.toFixed(2)} via ${paymentMethod.label}. Invoice ${this.#invoice.id} issued.`);
  }

  process() {
    this.#assertTransition('PROCESSING');
    this.#status = 'PROCESSING';
    this.#note('Order is being prepared for shipment.');
  }

  ship() {
    this.#assertTransition('SHIPPED');
    if (!this.#deliveryMethod) {
      throw new Error('Cannot ship an order without a delivery method.');
    }
    this.#status = 'SHIPPED';
    this.#note(`Shipped via ${this.#deliveryMethod.label}.`);
  }

  deliver() {
    this.#assertTransition('DELIVERED');
    this.#status = 'DELIVERED';
    this.#note('Order delivered.');
  }

  cancel(reason = 'Customer requested') {
    this.#assertTransition('CANCELLED');
    // Paid orders get an automatic refund on cancellation.
    if (this.#invoice && !this.#invoice.isFullyRefunded) {
      const refund = Refund.process(this.#invoice, this.#paymentMethod, this.#invoice.remainingRefundable, reason);
      this.#refunds.push(refund);
      this.#note(`Refund ${refund.id} issued for ${refund.amount.toFixed(2)}.`);
    }
    // Release any committed stock.
    for (const item of this.#items) {
      if (item.product.restock) item.product.restock(item.quantity);
    }
    this.#status = 'CANCELLED';
    this.#note(`Order cancelled: ${reason}.`);
  }

  /** Manual, partial or full refund on an already-paid order. */
  refund(amount, reason = 'Refund requested') {
    this.#assertStatus('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED');
    if (!this.#invoice) throw new Error('This order has no invoice to refund against.');
    const refund = Refund.process(this.#invoice, this.#paymentMethod, amount, reason);
    this.#refunds.push(refund);
    this.#note(`Refund ${refund.id} issued for ${refund.amount.toFixed(2)}: ${reason}.`);
    if (this.#invoice.isFullyRefunded) {
      this.#status = 'REFUNDED';
      this.#note('Order fully refunded.');
    }
    return refund;
  }
}