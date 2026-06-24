from typing import AsyncGenerator
import contextlib
from sqlalchemy.ext.asyncio import AsyncSession

from database import AsyncSessionLocal

class UnitOfWork:
    """
    Unit of Work pattern to handle database transactions cleanly.
    Ensures that a sequence of database operations happen within a single transaction.
    """
    def __init__(self, session_factory=AsyncSessionLocal):
        self.session_factory = session_factory
        self.session: AsyncSession = None

    async def __aenter__(self):
        self.session = self.session_factory()
        return self

    async def __aexit__(self, exc_type, exc_val, traceback):
        if exc_type is not None:
            await self.rollback()
        else:
            await self.commit()
        await self.session.close()

    async def commit(self):
        if self.session:
            await self.session.commit()

    async def rollback(self):
        if self.session:
            await self.session.rollback()

@contextlib.asynccontextmanager
async def get_uow() -> AsyncGenerator[UnitOfWork, None]:
    uow = UnitOfWork()
    async with uow:
        yield uow
