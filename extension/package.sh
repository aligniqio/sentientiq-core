#!/bin/bash

# Package Chrome Extension for Store Submission
echo "🚀 Packaging Intent Data Auditor for Chrome Web Store"

# Clean up any existing package
rm -f intent-data-auditor.zip

# Create icons if they don't exist (placeholder for now)
if [ ! -f "icon-16.png" ]; then
    echo "⚠️  Icons not found. Please generate icons using create-icons.html"
    echo "Creating placeholder icons..."
    
    # Create simple colored squares as placeholders
    convert -size 16x16 xc:"#FF0080" icon-16.png 2>/dev/null || echo "16x16 icon needed"
    convert -size 48x48 xc:"#FF0080" icon-48.png 2>/dev/null || echo "48x48 icon needed"
    convert -size 128x128 xc:"#FF0080" icon-128.png 2>/dev/null || echo "128x128 icon needed"
fi

# Create the zip package
echo "📦 Creating zip package..."
zip -r intent-data-auditor.zip \
    manifest.json \
    popup.html \
    popup.js \
    content.js \
    background.js \
    cmo-revelation.js \
    smoking-gun.js \
    api-connector.js \
    icon-*.png \
    -x "*.DS_Store" \
    -x "*test*" \
    -x "*.sh" \
    -x "*.md" \
    -x "create-icons.html"

echo "✅ Package created: intent-data-auditor.zip"
echo ""
echo "📋 Pre-submission checklist:"
echo "  [ ] Icons generated (16x16, 48x48, 128x128)"
echo "  [ ] Extension tested on test-page.html"
echo "  [ ] Math.random() detection verified"
echo "  [ ] Popup UI working"
echo "  [ ] No console errors"
echo ""
echo "🎯 Ready for Chrome Web Store submission!"
echo "   File: intent-data-auditor.zip"
echo "   Size: $(du -h intent-data-auditor.zip | cut -f1)"