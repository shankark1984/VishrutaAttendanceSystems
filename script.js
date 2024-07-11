
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

    // Function to check if employee exists
    async function checkEmployeeExists(empID) {
        try {
            const response = await fetch('/check_emp_exists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ emp_id: empID })
            });
            const data = await response.json();
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
            if (infoSplitA == null) {
                alert("First scan employee card");
                return;
            }
            siteID = splits[1];
            workOrderNo = splits[2];
        }

        if (splits[0] === "Emp") {
            const empID = splits[1];
            const empName = splits[2];

            // Check if the employee exists
            const existingEmpID = await checkEmployeeExists(empID);

            if (existingEmpID) {
                infoSplitA = existingEmpID;
                infoSplitB = empName;
                currentdatetime = new Date().toLocaleString();

                document.getElementById("empID").textContent = infoSplitA;
                document.getElementById("empName").textContent = infoSplitB;
                document.getElementById("siteID").textContent = siteID;
                document.getElementById("workOrderNo").textContent = workOrderNo;
                document.getElementById("datetime").textContent = currentdatetime;
            } else {
                alert("EMPLOYEE NOT EXISTS");
                return;
            }
        }
    }

    let htmlscanner = new Html5QrcodeScanner(
        "my-qr-reader",
        { fps: 10, qrbox: 250 }
    );
    htmlscanner.render(onScanSuccess);
});

