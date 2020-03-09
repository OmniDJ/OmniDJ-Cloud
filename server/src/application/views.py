from flask import jsonify, request
from application import app, socketApp


@app.route('/send_image', methods=['POST'])
def send_image():
    image_json = request.get_json()
    image = image_json.get('image')
    user_id = image_json.get('user_id')
    user_room = image_json.get('user_room')
    user_name = image_json.get('user_name')

    print("Got image for user with id [%s] and name [%s] with room_id [%s]" % (
        user_id, user_name, user_room))

    socketApp.emit('got_user_image', {
                   'user_id': user_id,
                   'user_name': user_name,
                   'image': image
                   }, broadcast=True, room=user_room)

    return jsonify({'msg': "imageuploaded", 'user_id': user_id, 'user_room': user_room, 'user_name': user_name}), 200


@app.route('/')
def home():
    return "This is OmniDJ", 200


# @app.route('/config', methods=['POST'])
# def config():
#     config_json = request.get_json()
#     event = config_json.get('event')
#     user_id = config_json.get('user_id')
#     user_room = config_json.get('user_room')
#     user_name = config_json.get('user_name')

#     print("Got config event [%s] for user with id [%s] and name [%s] with room_id [%s]" % (
#         event, user_id, user_name, user_room))
#     return jsonify({'msg': "receivedEvent"}), 200
