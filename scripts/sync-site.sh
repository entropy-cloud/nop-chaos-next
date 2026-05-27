#!/bin/bash
# Copy built frontend assets from nop-chaos-next to nop-entropy/nop-web-site
# - JS/CSS files > 3KB are gzip-compressed (original removed)
# - All other files are copied as-is

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT_DIR/apps/main/dist"
TARGET="$ROOT_DIR/../nop-entropy/nop-frontend-support/nop-web-site/src/main/resources/META-INF/resources/"

if [ ! -d "$SOURCE" ]; then
    echo "Error: Source directory not found: $SOURCE"
    echo "Please run 'pnpm build' in apps/main first."
    exit 1
fi

echo "Cleaning target: $TARGET"
rm -rf "$TARGET"

echo "Copying dist to target..."
cp -rf "$SOURCE" "$TARGET"

echo "Gzipping JS/CSS files larger than 3KB..."
find "$TARGET" -type f \( -name "*.js" -o -name "*.css" \) -size +3k | while read -r file; do
    gzip -n -k -9 "$file"
    rm "$file"
done

echo "Removing pre-existing .gz files' originals (if any)..."
# For any .gz files that already existed, remove the uncompressed version
find "$TARGET" -type f -name "*.gz" | while read -r gz_file; do
    orig_file="${gz_file%.gz}"
    if [ -f "$orig_file" ]; then
        rm "$orig_file"
    fi
done

echo "Done. Files copied to $TARGET"
