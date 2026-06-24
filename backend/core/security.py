from enum import Enum
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey-change-in-production")
ALGORITHM = "HS256"
security = HTTPBearer()

class Role(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"
    GUEST = "guest"

async def get_current_user_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_role(required_roles: list[Role]):
    async def role_checker(token: dict = Depends(get_current_user_token)):
        user_role = token.get("role", Role.GUEST.value)
        if user_role not in [role.value for role in required_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for your role"
            )
        return token
    return role_checker
