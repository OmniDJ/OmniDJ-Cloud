from application import db, flask_bcrypt, jwt
from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    jwt_required, get_jwt_claims, create_access_token)
from .models import User

users = Blueprint('users', __name__)


@jwt.user_claims_loader
def add_claims_to_access_token(identity):
    print("Claims for identity: ", identity)
    user = User.query.filter_by(
        username=identity).first()
    return {'username': user.username, 'accountType': user.accountType, 'email': user.email, 'firstName': user.firstName, 'lastName': user.lastName}


@users.route('/register', methods=['POST'])
def register():
    register_json = request.get_json()

    if not register_json:
        return jsonify({'error': 'Missing JSON'}), 400

    username = register_json.get('username')
    email = register_json.get('email')
    password = register_json.get('password')
    firstName = register_json.get('firstName')
    lastName = register_json.get('lastName')
    accountType = register_json.get('accountType')
    print("Trying to register user [%s] with email [%s] , firstName [%s] lastName [%s] password [%s] and accountType [%s]" % (
        username, email, firstName, lastName, password, accountType))
    user = User.query.filter_by(
        username=username).first()
    if user is not None:
        print("Username already exists")
        return jsonify({'error': 'User already exists'}), 401
    user = User.query.filter_by(
        email=email).first()
    if user is not None:
        print("Email already exists")
        return jsonify({'error': 'Email already exists'}), 401
    # User can be created
    newUser = User(username=username, email=email, password=password, firstName=firstName, lastName=lastName,
                   accountType=accountType)
    db.session.add(newUser)
    db.session.commit()
    return jsonify({'msg': "usercreated", 'username': username, 'email': email, 'password': password}), 200


@users.route('/login', methods=['POST'])
def login():
    print('Login handler')
    login_json = request.get_json()

    if not login_json:
        return jsonify({'error': 'Missing JSON'}), 400

    username = login_json.get('username')
    password = login_json.get('password')

    print("Trying to login user [%s] and password [%s]" % (username, password))

    # socketApp.emit('send_message', {
    #               'msg': 'Someone trying to login'}, broadcast=True)

    if not username:
        return jsonify({'error': 'Please enter a username'}), 400

    if not password:
        return jsonify({'error': 'Please enter a password'}), 400

    user = User.query.filter_by(
        username=username).first()

    if user is None:
        print("Could not find username %s" % (username))
        user = User.query.filter_by(
            email=username).first()
        if user is None:
            print("Could not find email %s" % (username))
            return jsonify({'error': 'Please check username and password'}), 401

    print("user is: %s" % (user))
    _hashedPassword = flask_bcrypt.generate_password_hash(password)

    if flask_bcrypt.check_password_hash(
            user.password, password) is False:
        print("Invalid passford for user %s" % (user.username))
        return jsonify({'error': 'Please check username and password'}), 401

    access_token = create_access_token(identity=user.username)

    return jsonify({'access_token': access_token}), 200


@users.route('/protected', methods=['GET'])
@jwt_required
def protected():
    claims = get_jwt_claims()
    print("claims are: ", claims)
    if claims.get('username') == 'test':
        return jsonify({'data': ['hi', 'it', 'works']}), 200
    return jsonify({'msg': 'No access for you!'}), 400


@users.route('/list')
def list():
    users = User.query.order_by(User.username).all()
    return jsonify(users)


@users.route('/delete', methods=['POST'])
@jwt_required
def delete():
    claims = get_jwt_claims()
    print("/delete claims are: ", claims)
    if claims is None:
        jsonify({'error': 'No valid auth'}), 401
    if claims.get('accountType') != 'admin':
        return jsonify({'msg': 'No access for you!'}), 400
    delete_json = request.get_json()

    if not delete_json:
        return jsonify({'error': 'Missing JSON'}), 400

    username = delete_json.get('username')
    print("Trying to delete user [%s] " % (
        username))
    user = User.query.filter_by(
        username=username).first()
    if user is None:
        print("User [%s] does not exist" % (
            username))
        return jsonify({'error': 'User does not exist'}), 401
    # User can be deleted
    db.session.delete(user)
    db.session.commit()
    return jsonify({'msg': "userdeleted", 'username': username}), 200
