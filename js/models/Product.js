/**
 * Product.js
 * ----------
 * Product (abstract) -> PhysicalProduct | DigitalProduct | SubscriptionProduct
 *
 * Demonstrates: ABSTRACTION  (calculatePrice/requiresShipping are contracts)
 *               INHERITANCE  (shared id/name/description/basePrice)
 *               POLYMORPHISM (each subtype prices & ships itself differently)
 */

let idCounter = 1;

export class Product {
  #id;
  #name;
  #description;
  #basePrice;
  #category;

  constructor(name, description, basePrice, category = 'General') {
    if (new.target === Product) {
      throw new Error('Product is abstract and cannot be instantiated directly.');
    }
    if (basePrice < 0) {
      throw new Error('basePrice cannot be negative.');
    }
    this.#id = `PRD-${String(idCounter++).padStart(4, '0')}`;
    this.#name = name;
    this.#description = description;
    this.#basePrice = basePrice;
    this.#category = category;
  }

  get id() { return this.#id; }
  get name() { return this.#name; }
  get description() { return this.#description; }
  get basePrice() { return this.#basePrice; }
  get category() { return this.#category; }

  /** Abstract contract - every product type must know how to price itself. */
  calculatePrice(quantity = 1) {
    throw new Error(`${this.constructor.name} must implement calculatePrice().`);
  }

  /** Abstract contract - does this product need a courier at all? */
  requiresShipping() {
    throw new Error(`${this.constructor.name} must implement requiresShipping().`);
  }

  /** Abstract contract - short label shown as a UI badge. */
  get typeLabel() {
    throw new Error(`${this.constructor.name} must implement typeLabel.`);
  }
}

export class PhysicalProduct extends Product {
  #stock;
  #weightKg;

  constructor(name, description, basePrice, stock, weightKg, category) {
    super(name, description, basePrice, category);
    if (stock < 0) throw new Error('Stock cannot be negative.');
    this.#stock = stock;
    this.#weightKg = weightKg;
  }

  get stock() { return this.#stock; }
  get weightKg() { return this.#weightKg; }
  get typeLabel() { return 'Physical'; }

  requiresShipping() { return true; }

  calculatePrice(quantity = 1) {
    return this.basePrice * quantity;
  }

  hasStockFor(quantity) {
    return this.#stock >= quantity;
  }

  /** Stock can never become negative — enforced here, not by the caller. */
  reduceStock(quantity) {
    if (quantity <= 0) throw new Error('Quantity to reduce must be positive.');
    if (this.#stock - quantity < 0) {
      throw new Error(`Not enough stock for "${this.name}" (have ${this.#stock}, need ${quantity}).`);
    }
    this.#stock -= quantity;
  }

  restock(quantity) {
    if (quantity <= 0) throw new Error('Restock quantity must be positive.');
    this.#stock += quantity;
  }
}

export class DigitalProduct extends Product {
  #downloadLink;
  #fileSizeMb;

  constructor(name, description, basePrice, downloadLink, fileSizeMb, category) {
    super(name, description, basePrice, category);
    this.#downloadLink = downloadLink;
    this.#fileSizeMb = fileSizeMb;
  }

  get downloadLink() { return this.#downloadLink; }
  get fileSizeMb() { return this.#fileSizeMb; }
  get typeLabel() { return 'Digital'; }

  requiresShipping() { return false; }

  calculatePrice(quantity = 1) {
    // Digital licenses are cheaper past the first copy (bulk-license logic).
    if (quantity <= 1) return this.basePrice;
    return this.basePrice + (quantity - 1) * this.basePrice * 0.85;
  }

  grantAccess() {
    return `Access granted: ${this.#downloadLink}`;
  }
}

export class SubscriptionProduct extends Product {
  #durationMonths;
  #autoRenew;

  constructor(name, description, basePrice, durationMonths, autoRenew = false, category) {
    super(name, description, basePrice, category);
    this.#durationMonths = durationMonths;
    this.#autoRenew = autoRenew;
  }

  get durationMonths() { return this.#durationMonths; }
  get autoRenew() { return this.#autoRenew; }
  get typeLabel() { return 'Subscription'; }

  requiresShipping() { return false; }

  calculatePrice(quantity = 1) {
    // basePrice is a monthly rate; the plan bills for its full duration.
    return this.basePrice * this.#durationMonths * quantity;
  }

  monthlyBilling() {
    return this.basePrice;
  }

  toggleAutoRenew(value) {
    this.#autoRenew = Boolean(value);
  }
}