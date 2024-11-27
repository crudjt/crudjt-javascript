// use std::env;
use std::fs;
use std::path::{Path, PathBuf};

// use std::path::Path;
use std::env;
use std::process::Command;

fn main() {
    // // Отримуємо шлях до кореня проєкту
    // let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    //
    // // Шлях до вашої .dylib бібліотеки
    // let dylib_dir = manifest_dir.join("native/macos/x86_64/");
    // let dylib_path = dylib_dir.join("libstore_jt.dylib");
    //
    // // Копіюємо .dylib до output-папки
    // let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    // let target_path = out_dir.join("libstore_jt.dylib");
    //
    // // Перевіряємо існування файлу, щоб уникнути помилок
    // if !dylib_path.exists() {
    //     panic!(
    //         "Динамічна бібліотека не знайдена: {}",
    //         dylib_path.display()
    //     );
    // }
    //
    // fs::copy(&dylib_path, &target_path).expect("Не вдалося скопіювати бібліотеку");
    //
    // // Повідомляємо Cargo, де шукати бібліотеку
    // println!("cargo:rustc-link-search=native={}", dylib_dir.display());
    // println!("cargo:rustc-link-lib=dylib=store_jt");


    // let dylib_path = "./native/macos/arm64/libstore_jt.dylib";
    // let dest_path = "/usr/local/lib/libstore_jt.dylib";
    //
    // // Копіюємо файл у /usr/local/lib
    // if Path::new(dylib_path).exists() {
    //     fs::copy(dylib_path, dest_path).expect("Failed to copy dylib to /usr/local/libstore_jt.dylib");
    //     println!("Library successfully copied to {}", dest_path);
    // } else {
    //     eprintln!("Error: Source file does not exist at {}", dylib_path);
    // }


    // let dylib_path = "./native/linux/x86_64";
    // // println!("cargo:rustc-env=LD_LIBRARY_PATH={}", dylib_path);
    // println!("cargo:rustc-link-search=native={}", dylib_path);
    // // println!("cargo:rustc-link-lib=store_jt");

    // let dylib_path = "./native/macos/arm64";
    // // println!("cargo:rustc-env=LD_LIBRARY_PATH={}", dylib_path);
    // println!("cargo:rustc-link-search=native={}", dylib_path);
    // // println!("cargo:rustc-link-lib=store_jt");

    // let dylib_path = "./native/windows/x86_64";
    // println!("cargo:rustc-link-search=native={}", dylib_path);
    // println!("cargo:rustc-link-lib=store_jt");


    // let dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    // let lib_path = Path::new(&dir).join("native/windows/x86_64/libstore_jt.dll");
    //
    // // Копіюємо бібліотеку до папки C:\Windows\System32
    // let system32_path = Path::new("C:\\Windows\\System32").join("libstore_jt.dll");
    // if let Err(e) = fs::copy(&lib_path, &system32_path) {
    //     eprintln!("Failed to copy DLL: {}", e);
    // } else {
    //     println!("Successfully copied DLL to System32: {}", system32_path.display());
    // }

    // let dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    let system32_dir = env::var("SYSTEM32_DIR").unwrap_or_else(|_| String::from("C:\\Windows\\System32"));
    println!("cargo:rustc-link-search=native={}", system32_dir);
    println!("cargo:rustc-link-lib=dylib=store_jt");
}
