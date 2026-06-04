var pc;
var offerSender;
var startRecTime;
var nid;
var fid;

function startUX() {
    nid = mid;
    fid = getUrlParam("id");
    $("#role").text("client");
    $("#status").text("Waiting for connection");
    setupRTC();
    pc.onnegotiationneeded = function () {
        pc.createOffer().then(function (desc) {
            pc.setLocalDescription(desc).then(function () {
                console.log("Set Local description");
                offerSender = sendAndRetryMessage(fid, nid, desc.type, desc.sdp, "Trying to connect call")
            })
        }).catch(function (error) {
            console.log("Set Local description error");
        });
    }
    let p1 = document.getElementById("P1");
    p1.innerHTML = "Click <button onclick='startCall()' id='doit' class='btn btn-danger'>Test</button> to conduct a test. "

}

// called when webRTC presents us with a fresh remote audio/video stream


// configure local peerconnection and handlers

function messageDeal(event) {
    console.log("message is ", event.data);
    let lines = event.data.split("\n");
    lines.forEach((line) => {
        let data = JSON.parse(line);
        console.log("message data is ", data);
        if (data.to != nid) {
            alert("message mixup");
        }
        switch (data.type) {
            case "answer":
                if (pc.signalingState == 'have-local-offer') {
                    pc.setRemoteDescription(data)
                        .then(_ => {
                            if (offerSender) {
                                window.clearInterval(offerSender);
                            }
                            $("#status").text("Trying to connect call");
                            $("#action").text("hangup");
                        })
                        .catch(e => console.log("set Remote answer error", e));
                } else {
                    $("#status").text("Peerconnection state is wrong " + pc.signalingState);
                }
                break;
            case "candidate":
                var jc = {
                    sdpMLineIndex: 0,
                    candidate: data.sdp
                };
                console.log("adding candidate ", jc);
                var nc = new RTCIceCandidate(jc);
                pc.addIceCandidate(nc)
                    .then(_ => console.log("added remote candidate"))
                    .catch((e) => console.log("couldn't add candidate ", e));
                break;
        }
    });
}


function startCall() {
    let start = Date.now();
    pc.createDataChannel(""+start);
    $("#status").text("client created datachannel ");
    pc.ondatachannel = (e) => {
        let stop = Date.now();
        $("#status").text("reply in " + (stop -start)+" ms");
    }
}


