const DonateException = require('./errors/donate_exception');
const InternalError = require('./errors/internal_error');

const ERRORS = {
  'DE000': DonateException,
  'XX000': InternalError
};

module.exports = ERRORS;
