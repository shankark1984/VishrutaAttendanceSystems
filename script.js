// script.js file
var infoSplitA=null;
var infoSplitB=null;
var siteID=null;
var workOrderNo=null;

function domReady(fn) {
	if (
		document.readyState === "complete" ||
		document.readyState === "interactive"
	) {
		setTimeout(fn, 1000);
	} else {
		document.addEventListener("DOMContentLoaded", fn);
	}
}

domReady(function () {

	// If found you qr code
	function onScanSuccess(decodeText, decodeResult) {

		//alert("Attendance Successfully: \n" + decodeText, decodeResult);
		var mystring = decodeText, decodeResult;
		var splits = mystring.split(",");

		 if (splits[0] == "Site") {
			if(infoSplitA==null){
				alert("First scan employee card");
				return;
			}
			siteID = splits[1];
			workOrderNo = splits[2];
			alert("Site");
		} else {
			infoSplitA = splits[0];
			infoSplitB = splits[1];
			alert("Emp");
		}

		//alert(splits[0]); // output: this

		//document.getElementById("Info1").textContent = decodeText, decodeResult;
		document.getElementById("Info1").textContent = infoSplitA;
		document.getElementById("Info2").textContent = infoSplitB;
		document.getElementById("siteID").textContent = siteID;
		document.getElementById("workOrderNo").textContent = workOrderNo;

	}

	let htmlscanner = new Html5QrcodeScanner(
		"my-qr-reader",
		{ fps: 10, qrbos: 250 }
	);
	htmlscanner.render(onScanSuccess);
});

