"""
Root conftest.py: Add apps/api to sys.path ahead of pipelines to ensure correct module resolution.
"""

import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent
api_dir = root_dir / "apps" / "api"

if str(api_dir) not in sys.path:
    sys.path.insert(0, str(api_dir))
if str(root_dir) not in sys.path:
    sys.path.insert(1, str(root_dir))
