module.exports = require('./index.node');

const fs = require('fs');
// const path = require('path');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

const os = require('os');
const path = require('path');

// Визначаємо ОС та архітектуру
const platform = os.platform(); // 'darwin', 'linux', 'win32'
const arch = os.arch(); // 'x64', 'arm64', 'ia32', тощо

const ERRORS = require('./errors');

function copyFileWithCheck(srcPath, destPath) {
  try {
    // Перевіряємо існування файлу джерела
    if (!fs.existsSync(srcPath)) {
      console.log(`Файл не знайдено: ${srcPath}`);
      return;
    }

    // Отримуємо назву файлу та шлях до файлу призначення
    const fileName = path.basename(srcPath);
    const destFilePath = path.join(destPath, fileName);

    // Перевіряємо існування файлу призначення
    if (fs.existsSync(destFilePath)) {
      // Отримуємо інформацію про файли
      const srcStats = fs.statSync(srcPath);
      const destStats = fs.statSync(destFilePath);

      // Якщо назва і розмір збігаються, виходимо з функції
      if (srcStats.size === destStats.size) {
        console.log(`Файл вже існує з такою ж назвою та розміром: ${destFilePath}`);
        return;
      }
    }

    // Копіюємо файл
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Файл успішно скопійовано в: ${destFilePath}`);
    }

  } catch (error) {
    console.error(`Помилка: ${error.message}`);
  }
}

///
// Визначаємо sourcePath
function getSourcePath() {
  let archDir;
  let platformDir;

  // Визначаємо архітектуру
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

  // Визначаємо директорію для платформи
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

  // Формуємо шлях до бібліотеки
  return path.join(__dirname, 'native', platformDir, archDir, 'libstore_jt.dylib');
}

// Визначаємо targetPath
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

// const sourcePath = getSourcePath();
// const targetPath = getTargetPath();
//
// copyFileWithCheck(sourcePath, targetPath);

const native = require('.'); // Require the compiled native module
const msgpack = require('msgpack-lite');
const { Buffer } = require('buffer');
const LRUCache = require('./Cache');
const Validation = require('./Validation');

const lruCache = new LRUCache((value) => native.read(value));

function create(hash, ttl = -1, silence_read = -1) {
    if (!Config.wasStarted()) {
      throw new Error(Validation.errorMessage(Validation.ERROR_NOT_STARTED));
    }

    Validation.validateInsertion(hash, ttl, silence_read);

    // Serialize hash into the format Msgpack
    const packedData = msgpack.encode(hash);
    Validation.validateHashBytesize(packedData.length);

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
    throw new Error(Validation.errorMessage(Validation.ERROR_NOT_STARTED));
  }

  Validation.validateToken(token);

  let output = lruCache.get(token);
  if (output) {
    return output
  }

  let result_str = native.read(token);
  // if (result_str === null) {
  //   return null;
  // }
  //
  // let result = JSON.parse(result_str);
  // lruCache.forceInsert(token, result);
  //
  // return result;

  const result = JSON.parse(result_str);

  if (!result.ok) {
    throw new ERRORS[result.code]();
  }

  if (result.data == null) { // null або undefined
    return null;
  }

  const data = JSON.parse(result.data);
  lruCache.forceInsert(token, data);

  return data;
}

function update(token, hash, ttl = -1, silence_read = -1) {
  if (!Config.wasStarted()) {
    throw new Error(Validation.errorMessage(Validation.ERROR_NOT_STARTED));
  }

  Validation.validateToken(token);
  Validation.validateInsertion(hash, ttl, silence_read);

  // Serialize hash into the format Msgpack
  const packedData = msgpack.encode(hash);
  Validation.validateHashBytesize(packedData.length);

  // Call native function update, passing it a pointer and the size of the data
  let result = native.update(token, packedData, packedData.length, ttl, silence_read);
  if (result) {
    lruCache.insert(token, hash, ttl, silence_read)
  }

  return result;
}

function __delete(token) {
  if (!Config.wasStarted()) {
    throw new Error(Validation.errorMessage(Validation.ERROR_NOT_STARTED));
  }

  Validation.validateToken(token);

  lruCache.delete(token);

  return native.delete(token);
}

// const Config = {
//     encrypted_key: native.encrypted_key,
//     store_jt_path: native.store_jt_path
// };

const settings = {};
let wasStarted = false;

const Config = {
  encrypted_key(value) {
    Validation.validateEncryptedKey(value); // аналог validate_encrypted_key!
    settings.encrypted_key = value;
    return this;
  },

  store_jt_path(value) {
    settings.store_jt_path = value;
    return this;
  },

  wasStarted() {
    return wasStarted;
  },

  start() {
    if (!settings.encrypted_key) {
      throw new ERRORS[Validation.ERROR_ENCRYPTED_KEY_NOT_SET](
        Validation.errorMessage(Validation.ERROR_ENCRYPTED_KEY_NOT_SET)
      );
    }

    if (wasStarted) {
      throw new ERRORS[Validation.ERROR_ALREADY_STARTED](
        Validation.errorMessage(Validation.ERROR_ALREADY_STARTED)
      );
    }

    // Викликаємо Neon-метод
    const result = JSON.parse(
      native.start_store_jt(settings.encrypted_key, settings.store_jt_path)
    );

    if (!result.ok) {
      const ErrorClass = ERRORS[result.code] || Error;
      throw new ErrorClass(result.error_message || 'Unknown error');
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
