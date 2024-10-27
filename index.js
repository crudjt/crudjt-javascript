const native = require('.'); // Require the compiled native module
const msgpack = require('msgpack-lite');
const { Buffer } = require('buffer');

function create(hash, ttl = -1, silence_read = -1) {
    // Serialize hash into the format Msgpack
    const packedData = msgpack.encode(hash);

    // Call native function create, passing it a pointer and the size of the data
    return native.create(packedData, packedData.length, ttl, silence_read);
}

function read(token) {
  let result = native.read(token);
  if (result === "") {
    return null;
  }

  return JSON.parse(result);
}

function update(token, hash, ttl = -1, silence_read = -1) {
  // Serialize hash into the format Msgpack
  const packedData = msgpack.encode(hash);

  // Call native function update, passing it a pointer and the size of the data
  return native.update(token, packedData, packedData.length, ttl, silence_read);
}

const CRUD_JT = {
    create,
    read,
    update,
    delete: native.delete,
    encrypted_key: native.encrypted_key
};

module.exports = CRUD_JT;
