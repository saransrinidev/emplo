"""Entry point to seed demo data. Run from workspace root:

    backend\\.venv\\Scripts\\python.exe backend\\seed_demo.py
"""
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

from app.seed_data import seed_demo

if __name__ == "__main__":
    seed_demo()
