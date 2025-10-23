<p align="center">
  <img src="logos/crud_jt_logo_black.png#gh-light-mode-only" alt="Logo Light" />
  <img src="logos/crud_jt_logo.png#gh-dark-mode-only" alt="Logo Dark" />
</p>

<p align="center">
  Simplifies user session. Login/Logout/Authorization
</p>

<p align="center">
  <a href="https://www.patreon.com/exwarvlad">
    <img src="logos/buy_me_a_coffee_orange.svg" alt="Buy Me a Coffee"/>
  </a>
</p>

# Installation

```sh
npm install crud_jt
```

Require and configure CRUD JT in your project

```javascript
const CRUD_JT = require('crud_jt');

// openssl rand -base64 48 # In your terminal
// => your_encrypted_base64/48
CRUD_JT.Config
  .encrypted_key('your_encrypted_base64/32/48/64')
  .store_jt_path('your_path_to_file_storage') // optional
  .start();
```

# C

```javascript
CRUD_JT.create({ user_id: 42, role: 11 });
=> 'HBmKFXoXgJ46mCqer1WXyQ'
```

```javascript
// with ttl — token time-to-live in seconds
ttl = 3600 * 24 * 30

CRUD_JT.create({ user_id: 42, role: 11 }, ttl);
=> 'HBmKFXoXgJ46mCqer1WXyQ'
```

```javascript
// with silence_read — silently read the token a specified number of times, then delete it permanently
silence_read = 3

CRUD_JT.create({ user_id: 42, role: 11 }, -1, silence_read);
=> 'HBmKFXoXgJ46mCqer1WXyQ'
```

```javascript
// with ttl and silence_read
ttl = 3600 * 24 * 30
silence_read = 3

CRUD_JT.create({ user_id: 42, role: 11 }, ttl, silence_read);
=> 'HBmKFXoXgJ46mCqer1WXyQ'
```

# R

```javascript
// ...
CRUD_JT.read('HBmKFXoXgJ46mCqer1WXyQ');
=> { data: { user_id: 42, role: 11 }}
```

```javascript
// with ttl
CRUD_JT.read('HBmKFXoXgJ46mCqer1WXyQ');
=> { metadata: { ttl: 3 }, data: { user_id: 42, role: 11 } }

// after 1 second
CRUD_JT.read('HBmKFXoXgJ46mCqer1WXyQ');
=> { metadata: { ttl: 2 }, data: { user_id: 42, role: 11 } }

// still second
CRUD_JT.read('HBmKFXoXgJ46mCqer1WXyQ');
=> { metadata: { ttl: 1 }, data: { user_id: 42, role: 11 } }

// ups
CRUD_JT.read('HBmKFXoXgJ46mCqer1WXyQ')
=> null
```

```javascript
// with silence_read
CRUD_JT.read('HBmKFXoXgJ46mCqer1WXyQ');
=> { metadata: { silence_read: 2 }, data: { user_id: 42, role: 11 } }


// after 1 read
CRUD_JT.read('HBmKFXoXgJ46mCqer1WXyQ')
=> { metadata: { silence_read: 1 }, data: { user_id: 42, role: 11 } }

// still one read
CRUD_JT.read('HBmKFXoXgJ46mCqer1WXyQ')
=> { metadata: { silence_read: 0 }, data: { user_id: 42, role: 11 } }

// ups
CRUD_JT.read('HBmKFXoXgJ46mCqer1WXyQ')
=> null
```

```javascript
// with ttl and silence_read
CRUD_JT.read('HBmKFXoXgJ46mCqer1WXyQ')
=> { metadata: { ttl: 88, silence_read: 2 }, data: { user_id: 42, role: 11 } }
// ...
```

# U

```javascript
CRUD_JT.update('HBmKFXoXgJ46mCqer1WXyQ', { user_id: 42, role: 8 })
=> true // { data: { user_id: 42, role: 8} }
```

```javascript
// supports for ttl and/or silence_read
ttl = 41
silence_read = 5

CRUD_JT.update('HBmKFXoXgJ46mCqer1WXyQ', { user_id: 42, role: 8 }, ttl, silence_read)
=> true // { metadata: { ttl: 41, silence_read: 5}, data: { user_id: 42, role: 8 } }
```

```javascript
// when expired/not found token
CRUD_JT.update('HBmKFXoXgJ46mCqer1WXyQ', { user_id: 42, role: 8 })
=> false
```

# D
```javascript
// when token exist
CRUD_JT.delete('HBmKFXoXgJ46mCqer1WXyQ')
=> true
```

```javascript
// when expired/not found token
CRUD_JT.delete('HBmKFXoXgJ46mCqer1WXyQ')
=> false
```

# Performance
**40k** requests of **256 bytes** — median over 10 runs  
ARM64 (Apple M1+), macOS darwin 24.6.0  
Node 20.19.5

| Function | CRUD JT (Javascript) | JWT (Javascript) | redis-session-store (Ruby, Rails 8.0.4) |
|----------|-------|------|------|
| C        | `0.335 second` ![Logo Favicon Light](logos/crud_jt_logo_favicon_white.png#gh-light-mode-only) ![Logo Favicon Dark](logos/crud_jt_logo_favicon_black.png#gh-dark-mode-only) | 11.182 seconds | 4.057 seconds |
| R        | `0.007 second` ![Logo Favicon Light](logos/crud_jt_logo_favicon_white.png#gh-light-mode-only) ![Logo Favicon Dark](logos/crud_jt_logo_favicon_black.png#gh-dark-mode-only) | 11.639 second | 7.011 seconds |
| U        | `0.449 second` ![Logo Favicon Light](logos/crud_jt_logo_favicon_white.png#gh-light-mode-only) ![Logo Favicon Dark](logos/crud_jt_logo_favicon_black.png#gh-dark-mode-only) | X | 3.49 seconds |
| D        | `0.222 second` ![Logo Favicon Light](logos/crud_jt_logo_favicon_white.png#gh-light-mode-only) ![Logo Favicon Dark](logos/crud_jt_logo_favicon_black.png#gh-dark-mode-only) | X | 6.589 seconds |

[Full results](https://github.com/exwarvlad/benchmarks)

# Storage (Store JT)

## Path Lookup Order
Stored tokens are placed in the **file system** according to the following order

1. Explicitly set via `CRUD_JT.Config.store_jt_path('custom/path/to/file_system_db')`
2. Default system location
   - **Linux**: `/var/lib/store_jt`
   - **macOS**: `/usr/local/var/store_jt`
   - **Windows**: `C:\Program Files\store_jt`
3. Project root directory (fallback)

## Storage Characteristics
* Store JT **automatically removing expired tokens** every 24 hours without blocking the main thread   
* **Store JT automatically fsyncs every 500ms**, meanwhile tokens ​​are available from cache
* Store JT is available for one process to open per instance for the time being

## Configuration

You can configure the library before starting it

```javascript
const CRUD_JT = require('crud_jt');

// Required configuration
CRUD_JT.Config.encrypted_key('some_base64_key');

// Optional configuration
CRUD_JT.Config.store_jt_path('/custom/path/to/store_jt');

// Start the CRUD JT and Store JT
CRUD_JT.Config.start();
```

#### `encrypted_key(base64_key)`
Sets the encrypted key (**required**)

#### `store_jt_path(path_to_db)`
Overrides the default Store JT path (**optional**)

#### `start()`
Initializes the CRUD JT and opens the Store JT (**must be called last**)

# Limits
The library has the following limits and requirements

- **Node version:** >= 18.0.0
- **Supported platforms:** Linux, macOS, Windows (x86_64 / arm64)
- **Maximum json size per token:** 256 bytes
- **`encrypted_key` format:** must be Base64
- **`encrypted_key` size:** must be 32, 48, or 64 bytes

# Contact & Support
<p align="center">
  <img src="logos/crud_jt_logo_favicon_black_160.png#gh-light-mode-only" alt="Visit Light" />
  <img src="logos/crud_jt_logo_favicon_white_160.png#gh-dark-mode-only" alt="Visit Dark" />
</p>

- **Custom integrations / new features / collaboration**: support@crudjt.com  
- **Library support & bug reports:** [open an issue](https://github.com/crud_jt/crud_jt-ruby/issues)


# License
CRUD JT is released under the [MIT License](LICENSE.txt)

<p align="center">
  💘 Shoot your g . ? Love me out via <a href="https://www.patreon.com/exwarvlad">Github Sponsors</a>!
</p>
