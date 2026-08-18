/**
 * Customer.js
 * -----------
 * User -> Customer -> RegularCustomer | PremiumCustomer | BusinessCustomer
 *
 * Demonstrates: ENCAPSULATION (wallet balance is private, only mutated via methods)
 *               POLYMORPHISM  (calculateDiscount / offersFreeShipping differ per type)
 */

import { User } from './User.js';

export class Customer extends User {
  #wallet;
  #membershipLevel;

  constructor(name, email, membershipLevel, openingBalance = 0) {
    super(name, email);
    if (new.target === Customer) {
      throw new Error('Customer is abstract and cannot be instantiated directly.');
    }
    this.#membershipLevel = membershipLevel;
    this.#wallet = openingBalance;
  }

  get role() { return 'Customer'; }
  get membershipLevel() { return this.#membershipLevel; }
  get walletBalance() { return this.#wallet; }

  topUpWallet(amount) {
    if (amount <= 0) throw new Error('Top-up amount must be positive.');
    this.#wallet += amount;
    return this.#wallet;
  }

  /** Wallet can never go negative — enforced here, never by the caller. */
  debitWallet(amount) {
    if (amount <= 0) throw new Error('Debit amount must be positive.');
    if (amount > this.#wallet) {
      throw new Error(`Insufficient wallet balance (have ${this.#wallet.toFixed(2)}, need ${amount.toFixed(2)}).`);
    }
    this.#wallet -= amount;
  }

  creditWallet(amount) {
    if (amount <= 0) throw new Error('Credit amount must be positive.');
    this.#wallet += amount;
  }

  /** Abstract contract — percentage off the product subtotal, 0..1 */
  discountRate() {
    throw new Error(`${this.constructor.name} must implement discountRate().`);
  }

  calculateDiscount(subtotal) {
    return subtotal * this.discountRate();
  }

  /** Abstract contract — does this customer ship for free on this order? */
  offersFreeShipping(orderSubtotal) {
    throw new Error(`${this.constructor.name} must implement offersFreeShipping().`);
  }
}

export class RegularCustomer extends Customer {
  constructor(name, email, openingBalance) {
    super(name, email, 'Regular', openingBalance);
  }
  discountRate() { return 0; }
  offersFreeShipping() { return false; }
}

export class PremiumCustomer extends Customer {
  constructor(name, email, openingBalance) {
    super(name, email, 'Premium', openingBalance);
  }
  discountRate() { return 0.10; }
  offersFreeShipping() { return true; }
}

export class BusinessCustomer extends Customer {
  static FREE_SHIPPING_THRESHOLD = 5000;

  constructor(name, email, openingBalance) {
    super(name, email, 'Business', openingBalance);
  }
  discountRate() { return 0.15; }
  offersFreeShipping(orderSubtotal = 0) {
    return orderSubtotal >= BusinessCustomer.FREE_SHIPPING_THRESHOLD;
  }
}