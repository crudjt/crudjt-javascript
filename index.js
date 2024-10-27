const native = require('.'); // Require the compiled native module
const msgpack = require('msgpack5')();
const { Buffer } = require('buffer');

function create(hash, ttl = -1, silence_read = -1) {
    // Serialize hash into the format Msgpack
    const packedData = msgpack.encode(hash);

    // Get pointer on bytes and size
    const packed_data = msgpack.encode(hash);

    const buffer = Buffer.alloc(packed_data.length);
    packed_data.copy(buffer);

    // Call native function create, passing it a pointer and the size of the data
    return native.create(buffer, packed_data.length, ttl, silence_read);
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

  // Get pointer on bytes and size
  const packed_data = msgpack.encode(hash);

  const buffer = Buffer.alloc(packed_data.length);
  packed_data.copy(buffer);

  // Call native function create, passing it a pointer and the size of the data
  return native.update(token, buffer, packed_data.length, ttl, silence_read);
}

const CRUD_JT = {
    create,
    read,
    update,
    encrypted_key: native.encrypted_key
};

CRUD_JT.encrypted_key('Cm7B68NWsMNNYjzMDREacmpe5sI1o0g40ZC9w1yQW3WOes7Gm59UsittlOHR2dciYiwmaYq98l3tG8h9yXVCxg==');
let token = CRUD_JT.create({ user_id: 42, role: 11 });

console.log(token);
console.log(CRUD_JT.read(token));

console.log(CRUD_JT.update(token, { qwe: 12313 }));
console.log(token);

module.exports = CRUD_JT;
