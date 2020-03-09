import { useCallback, useState } from "react";
import { Janus } from "./useJanus/janus";

export const blobToBase64 = function(blob, callback) {
  console.log("Blob is: ", blob);
  var reader = new FileReader();
  reader.onload = function() {
    var dataUrl = reader.result;
    var base64 = dataUrl.split(",")[1];
    callback(base64);
  };
  reader.readAsDataURL(blob);
};

export const useCamera = () => {
  const [videoNode, setVideoNode] = useState(null);

  const [localStream, setLocalStream] = useState(null);

  const startCamera = useCallback(() => {
    return navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      setLocalStream(stream);
      if (videoNode !== null) {
        videoNode.srcObject = stream;
        console.log("Playing camera video");
        return videoNode.play();
      }
    });
  }, [videoNode]);

  const snapshotVideoRef = useCallback(
    node => {
      setVideoNode(node);
      if (node) {
        if (localStream !== null) {
          Janus.attachMediaStream(node, localStream);
          console.log("playing camera video");
          node.play();
        }
      }
    },
    [localStream]
  );

  const stopCamera = useCallback(() => {
    console.log("stopCamera - videoNode este: ", videoNode);
    if (videoNode !== null && videoNode.srcObject !== null) {
      videoNode.srcObject.getTracks().forEach(function(track) {
        track.stop();
      });
    }
  }, [videoNode]);

  const takeASnap = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (videoNode === null) {
        reject("Video node is null");
      }
      const canvas = document.createElement("canvas"); // create a canvas
      const ctx = canvas.getContext("2d"); // get its context
      canvas.width = videoNode.videoWidth; // set its size to the one of the video
      canvas.height = videoNode.videoHeight;
      ctx.drawImage(videoNode, 0, 0); // the video
      canvas.toBlob(resolve, "image/jpeg"); // request a Blob from the canvas
    });
  }, [videoNode]);

  return [snapshotVideoRef, startCamera, stopCamera, takeASnap];
};
