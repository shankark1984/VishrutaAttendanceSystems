
// script.js file
var empID = null;
var empName = null;
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
    // Function to check if employee exists
    async function checkEmployeeExists(empID) {
        console.log("Received empID: " + empID); // Log received empID

        try {
            const sendData = { emp_id: empID };
            console.log("Sending data:", sendData); // Log the data being sent

            const response = await fetch('http://127.0.0.1:5500//check_emp_exists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sendData)
            });

            console.log("Response received"); // Log when response is received

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log("Response data:", data); // Log the response data

            return data.exists ? data.employee_id : null;

        } catch (error) {
            console.error('Error checking employee:', error);
            return null;
        }
    }

    // If found your QR code
    async function onScanSuccess(decodeText, decodeResult) {
        var mystring = decodeText;
        var splits = mystring.split(",");

        if (splits[0] === "Site") {
            console.log(mystring);
            if (empID == null) {
                alert("First scan employee card");
                return;
            }
            document.getElementById("siteID").textContent = splits[1];
            document.getElementById("workOrderNo").textContent = splits[2];
        }

        if (splits[0] === "Emp") {
            empID = splits[1];
            empName = splits[2];

            // Check if the employee exists
            const existingEmpID = await checkEmployeeExists(empID);

            console.log("After Fx " + existingEmpID);

            if (existingEmpID) {
                console.log("After Fx " + existingEmpID);
                //empID = existingEmpID;
                document.getElementById("empID").textContent = empID;
                document.getElementById("empName").textContent = empName;
            } else {
                alert("EMPLOYEE NOT EXISTS");
                return;
            }
            currentdatetime = new Date().toLocaleString();
            document.getElementById("datetime").textContent = currentdatetime;
        }
    }

    let htmlscanner = new Html5QrcodeScanner(
        "my-qr-reader",
        { fps: 10, qrbox: 250 }
    );
    htmlscanner.render(onScanSuccess);
});