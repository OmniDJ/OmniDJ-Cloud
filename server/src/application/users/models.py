from dataclasses import dataclass
from application import db, flask_bcrypt
import datetime
from sqlalchemy.ext.hybrid import hybrid_property


@dataclass
class User(db.Model):
    id: int
    email: str
    username: str
    firstName: str
    lastName: str
    accountType: str

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True)
    username = db.Column(db.String(40), unique=True)
    _password = db.Column('password', db.String(60))
    firstName = db.Column(db.String(255), unique=True)
    lastName = db.Column(db.String(255), unique=True)
    accountType = db.Column(db.String(40))
    created_on = db.Column(db.DateTime,
                           default=datetime.datetime.utcnow)

    @hybrid_property
    def password(self):
        """The bcrypt'ed password of the given user."""
        return self._password

    @password.setter
    def password(self, password):
        """Bcrypt the password on assignment."""
        self._password = flask_bcrypt.generate_password_hash(
            password)
