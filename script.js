
// script.js file
var infoSplitA = null;
var infoSplitB = null;
var siteID = null;
var workOrderNo = null;
var currentdatetime = null;
var matchEmpID = null;

function domReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(fn, 1000);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

domReady(function () {

    // If found you qr code
    function onScanSuccess(decodeText, decodeResult) {

        //alert("Attendance Successfully: \n" + decodeText, decodeResult);
        var mystring = decodeText;
        var splits = mystring.split(",");

        if (splits[0] === "Site") {
            if (infoSplitA == null) {
                alert("First scan employee card");
                return;
            }
            siteID = splits[1];
            workOrderNo = splits[2];
            //alert("Site");
        }

        if (splits[0] === "Emp") {
            // if (splits[1] !== matchEmpID) {
            //     // alert("No matching employee ID found");
            //     // return;
            // }
            infoSplitA = splits[1];
            infoSplitB = splits[2];
            //alert("Emp");
        }
            currentdatetime = new Date().toLocaleString();

            document.getElementById("empID").textContent = infoSplitA;
            document.getElementById("empName").textContent = infoSplitB;
            document.getElementById("siteID").textContent = siteID;
            document.getElementById("workOrderNo").textContent = workOrderNo;
            document.getElementById("datetime").textContent = currentdatetime;
        
    }

    let htmlscanner = new Html5QrcodeScanner(
        "my-qr-reader",
        { fps: 10, qrbox: 250 }
    );
    htmlscanner.render(onScanSuccess);
});
