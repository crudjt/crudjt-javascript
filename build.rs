use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    // let manifest_dir = env::var("CARGO_MANIFEST_DIR").expect("Failed to get CARGO_MANIFEST_DIR");
    //
    // let target_os = env::var("CARGO_CFG_TARGET_OS").expect("Failed to get target OS");
    // let target_arch = env::var("CARGO_CFG_TARGET_ARCH").expect("Failed to get target architecture");
    //
    // let lib_path: PathBuf = match (target_os.as_str(), target_arch.as_str()) {
    //     ("macos", "x86_64") => PathBuf::from(&manifest_dir).join("native"),
    //     ("macos", "aarch64") => PathBuf::from(&manifest_dir).join("path/to/macos/aarch64"),
    //     ("windows", "x86_64") => PathBuf::from(&manifest_dir).join("path/to/windows/x86_64"),
    //     ("linux", "x86_64") => PathBuf::from(&manifest_dir).join("path/to/linux/x86_64"),
    //     _ => panic!("Unsupported platform"),
    // };
    //
    // println!("cargo:rustc-link-search={}", lib_path.display());
    // // println!("cargo:rustc-link-lib=store_jt");
    //
    // // println!(r"cargo:rustc-link-search={}", manifest_dir);

    // println!("cargo:rustc-link-search=./native");


    // Отримуємо вихідну директорію для збирання
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());

    // Шлях до оригінальної dylib бібліотеки
    let dylib_path = PathBuf::from("native/libstore_jt.dylib");

    // // Копіюємо dylib бібліотеку в вихідну директорію
    // fs::copy(&dylib_path, out_dir.join("libstore_jt.dylib"))
    //     .expect("Failed to copy dylib file");

    // Вказуємо шлях для лінкування бібліотеки
    println!("cargo:rustc-link-search=native={}", out_dir.display());
}
