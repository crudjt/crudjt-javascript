module.exports = require('./index.node');

const { createStub } = require('./token_service_client');

const fs = require('fs');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

const os = require('os');
const path = require('path');

const platform = os.platform(); // 'darwin', 'linux', 'win32'
const arch = os.arch(); // 'x64', 'arm64', 'ia32', etc

const CRUDJT_ERRORS = require('./errors');

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
const CRUDJT_LRUCache = require('./Cache');
const CRUDJT_Validation = require('./Validation');

const lruCache = new CRUDJT_LRUCache((value) => native.read(value));

function original_create(hash, ttl = -1, silence_read = -1) {
    if (!Config.wasStarted()) {
      throw new Error(CRUDJT_Validation.errorMessage(CRUDJT_Validation.ERROR_NOT_STARTED));
    }

    CRUDJT_Validation.validateInsertion(hash, ttl, silence_read);

    // Serialize hash into the format Msgpack
    const packedData = msgpack.encode(hash);
    CRUDJT_Validation.validateHashBytesize(packedData.length);

    // Call native function create, passing it a pointer and the size of the data
    let token = native.create(packedData, packedData.length, ttl, silence_read);
    if (!token) {
      throw new CRUDJT.Errors.InternalError('Something went wrong. Ups');
    }

    lruCache.insert(token, hash, ttl, silence_read);

    return token;
}

async function create(hash, ttl = -1, silence_read = -1) {
  if (CRUDJT.Config.master()) {
    return original_create(hash, ttl, silence_read);
  } else {
    const packed_data = msgpack.encode(hash);
    const response = await new Promise((resolve, reject) => {
      CRUDJT.Config.stub().CreateToken(
        { packed_data, ttl, silence_read },
        (err, response) => {
          if (err) reject(err);
          else resolve(response);
        }
      );
    });
    return response.token;
  }
}

function original_read(token) {
  if (!Config.wasStarted()) {
    throw new Error(CRUDJT_Validation.errorMessage(CRUDJT_Validation.ERROR_NOT_STARTED));
  }

  CRUDJT_Validation.validateToken(token);

  let output = lruCache.get(token);
  if (output) {
    return output
  }

  let result_str = native.read(token);

  const result = JSON.parse(result_str);

  if (!result.ok) {
    throw new CRUDJT_ERRORS[result.code]();
  }

  if (result.data == null) {
    return null;
  }

  const data = JSON.parse(result.data);
  lruCache.forceInsert(token, data);

  return data;
}

async function read(token) {
  if (CRUDJT.Config.master()) {
    return original_read(token);
  } else {
    const response = await new Promise((resolve, reject) => {
      CRUDJT.Config.stub().ReadToken(
        { token },
        (err, response) => {
          if (err) reject(err);
          else resolve(response);
        }
      );
    });

    return msgpack.decode(response.packed_data);
  }
}

function original_update(token, hash, ttl = -1, silence_read = -1) {
  if (!Config.wasStarted()) {
    throw new Error(CRUDJT_Validation.errorMessage(CRUDJT_Validation.ERROR_NOT_STARTED));
  }

  CRUDJT_Validation.validateToken(token);
  CRUDJT_Validation.validateInsertion(hash, ttl, silence_read);

  // Serialize hash into the format Msgpack
  const packedData = msgpack.encode(hash);
  CRUDJT_Validation.validateHashBytesize(packedData.length);

  // Call native function update, passing it a pointer and the size of the data
  let result = native.update(token, packedData, packedData.length, ttl, silence_read);
  if (result) {
    lruCache.insert(token, hash, ttl, silence_read)
  }

  return result;
}

async function update(token, hash, ttl = -1, silence_read = -1) {
  if (CRUDJT.Config.master()) {
    return original_update(token, hash, ttl, silence_read);
  } else {
    const packed_data = msgpack.encode(hash);
    const response = await new Promise((resolve, reject) => {
      CRUDJT.Config.stub().UpdateToken(
        { token, packed_data, ttl, silence_read },
        (err, response) => {
          if (err) reject(err);
          else resolve(response);
        }
      );
    });
    return response.result;
  }
}

function original_delete(token) {
  if (!Config.wasStarted()) {
    throw new Error(CRUDJT_Validation.errorMessage(CRUDJT_Validation.ERROR_NOT_STARTED));
  }

  CRUDJT_Validation.validateToken(token);

  lruCache.delete(token);

  return native.delete(token);
}

async function __delete(token) {
  if (CRUDJT.Config.master()) {
    return original_delete(token);
  } else {
    const response = await new Promise((resolve, reject) => {
      CRUDJT.Config.stub().DeleteToken(
        { token },
        (err, response) => {
          if (err) reject(err);
          else resolve(response);
        }
      );
    });

    return response.result;
  }
}

// ---- Start gRPC interface -----
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const PROTO_PATH = path.join(__dirname, 'token_service.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
});

const tokenProto = grpc.loadPackageDefinition(packageDefinition).token;

async function startServer(address) {
  const server = new grpc.Server();

  server.addService(tokenProto.TokenService.service, {
    CreateToken: createToken,
    ReadToken: readToken,
    UpdateToken: updateToken,
    DeleteToken: deleteToken
  });

  await new Promise((resolve, reject) => {
    server.bindAsync(
      address,
      grpc.ServerCredentials.createInsecure(),
      err => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

  return server;
}


function createToken(call, callback) {
  const hash = msgpack.decode(call.request.packed_data);
  const token = original_create(hash, call.request.ttl, call.request.silence_read);

  callback(null, {
    token: token
  });
}

function readToken(call, callback) {
  const hash = original_read(call.request.token);

  let packedData = msgpack.encode(hash);

  callback(null, {
    packed_data: packedData,
  });
}

function updateToken(call, callback) {
  const hash = msgpack.decode(call.request.packed_data);
  const result = original_update(call.request.token, hash, call.request.ttl, call.request.silence_read);

  callback(null, {
    result: result
  });
}

function deleteToken(call, callback) {
  const result = original_delete(call.request.token);

  callback(null, {
    result: result
  });
}
// ---- End gRPC interface

const settings = {};
let wasStarted = false;
let server = false;

const Config = {
  _stub: null,
  GRPC_HOST: '127.0.0.1',
  GRPC_PORT: 50051,

  wasStarted() {
    return wasStarted;
  },

  master() {
    return master;
  },

  async shutdownServer() {
    if (!server) {
      throw new Error('gRPC server is not started');
    }

    await new Promise(resolve => {
      server.tryShutdown(resolve);
    });
  },

  async startMaster(options = {}) {
    if (!options.encrypted_key) {
      throw new CRUDJT_ERRORS[CRUDJT_Validation.ERROR_ENCRYPTED_KEY_NOT_SET](
        CRUDJT_Validation.errorMessage(CRUDJT_Validation.ERROR_ENCRYPTED_KEY_NOT_SET)
      );
    }

    if (wasStarted) {
      throw new CRUDJT_ERRORS[CRUDJT_Validation.ERROR_ALREADY_STARTED](
        CRUDJT_Validation.errorMessage(CRUDJT_Validation.ERROR_ALREADY_STARTED)
      );
    }

    CRUDJT_Validation.validateEncryptedKey(options.encrypted_key);

    const {
      store_jt_path,
      grpc_host = Config.GRPC_HOST,
      grpc_port = Config.GRPC_PORT
    } = options;

    this.settings = {
      store_jt_path,
      grpc_host,
      grpc_port
    };

    const address = `${grpc_host}:${grpc_port}`;

    server = await startServer(address);

    const result = JSON.parse(
      native.start_store_jt(options.encrypted_key, this.settings.store_jt_path)
    );

    if (!result.ok) {
      const ErrorClass = CRUDJT_ERRORS[result.code] || Error;
      await CRUDJT.Config.shutdownServer();
      throw new ErrorClass(result.error_message || 'Unknown error');
    }

    master = true;
    wasStarted = true;
  },

  connectToMaster(options = {}) {
    const {
      grpc_host = Config.GRPC_HOST,
      grpc_port = Config.GRPC_PORT
    } = options;

    this.settings = {
      grpc_host,
      grpc_port
    };

    const address = `${grpc_host}:${grpc_port}`;

    this._stub = createStub(address);

    master = false;
    wasStarted = true;
  },

  stub() {
    if (!this._stub) {
      throw new Error('Config.connectToMaster() was not called');
    }
    return this._stub;
  }
};

const CRUDJT = {
    create,
    read,
    update,
    delete: __delete,

    Config
};

module.exports = CRUDJT;
