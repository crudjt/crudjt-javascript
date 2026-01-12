class InvalidState extends Error {
  constructor(message = 'Invalid State') {
    super(message);
    this.name = 'InvalidState';
  }
}

module.exports = InvalidState;
