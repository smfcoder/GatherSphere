import os
import uvicorn
from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, Depends

from dependencies import get_current_user, require_admin

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI()


@app.get("/")
def health_check():
    return {"status": "healthy"}


@app.post("/login")
def login():
    return {
        "message": "OIDC authentication endpoint",
        "provider": "To be configured with Next.js frontend",
    }


@app.get("/auth/user")
def user_dashboard(payload: dict = Depends(get_current_user)):
    return {"message": "Welcome to the user dashboard", "user": payload}


@app.get("/auth/admin")
def admin_dashboard(payload: dict = Depends(require_admin)):
    return {"message": "Welcome to the admin dashboard", "admin": payload}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
