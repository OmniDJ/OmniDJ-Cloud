import { useState, useEffect, useRef, useCallback } from "react";
import { Janus } from "./janus";

import { Modal } from "antd";

const attachToPlugin = ({
  session,
  id,
  myPrivateId,
  opaqueId,
  video_codec,
  currentRoom,
  callbacks
}) => {
  return new Promise((resolve, reject) => {
    var videoRoomAPI = null;
    session.attach({
      plugin: "janus.plugin.videoroom",
      opaqueId: opaqueId,
      success: function(localPluginHandle) {
        videoRoomAPI = localPluginHandle;
        videoRoomAPI.simulcastStarted = false;
        Janus.log(
          "Plugin attached! (" +
            videoRoomAPI.getPlugin() +
            ", id=" +
            videoRoomAPI.getId() +
            ")"
        );
        Janus.log("  -- This is a subscriber");
        resolve(localPluginHandle);
        // We wait for the plugin to send us an offer
        var subscribe = {
          request: "join",
          room: currentRoom,
          ptype: "subscriber",
          feed: id,
          private_id: myPrivateId
        };
        // In case you don't want to receive audio, video or data, even if the
        // publisher is sending them, set the 'offer_audio', 'offer_video' or
        // 'offer_data' properties to false (they're true by default), e.g.:
        // 		subscribe["offer_video"] = false;
        // For example, if the publisher is VP8 and this is Safari, let's avoid video
        if (
          Janus.webRTCAdapter.browserDetails.browser === "safari" &&
          (video_codec === "vp9" || (video_codec === "vp8" && !Janus.safariVp8))
        ) {
          if (video_codec) video_codec = video_codec.toUpperCase();
          Modal.warning({
            content:
              "Publisher is using " +
              video_codec +
              ", but Safari doesn't support it: disabling video"
          });
          subscribe["offer_video"] = false;
        }
        videoRoomAPI.videoCodec = video_codec;
        videoRoomAPI.send({ message: subscribe });
      },
      error: function(error) {
        Janus.error("  -- Error attaching plugin...", error);
        reject(error);
      },
      onmessage: function(msg, jsep) {
        Janus.debug(" ::: Got a message (subscriber) :::");
        Janus.debug(msg);
        var event = msg["videoroom"];
        Janus.debug("Event: " + event);
        if (msg["error"] !== undefined && msg["error"] !== null) {
          callbacks.onErrorEvent && callbacks.onErrorEvent(msg);
        } else if (event !== undefined && event != null) {
          if (event === "attached") {
            // Subscriber created and attached
            console.log("Username for video is: ", msg["display"]);
            console.log("Id for video is: ", msg["id"]);
            //TODO: indicate that the video is loading - show spinner
            Janus.log(
              "Successfully attached to feed " +
                msg["id"] +
                " (" +
                msg["display"] +
                ") in room " +
                msg["room"]
            );
            callbacks.onAttachedToFeed && callbacks.onAttachedToFeed(msg);
          } else if (event === "event") {
            // Check if we got an event on a simulcast-related event from this publisher
            var substream = msg["substream"];
            var temporal = msg["temporal"];
            if (
              (substream !== null && substream !== undefined) ||
              (temporal !== null && temporal !== undefined)
            ) {
              if (!videoRoomAPI.simulcastStarted) {
                videoRoomAPI.simulcastStarted = true;
                console.log("Simulcast started");
                //TODO: Add simulcast buttons
                //   addSimulcastButtons(
                //     videoRoomAPI.rfindex,
                //     videoRoomAPI.videoCodec === "vp8" ||
                //       videoRoomAPI.videoCodec === "h264"
                //   );
              }
              // We just received notice that there's been a switch, update the buttons
              //TODO: Add simulcast buttons
              // updateSimulcastButtons(videoRoomAPI.rfindex, substream, temporal);
            }
          } else {
            // What has just happened?
          }
        }
        if (jsep !== undefined && jsep !== null) {
          Janus.debug("Handling SDP as well...");
          Janus.debug(jsep);
          // Answer and attach
          videoRoomAPI.createAnswer({
            jsep: jsep,
            // Add data:true here if you want to subscribe to datachannels as well
            // (obviously only works if the publisher offered them in the first place)
            media: { audioSend: false, videoSend: false }, // We want recvonly audio/video
            success: function(jsep) {
              Janus.debug("Got SDP!");
              Janus.debug(jsep);
              // Request the remote feed
              var body = { request: "start", room: currentRoom };
              videoRoomAPI.send({ message: body, jsep: jsep });
            },
            error: function(error) {
              Janus.error("WebRTC error:", error);
              callbacks.onErrorEvent &&
                callbacks.onErrorEvent(
                  "WebRTC error: " + JSON.stringify(error)
                );
            }
          });
        }
      },
      webrtcState: function(on) {
        Janus.log(
          "useRemoteFeed -> Janus says this WebRTC PeerConnection is " +
            (on ? "up" : "down") +
            " now"
        );
      },
      onlocalstream: function(stream) {
        // The subscriber stream is recvonly, we don't expect anything here
      },
      onremotestream: function(stream) {
        console.log("useRemoteFeed - got remote stream: ", stream);
        //TODO: Show spinner

        var videoTracks = stream.getVideoTracks();
        if (
          videoTracks === null ||
          videoTracks === undefined ||
          videoTracks.length === 0
        ) {
          console.log("No remote video available");
          // No remote video
          callbacks.onErrorEvent &&
            callbacks.onErrorEvent("No remote video available");
        } else {
          console.log("we have remote video! yey!");
          callbacks.onRemoteStream && callbacks.onRemoteStream(stream);
        }
      },
      oncleanup: function() {
        Janus.log(
          " ::: Got a cleanup notification (remote feed " + id + ") :::"
        );
        console.log("We should do cleanup");
      }
    });
  });
};

export const useRemoteFeed = props => {
  const { publisher, connection, currentRoom, myPrivateId } = props;
  const { id, video_codec } = publisher;
  const [videoRoomAPI, setVideoRoomAPI] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [user, setUser] = useState(null);

  const initialized = useRef(false);

  const onErrorEvent = useCallback(error => {
    console.error("Encountered error: ", error);
  }, []);

  const onRemoteStream = useCallback(stream => {
    console.log("Got remote stream: ", stream);
    setRemoteStream(stream);
  }, []);

  const onAttachedToFeed = useCallback(msg => {
    console.log("Attached to feed: ", msg);
    setUser({ username: msg["display"], id: msg["id"] });
  }, []);

  const [pluginCBs] = useState(() => {
    return {
      onAttachedToFeed,
      onRemoteStream,
      onErrorEvent
    };
  });

  useEffect(() => {
    console.log("useRemoteFeed -> onRemoteStream changed: ", onRemoteStream);
    pluginCBs.onRemoteStream = onRemoteStream;
  }, [onRemoteStream]);

  useEffect(() => {
    console.log(
      "useRemoteFeed -> onAttachedToFeed changed: ",
      onAttachedToFeed
    );
    pluginCBs.onAttachedToFeed = onAttachedToFeed;
  }, [onAttachedToFeed]);

  const initializeStream = useCallback(
    (connection, pluginCallbacks) => {
      console.log("initializeStream");
      attachToPlugin({
        session: connection.session,
        id: id,
        myPrivateId: myPrivateId,
        video_codec: video_codec,
        currentRoom: currentRoom,
        opaqueId: connection.opaqueId,
        callbacks: pluginCallbacks
      })
        .then(pluginHandle => {
          console.log("useRemoteFeed -> onPluginAttached:  ", pluginHandle);
          setVideoRoomAPI(pluginHandle);
        })
        .catch(error => {
          console.log("useRemoteFeed -> error attaching plugin: ", error);
        });
    },
    [currentRoom, id, myPrivateId, video_codec]
  );

  if (!initialized.current) {
    initializeStream(connection, pluginCBs);
    initialized.current = true;
  }

  return [videoRoomAPI, remoteStream, user];
};
