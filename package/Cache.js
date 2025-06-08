const { LRUCache } = require('lru-cache')
const CACHE_CAPACITY = 40_000;

class Cache {
  constructor(readFunc) {
    this.cache = new LRUCache({
      max: CACHE_CAPACITY,
      updateAgeOnGet: true,
    });
    this.readFunc = readFunc;
  }

  get(token) {
    let cachedValue = this.cache.get(token);

    if (cachedValue) {
      this.cache.set(token, cachedValue);

      const output = {};
      const metadata = cachedValue['metadata'] || {};

      if (metadata['ttl']) {
        const ttl = Math.ceil((new Date(metadata['ttl']).getTime() - Date.now()) / 1000);
        if (ttl <= 0) {
          this.cache.delete(token);
          return;
        }
        output['metadata'] = { ttl };
      }

      let silence_read = undefined;
      if (cachedValue['metadata']) {
        if (cachedValue['metadata']['silence_read']) {
          silence_read = cachedValue['metadata']['silence_read'];
        }
      }

      if (silence_read) {
        silence_read = (cachedValue['metadata']['silence_read'] -= 1)
        output['metadata'] ||= {};
        output['metadata']['silence_read'] = silence_read;

        if (silence_read <= 0) {
          this.cache.delete(token);
        }

        this.readFunc(token);
      }

      output['data'] = cachedValue['data'];
      return output;
    }
  }

  insert(key, token, ttl, silence_read) {
    const hash = { data: token, metadata: {} };

    if (ttl > 0) {
      hash['metadata']['ttl'] = new Date(Date.now() + ttl * 1000).toISOString();
    }

    if (silence_read > 0) {
      hash['metadata']['silence_read'] = silence_read;
    }

    this.cache.set(key, hash);
  }

  forceInsert(token, hash) {
    this.cache.set(token, hash);
  }

  delete(token) {
    this.cache.delete(token);
  }
}

module.exports = Cache;
