import uvicorn
from dotenv import load_dotenv
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from dependencies import require_user, require_admin
from models import User
from keycloak_admin import create_keycloak_user, delete_keycloak_user, find_keycloak_user_by_email

load_dotenv(Path(__file__).parent / ".env", override=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserCreate(BaseModel):
    name: str = Field(min_length=1)
    email: str = Field(min_length=3)
    phone: str | None = None
    password: str | None = None


class ProfileUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    flat_number: str | None = None
    floor_number: str | None = None
    resident_type: str | None = None
    family_members: int | None = None
    vehicle_details: str | None = None


def user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "flat_number": user.flat_number,
        "floor_number": user.floor_number,
        "resident_type": user.resident_type,
        "family_members": user.family_members,
        "vehicle_details": user.vehicle_details,
    }


@app.get("/")
def health_check():
    return {"status": "healthy"}


@app.get("/users/me")
def get_own_user(
    payload: dict = Depends(require_user),
    db: Session = Depends(get_db),
):
    email = (payload.get("email") or payload.get("preferred_username") or payload.get("sub", "")).strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        name = payload.get("name") or payload.get("preferred_username") or email.split("@")[0]
        user = User(name=name, email=email)
        db.add(user)
        db.commit()
        db.refresh(user)

    return {"user": user_to_dict(user)}


@app.put("/users/me")
def update_own_profile(
    data: ProfileUpdate,
    payload: dict = Depends(require_user),
    db: Session = Depends(get_db),
):
    email = (payload.get("email") or payload.get("preferred_username") or payload.get("sub", "")).strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(name=email.split("@")[0], email=email)
        db.add(user)
        db.commit()
        db.refresh(user)

    if data.name is not None:
        user.name = data.name.strip()
    if data.phone is not None:
        user.phone = data.phone.strip() or None
    if data.flat_number is not None:
        user.flat_number = data.flat_number.strip() or None
    if data.floor_number is not None:
        user.floor_number = data.floor_number.strip() or None
    if data.resident_type is not None:
        user.resident_type = data.resident_type.strip() or None
    if data.family_members is not None:
        user.family_members = data.family_members
    if data.vehicle_details is not None:
        user.vehicle_details = data.vehicle_details.strip() or None

    db.commit()
    db.refresh(user)
    return {"user": user_to_dict(user)}


# --- Admin endpoints ---


@app.get("/users")
def get_all_users(
    payload: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.id).all()
    return {"users": [user_to_dict(u) for u in users]}


@app.get("/users/{user_id}")
def get_user(
    user_id: int,
    payload: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"user": user_to_dict(user)}


@app.put("/users/{user_id}")
def update_user(
    user_id: int,
    data: ProfileUpdate,
    payload: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if data.name is not None:
        user.name = data.name.strip()
    if data.phone is not None:
        user.phone = data.phone.strip() or None
    if data.flat_number is not None:
        user.flat_number = data.flat_number.strip() or None
    if data.floor_number is not None:
        user.floor_number = data.floor_number.strip() or None
    if data.resident_type is not None:
        user.resident_type = data.resident_type.strip() or None
    if data.family_members is not None:
        user.family_members = data.family_members
    if data.vehicle_details is not None:
        user.vehicle_details = data.vehicle_details.strip() or None

    db.commit()
    db.refresh(user)
    return {"user": user_to_dict(user)}


@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    payload: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(user)
    db.commit()
    return {"detail": "User deleted"}


@app.post("/users")
async def admin_create_user(
    data: UserCreate,
    payload: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required to create a user in Keycloak.",
        )

    email = data.email.strip().lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists.",
        )

    username = email.split("@")[0]

    try:
        await create_keycloak_user(username=username, email=email, password=data.password)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user in Keycloak: {e}",
        )

    user = User(name=data.name.strip(), email=email, phone=data.phone.strip() if data.phone else None)
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"user": user_to_dict(user), "detail": "User created in Keycloak and database."}


@app.delete("/users/{user_id}/keycloak")
async def delete_user_with_keycloak(
    user_id: int,
    payload: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    kc_id = await find_keycloak_user_by_email(user.email)
    if kc_id:
        try:
            await delete_keycloak_user(kc_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete user from Keycloak: {e}",
            )

    db.delete(user)
    db.commit()
    return {"detail": "User deleted from Keycloak and database."}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
