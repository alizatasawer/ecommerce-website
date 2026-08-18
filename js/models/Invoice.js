/**
 * Invoice.js
 * ----------
 * Generated the moment an Order is paid. Tracks how much of the payment
 * has been refunded so a payment can never be refunded twice.
 */

let idCounter = 1;

export class Invoice {
  #id;
  #orderId;
  #amountPaid;
  #refundedAmount;
  #issuedAt;
  #transaction;

  constructor(orderId, amountPaid, transaction) {
    this.#id = `INV-${String(idCounter++).padStart(4, '0')}`;
    this.#orderId = orderId;
    this.#amountPaid = amountPaid;
    this.#refundedAmount = 0;
    this.#issuedAt = new Date();
    this.#transaction = transaction;
  }

  get id() { return this.#id; }
  get orderId() { return this.#orderId; }
  get amountPaid() { return this.#amountPaid; }
  get refundedAmount() { return this.#refundedAmount; }
  get remainingRefundable() { return this.#amountPaid - this.#refundedAmount; }
  get issuedAt() { return this.#issuedAt; }
  get transaction() { return { ...this.#transaction }; }
  get isFullyRefunded() { return this.#refundedAmount >= this.#amountPaid; }

  /** Enforced here: a payment can never be refunded twice / over-refunded. */
  registerRefund(amount) {
    if (this.isFullyRefunded) {
      throw new Error(`Invoice ${this.#id} has already been fully refunded.`);
    }
    if (amount > this.remainingRefundable + 1e-9) {
      throw new Error(
        `Cannot refund ${amount.toFixed(2)}; only ${this.remainingRefundable.toFixed(2)} remains refundable on ${this.#id}.`
      );
    }
    this.#refundedAmount += amount;
  }
}