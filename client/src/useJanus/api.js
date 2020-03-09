import { Janus } from "./janus";

export const attachToPlugin = ({ session, opaqueId, callbacks }) => {
  return new Promise((resolve, reject) => {
    var videoRoomAPI = null;
    session.attach({
      plugin: "janus.plugin.videoroom",
      opaqueId: opaqueId,
      success: function(localPluginHandle) {
        videoRoomAPI = localPluginHandle;
        Janus.log(
          "Plugin attached! (" +
            localPluginHandle.getPlugin() +
            ", id=" +
            localPluginHandle.getId() +
            ")"
        );
        Janus.log("  -- This is a publisher/manager");
        resolve(localPluginHandle);
      },
      error: function(error) {
        Janus.error("  -- Error attaching plugin...", error);
        reject(error);
      },
      consentDialog: function(on) {
        Janus.debug("Consent dialog should be " + (on ? "on" : "off") + " now");
        //   if (on) {
        //     message.info({
        //       content: "Starting webcam",
        //       key: "webcamaccess"
        //     });
        //   } else {
        //     let consentModal = message.info({
        //       content: "Starting webcam",
        //       key: "webcamaccess"
        //     });
        //     consentModal();
        //   }
      },
      mediaState: function(medium, on) {
        Janus.log(
          "Janus " + (on ? "started" : "stopped") + " receiving our " + medium
        );
      },
      webrtcState: function(on) {
        Janus.log(
          "Janus says our WebRTC PeerConnection is " +
            (on ? "up" : "down") +
            " now"
        );
      },
      onmessage: function(msg, jsep) {
        Janus.debug(" ::: Got a message (publisher) :::");
        Janus.debug(msg);
        var event = msg["videoroom"];
        Janus.debug("Event: " + event);
        if (event !== undefined && event !== null) {
          if (event === "joined") {
            console.log("Event is joined!");
            // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
            callbacks.onRoomJoined && callbacks.onRoomJoined(msg);
          } else if (event === "destroyed") {
            // The room has been destroyed
            Janus.warn("The room has been destroyed!");
            callbacks.onRoomDestroyed && callbacks.onRoomDestroyed(msg["room"]);
          } else if (event === "event") {
            // Any new feed to attach to?
            if (msg["publishers"] !== undefined && msg["publishers"] !== null) {
              let list = msg["publishers"];
              Janus.debug("Got publishers:");
              Janus.debug(list);
              callbacks.onGotPublishers && callbacks.onGotPublishers(msg);
              // console.log("Publishers list: ", list);
              // setPublishersList(list);
            } else if (
              msg["joining"] !== undefined &&
              msg["joining"] !== null
            ) {
              // New publisher joined
              var joining = msg["joining"];
              Janus.log("Participant joined: " + joining.display);
              callbacks.onParticipantJoined &&
                callbacks.onParticipantJoined(msg);
            } else if (
              msg["leaving"] !== undefined &&
              msg["leaving"] !== null
            ) {
              // One of the publishers has gone away?
              // var leaving = msg["leaving"];
              // Janus.log("Publisher left: " + leaving);
              callbacks.onParticipantLeft && callbacks.onParticipantLeft(msg);
            } else if (
              msg["unpublished"] !== undefined &&
              msg["unpublished"] !== null
            ) {
              // One of the publishers has unpublished?
              var unpublished = msg["unpublished"];
              // Janus.log("Publisher left 2: " + unpublished);
              callbacks.onPublisherLeft &&
                callbacks.onPublisherLeft(unpublished);
              if (unpublished === "ok") {
                // That's us
                //videoRoomAPI.hangup();
                return;
              }
            } else if (msg["error"] !== undefined && msg["error"] !== null) {
              callbacks.onErrorEvent && callbacks.onErrorEvent(msg);
            }
          }
        }
        if (jsep !== undefined && jsep !== null) {
          Janus.debug("Handling SDP as well...");
          Janus.debug(jsep);
          videoRoomAPI.handleRemoteJsep({
            jsep: jsep
          });
        }
      },
      onlocalstream: function(stream) {
        Janus.debug(" ::: Got a local stream :::");
        callbacks.onLocalStream && callbacks.onLocalStream(stream);
      },
      onremotestream: function(stream) {
        console.log("Got remote stream: ", stream);
        // The publisher stream is sendonly, we don't expect anything here
      },
      oncleanup: function() {
        Janus.log(
          " ::: Got a cleanup notification: we are unpublished now :::"
        );
        callbacks.onPluginCleanup && callbacks.onPluginCleanup();
      }
    });
  });
};

export const createRoomAPI = (
  videoRoomAPI,
  description,
  numPublishers,
  notify_joining
) =>
  new Promise((resolve, reject) => {
    let localNumPublishers = numPublishers ? Number(numPublishers) : Number(10);
    let localNotifyJoining = notify_joining ? notify_joining : true;
    var create = {
      request: "create",
      description: description,
      publishers: localNumPublishers,
      notify_joining: localNotifyJoining
    };
    console.log("Creating room with params: ", create);
    videoRoomAPI.send({
      message: create,
      success: result => resolve(result)
    });
  });

export const destroyRoomAPI = (videoRoomAPI, roomId) =>
  new Promise((resolve, reject) => {
    var destroy = {
      request: "destroy",
      room: roomId
    };
    videoRoomAPI.send({
      message: destroy,
      success: result => {
        console.log("Destroy result: ", result);
        resolve(result);
      }
    });
  });

export const joinRoomAPI = (videoRoomAPI, roomNumber, username, userID) =>
  new Promise((resolve, reject) => {
    console.log(
      `Joining room: ${roomNumber} with username: ${username} and userID: ${userID}`,
      " - videoRoomAPI: ",
      videoRoomAPI
    );
    var register = {
      request: "join",
      ptype: "publisher",
      // close_pc only works for publishers
      // close_pc: false,
      room: roomNumber,
      id: userID,
      display: username
    };
    videoRoomAPI.send({
      message: register,
      success: params => {
        console.log("Sent join request for room: ", roomNumber);
        resolve();
      },
      error: msg => {
        console.log(
          "Sent join request failed for room: ",
          roomNumber,
          " - error: ",
          msg
        );
        reject(msg);
      }
    });
  });

export const kickFromRoomAPI = (videoRoomAPI, roomNumber, userID) =>
  new Promise((resolve, reject) => {
    console.log(
      `Kick participant from room: ${roomNumber} with userID: ${userID}`,
      " - videoRoomAPI: ",
      videoRoomAPI
    );
    var kick = {
      request: "kick",
      room: roomNumber,
      id: userID
    };
    videoRoomAPI.send({
      message: kick,
      success: params => {
        console.log(
          `Kick participant from room: ${roomNumber} with userID: ${userID} -> result: ` +
            JSON.stringify(params)
        );
        resolve();
      },
      error: msg => {
        console.log(
          "Sent kick request failed for room: ",
          roomNumber,
          " - error: ",
          msg
        );
        reject(msg);
      }
    });
  });

export const leaveRoomAPI = videoRoomAPI =>
  new Promise((resolve, reject) => {
    console.log("Leaving room");
    var leave = {
      request: "leave"
    };
    videoRoomAPI.send({
      message: leave,
      success: () => {
        console.log("Sent leave request");
        resolve();
      }
    });
  });

export const listParticipantsAPI = (videoRoomAPI, room) =>
  new Promise((resolve, reject) => {
    var list = {
      request: "listparticipants",
      room: room
    };
    videoRoomAPI.send({
      message: list,
      success: msg => {
        if (msg["error"] !== undefined && msg["error"] !== null) {
          reject(msg["error"]);
        } else {
          let participants = msg.participants;
          resolve(participants);
        }
      }
    });
  });

export const listRoomsAPI = videoRoomAPI =>
  new Promise((resolve, reject) => {
    var list = {
      request: "list"
    };

    videoRoomAPI.send({
      message: list,
      success: result => {
        let rooms = result.list.filter(
          current => current.room !== 1234 && current.room !== 5678
        );
        resolve(rooms);
      }
    });
  });

export const publishOwnFeedAPI = (videoRoomAPI, useAudio) =>
  new Promise((resolve, reject) => {
    // Publish our stream
    videoRoomAPI.createOffer({
      // Add data:true here if you want to publish datachannels as well
      media: {
        audioRecv: false,
        videoRecv: false,
        audioSend: useAudio,
        videoSend: true
      }, // Publishers are sendonly
      // // If you want to test simulcasting (Chrome and Firefox only), then
      // // pass a ?simulcast=true when opening this demo page: it will turn
      // // the following 'simulcast' property to pass to janus.js to true
      // simulcast: doSimulcast,
      // simulcast2: doSimulcast2,
      success: function(jsep) {
        Janus.debug("Got publisher SDP!");
        Janus.debug(jsep);
        var publish = { request: "configure", audio: useAudio, video: true };
        // You can force a specific codec to use when publishing by using the
        // audiocodec and videocodec properties, for instance:
        // 		publish["audiocodec"] = "opus"
        // to force Opus as the audio codec to use, or:
        // 		publish["videocodec"] = "vp9"
        // to force VP9 as the videocodec to use. In both case, though, forcing
        // a codec will only work if: (1) the codec is actually in the SDP (and
        // so the browser supports it), and (2) the codec is in the list of
        // allowed codecs in a room. With respect to the point (2) above,
        // refer to the text in janus.plugin.videoroom.cfg for more details
        videoRoomAPI.send({
          message: publish,
          jsep: jsep,
          success: msg => {
            console.log("Published succesful!");
            resolve();
          }
        });
      },
      error: function(error) {
        Janus.error("WebRTC error:", error);
        reject(error);
      }
    });
  });

export const unpublishOwnFeedAPI = videoRoomAPI =>
  new Promise((resolve, reject) => {
    var unpublish = {
      request: "unpublish"
    };
    videoRoomAPI.send({
      message: unpublish,
      success: () => {
        resolve();
      }
    });
  });
