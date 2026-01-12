const InvalidState = require('./errors/invalid_state');
const InternalError = require('./errors/internal_error');

const ERRORS = {
  '55JT01': InvalidState,
  'XX000': InternalError
};

module.exports = ERRORS;
