use std::path::PathBuf;

fn main() {
    let proto_dir = PathBuf::from("proto");
    
    tonic_build::configure()
        .out_dir("src/pb")
        .compile(
            &["proto/gen.proto"],
            &[proto_dir],
        )
        .expect("Failed to compile protos");
}
