/**
 * DeliveryMethod.js
 * -----------------
 * DeliveryMethod (abstract) -> StandardDelivery | ExpressDelivery | SameDayDelivery
 *
 * Demonstrates: ABSTRACTION + POLYMORPHISM
 * Order calls calculateShippingCost(order) / estimateDeliveryDays() without
 * knowing which concrete strategy it is talking to.
 */

export class DeliveryMethod {
  #label;

  constructor(label) {
    if (new.target === DeliveryMethod) {
      throw new Error('DeliveryMethod is abstract and cannot be instantiated directly.');
    }
    this.#label = label;
  }

  get label() { return this.#label; }

  /** Abstract contract. `order` is passed so cost can depend on its contents. */
  calculateShippingCost(order) {
    throw new Error(`${this.constructor.name} must implement calculateShippingCost().`);
  }

  /** Abstract contract. */
  estimateDeliveryDays() {
    throw new Error(`${this.constructor.name} must implement estimateDeliveryDays().`);
  }

  /** Shared helper: digital-only orders never pay a courier, on any method. */
  _baseCostOrZero(order, flatCost) {
    if (!order.hasPhysicalItems()) return 0;
    if (order.customer.offersFreeShipping(order.productSubtotal())) return 0;
    return flatCost;
  }
}

export class StandardDelivery extends DeliveryMethod {
  constructor() { super('Standard Delivery'); }
  calculateShippingCost(order) { return this._baseCostOrZero(order, 5); }
  estimateDeliveryDays() { return 5; }
}

export class ExpressDelivery extends DeliveryMethod {
  constructor() { super('Express Delivery'); }
  calculateShippingCost(order) { return this._baseCostOrZero(order, 15); }
  estimateDeliveryDays() { return 2; }
}

export class SameDayDelivery extends DeliveryMethod {
  constructor() { super('Same-Day Delivery'); }
  calculateShippingCost(order) { return this._baseCostOrZero(order, 30); }
  estimateDeliveryDays() { return 0; }
}