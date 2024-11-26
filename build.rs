use std::env;
use std::fs;
use std::path::{Path, PathBuf};

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


    let dylib_path = "./native/macos/x86_64/libstore_jt.dylib";
    let dest_path = "/usr/local/lib/libstore_jt.dylib";

    // Копіюємо файл у /usr/local/lib
    if Path::new(dylib_path).exists() {
        fs::copy(dylib_path, dest_path).expect("Failed to copy dylib to /lib/local/libstore_jt.dylib");
        println!("Library successfully copied to {}", dest_path);
    } else {
        eprintln!("Error: Source file does not exist at {}", dylib_path);
    }


    // let dylib_path = "./native/linux/x86_64";
    // // println!("cargo:rustc-env=LD_LIBRARY_PATH={}", dylib_path);
    // println!("cargo:rustc-link-search=native={}", dylib_path);
    // // println!("cargo:rustc-link-lib=store_jt");
}
