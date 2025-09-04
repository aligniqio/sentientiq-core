#!/bin/bash

# SentientIQ Backend Setup Script
# Sets up Python environment and installs dependencies

echo "🚀 SentientIQ Backend Setup"
echo "=========================="

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip --quiet

# Install dependencies
echo "Installing dependencies..."
pip install fastapi uvicorn stripe requests boto3 pandas joblib s3fs --quiet

# Create requirements.txt
cat > requirements.txt << EOF
fastapi==0.104.1
uvicorn==0.24.0
stripe==7.0.0
requests==2.31.0
boto3==1.28.84
pandas==2.1.3
joblib==1.3.2
s3fs==2023.10.0
python-multipart==0.0.6
EOF

echo "✅ Dependencies installed"

# Create run script
cat > run.sh << 'EOF'
#!/bin/bash
source venv/bin/activate
echo "Starting SentientIQ Backend..."
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
EOF

chmod +x run.sh

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the backend:"
echo "  cd backend"
echo "  ./run.sh"
echo ""
echo "Or manually:"
echo "  source venv/bin/activate"
echo "  uvicorn app:app --host 0.0.0.0 --port 8000 --reload"
echo ""