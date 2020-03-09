from application import socketApp
from flask_socketio import emit, join_room, leave_room
from flask import request


@socketApp.on('connect')
def connected():
    print("Socket session %s connected" % (request.sid))


@socketApp.on('disconnect')
def connected():
    print("Socket session %s disconnected" % (request.sid))


@socketApp.on('message')
def handle_message(msg):
    action = msg.get('action')
    # print("request is" % (request))
    print('received action: %s from %s' % (action, request.sid))
    if action == "join":
        roomID = msg.get('room')
        user_id = msg.get('user_id')
        user_name = msg.get('user_name')
        print('%s with id %s wants to join room: %s' %
              (user_name, user_id, roomID))
        join_room(roomID)
    if action == "leave":
        roomID = msg.get('room')
        user_id = msg.get('user_id')
        user_name = msg.get('user_name')
        print('%s with id %s wants to leave room: %s' %
              (user_name, user_id, roomID))
        leave_room(roomID)
