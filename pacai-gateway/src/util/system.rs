use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use std::sync::atomic::{AtomicU64, Ordering};

static START_TIME: AtomicU64 = AtomicU64::new(0);

pub fn init_system() {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    START_TIME.store(now, Ordering::SeqCst);
}

pub fn uptime_seconds() -> u64 {
    let start = START_TIME.load(Ordering::SeqCst);
    if start == 0 {
        return 0;
    }
    
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    now - start
}

pub fn get_hardware_fingerprint() -> String {
    let machine_id = std::fs::read_to_string("/etc/machine-id")
        .unwrap_or_else(|_| {
            std::env::var("HOSTNAME")
                .unwrap_or_else(|_| uuid::Uuid::new_v4().to_string())
        });
    
    use sha2::{Sha256, Digest};
    let hash = Sha256::digest(machine_id.trim().as_bytes());
    hex::encode(&hash[..16])
}

pub fn get_system_info() -> SystemInfo {
    SystemInfo {
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        hostname: std::env::var("HOSTNAME").unwrap_or_else(|_| "unknown".into()),
        cpus: num_cpus(),
        memory_mb: available_memory_mb(),
        uptime_seconds: uptime_seconds(),
    }
}

#[derive(Debug, serde::Serialize)]
pub struct SystemInfo {
    pub platform: String,
    pub arch: String,
    pub hostname: String,
    pub cpus: usize,
    pub memory_mb: u64,
    pub uptime_seconds: u64,
}

fn num_cpus() -> usize {
    std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(1)
}

fn available_memory_mb() -> u64 {
    if let Ok(meminfo) = std::fs::read_to_string("/proc/meminfo") {
        for line in meminfo.lines() {
            if line.starts_with("MemAvailable:") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    if let Ok(kb) = parts[1].parse::<u64>() {
                        return kb / 1024;
                    }
                }
            }
        }
    }
    0
}

pub struct Timer {
    start: Instant,
    label: String,
}

impl Timer {
    pub fn new(label: &str) -> Self {
        Self {
            start: Instant::now(),
            label: label.to_string(),
        }
    }
    
    pub fn elapsed(&self) -> Duration {
        self.start.elapsed()
    }
    
    pub fn elapsed_ms(&self) -> u128 {
        self.start.elapsed().as_millis()
    }
}

impl Drop for Timer {
    fn drop(&mut self) {
        tracing::debug!("{} took {}ms", self.label, self.elapsed_ms());
    }
}

pub fn generate_request_id() -> String {
    format!("req-{}", uuid::Uuid::new_v4().to_string()[..8].to_string())
}
