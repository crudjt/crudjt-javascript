module.exports = require('./index.node');

const fs = require('fs');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

const os = require('os');
const path = require('path');

const platform = os.platform(); // 'darwin', 'linux', 'win32'
const arch = os.arch(); // 'x64', 'arm64', 'ia32', etc

const CRUD_JT_ERRORS = require('./errors');

function getSourcePath() {
  let archDir;
  let platformDir;

  switch (arch) {
    case 'x64':
      archDir = 'x86_64';
      break;
    case 'arm64':
      archDir = 'arm64';
      break;
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }

  switch (platform) {
    case 'darwin':
      platformDir = 'macos';
      break;
    case 'linux':
      platformDir = 'linux';
      break;
    case 'win32':
      platformDir = 'windows';
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  return path.join(__dirname, 'native', platformDir, archDir, 'libstore_jt.dylib');
}

function getTargetPath() {
  let systemLibDir;
  let libName;

  switch (platform) {
    case 'darwin':
      systemLibDir = '/usr/local/lib';
      libName = 'libstore_jt.dylib';
      break;
    case 'linux':
      systemLibDir = '/usr/lib';
      libName = 'libstore_jt.so';
      break;
    case 'win32':
      systemLibDir = 'C:\\Windows\\System32';
      libName = 'libstore_jt.dll';
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  return path.join(systemLibDir, libName);
}
///

const native = require('.'); // Require the compiled native module
const msgpack = require('msgpack-lite');
const { Buffer } = require('buffer');
const CRUD_JT_LRUCache = require('./Cache');
const CRUD_JT_Validation = require('./Validation');

const lruCache = new CRUD_JT_LRUCache((value) => native.read(value));

function create(hash, ttl = -1, silence_read = -1) {
    if (!Config.wasStarted()) {
      throw new Error(CRUD_JT_Validation.errorMessage(CRUD_JT_Validation.ERROR_NOT_STARTED));
    }

    if (Config.hint_cheatcode() != Config.CHEATCODE) {
      silence_read = -1;
    }

    CRUD_JT_Validation.validateInsertion(hash, ttl, silence_read);

    // Serialize hash into the format Msgpack
    const packedData = msgpack.encode(hash);
    CRUD_JT_Validation.validateHashBytesize(packedData.length);

    // Call native function create, passing it a pointer and the size of the data
    let token = native.create(packedData, packedData.length, ttl, silence_read);
    if (!token) {
      throw new CRUD_JT.Errors.InternalError('Something went wrong. Ups');
    }

    lruCache.insert(token, hash, ttl, silence_read);

    return token;
}

function read(token) {
  if (!Config.wasStarted()) {
    throw new Error(CRUD_JT_Validation.errorMessage(CRUD_JT_Validation.ERROR_NOT_STARTED));
  }

  CRUD_JT_Validation.validateToken(token);

  let output = lruCache.get(token);
  if (output) {
    return output
  }

  let result_str = native.read(token);

  const result = JSON.parse(result_str);

  if (!result.ok) {
    throw new CRUD_JT_ERRORS[result.code]();
  }

  if (result.data == null) {
    return null;
  }

  const data = JSON.parse(result.data);
  lruCache.forceInsert(token, data);

  return data;
}

function update(token, hash, ttl = -1, silence_read = -1) {
  if (!Config.wasStarted()) {
    throw new Error(CRUD_JT_Validation.errorMessage(CRUD_JT_Validation.ERROR_NOT_STARTED));
  }

  if (Config.hint_cheatcode() != Config.CHEATCODE) {
    silence_read = -1;
  }

  CRUD_JT_Validation.validateToken(token);
  CRUD_JT_Validation.validateInsertion(hash, ttl, silence_read);

  // Serialize hash into the format Msgpack
  const packedData = msgpack.encode(hash);
  CRUD_JT_Validation.validateHashBytesize(packedData.length);

  // Call native function update, passing it a pointer and the size of the data
  let result = native.update(token, packedData, packedData.length, ttl, silence_read);
  if (result) {
    lruCache.insert(token, hash, ttl, silence_read)
  }

  return result;
}

function __delete(token) {
  if (!Config.wasStarted()) {
    throw new Error(CRUD_JT_Validation.errorMessage(CRUD_JT_Validation.ERROR_NOT_STARTED));
  }

  CRUD_JT_Validation.validateToken(token);

  lruCache.delete(token);

  return native.delete(token);
}

const settings = {};
let wasStarted = false;

const Config = {
  CHEATCODE: 'BAGUVIX', // 🐰🥚

  encrypted_key(value) {
    CRUD_JT_Validation.validateEncryptedKey(value);
    settings.encrypted_key = value;
    return this;
  },

  store_jt_path(value) {
    settings.store_jt_path = value;
    return this;
  },

  cheatcode(code) {
    settings.cheatcode = code;
    return this;
  },

  hint_cheatcode() {
    return settings.cheatcode;
  },

  wasStarted() {
    return wasStarted;
  },

  start() {
    if (!settings.encrypted_key) {
      throw new CRUD_JT_ERRORS[CRUD_JT_Validation.ERROR_ENCRYPTED_KEY_NOT_SET](
        CRUD_JT_Validation.errorMessage(CRUD_JT_Validation.ERROR_ENCRYPTED_KEY_NOT_SET)
      );
    }

    if (wasStarted) {
      throw new CRUD_JT_ERRORS[CRUD_JT_Validation.ERROR_ALREADY_STARTED](
        CRUD_JT_Validation.errorMessage(CRUD_JT_Validation.ERROR_ALREADY_STARTED)
      );
    }

    // Call Neon method
    const result = JSON.parse(
      native.start_store_jt(settings.encrypted_key, settings.store_jt_path)
    );

    if (!result.ok) {
      const ErrorClass = CRUD_JT_ERRORS[result.code] || Error;
      throw new ErrorClass(result.error_message || 'Unknown error');
    }

    if (Config.hint_cheatcode() === Config.CHEATCODE) {
      console.log(
        "🐰🥚 You have activated optional param silence_read for CRUD_JT on method create\n" +
        "Ideal for one-time reads, email confirmation links, or limits on the number of operations\n" +
        "Each read decrements silence_read by 1, when the counter reaches zero — the token is deleted permanently"
      );
    }

    wasStarted = true;
  }
};

const CRUD_JT = {
    create,
    read,
    update,
    delete: __delete,

    Config
};

module.exports = CRUD_JT;
