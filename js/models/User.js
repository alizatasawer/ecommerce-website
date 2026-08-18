/**
 * User.js
 * -------
 * Base class for anyone who can log into the platform.
 * Demonstrates: ENCAPSULATION (private fields, no direct mutation)
 *               INHERITANCE  (Admin extends User)
 */

let idCounter = 1000;

export class User {
  #id;
  #name;
  #email;
  #createdAt;

  constructor(name, email) {
    if (new.target === User) {
      throw new Error('User is abstract and cannot be instantiated directly.');
    }
    if (!name || !email) {
      throw new Error('A user requires a name and an email.');
    }
    this.#id = `USR-${idCounter++}`;
    this.#name = name;
    this.#email = email;
    this.#createdAt = new Date();
  }

  get id() { return this.#id; }
  get name() { return this.#name; }
  get email() { return this.#email; }
  get createdAt() { return this.#createdAt; }

  /** Every role has a label; subclasses override this. */
  get role() {
    return 'User';
  }
}

export class Admin extends User {
  #permissions;

  constructor(name, email, permissions = ['MANAGE_PRODUCTS', 'MANAGE_ORDERS']) {
    super(name, email);
    this.#permissions = [...permissions];
  }

  get role() { return 'Admin'; }
  get permissions() { return [...this.#permissions]; }

  can(permission) {
    return this.#permissions.includes(permission);
  }
}