class DonateException extends Error {
  constructor(message = 'Donate Exception') {
    super(message);
    this.name = 'DonateException';
  }
}

module.exports = DonateException;
