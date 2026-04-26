from app.database import Base
from app.models import *   # imports all models so alembic sees them

target_metadata = Base.metadata