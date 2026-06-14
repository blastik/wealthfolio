use std::{env, fs, path::PathBuf};

const DEFAULT_CONNECT_API_URL: &str = "https://api.wealthfolio.app";
const DEFAULT_CONNECT_AUTH_URL: &str = "https://auth.wealthfolio.app";
const DEFAULT_CONNECT_AUTH_PUBLISHABLE_KEY: &str = "sb_publishable_ZSZbXNtWtnh9i2nqJ2UL4A_NV8ZVutd";

fn read_env_value_from_dotenv(key: &str) -> Option<String> {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").ok()?;
    let dotenv_path = PathBuf::from(manifest_dir).join("../../.env");

    println!("cargo:rerun-if-changed={}", dotenv_path.display());

    let content = fs::read_to_string(dotenv_path).ok()?;
    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let line = line.strip_prefix("export ").unwrap_or(line);
        let prefix = format!("{}=", key);
        let Some(value) = line.strip_prefix(&prefix) else {
            continue;
        };

        let value = value.trim();
        let value = value
            .strip_prefix('"')
            .and_then(|v| v.strip_suffix('"'))
            .or_else(|| value.strip_prefix('\'').and_then(|v| v.strip_suffix('\'')))
            .unwrap_or(value)
            .trim();

        if !value.is_empty() {
            return Some(value.to_string());
        }
    }

    None
}

fn resolve_config_value(key: &str, default: &str) -> (String, bool) {
    let configured = env::var(key)
        .ok()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .or_else(|| read_env_value_from_dotenv(key));

    match configured {
        Some(value) => (value, false),
        None => (default.to_string(), true),
    }
}

fn emit_config_value(key: &str, default: &str) {
    let (value, used_default) = resolve_config_value(key, default);

    println!("cargo:rustc-env={}={}", key, value);

    if used_default {
        println!("cargo:warning={} is not set; using production default", key);
    } else {
        println!("cargo:warning={} is set", key);
    }
}

fn main() {
    println!("cargo:rerun-if-env-changed=CONNECT_API_URL");
    println!("cargo:rerun-if-env-changed=CONNECT_AUTH_URL");
    println!("cargo:rerun-if-env-changed=CONNECT_AUTH_PUBLISHABLE_KEY");

    emit_config_value("CONNECT_API_URL", DEFAULT_CONNECT_API_URL);
    emit_config_value("CONNECT_AUTH_URL", DEFAULT_CONNECT_AUTH_URL);
    emit_config_value(
        "CONNECT_AUTH_PUBLISHABLE_KEY",
        DEFAULT_CONNECT_AUTH_PUBLISHABLE_KEY,
    );

    tauri_build::build()
}
