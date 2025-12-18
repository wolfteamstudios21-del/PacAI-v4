#!/bin/bash
# PacAI v6.3 Linux AppImage Builder
# Prerequisites: linuxdeploy, appimagetool

set -e

APP_NAME="PacAI-v6-Admin"
VERSION="6.3.0"
ARCH="x86_64"

echo "Building PacAI v6.3 AppImage..."

# Create AppDir structure
mkdir -p AppDir/usr/bin
mkdir -p AppDir/usr/share/applications
mkdir -p AppDir/usr/share/icons/hicolor/256x256/apps

# Copy binary (from Tauri build)
cp ../pacai-desktop/src-tauri/target/release/${APP_NAME} AppDir/usr/bin/

# Copy desktop file
cp pacai.desktop AppDir/usr/share/applications/
cp pacai.desktop AppDir/

# Copy icon (if exists)
if [ -f "pacai.png" ]; then
    cp pacai.png AppDir/usr/share/icons/hicolor/256x256/apps/
    cp pacai.png AppDir/
fi

# Create AppRun
cat > AppDir/AppRun << 'EOF'
#!/bin/bash
SELF=$(readlink -f "$0")
HERE=${SELF%/*}
export PATH="${HERE}/usr/bin:${PATH}"
export LD_LIBRARY_PATH="${HERE}/usr/lib:${LD_LIBRARY_PATH}"
exec "${HERE}/usr/bin/PacAI-v6-Admin" "$@"
EOF
chmod +x AppDir/AppRun

# Set permissions
chmod +x AppDir/usr/bin/${APP_NAME}

# Build AppImage
if command -v appimagetool &> /dev/null; then
    ARCH=${ARCH} appimagetool AppDir ${APP_NAME}-${VERSION}-${ARCH}.AppImage
    echo "Created: ${APP_NAME}-${VERSION}-${ARCH}.AppImage"
elif command -v linuxdeploy &> /dev/null; then
    linuxdeploy --appdir AppDir --output appimage
    echo "Created AppImage with linuxdeploy"
else
    echo "Warning: Neither appimagetool nor linuxdeploy found"
    echo "AppDir created at: ./AppDir"
    echo "Install appimagetool or linuxdeploy to create AppImage"
fi

echo "Done!"
