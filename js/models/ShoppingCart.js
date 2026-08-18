/**
 * ShoppingCart.js
 * ---------------
 * A pre-order staging area. ASSOCIATION with Customer, COMPOSITION of its
 * own line entries. Converts itself into a real Order at checkout time.
 */

import { Order } from './Order.js';

export class ShoppingCart {
  #customer;
  #lines; // Map<productId, { product, quantity }>

  constructor(customer) {
    this.#customer = customer;
    this.#lines = new Map();
  }

  get customer() { return this.#customer; }

  get lines() {
    return [...this.#lines.values()];
  }

  addProduct(product, quantity = 1) {
    if (quantity <= 0) throw new Error('Quantity must be positive.');
    if (product.hasStockFor && !product.hasStockFor(quantity)) {
      throw new Error(`"${product.name}" does not have enough stock.`);
    }
    const existing = this.#lines.get(product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.#lines.set(product.id, { product, quantity });
    }
  }

  updateQuantity(productId, quantity) {
    if (!this.#lines.has(productId)) throw new Error('Product is not in the cart.');
    if (quantity <= 0) {
      this.#lines.delete(productId);
      return;
    }
    this.#lines.get(productId).quantity = quantity;
  }

  removeProduct(productId) {
    this.#lines.delete(productId);
  }

  clear() {
    this.#lines.clear();
  }

  subtotal() {
    let sum = 0;
    for (const { product, quantity } of this.#lines.values()) {
      sum += product.calculatePrice(quantity);
    }
    return sum;
  }

  isEmpty() {
    return this.#lines.size === 0;
  }

  /** Turns the cart contents into a brand-new CREATED Order and empties the cart. */
  checkout() {
    if (this.isEmpty()) throw new Error('Cannot checkout an empty cart.');
    const order = new Order(this.#customer);
    for (const { product, quantity } of this.#lines.values()) {
      order.addItem(product, quantity);
    }
    this.clear();
    return order;
  }
}