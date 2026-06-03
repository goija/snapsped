var mid;
var properties;
var socket;
var pc;


function isWebrtcSupported() {
    return ('RTCPeerConnection' in window) && ("mediaDevices" in navigator) && ("getUserMedia" in navigator.mediaDevices);
};

function getUrlParam(name){
    const queryString = window.location.search;
    console.log(queryString);
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get(name);
}

function sendMessage(to,from,type,data){
    var messageJ = {
        to:to,
        from:from,
        type:type,
        sdp:data
    };

    var message = JSON.stringify(messageJ);
    if (socket.readyState == 1 ){
        console.log("sending ", message);
        socket.send(message);
    } else {
        console.log("not sending \n"+ message+ "\n because websocket readyState ="+socket.readyState);
        $("#status").text("Server Problem?");
    }
}

function stopCall() {
    var dur = Date.now() - startRecTime;
    $("#status").text("Call ended.");
    window.location = "thanks.html?dur=" + dur;
}



function sendAndRetryMessage(to,from,type,data, statusText ){
    var count = 0;
    sendMessage(to,from,type,data);
    $("#status").text(statusText);
    return window.setInterval( () => {
        count++;
        sendMessage(to,from,type,data);
        var lstatusText = statusText + " - retry "+count+".";
        $("#status").text(lstatusText);
    },5000);
}



function loadProps() {
    var that = {configUrl: "pipeconfig.json"};
    var promise = new Promise(function (resolve, reject) {
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', that.configUrl, true);
        xobj.onreadystatechange = function () {
            if (xobj.readyState == 4 && xobj.status == "200") {
                var pipeconfig = JSON.parse(xobj.responseText);
                console.log("Config is " + xobj.responseText);
                if (pipeconfig.ice) {
                    that.configuration = pipeconfig.ice;
                    console.log("Set ICE params " + JSON.stringify(that.configuration));
                }
                if (pipeconfig.wsurl) {
                    that.wsurl = pipeconfig.wsurl;
                    console.log("Set wsurl " + JSON.stringify(that.wsurl));
                }
                resolve(that);
            }
        };
        xobj.send(null);
    });
    return promise;
}

async function startPipe(){
    mid = localStorage['showId'];
    //var act = $("#action");
    if (!mid) {
        var array = new Uint32Array(8);
        window.crypto.getRandomValues(array);
        var hexCodes = [];
        for (var i = 0; i < array.length; i ++ ){
            // Using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
            var value = array[i];
            // toString(16) will give the hex representation of the number without padding
            var stringValue = value.toString(16);
            // We use concatenation and slice for padding
            var padding = '00000000';
            var paddedValue = (padding + stringValue).slice(-padding.length)
            hexCodes.push(paddedValue);
        }
        mid = hexCodes.join("").toUpperCase();
        console.log("mid =", mid);
        localStorage['showId'] = mid;
    }
    properties = await loadProps();
    socket = new WebSocket( properties.wsurl + mid);
    socket.onmessage = messageDeal;
    socket.onopen = (_) => {
        setupRTC();
        startUX();
    }
}

function setupRTC(){
    pc = new RTCPeerConnection(properties.configuration, null);
    console.log("created peer connection");

    pc.onicecandidate = (e) => {
        console.log("local ice candidate", e.candidate);
        if (e.candidate != null) {
            if (pc.signalingState == 'stable') {
                sendMessage(fid, nid, "candidate", e.candidate.candidate);
            } else {
                console.log("stashing ice candidate");
                lcandyStash.push(e.candidate);
            }
        }
    };
    pc.oniceconnectionstatechange = (e) => {
        console.log("ice state is changed", pc.iceConnectionState);
        $("#status").text(pc.iceConnectionState+" connection.");

        /*
         "new"	The ICE agent is gathering addresses or is waiting to be given remote candidates through calls to RTCPeerConnection.addIceCandidate() (or both).
         "checking"	The ICE agent has been given one or more remote candidates and is checking pairs of local and remote candidates against one another to try to find a compatible match, but has not yet found a pair which will allow the peer connection to be made. It's possible that gathering of candidates is also still underway.
         "connected"	A usable pairing of local and remote candidates has been found for all components of the connection, and the connection has been established. It's possible that gathering is still underway, and it's also possible that the ICE agent is still checking candidates against one another looking for a better connection to use.
         "completed"	The ICE agent has finished gathering candidates, has checked all pairs against one another, and has found a connection for all components.
         "failed"	The ICE candidate has checked all candidates pairs against one another and has failed to find compatible matches for all components of the connection. It is, however, possible that the ICE agent did find compatible connections for some components.
         "disconnected"	Checks to ensure that components are still connected failed for at least one component of the RTCPeerConnection. This is a less stringent test than "failed" and may trigger intermittently and resolve just as spontaneously on less reliable networks, or during temporary disconnections. When the problem resolves, the connection may return to the "connected" state.
         "closed"
         */
        if (pc.iceConnectionState === "connected"){
            window.onbeforeunload = function() {
                return pc.iceConnectionState=="connected" ? "If you leave this page you will end the call." : null;
            }
            socket.close();
        }
    };



    // use this to determine the state of the 'hangup' button and send any candidates we found quickly
    pc.onsignalingstatechange = (evt) => {
        console.log("signalling state is ", pc.signalingState);
        if (pc.signalingState == 'stable') {
            var can;
            while (can = lcandyStash.pop()) {
                console.log("popping candidate off stash")
                sendMessage(fid, nid, "candidate", can.candidate);
            }
            window.onbeforeunload = function() {
                return pc.iceConnectionState=="connected" ? "If you leave this page you will end the call." : null;
            }
        }
    };
}
var lcandyStash = [];
var rcandyStash = [];
function loaded(){

    if (isWebrtcSupported()) {
        console.log("I see webRTC !");
        $("#status").text("Waiting for server connection");
        startPipe();
    } else {
        console.log("I don't see webRTC !");
        $("#status").text("Dont have webRTC available ");
        $('#nowebrtc').modal('show');
    }
}
