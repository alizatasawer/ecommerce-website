/**
 * Discount.js
 * -----------
 * Discount (abstract) -> PercentageDiscount | FixedAmountDiscount
 *                       | BuyOneGetOneDiscount | SeasonalDiscount
 *
 * Demonstrates: POLYMORPHISM — Order calls discount.applyDiscount(order)
 * without caring which promotional strategy is plugged in.
 */

export class Discount {
  #code;

  constructor(code) {
    if (new.target === Discount) {
      throw new Error('Discount is abstract and cannot be instantiated directly.');
    }
    this.#code = code;
  }

  get code() { return this.#code; }

  /** Abstract contract — returns the amount (never negative) to subtract. */
  applyDiscount(order) {
    throw new Error(`${this.constructor.name} must implement applyDiscount().`);
  }
}

export class PercentageDiscount extends Discount {
  #percent;
  constructor(code, percent) {
    super(code);
    this.#percent = percent;
  }
  applyDiscount(order) {
    return order.productSubtotal() * (this.#percent / 100);
  }
  get description() { return `${this.#percent}% off products`; }
}

export class FixedAmountDiscount extends Discount {
  #amount;
  constructor(code, amount) {
    super(code);
    this.#amount = amount;
  }
  applyDiscount(order) {
    return Math.min(this.#amount, order.productSubtotal());
  }
  get description() { return `$${this.#amount.toFixed(2)} off`; }
}

/** "Buy one, get one free" on a specific product in the order. */
export class BuyOneGetOneDiscount extends Discount {
  #productId;
  constructor(code, productId) {
    super(code);
    this.#productId = productId;
  }
  applyDiscount(order) {
    const item = order.items.find((i) => i.product.id === this.#productId);
    if (!item || item.quantity < 2) return 0;
    const freeUnits = Math.floor(item.quantity / 2);
    const unitPrice = item.product.calculatePrice(1);
    return freeUnits * unitPrice;
  }
  get description() { return 'Buy one, get one free'; }
}

export class SeasonalDiscount extends Discount {
  #percent;
  #activeFrom;
  #activeTo;
  constructor(code, percent, activeFrom, activeTo) {
    super(code);
    this.#percent = percent;
    this.#activeFrom = activeFrom;
    this.#activeTo = activeTo;
  }
  isActive(date = new Date()) {
    return date >= this.#activeFrom && date <= this.#activeTo;
  }
  applyDiscount(order) {
    if (!this.isActive()) return 0;
    return order.productSubtotal() * (this.#percent / 100);
  }
  get description() { return `${this.#percent}% seasonal offer`; }
}