/**
 * Refund.js
 * ---------
 * A Refund is the audit trail of money returned to a customer. It delegates
 * the actual money movement back to the polymorphic PaymentMethod.refund(),
 * and delegates the "no double refund" rule to the Invoice.
 */

let idCounter = 1;

export class Refund {
  #id;
  #invoiceId;
  #amount;
  #reason;
  #processedAt;
  #transaction;

  constructor(invoiceId, amount, reason, transaction) {
    this.#id = `RFD-${String(idCounter++).padStart(4, '0')}`;
    this.#invoiceId = invoiceId;
    this.#amount = amount;
    this.#reason = reason;
    this.#processedAt = new Date();
    this.#transaction = transaction;
  }

  get id() { return this.#id; }
  get invoiceId() { return this.#invoiceId; }
  get amount() { return this.#amount; }
  get reason() { return this.#reason; }
  get processedAt() { return this.#processedAt; }
  get transaction() { return { ...this.#transaction }; }

  /**
   * Factory that performs a refund end-to-end:
   * 1. Ask the Invoice if this amount is even refundable (no double refunds).
   * 2. Ask the PaymentMethod to move the money back (polymorphic).
   * 3. Record the Refund.
   */
  static process(invoice, paymentMethod, amount, reason = 'Customer requested') {
    invoice.registerRefund(amount); // throws if already refunded / over-refund
    const transaction = paymentMethod.refund(amount);
    return new Refund(invoice.id, amount, reason, transaction);
  }
}