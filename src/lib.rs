use std::ffi::CString;
use core::ffi::CStr;
use std::os::raw::{c_char, c_int};
use neon::prelude::*;
use neon::types::buffer::TypedArray;
use std::ptr;
use libloading::{Library, Symbol};
use std::sync::{Mutex, Once};
use lazy_static::lazy_static;
use std::sync::Arc;

use std::path::{Path, PathBuf};

fn get_library_path() -> Result<PathBuf, String> {
    let project_root = Path::new(env!("CARGO_MANIFEST_DIR"));

    let library_subpath = {
        #[cfg(target_os = "linux")]
        {
            if cfg!(target_arch = "x86_64") {
                "native/linux/store_jt_x86_64.so"
            } else if cfg!(target_arch = "aarch64") {
                "native/linux/store_jt_arm64.so"
            } else {
                return Err("Unsupported architecture for Linux".to_string());
            }
        }

        #[cfg(target_os = "macos")]
        {
            if cfg!(target_arch = "x86_64") {
                "native/macos/store_jt_x86_64.dylib"
            } else if cfg!(target_arch = "aarch64") {
                "native/macos/store_jt_arm64.dylib"
            } else {
                return Err("Unsupported architecture for macOS".to_string());
            }
        }

        #[cfg(target_os = "windows")]
        {
            if cfg!(target_arch = "x86_64") {
                "native/windows/store_jt_x86_64.dll"
            } else if cfg!(target_arch = "aarch64") {
                "native/windows/store_jt_arm64.dll"
            } else {
                return Err("Unsupported architecture for Windows".to_string());
            }
        }

        #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
        {
            return Err("Unsupported OS".to_string());
        }
    };

    Ok(project_root.join(library_subpath))
}

lazy_static! {
    pub static ref LIB: Result<Library, String> = unsafe {
        get_library_path().and_then(|path| {
            Library::new(path)
                .map_err(|e| format!("Failed to load library: {}", e))
        })
    };
}

fn _start_store_jt(encrypted_key: *const c_char, store_jt_path: *const c_char) -> Result<*const c_char, Box<dyn std::error::Error>> {
    let lib = match &*LIB {
        Ok(lib) => lib,
        Err(e) => return Err(e.clone().into())
    };

    unsafe {
        let func: libloading::Symbol<unsafe extern fn(*const c_char, *const c_char) -> *const c_char> = lib.get(b"start_store_jt")?;
        Ok(func(encrypted_key, store_jt_path))
    }
}

fn _create(data: *const u8, len: usize, ttl: i64, silence_read: i32) -> Result<*const c_char, Box<dyn std::error::Error>> {
    let lib = match &*LIB {
        Ok(lib) => lib,
        Err(e) => return Err(e.clone().into())
    };

    unsafe {
        let func: libloading::Symbol<unsafe extern fn(*const u8, usize, i64, i32) -> *const c_char> = lib.get(b"__create")?;
        Ok(func(data, len, ttl, silence_read))
    }
}

fn _read(token: *const c_char) -> Result<*const c_char, Box<dyn std::error::Error>> {
    let lib = match &*LIB {
        Ok(lib) => lib,
        Err(e) => return Err(e.clone().into())
    };

    unsafe {
        let func: libloading::Symbol<unsafe extern fn(*const c_char) -> *const c_char> = lib.get(b"__read")?;
        let result = func(token);

        if result.is_null() {
            return Ok(ptr::null());
        }

        Ok(func(token))
    }
}

fn _update(token: *const c_char, data: *const u8, len: usize, ttl: i64, silence_read: i32) -> Result<*const c_int, Box<dyn std::error::Error>> {
    let lib = match &*LIB {
        Ok(lib) => lib,
        Err(e) => return Err(e.clone().into())
    };

    unsafe {
        let func: libloading::Symbol<unsafe extern fn(*const c_char, *const u8, usize, i64, i32) -> *const c_int> = lib.get(b"__update")?;
        Ok(func(token, data, len, ttl, silence_read))
    }
}

fn _delete(token: *const c_char) -> Result<*const c_int, Box<dyn std::error::Error>> {
    let lib = match &*LIB {
        Ok(lib) => lib,
        Err(e) => return Err(e.clone().into())
    };

    unsafe {
        let func: libloading::Symbol<unsafe extern fn(*const c_char) -> *const c_int> = lib.get(b"__delete")?;
        Ok(func(token))
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
fn call_start_store_jt(mut cx: FunctionContext) -> JsResult<JsString> {
    let encrypted_key = cx.argument::<JsString>(0)?.value(&mut cx);

    let c_encrypted_key = match CString::new(encrypted_key) {
        Ok(c) => c,
        Err(e) => return cx.throw_error(format!("Failed to create CString: {}", e)),
    };

    let path_to_db = match cx.argument_opt(1) {
            Some(arg) => {
                if let Ok(js_str) = arg.downcast::<JsString, _>(&mut cx) {
                    Some(js_str.value(&mut cx))
                } else {
                    None
                }
            }
            None => None,
        };

    let c_path_to_db = match path_to_db {
        Some(ref s) => {
            let cstr = match CString::new(s.as_str()) {
                Ok(c) => c,
                Err(e) => return cx.throw_error(format!("Failed to create CString: {}", e)),
            };
            cstr.as_ptr()
        }
        None => std::ptr::null(),
    };

    let result_ptr = match _start_store_jt(c_encrypted_key.as_ptr(), c_path_to_db) {
        Ok(ptr) => ptr,
        Err(e) => {
            return cx.throw_error(format!("_start_store_jt failed: {}", e));
        }
    };

    unsafe {
        let result_str = CStr::from_ptr(result_ptr).to_string_lossy().into_owned();

        Ok(cx.string(result_str))
    }
}

fn call_create(mut cx: FunctionContext) -> JsResult<JsString> {
    let js_buffer = cx.argument::<JsBuffer>(0)?;
    let data_size = cx.argument::<JsNumber>(1)?;
    let data_usize = data_size.value(&mut cx) as usize;

    let ttl = cx.argument::<JsNumber>(2)?;
    let silence_read = cx.argument::<JsNumber>(3)?;

    let ttl_int = ttl.value(&mut cx) as i64;
    let silence_read_int = silence_read.value(&mut cx) as i32;

    let data = js_buffer.as_slice(&cx);
    let data_ptr: *const u8 = data.as_ptr();

    let result_ptr = match _create(data_ptr, data_usize, ttl_int, silence_read_int) {
        Ok(ptr) => ptr,
        Err(e) => {
            return cx.throw_error(format!("native call_create failed: {}", e));
        }
    };

    unsafe {
        let result_str = CStr::from_ptr(result_ptr).to_string_lossy().into_owned();

        Ok(cx.string(result_str))
    }
}

fn call_read(mut cx: FunctionContext) -> JsResult<JsValue> {
    let token = cx.argument::<JsString>(0)?.value(&mut cx);

    let c_token = match CString::new(token) {
        Ok(c) => c,
        Err(e) => return cx.throw_error(format!("Failed to create CString: {}", e)),
    };

    unsafe {
        let result = match _read(c_token.as_ptr()) {
            Ok(ptr) => ptr,
            Err(e) => {
                return cx.throw_error(format!("native call_read failed: {}", e));
            }
        };

        if result.is_null() {
            return Ok(cx.null().upcast());
        }

        let result_str = CStr::from_ptr(result).to_string_lossy().into_owned();
        Ok(cx.string(result_str).upcast())
    }
}

fn call_update(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let token = cx.argument::<JsString>(0)?.value(&mut cx);

    let c_token = match CString::new(token) {
        Ok(c) => c,
        Err(e) => return cx.throw_error(format!("Failed to create CString: {}", e)),
    };

    let js_buffer = cx.argument::<JsBuffer>(1)?;
    let data_size = cx.argument::<JsNumber>(2)?;
    let data_usize = data_size.value(&mut cx) as usize;

    let ttl = cx.argument::<JsNumber>(3)?;
    let silence_read = cx.argument::<JsNumber>(4)?;

    let ttl_int = ttl.value(&mut cx) as i64;
    let silence_read_int = silence_read.value(&mut cx) as i32;

    let data = js_buffer.as_slice(&cx);
    let data_ptr: *const u8 = data.as_ptr();

    let output: *const c_int =  match _update(c_token.as_ptr(), data_ptr, data_usize, ttl_int, silence_read_int) {
        Ok(ptr) => ptr,
        Err(e) => {
            return cx.throw_error(format!("native call_update failed: {}", e));
        }
    };
    let bool: bool = output as usize == 1;

    Ok(cx.boolean(bool))
}

fn call_delete(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let token = cx.argument::<JsString>(0)?.value(&mut cx);
    let c_token = match CString::new(token) {
        Ok(c) => c,
        Err(e) => return cx.throw_error(format!("Failed to create CString: {}", e)),
    };

    let output: *const c_int = match _delete(c_token.as_ptr()) {
        Ok(ptr) => ptr,
        Err(e) => {
            return cx.throw_error(format!("native call_delete failed: {}", e));
        }
    };
    let bool: bool = output as usize == 1;

    Ok(cx.boolean(bool))
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("start_store_jt", call_start_store_jt)?;

    cx.export_function("create", call_create)?;
    cx.export_function("read", call_read)?;
    cx.export_function("update", call_update)?;
    cx.export_function("delete", call_delete)?;

    Ok(())
}
