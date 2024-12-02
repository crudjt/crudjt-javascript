use std::ffi::CString;
use core::ffi::CStr;
use std::os::raw::{c_char, c_int};
use neon::prelude::*;
use neon::types::buffer::TypedArray;
use std::ptr;

///
use libloading::{Library, Symbol};
use std::sync::{Mutex, Once};
use lazy_static::lazy_static;
use std::sync::Arc;

use std::path::{Path, PathBuf};

fn get_library_path() -> PathBuf {
    let project_root = Path::new(env!("CARGO_MANIFEST_DIR"));

    // Формуємо шлях до бібліотеки залежно від ОС та архітектури
    let library_subpath = {
        #[cfg(target_os = "linux")]
        {
            if cfg!(target_arch = "x86_64") {
                "native/linux/libstore_jt.so"
            } else if cfg!(target_arch = "aarch64") {
                "native/linux/store_jt_arm64.so"
            } else {
                panic!("Unsupported architecture for Linux");
            }
        }

        #[cfg(target_os = "macos")]
        {
            if cfg!(target_arch = "x86_64") {
                "native/macos/store_jt_x86_64.dylib"
            } else if cfg!(target_arch = "aarch64") {
                "native/macos/store_jt_arm64.dylib"
            } else {
                panic!("Unsupported architecture for macOS");
            }
        }

        #[cfg(target_os = "windows")]
        {
            if cfg!(target_arch = "x86_64") {
                "native/windows/store_jt_x86_64.dll"
            } else if cfg!(target_arch = "aarch64") {
                "native/windows/store_jt_arm64.dll"
            } else {
                panic!("Unsupported architecture for Windows");
            }
        }

        #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
        {
            panic!("Unsupported OS");
        }
    };

    // Об'єднуємо шлях до проекту з відносним шляхом до бібліотеки
    project_root.join(library_subpath)
}

lazy_static! {
    pub static ref LIB: Library = {
        unsafe { Library::new(get_library_path()).expect("Failed to load library") }
    };
}

fn _encrypted_key(key: *const c_char) -> Result<u32, Box<dyn std::error::Error>> {
    unsafe {
        // let lib = libloading::Library::new("/path/to/liblibrary.so")?;
        let func: libloading::Symbol<unsafe extern fn(*const c_char) -> u32> = LIB.get(b"encrypted_key")?;
        Ok(func(key))
    }
}

fn _create(data: *const u8, len: usize, ttl: i64, silence_read: i32) -> Result<*const c_char, Box<dyn std::error::Error>> {
    unsafe {
        let func: libloading::Symbol<unsafe extern fn(*const u8, usize, i64, i32) -> *const c_char> = LIB.get(b"__create")?;
        Ok(func(data, len, ttl, silence_read))
    }
}

fn _read(token: *const c_char) -> Result<*const c_char, Box<dyn std::error::Error>> {
    unsafe {
        // let lib = libloading::Library::new("/path/to/liblibrary.so")?;
        let func: libloading::Symbol<unsafe extern fn(*const c_char) -> *const c_char> = LIB.get(b"__read")?;
        Ok(func(token))
    }
}

fn _update(token: *const c_char, data: *const u8, len: usize, ttl: i64, silence_read: i32) -> Result<*const c_int, Box<dyn std::error::Error>> {
    unsafe {
        let func: libloading::Symbol<unsafe extern fn(*const c_char, *const u8, usize, i64, i32) -> *const c_int> = LIB.get(b"__update")?;
        Ok(func(token, data, len, ttl, silence_read))
    }
}

fn _delete(token: *const c_char) -> Result<*const c_int, Box<dyn std::error::Error>> {
    unsafe {
        // let lib = libloading::Library::new("/path/to/liblibrary.so")?;
        let func: libloading::Symbol<unsafe extern fn(*const c_char) -> *const c_int> = LIB.get(b"__delete")?;
        Ok(func(token))
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

fn call_encrypted_key(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let key = cx.argument::<JsString>(0)?.value(&mut cx);
    let c_key = CString::new(key).expect("Failed to create CString");

    _encrypted_key(c_key.as_ptr()).unwrap();
    Ok(cx.undefined())
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

    let result_ptr = _create(data_ptr, data_usize, ttl_int, silence_read_int).unwrap();

    unsafe {
        let result_str = CStr::from_ptr(result_ptr).to_string_lossy().into_owned();

        Ok(cx.string(result_str))
    }
}

fn call_read(mut cx: FunctionContext) -> JsResult<JsString> {
    let token = cx.argument::<JsString>(0)?.value(&mut cx);
    let c_token = CString::new(token).expect("Failed to create CString");

    unsafe {
        let result = _read(c_token.as_ptr()).unwrap();

        // // Перевірка на "особливі" значення
        // if result as usize == usize::MAX {
        //     // eprintln!("Function __w returned invalid pointer: {:p}", result);
        //     return Ok(cx.string(""));
        // }

        let result_str = CStr::from_ptr(result).to_string_lossy().into_owned();

        Ok(cx.string(result_str))
    }
}

fn call_update(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let token = cx.argument::<JsString>(0)?.value(&mut cx);
    let c_token = CString::new(token).expect("Failed to create CString");

    let js_buffer = cx.argument::<JsBuffer>(1)?;
    let data_size = cx.argument::<JsNumber>(2)?;
    let data_usize = data_size.value(&mut cx) as usize;

    let ttl = cx.argument::<JsNumber>(3)?;
    let silence_read = cx.argument::<JsNumber>(4)?;

    let ttl_int = ttl.value(&mut cx) as i64;
    let silence_read_int = silence_read.value(&mut cx) as i32;

    let data = js_buffer.as_slice(&cx);
    let data_ptr: *const u8 = data.as_ptr();

    let output: *const c_int = _update(c_token.as_ptr(), data_ptr, data_usize, ttl_int, silence_read_int).unwrap();
    let bool: bool = output as usize == 1;

    Ok(cx.boolean(bool))
}

fn call_delete(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let token = cx.argument::<JsString>(0)?.value(&mut cx);
    let c_token = CString::new(token).expect("Failed to create CString");

    let output: *const c_int = _delete(c_token.as_ptr()).unwrap();
    let bool: bool = output as usize == 1;

    Ok(cx.boolean(bool))
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("encrypted_key", call_encrypted_key)?;
    cx.export_function("create", call_create)?;
    cx.export_function("read", call_read)?;
    cx.export_function("update", call_update)?;
    cx.export_function("delete", call_delete)?;

    Ok(())
}
