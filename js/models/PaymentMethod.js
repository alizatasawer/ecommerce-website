/**
 * PaymentMethod.js
 * ----------------
 * PaymentMethod (abstract) -> CreditCard | BankTransfer | DigitalWallet
 *
 * Demonstrates: ABSTRACTION  (Order only ever calls pay()/refund())
 *               POLYMORPHISM (each method authorizes money differently)
 */

let txnCounter = 1;

export class PaymentMethod {
  #label;

  constructor(label) {
    if (new.target === PaymentMethod) {
      throw new Error('PaymentMethod is abstract and cannot be instantiated directly.');
    }
    this.#label = label;
  }

  get label() { return this.#label; }

  /** Abstract contract. Must return a transaction record: { id, amount, status } */
  pay(amount) {
    throw new Error(`${this.constructor.name} must implement pay().`);
  }

  /** Abstract contract. Must return a refund record: { id, amount, status } */
  refund(amount) {
    throw new Error(`${this.constructor.name} must implement refund().`);
  }

  static nextTxnId(prefix) {
    return `${prefix}-${String(txnCounter++).padStart(5, '0')}`;
  }
}

export class CreditCard extends PaymentMethod {
  #cardNumberMasked;

  constructor(cardNumber) {
    super('Credit Card');
    this.#cardNumberMasked = `**** **** **** ${String(cardNumber).slice(-4)}`;
  }

  get cardNumberMasked() { return this.#cardNumberMasked; }

  pay(amount) {
    // Simulated card-network authorization.
    return {
      id: PaymentMethod.nextTxnId('CC'),
      amount,
      method: this.label,
      status: 'AUTHORIZED',
      detail: `Charged ${this.#cardNumberMasked}`,
    };
  }

  refund(amount) {
    return {
      id: PaymentMethod.nextTxnId('CC-RF'),
      amount,
      method: this.label,
      status: 'REFUNDED',
      detail: `Reversed charge on ${this.#cardNumberMasked}`,
    };
  }
}

export class BankTransfer extends PaymentMethod {
  #iban;

  constructor(iban) {
    super('Bank Transfer');
    this.#iban = iban;
  }

  pay(amount) {
    return {
      id: PaymentMethod.nextTxnId('BT'),
      amount,
      method: this.label,
      status: 'PENDING_CLEARANCE',
      detail: `Transfer initiated from IBAN ending ${this.#iban.slice(-4)}`,
    };
  }

  refund(amount) {
    return {
      id: PaymentMethod.nextTxnId('BT-RF'),
      amount,
      method: this.label,
      status: 'REFUNDED',
      detail: `Funds returned to IBAN ending ${this.#iban.slice(-4)}`,
    };
  }
}

export class DigitalWallet extends PaymentMethod {
  #walletId;

  constructor(walletId) {
    super('Digital Wallet');
    this.#walletId = walletId;
  }

  pay(amount) {
    return {
      id: PaymentMethod.nextTxnId('DW'),
      amount,
      method: this.label,
      status: 'AUTHORIZED',
      detail: `Debited wallet ${this.#walletId}`,
    };
  }

  refund(amount) {
    return {
      id: PaymentMethod.nextTxnId('DW-RF'),
      amount,
      method: this.label,
      status: 'REFUNDED',
      detail: `Credited wallet ${this.#walletId}`,
    };
  }
}