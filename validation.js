const U64_MAX = BigInt(2) ** BigInt(64) - BigInt(1);

const MAX_HASH_SIZE = 256;

const ERROR_ALREADY_STARTED = 0;
const ERROR_NOT_STARTED = 1;
const ERROR_ENCRYPTED_KEY_NOT_SET = 2;

const ERROR_MESSAGES = {
  [ERROR_ALREADY_STARTED]: 'CRUD_JT already started',
  [ERROR_NOT_STARTED]: 'CRUD_JT has not started',
  [ERROR_ENCRYPTED_KEY_NOT_SET]: 'Encrypted key is blank'
};


class Validation {
  static errorMessage(code) {
    return Validation.ERROR_MESSAGES[code] || `Unknown error (${code})`;
  }

  static validateInsertion(hash, ttl, silence_read) {
    if (typeof hash !== 'object' || hash === null || Array.isArray(hash)) {
      throw new Error("Must be a Hash (Object)");
    }
    if (ttl != -1 && !(BigInt(ttl) > 0 && BigInt(ttl) <= U64_MAX)) {
      throw new Error("ttl should be greater than 0 and less than 2^64");
    }
    if (silence_read !== -1 && !(BigInt(silence_read) > 0 && BigInt(silence_read) <= U64_MAX)) {
      throw new Error("silence_read should be greater than 0 and less than 2^64");
    }
  }

  static validateToken(token) {
    if (typeof token !== 'string') {
      throw new Error("token must be a String");
    }
    if (token.length < 1) {
      throw new Error("token can't be blank");
    }
  }

  static validateHashBytesize(hashBytesize) {
    if (hashBytesize > Validation.MAX_HASH_SIZE) {
      throw new Error(`Hash can not be bigger than ${Validation.MAX_HASH_SIZE} bytesize`);
    }
  }

  static validateEncryptedKey(key) {
    let decoded;
    try {
      decoded = Buffer.from(key, 'base64');
      // Перевірка, чи справді рядок був валідним Base64
      if (Buffer.from(decoded.toString('base64'), 'base64').length !== decoded.length) {
        throw new Error();
      }
    } catch {
      throw new TypeError(`'encrypted_key' must be a valid Base64 string`);
    }

    if (![32, 48, 64].includes(decoded.length)) {
      throw new TypeError(`'encrypted_key' must be exactly 32, 48, or 64 bytes. Got ${decoded.length} bytes`);
    }

    return true;
  }
}

module.exports = Validation;
