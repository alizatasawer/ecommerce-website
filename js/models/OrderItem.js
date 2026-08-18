/**
 * OrderItem.js
 * ------------
 * A line item inside an Order. Pure COMPOSITION target — an OrderItem has
 * no meaning or lifecycle outside the Order that owns it.
 */

export class OrderItem {
  #product;
  #quantity;

  constructor(product, quantity) {
    if (quantity <= 0) throw new Error('Quantity must be positive.');
    this.#product = product;
    this.#quantity = quantity;
  }

  get product() { return this.#product; }
  get quantity() { return this.#quantity; }

  increaseQuantity(by) {
    this.#quantity += by;
  }

  /** Polymorphic call — this line item doesn't know or care what kind of Product it holds. */
  lineTotal() {
    return this.#product.calculatePrice(this.#quantity);
  }
}