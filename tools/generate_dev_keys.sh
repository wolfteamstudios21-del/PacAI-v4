#!/bin/bash
# PacAI v6.3 Development Key Generator
# Generates Ed25519 keypair for signing export manifests

set -e

KEY_DIR="${HOME}/.pacai/keys"
KEY_NAME="pacai_dev_ed25519"

echo "========================================"
echo "PacAI v6.3 Development Key Generator"
echo "========================================"
echo

# Create key directory
mkdir -p "${KEY_DIR}"
chmod 700 "${KEY_DIR}"

# Check if keys already exist
if [ -f "${KEY_DIR}/${KEY_NAME}" ]; then
    echo "Warning: Keys already exist at ${KEY_DIR}/${KEY_NAME}"
    read -p "Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Generate Ed25519 keypair using ssh-keygen
echo "Generating Ed25519 keypair..."
ssh-keygen -t ed25519 \
    -f "${KEY_DIR}/${KEY_NAME}" \
    -C "pacai-dev-key-$(date +%Y%m%d)" \
    -N ""

echo
echo "Keys generated successfully!"
echo

# Convert to PEM format (optional, for some toolchains)
if command -v openssl &> /dev/null; then
    echo "Converting to PEM format..."
    
    # Convert private key to PKCS8 PEM
    ssh-keygen -p -m PEM -f "${KEY_DIR}/${KEY_NAME}" -N "" 2>/dev/null || true
    
    # Export public key in various formats
    ssh-keygen -e -m PKCS8 -f "${KEY_DIR}/${KEY_NAME}.pub" > "${KEY_DIR}/${KEY_NAME}_pub.pem" 2>/dev/null || true
    
    echo "PEM conversion complete."
    echo
fi

# Display key info
echo "Key Locations:"
echo "  Private Key: ${KEY_DIR}/${KEY_NAME}"
echo "  Public Key:  ${KEY_DIR}/${KEY_NAME}.pub"
if [ -f "${KEY_DIR}/${KEY_NAME}_pub.pem" ]; then
    echo "  Public PEM:  ${KEY_DIR}/${KEY_NAME}_pub.pem"
fi
echo

# Extract public key bytes in hex for verification scripts
echo "Public Key (hex):"
cat "${KEY_DIR}/${KEY_NAME}.pub" | awk '{print $2}' | base64 -d | tail -c 32 | xxd -p | tr -d '\n'
echo
echo

# Security reminders
echo "========================================"
echo "SECURITY REMINDERS"
echo "========================================"
echo "1. For development only - DO NOT use in production"
echo "2. For production, import key into YubiHSM2/Nitrokey3"
echo "3. Never commit private keys to version control"
echo "4. Set permissions: chmod 600 ${KEY_DIR}/${KEY_NAME}"
echo

chmod 600 "${KEY_DIR}/${KEY_NAME}"
chmod 644 "${KEY_DIR}/${KEY_NAME}.pub"

echo "Done! Keys are ready for development use."
