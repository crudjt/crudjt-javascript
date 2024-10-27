use std::ffi::CString;
use core::ffi::CStr;
use std::os::raw::{c_char, c_int};
use neon::prelude::*;
use neon::types::buffer::TypedArray;
use std::ptr;

#[link(name = "store_jt")]
extern {
    pub fn encrypted_key(key: *const std::os::raw::c_char);
}

#[link(name = "store_jt")]
extern {
    pub fn __create(data: *const u8, len: usize, ttl: i64, silence_read: i32) -> *const c_char;
}

fn call_encrypted_key(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let key = cx.argument::<JsString>(0)?.value(&mut cx);
    let c_key = CString::new(key).expect("Failed to create CString");

    unsafe {
        encrypted_key(c_key.as_ptr());
    }

    Ok(cx.undefined())
}

fn create_function(mut cx: FunctionContext) -> JsResult<JsString> {
    let js_buffer = cx.argument::<JsBuffer>(0)?;
    let data_size = cx.argument::<JsNumber>(1)?;
    let data_usize = data_size.value(&mut cx) as usize;

    let ttl = cx.argument::<JsNumber>(2)?;
    let silence_read = cx.argument::<JsNumber>(3)?;

    let ttl_int = ttl.value(&mut cx) as i64;
    let silence_read_int = silence_read.value(&mut cx) as i32;

    let data = js_buffer.as_slice(&cx);
    let data_ptr: *const u8 = data.as_ptr();

    unsafe {
        let result: *const c_char = __create(data_ptr, data_usize, ttl_int, silence_read_int);
        let result_str = CStr::from_ptr(result).to_string_lossy().into_owned();

        Ok(cx.string(result_str))
    }
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("encrypted_key", call_encrypted_key)?;
    cx.export_function("create", create_function)?;

    Ok(())
}
