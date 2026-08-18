/**
 * Store.js
 * --------
 * AGGREGATION: the Store manages Products, but a Product is a meaningful,
 * independently-referenced object in its own right (an OrderItem or a
 * ShoppingCart line can hold onto a Product after the Store "removes" it).
 * That's the distinction from Order -> OrderItem, which is COMPOSITION.
 */

export class Store {
  #name;
  #products;
  #customers;
  #orders;

  constructor(name) {
    this.#name = name;
    this.#products = new Map();
    this.#customers = new Map();
    this.#orders = new Map();
  }

  get name() { return this.#name; }

  addProduct(product) {
    this.#products.set(product.id, product);
    return product;
  }

  removeProduct(productId) {
    this.#products.delete(productId);
  }

  listProducts() {
    return [...this.#products.values()];
  }

  findProduct(productId) {
    return this.#products.get(productId) || null;
  }

  registerCustomer(customer) {
    this.#customers.set(customer.id, customer);
    return customer;
  }

  listCustomers() {
    return [...this.#customers.values()];
  }

  findCustomer(customerId) {
    return this.#customers.get(customerId) || null;
  }

  recordOrder(order) {
    this.#orders.set(order.id, order);
    return order;
  }

  listOrders() {
    return [...this.#orders.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  findOrder(orderId) {
    return this.#orders.get(orderId) || null;
  }
}