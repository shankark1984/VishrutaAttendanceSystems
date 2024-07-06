// script.js file

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
		var infoSplitA= splits[0];
		var infoSplitB= splits[1];
		//alert(splits[0]); // output: this

		//document.getElementById("Info1").textContent = decodeText, decodeResult;
		document.getElementById("Info1").textContent = infoSplitA;
		document.getElementById("Info2").textContent = infoSplitB;
		document.getElementById("srtLatitude").textContent=position.coords.latitude;
		document.getElementById("srtLongitude").textContent=position.coords.longitude;
	}

	let htmlscanner = new Html5QrcodeScanner(
		"my-qr-reader",
		{ fps: 10, qrbos: 250 }
	);
	htmlscanner.render(onScanSuccess);

	function getLocation() {
		if (navigator.geolocation) {
			navigator.geolocation.watchPosition(showPosition);
		} else {
			x.innerHTML = "Geolocation is not supported by this browser.";
		}
	}

	function showPosition(position) {



		x.innerHTML = "Latitude: " + position.coords.latitude +
			" Longitude: " + position.coords.longitude;
	}
});

// const x = document.getElementById("demo");

//         function getLocation() {
//             if (navigator.geolocation) {
//                 navigator.geolocation.watchPosition(showPosition);
//             } else {
//                 x.innerHTML = "Geolocation is not supported by this browser.";
//             }
//         }

//         function showPosition(position) {



//             x.innerHTML = "Latitude: " + position.coords.latitude +
//                 " Longitude: " + position.coords.longitude;
//         }
