var nid;
var urltxt;
var fid;


function shareURL() {
    let shareData = {
        title: "test client URL",
        text: "Please click this link to test setup time",
        url: urltxt,
    }
    if (!navigator.canShare) {
        console.log("navigator.canShare() not supported.");
    } else if (navigator.canShare(shareData)) {
        console.log("navigator.canShare() supported. We can use navigator.share() to send the data.");
        navigator.share(shareData).catch((err) => {
            console.log("cant share because " + err)
        });
    } else {
        console.log("Specified data cannot be shared.");
    }
    console.log("share url is " + urltxt);
}

function startUX() {
    nid = mid;
    $("#role").text("Server");
    $("#status").text("Connected");
    urltxt = window.location.href.replace("server.html", "client.html") + "?id=" + mid;
    let p1 = document.getElementById("P1");
    if (!navigator.canShare) {
        console.log("navigator.canShare() not supported.");
        p1.innerText = "Share this link with your guests. " + urltxt
    } else {
        p1.innerHTML = "Click <button onclick='shareURL()' id='shareURL' class='btn btn-danger'>Share</button> to send link to guests. "
        shared();
    }

}

function shared() {
    pc.ondatachannel = (e) => {
        let tick = Date.now();
        pc.createDataChannel(""+tick);
        $("#status").text("client created datachannel " + e.channel.label);
    }
    console.log("ready for offer");
    $("#status").text("Waiting for guests.");
}

function messageDeal(event) {
    let lines = event.data.split("\n");
    lines.forEach((line) => {
        var data = JSON.parse(line);
        console.log("message data is ", line);
        if (data.to != nid) {
            alert("message mixup");
        }
        switch (data.type) {
            case "offer":
                fid = data.from;
                pc.setRemoteDescription(data)
                    .then(_ => {
                        pc.createAnswer().then(ans => {
                            pc.setLocalDescription(ans).then(_ =>
                                sendMessage(fid, nid, "answer", ans.sdp)
                            )
                        });
                        $("#status").text("Trying to connect call");
                    })
                    .catch(e => console.log("set Remote answer error", e));

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






