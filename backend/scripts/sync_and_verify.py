"""Sync all tables and verify recent feature routers load."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine
from app.models import Base

Base.metadata.create_all(bind=engine)
print("Tables synced")

from app.api.profile_changes import router as r5
from app.api.bank_accounts import router as r4
from app.api.holidays import router as r3
from app.api.leave_management import router as r2
from app.api.departments import router as r1
from app.api.attendance_records import router as r6
from app.api.password_reset import router as r7
from app.api.edit_requests import router as r8
print(f"All 8 new routers OK")

# Verify full app loads
from app.main import app
print(f"App routes total: {len(app.routes)}")
