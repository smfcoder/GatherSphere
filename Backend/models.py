from sqlalchemy import Column, Integer, String

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=True)
    flat_number = Column(String, nullable=True)
    floor_number = Column(String, nullable=True)
    resident_type = Column(String, nullable=True)
    family_members = Column(Integer, nullable=True)
    vehicle_details = Column(String, nullable=True)
