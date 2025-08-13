class InternalError extends Error {
  constructor(message = 'Internal Error') {
    super(message);
    this.name = 'InternalError';
  }
}

module.exports = InternalError;
