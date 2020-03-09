from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import (JWTManager, create_access_token,
                                get_jwt_claims, jwt_required)
from flask_sqlalchemy import SQLAlchemy

from flask_bcrypt import Bcrypt
from flask_socketio import SocketIO

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'omnidj-secret'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CORS(app)
print("creating socket io instance")
socketApp = SocketIO(app, cors_allowed_origins="*")
print("socketApp instance is: ", socketApp)

jwt = JWTManager(app)


app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///../omnidj.db'
db = SQLAlchemy(app)

flask_bcrypt = Bcrypt(app)

from application.users.views import users

db.create_all()

app.register_blueprint(users, url_prefix='/users')

import application.views

import application.events


def load_user(user_id):
    return application.user_models.query.get(int(user_id))


if __name__ == "__main__":
    print("In __init__.py main")
