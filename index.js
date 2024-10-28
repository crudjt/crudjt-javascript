const native = require('.'); // Require the compiled native module
const msgpack = require('msgpack-lite');
const { Buffer } = require('buffer');
const LRUCache = require('./Cache');
const Validation = require('./Validation');

const lruLRUCache = new LRUCache((value) => native.read(value));

function create(hash, ttl = -1, silence_read = -1) {
    Validation.validateInsertion(hash, ttl, silence_read);

    // Serialize hash into the format Msgpack
    const packedData = msgpack.encode(hash);

    // Call native function create, passing it a pointer and the size of the data
    let token = native.create(packedData, packedData.length, ttl, silence_read);
    lruLRUCache.insert(token, hash, ttl, silence_read);

    return token;
}

function read(token) {
  Validation.validateToken(token);

  let output = lruLRUCache.get(token);
  if (output) {
    return output
  }

  let result_str = native.read(token);
  if (result_str === "") {
    return null;
  }

  let result = JSON.parse(result_str);
  lruLRUCache.forceInsert(token, result);

  return result;
}

function update(token, hash, ttl = -1, silence_read = -1) {
  Validation.validateToken(token);
  Validation.validateInsertion(hash, ttl, silence_read);

  // Serialize hash into the format Msgpack
  const packedData = msgpack.encode(hash);

  // Call native function update, passing it a pointer and the size of the data
  let result = native.update(token, packedData, packedData.length, ttl, silence_read);
  if (result) {
    lruLRUCache.insert(token, hash, ttl, silence_read)
  }

  return result;
}

function __delete(token) {
  Validation.validateToken(token);

  lruLRUCache.delete(token);

  return native.delete(token);
}

const CRUD_JT = {
    create,
    read,
    update,
    delete: __delete,
    encrypted_key: native.encrypted_key
};

module.exports = CRUD_JT;
