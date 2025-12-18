#!/usr/bin/env python3
"""
PacAI v6.3 Export Bundle Verification Tool

Verifies the Ed25519 signature and SHA-384 checksums of export bundles.

Usage:
    python verify_manifest.py <export.zip> [--pubkey <pubkey.pem>]
    python verify_manifest.py <export.zip> --pubkey-hex <hex_string>

Requirements:
    pip install cryptography

Exit codes:
    0 - Verification successful
    1 - Verification failed (bad signature or checksum)
    2 - Error (file not found, invalid format, etc.)
"""

import json
import sys
import binascii
import hashlib
import zipfile
import argparse
from pathlib import Path

try:
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
    from cryptography.hazmat.primitives import serialization
    from cryptography.exceptions import InvalidSignature
except ImportError:
    print("Error: cryptography package required. Install with: pip install cryptography")
    sys.exit(2)


def load_public_key_pem(pem_path: str) -> Ed25519PublicKey:
    """Load Ed25519 public key from PEM file."""
    with open(pem_path, 'rb') as f:
        return serialization.load_pem_public_key(f.read())


def load_public_key_hex(hex_string: str) -> Ed25519PublicKey:
    """Load Ed25519 public key from hex-encoded bytes."""
    key_bytes = binascii.unhexlify(hex_string)
    return Ed25519PublicKey.from_public_bytes(key_bytes)


def load_public_key_from_manifest(manifest: dict) -> Ed25519PublicKey:
    """Extract and load public key from manifest."""
    pubkey_hex = manifest.get('public_key')
    if not pubkey_hex:
        raise ValueError("No public key found in manifest")
    return load_public_key_hex(pubkey_hex)


def verify_signature(manifest_bytes: bytes, signature: bytes, public_key: Ed25519PublicKey) -> bool:
    """Verify Ed25519 signature."""
    try:
        public_key.verify(signature, manifest_bytes)
        return True
    except InvalidSignature:
        return False


def verify_checksums(archive: zipfile.ZipFile, checksums: dict) -> tuple:
    """Verify SHA-384 checksums of all files."""
    verified = []
    failed = []
    
    for rel_path, expected_hash in checksums.items():
        try:
            data = archive.read(rel_path)
            actual_hash = hashlib.sha384(data).hexdigest()
            
            if actual_hash == expected_hash:
                verified.append(rel_path)
            else:
                failed.append({
                    'path': rel_path,
                    'expected': expected_hash,
                    'actual': actual_hash
                })
        except KeyError:
            failed.append({
                'path': rel_path,
                'error': 'File not found in archive'
            })
    
    return verified, failed


def verify_bundle(zip_path: str, public_key: Ed25519PublicKey = None, verbose: bool = False) -> bool:
    """
    Verify a PacAI export bundle.
    
    Args:
        zip_path: Path to the export .zip file
        public_key: Optional Ed25519PublicKey. If None, uses key from manifest.
        verbose: Print detailed verification info
    
    Returns:
        True if verification passes, False otherwise
    """
    try:
        with zipfile.ZipFile(zip_path, 'r') as archive:
            manifest_bytes = archive.read('manifest.json')
            sig_hex = archive.read('manifest.sig').decode('utf-8').strip()
            signature = binascii.unhexlify(sig_hex)
            
            manifest = json.loads(manifest_bytes)
            
            if verbose:
                print(f"PacAI Version: {manifest.get('pacai', 'unknown')}")
                print(f"Generated: {manifest.get('generated', 'unknown')}")
                print(f"Seed: {manifest.get('seed', 'unknown')}")
                print(f"Exports: {', '.join(manifest.get('exports', []))}")
                print(f"Files: {len(manifest.get('checksums', {}))}")
                print()
            
            if public_key is None:
                if verbose:
                    print("Loading public key from manifest...")
                public_key = load_public_key_from_manifest(manifest)
            
            if verbose:
                print("Verifying signature... ", end="")
            
            if not verify_signature(manifest_bytes, signature, public_key):
                if verbose:
                    print("FAILED")
                print("Signature verification FAILED")
                return False
            
            if verbose:
                print("OK")
            
            checksums = manifest.get('checksums', {})
            if verbose:
                print(f"Verifying {len(checksums)} file checksums... ", end="")
            
            verified, failed = verify_checksums(archive, checksums)
            
            if failed:
                if verbose:
                    print("FAILED")
                print("\nChecksum verification FAILED:")
                for f in failed:
                    if 'error' in f:
                        print(f"  {f['path']}: {f['error']}")
                    else:
                        print(f"  {f['path']}: hash mismatch")
                return False
            
            if verbose:
                print("OK")
            
            print(f"\nVerification SUCCESSFUL")
            print(f"  - Signature: Valid (Ed25519)")
            print(f"  - Files verified: {len(verified)}")
            print(f"  - Bundle integrity: Intact")
            return True
            
    except FileNotFoundError:
        print(f"Error: File not found: {zip_path}")
        return False
    except zipfile.BadZipFile:
        print(f"Error: Invalid zip file: {zip_path}")
        return False
    except KeyError as e:
        print(f"Error: Missing required file in bundle: {e}")
        return False
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Verify PacAI v6.3 export bundle signature and checksums'
    )
    parser.add_argument('zip_path', help='Path to export .zip file')
    parser.add_argument('--pubkey', '-p', help='Path to PEM public key file')
    parser.add_argument('--pubkey-hex', help='Hex-encoded public key bytes')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    public_key = None
    if args.pubkey:
        try:
            public_key = load_public_key_pem(args.pubkey)
        except Exception as e:
            print(f"Error loading public key: {e}")
            sys.exit(2)
    elif args.pubkey_hex:
        try:
            public_key = load_public_key_hex(args.pubkey_hex)
        except Exception as e:
            print(f"Error loading public key: {e}")
            sys.exit(2)
    
    success = verify_bundle(args.zip_path, public_key, args.verbose)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
