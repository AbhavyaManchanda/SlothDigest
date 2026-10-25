import uvicorn
import sys
import os
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

if __name__ == "__main__":
    print("=" * 60)
    print("SlothDigest - Zero-Effort Local RSS & Newsletter Curator")
    print("=" * 60)
    print("Starting backend server at: http://localhost:8000")
    print("API Documentation at:       http://localhost:8000/docs")
    print("Frontend accessible at:     http://localhost:3000 (dev) or :8000 (prod)")
    print("=" * 60)
    uvicorn.run(
        "backend.main:app", 
        host="127.0.0.1", 
        port=8000, 
        reload=False
    )
