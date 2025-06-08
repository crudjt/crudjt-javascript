const U64_MAX = BigInt(2) ** BigInt(64) - BigInt(1);

class Validation {
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
}

module.exports = Validation;
