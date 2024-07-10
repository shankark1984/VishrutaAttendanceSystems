const express = require('express');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3000;
const { Client } = require('pg');
const { CommitStats } = require('git');
const multer = require('multer');
//const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { resolve } = require('path');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const { join } = require('path');
const os = require('os');
const axios = require('axios');
const { copyStringIntoBuffer, componentsToColor } = require('pdf-lib');
const xlsx = require('xlsx');
const { ConfiguredPluginListInstance } = require('twilio/lib/rest/flexApi/v1/pluginConfiguration/configuredPlugin');
const { CompositionListInstance } = require('twilio/lib/rest/video/v1/composition');
const { ContentContextImpl } = require('twilio/lib/rest/content/v1/content');
//const pdf = require('pdf-lib');
const { error } = require('console');
const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLibDocument } = require('pdf-lib');
//const { PDFDocument1 } = require('pdf-lib');
const { convert } = require('docx-pdf');
//const bodyParser = require('body-parser');
const mammoth = require('mammoth');
const pdf = require('html-pdf');

app.use(cors());


const dbConfig = {
    user: 'default',
    host: 'ep-polished-hall-07857143-pooler.us-east-1.postgres.vercel-storage.com',
    database: 'verceldb',
    password: 'iMbCu7NFrWR3',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
};

const client = new Client(dbConfig);
client.connect();

//Global Variables
let isProcessing = false; // Initialize processing flag

//const port = 3000;
//const os = require('os');

function getCurrentIPAddress() {
    const interfaces = os.networkInterfaces();
    let currentIPAddress;

    // Iterate through network interfaces
    Object.keys(interfaces).forEach((interfaceName) => {
        interfaces[interfaceName].forEach((interfaceInfo) => {
            // Skip over non-IPv4 addresses and loopback interface
            if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
                currentIPAddress = interfaceInfo.address;
            }
        });
    });

    return currentIPAddress;
}

// Example usage:
const ipAddress = getCurrentIPAddress();
console.log('Current IP Address:', ipAddress);

//const ipAddress = '192.168.0.108'; // Replace this with the actual IP address of the server system



// app.listen(port, ipAddress, () => {
//     console.log(`Server is listening at http://${ipAddress}:${port}`);
// });
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});


app.use(express.json());
///////////////////////////////////////////////////////////////////////////////////
//value round off function
function customRound(num) {
    if (num < 0) {
        return -customRound(-num);
    }
    var intPart = Math.floor(num);
    var fracPart = num - intPart;
    if (fracPart < 0.50) {
        return intPart;
    } else {
        return Math.ceil(num);
    }
}
//////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// API route to store contractor details
app.post('/contractors', async (req, res) => {
    const {
        name,
        contractor_type,
    } = req.body;

    try {
        // Check if the contractor name already exists in the database
        const checkQuery = `SELECT contractor_name FROM contractor WHERE contractor_name = $1`;
        const checkResult = await client.query(checkQuery, [name]);

        if (checkResult.rows.length > 0) {
            // If the contractor name already exists, send a message indicating it
            console.log('Contractor name already exists');
            res.status(409).json({ error: 'Contractor name already exists' });
            return;
        }

        // Insert the contractor details into the database
        const insertQuery = `INSERT INTO contractor (contractor_name, contractor_type)
                             VALUES ($1, $2)`;
        const insertValues = [name, contractor_type];
        await client.query(insertQuery, insertValues);

        console.log('Contractor details added successfully');
        res.status(201).json({ message: 'Contractor details added successfully' });
    } catch (err) {
        console.error('Error inserting contractor details:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////
// Placeholder function to get the last employee ID from the database
async function getLastEmployeeIdFromDatabase() {
    try {
        // Execute SQL query to retrieve the highest employee ID
        const query = 'SELECT id FROM employee ORDER BY id DESC LIMIT 1';
        const result = await client.query(query);

        // If there are no records in the table, return null
        if (result.rows.length === 0) {
            return null;
        }

        // Extract the last employee ID from the query result
        const lastEmployeeId = result.rows[0].id;

        return lastEmployeeId;
    } catch (error) {
        console.error('Error retrieving last employee ID:', error);
        throw error; // Propagate the error
    }
}

// Function to generate the next employee ID based on the last one
function generateNextEmployeeId(lastEmployeeId) {
    if (!lastEmployeeId) {
        // If no previous ID found, start from C001
        return 'C001';
    } else {
        // Extract numeric part and increment
        const numericPart = parseInt(lastEmployeeId.slice(1)) + 1;
        // Pad the numeric part with leading zeros
        const paddedNumericPart = String(numericPart).padStart(3, '0');
        // Combine with the prefix
        return 'C' + paddedNumericPart;
    }
}
//////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////
// Function to calculate salary components for workmen statutory
async function calculateSalaryComponentsStatutory(employeename, gross_salary, salarychangestatus, monthyear) {
    let grossSalary = gross_salary;
    //console.log("gross_salary from statutory", grossSalary);
    //console.log("employee name", employeename);
    const basicDA = 17862;
    let hra = 0;
    let foodAllowance = 0;
    let siteAllowance = 0;
    let maxHRA = 7138;
    let MaxFoodAllowance = 3000;
    const minGrossSalary = 21000;
    // Check if gross_salary is a valid number
    if (isNaN(gross_salary) || gross_salary <= 0) {
        throw new Error('Invalid gross_salary value');
    }

    if (gross_salary <= minGrossSalary) {
        hra = 3138;
    } else {
        hra = Math.min(maxHRA, gross_salary - basicDA);
        foodAllowance = Math.min(MaxFoodAllowance, gross_salary - basicDA - hra);
        siteAllowance = Math.max(0, gross_salary - basicDA - hra - foodAllowance);
    }
    grossSalary = basicDA + hra + foodAllowance + siteAllowance;
    const weekday_ot_price = customRound(grossSalary / 26 / 8 * 2);
    const sunday_ot_price = customRound(grossSalary / 26 / 8 * 2);
    const mobile_allowance = 0;


    const checkexist = `select employeename from employeefixedwagestatutory where employeename = $1`;
    const checkexistresult = await client.query(checkexist, [employeename]);

    if (checkexistresult.rows.length === 0) {
        const insertquery = `INSERT INTO employeefixedwagestatutory (employeename, basic_da, hra, 
        food_allowance, site_allowancce, weekday_ot_price, sunday_ot_price, grossalary, date)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`;

        const values = [
            employeename,
            basicDA,
            hra,
            foodAllowance,
            siteAllowance,
            weekday_ot_price,
            sunday_ot_price,
            grossSalary,
            new Date() // Assuming you're using Node.js, this generates the current date
        ];

        // Assuming `client` is your PostgreSQL client
        await client.query(insertquery, values);
    }
    else {
        if (salarychangestatus === "BOTH" || salarychangestatus === "MAINSALARY") {
            const checkEmpStatusQuery = `SELECT status FROM workingdata WHERE employeename = $1 AND monthyear = $2`;
            const checkEmpStatusResult = await client.query(checkEmpStatusQuery, [employeename, monthyear]);

            const status = checkEmpStatusResult.rows[0]?.status; // Using optional chaining to safely access status

            if (status !== 'FREEZED') {
                const updateQuery = `UPDATE employeefixedwagestatutory SET basic_da = $1, hra = $2, 
                    food_allowance = $3, site_allowancce = $4, weekday_ot_price = $5, sunday_ot_price = $6, grossalary = $7, date = $8 
                    WHERE employeename = $9`;

                const values = [
                    basicDA,
                    hra,
                    foodAllowance,
                    siteAllowance,
                    weekday_ot_price,
                    sunday_ot_price,
                    grossSalary,
                    new Date(),
                    employeename
                ];

                await client.query(updateQuery, values);
            }
        }

        if (salarychangestatus === "BOTH" || salarychangestatus === "MONTH") {
            const updateWorkingDataQuery = `UPDATE workingdata 
                                            SET statutory_fixed_basic_da = $1, 
                                                statutory_fixed_hra = $2, 
                                                statutory_fixed_food_allowance = $3, 
                                                statutory_fixed_site_allowance = $4, 
                                                statutory_fixed_mobile_allowance = $5, 
                                                statutory_fixed_gross_salary = $6 
                                            WHERE employeename = $7 AND monthyear = $8 AND status != $9`;

            const workingValues = [
                basicDA,
                hra,
                foodAllowance,
                siteAllowance,
                mobile_allowance,
                gross_salary,
                employeename,
                monthyear,
                'FREEZED' // Assuming the status should be updated to 'WORKING'
            ];

            await client.query(updateWorkingDataQuery, workingValues);
        }


    }
}
///////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////
// Function to calculate salary components for workmen reference
async function calculateSalaryComponentsReference(employeename, gross_salary, salarychangestatus, monthyear) {
    let basicDA = 17862;
    let hra = 0;
    let foodAllowance = 0;
    let siteAllowance = 0;
    let maxHRA = 7138;
    let MaxFoodAllowance = 3000;

    //const minGrossSalary = 21000;

    //console.log("test1");
    basicDA = Math.min(basicDA, gross_salary);
    hra = Math.min(maxHRA, gross_salary - basicDA);
    //console.log("HRA",hra);
    //console.log("gross salary",grossSalary);
    foodAllowance = Math.min(MaxFoodAllowance, gross_salary - basicDA - hra);
    siteAllowance = Math.max(0, gross_salary - basicDA - hra - foodAllowance);

    const getdetails = `SELECT working_hours_day, weekday_ot_type, sunday_ot_type FROM employee WHERE employeename = $1`;
    const getdetailsresult = await client.query(getdetails, [employeename]);

    const working_hours_day = getdetailsresult.rows[0].working_hours_day;
    const weekday_ot_type = getdetailsresult.rows[0].weekday_ot_type;
    const sunday_ot_type = getdetailsresult.rows[0].sunday_ot_type;

    const weekday_ot_price = customRound(gross_salary / 26 / working_hours_day * weekday_ot_type);
    const sunday_ot_price = customRound(gross_salary / 26 / working_hours_day * sunday_ot_type);
    const mobile_allowance = 0;

    const checkexist = `select employeename from employeefixedwagereference where employeename = $1`;
    const checkexistresult = await client.query(checkexist, [employeename]);

    if (checkexistresult.rows.length === 0) {
        const insertquery = `INSERT INTO employeefixedwagereference (employeename, basic_da, hra, 
        food_allowance, site_allowancce, weekday_ot_price, sunday_ot_price, grossalary, date)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`;

        const values = [
            employeename,
            basicDA,
            hra,
            foodAllowance,
            siteAllowance,
            weekday_ot_price,
            sunday_ot_price,
            gross_salary,
            new Date() // Assuming you're using Node.js, this generates the current date
        ];

        // Assuming `client` is your PostgreSQL client
        await client.query(insertquery, values);
    } else {
        try {
            if (salarychangestatus === "BOTH" || salarychangestatus === "MAINSALARY") {
                const updatequery = `UPDATE employeefixedwagereference SET basic_da = $1, hra = $2, 
                    food_allowance = $3, site_allowancce = $4, weekday_ot_price = $5, sunday_ot_price = $6, grossalary = $7, date = $8 WHERE employeename = $9`;

                const values = [
                    basicDA,
                    hra,
                    foodAllowance,
                    siteAllowance,
                    weekday_ot_price,
                    sunday_ot_price,
                    gross_salary,
                    new Date(), // Assuming you're using Node.js, this generates the current date
                    employeename
                ];

                // Assuming `client` is your PostgreSQL client
                await client.query(updatequery, values);
            }

            if (salarychangestatus === "BOTH" || salarychangestatus === "MONTH") {
                const updateWorkingDataQuery = `UPDATE workingdata SET ref_fixed_basic_da = $1, ref_fixed_hra = $2, ref_fixed_food_allowance = $3,
                    ref_fixed_site_allowance = $4, ref_fixed_mobile_allowance = $5, ref_fixed_gross_salary = $6, ref_fixed_weekday_ot_price = $7,
                    ref_fixed_sunday_ot_price = $8 WHERE employeename = $9 AND monthyear = $10`;

                const workingValues = [
                    basicDA,
                    hra,
                    foodAllowance,
                    siteAllowance,
                    mobile_allowance,
                    gross_salary,
                    weekday_ot_price,
                    sunday_ot_price,
                    employeename,
                    monthyear
                ];

                await client.query(updateWorkingDataQuery, workingValues);
            }
        } catch (error) {
            console.error("Error occurred while updating salary details:", error.message);
            // Handle the error appropriately, such as rolling back transactions, logging, or sending an error response
        }

    }

}
////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Endpoint to handle POST requests to store work order data
app.post('/workorders', async (req, res) => {
    const { workorderno, sitename, address, siteengineername, contactno } = req.body;

    try {
        // Check if the work order already exists
        const checkexist = `SELECT workorderno FROM workorderdata WHERE workorderno = $1`;
        const checkexistresult = await client.query(checkexist, [workorderno]);

        if (checkexistresult.rows.length > 0) {
            return res.status(400).send("Workorder details already exist");
        }

        // Insert the work order data into the database
        const query = `INSERT INTO workorderdata (workorderno, sitename, address, siteengineername, contactno, status, sitelocation)
                       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
        const values = [workorderno, sitename, address, siteengineername, contactno, 'PROGRESS', 'Bangalore'];
        const result = await client.query(query, values);

        res.status(201).send("Details Stores Successfully"); // Return the inserted row
    } catch (error) {
        console.error('Error inserting work order data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// API endpoint to insert employee details
app.post('/employees', async (req, res) => {
    try {
        const {
            employeetype,
            recruitment_type,
            contractor_vendor_name,
            work_orderno,
            employeename,
            designation,
            fathername,
            dateofbirth,
            adharno,
            phoneno,
            address,
            bloodgroup,
            emailid,
            marital_status,
            dateofjoining,
            uan_no,
            pfnumber,
            pan_number,
            namineename,
            realtionship_with_nominee,
            nominee_mobile_no,
            nominee_adhar_no,
            bank_name,
            bank_branch,
            account_no,
            ifsc_code,
            gross_salary,
            working_hours_day,
            weekday_ot_type,
            sunday_ot_type,
        } = req.body;
        // Check if the employee already exists in the database
        const existingEmployeeQuery = 'SELECT employeename FROM employee WHERE employeename = $1';
        const existingEmployeeResult = await client.query(existingEmployeeQuery, [employeename]);

        // Check if the employee already exists in the employeevendor table
        const existingEmployeeQuery1 = 'SELECT employeename FROM employeevendor WHERE employeename = $1';
        const existingEmployeeResult1 = await client.query(existingEmployeeQuery1, [employeename]);

        if (existingEmployeeResult.rows.length > 0 || existingEmployeeResult1.rows.length > 0) {
            // Employee already exists, return an error response
            return res.status(400).json({ error: 'Employee already exists' });

            //     const update_employee_data = `
            //     UPDATE employee SET  
            //         employeetype, 
            //         recruitment_type, 
            //         contractor_vendor_name, 
            //         work_orderno, 
            //         employeename, 
            //         designation, 
            //         fathername, 
            //         dateofbirth, 
            //         adharno, 
            //         phoneno, 
            //         address, 
            //         bloodgroup, 
            //         emailid, 
            //         marital_status, 
            //         dateofjoining, 
            //         uan_no, 
            //         namineename, 
            //         realtionship_with_nominee, 
            //         nominee_mobile_no, 
            //         nominee_adhar_no, 
            //         bank_name, 
            //         bank_branch, 
            //         account_no, 
            //         ifsc_code, 
            //         pfnumber, 
            //         pan_number
            //     WHERE employeename = 
            // `;
            //     const values = [
            //         nextEmployeeId,
            //         employeetype,
            //         recruitment_type,
            //         contractor_vendor_name,
            //         work_orderno,
            //         employeename,
            //         designation,
            //         fathername,
            //         dateofbirth,
            //         adharno,
            //         phoneno,
            //         address,
            //         bloodgroup,
            //         emailid,
            //         marital_status,
            //         dateofjoining,
            //         uan_no,
            //         namineename,
            //         realtionship_with_nominee,
            //         nominee_mobile_no,
            //         nominee_adhar_no,
            //         bank_name,
            //         bank_branch,
            //         account_no,
            //         ifsc_code,
            //         gross_salary,
            //         working_hours_day,
            //         weekday_ot_type,
            //         sunday_ot_type,
            //         true,
            //         pfnumber,
            //         pan_number
            //     ];

        }


        // Generate employee ID (e.g., C001, C002, etc.)
        const lastEmployeeId = await getLastEmployeeIdFromDatabase(); // You need to implement this function to get the last employee ID from the database
        const nextEmployeeId = generateNextEmployeeId(lastEmployeeId);
        // Insert employee details into the database
        const query = `
            INSERT INTO employee (id, employeetype, recruitment_type, contractor_vendor_name, work_orderno, employeename, designation, fathername, dateofbirth, adharno, phoneno, address, bloodgroup, emailid, marital_status, dateofjoining, uan_no, namineename, realtionship_with_nominee, nominee_mobile_no, nominee_adhar_no, bank_name, bank_branch, account_no, ifsc_code, gross_salary, working_hours_day, weekday_ot_type, sunday_ot_type, status, pfnumber, pan_number, pf_applicable_or_not)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
        `;
        const values = [
            nextEmployeeId,
            employeetype,
            recruitment_type,
            contractor_vendor_name,
            work_orderno,
            employeename,
            designation,
            fathername,
            dateofbirth,
            adharno,
            phoneno,
            address,
            bloodgroup,
            emailid,
            marital_status,
            dateofjoining,
            uan_no,
            namineename,
            realtionship_with_nominee,
            nominee_mobile_no,
            nominee_adhar_no,
            bank_name,
            bank_branch,
            account_no,
            ifsc_code,
            gross_salary,
            working_hours_day,
            weekday_ot_type,
            sunday_ot_type,
            true,
            pfnumber,
            pan_number,
            true
        ];

        await client.query(query, values);
        const salarychangestatus = 'null';
        const monthyear = '999999';
        //call the function to finalize the wage
        await calculateSalaryComponentsStatutory(employeename, parseFloat(gross_salary), salarychangestatus, monthyear);
        await calculateSalaryComponentsReference(employeename, parseFloat(gross_salary), salarychangestatus, monthyear);

        //send employee name 
        res.status(201).send(`Employee details inserted successfully. Employee ID: ${nextEmployeeId}`);

    } catch (error) {
        console.error('Error inserting employee details:', error);
        res.status(500).send('Internal Server Error');
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//API endpoint to insert employee details reading from excel file
app.post('/upload-employees', async (req, res) => {
    try {
        const { workbook1 } = req.body;
        // Read the Excel file
        const workbook = xlsx.readFile(workbook1);
        const sheetName = workbook.SheetNames[0]; // Assuming the data is in the first sheet
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        // Loop through each row of data from Excel
        for (const row of data) {
            const dateOfBirth = xlsx.SSF.parse_date_code(row.dateofbirth);
            const dateOfJoining = xlsx.SSF.parse_date_code(row.dateofjoining);
            // Format dates as dd-mm-yyyy
            const formattedDateOfBirth = `${dateOfBirth.m}-${dateOfBirth.d}-${dateOfBirth.y}`;
            const formattedDateOfJoining = `${dateOfJoining.m}-${dateOfJoining.d}-${dateOfJoining.y}`;
            row.dateofbirth = formattedDateOfBirth;
            row.dateofjoining = formattedDateOfJoining;
            await executeApiForEmployee(row);
            console.log(row.employeename);
        }

        res.status(200).send('Data inserted successfully.');
    } catch (error) {
        console.error('Error inserting employee details:', error);
        res.status(500).send('Internal Server Error');
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Update employee details
app.post('/update-employee-details', async (req, res) => {
    try {
        const {
            employeename,
            designation,
            dateofjoining,
            fathername,
            dateofbirth,
            adharno,
            phoneno,
            address,
            bloodgroup,
            marital_status,
            emailid,
            status,
            uan_no,
            pfnumber,
            pan_number,
            namineename,
            realtionship_with_nominee,
            nominee_mobile_no,
            nominee_adhar_no,
            bank_name,
            bank_branch,
            account_no,
            ifsc_code,
            working_hours_day,
            weekday_ot_type,
            sunday_ot_type
        } = req.body;

        const updateQuery = `UPDATE employee SET
                            designation = $1,
                            fathername = $2,
                            dateofbirth = $3,
                            adharno = $4,
                            phoneno = $5,
                            address = $6,
                            bloodgroup = $7,
                            emailid = $8,
                            marital_status = $9,
                            dateofjoining = $10,
                            uan_no = $11,
                            pfnumber = $12,
                            pan_number = $26,
                            namineename = $13,
                            realtionship_with_nominee = $14,
                            nominee_mobile_no = $15,
                            nominee_adhar_no = $16,
                            bank_name = $17,
                            bank_branch = $18,
                            account_no = $19,
                            ifsc_code = $20,
                            working_hours_day = $21,
                            weekday_ot_type = $22,
                            sunday_ot_type = $23,
                            status = $24                            
                            WHERE employeename = $25`;

        const values = [
            designation,
            fathername,
            dateofbirth,
            adharno,
            phoneno,
            address,
            bloodgroup,
            emailid,
            marital_status,
            dateofjoining,
            uan_no,
            pfnumber,
            namineename,
            realtionship_with_nominee,
            nominee_mobile_no,
            nominee_adhar_no,
            bank_name,
            bank_branch,
            account_no,
            ifsc_code,
            working_hours_day,
            weekday_ot_type,
            sunday_ot_type,
            status,
            employeename,
            pan_number
        ];

        const result = await client.query(updateQuery, values);

        res.status(200).send("Employee details updated successfully");
    } catch (error) {
        console.error('Error updating employee details:', error);
        res.status(500).send("Error updating employee details");
    }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Function to execute the API for each row of data
async function executeApiForEmployee(row) {
    try {
        const {
            employeetype,
            recruitment_type,
            contractor_vendor_name,
            work_orderno,
            employeename,
            designation,
            fathername,
            dateofbirth,
            adharno,
            phoneno,
            address,
            bloodgroup,
            emailid,
            marital_status,
            dateofjoining,
            uan_no,
            pfnumber,
            pan_number,
            namineename,
            realtionship_with_nominee,
            nominee_mobile_no,
            nominee_adhar_no,
            bank_name,
            bank_branch,
            account_no,
            ifsc_code,
            gross_salary,
            working_hours_day,
            weekday_ot_type,
            sunday_ot_type,
        } = row;
        // Check if the employee already exists in the database
        const existingEmployeeQuery = 'SELECT employeename FROM employee WHERE employeename = $1';
        const existingEmployeeResult = await client.query(existingEmployeeQuery, [employeename]);

        // Check if the employee already exists in the employeevendor table
        const existingEmployeeQuery1 = 'SELECT employeename FROM employeevendor WHERE employeename = $1';
        const existingEmployeeResult1 = await client.query(existingEmployeeQuery1, [employeename]);

        if (existingEmployeeResult.rows.length > 0 || existingEmployeeResult1.rows.length > 0) {
            // Employee already exists, return an error response
            //return res.status(400).json({ error: 'Employee already exists' });
        } else {


            // Generate employee ID (e.g., C001, C002, etc.)
            const lastEmployeeId = await getLastEmployeeIdFromDatabase(); // You need to implement this function to get the last employee ID from the database
            const nextEmployeeId = generateNextEmployeeId(lastEmployeeId);
            // Insert employee details into the database
            const query = `
            INSERT INTO employee (id, employeetype, recruitment_type, contractor_vendor_name, work_orderno, employeename, designation, fathername, dateofbirth, adharno, phoneno, address, bloodgroup, emailid, marital_status, dateofjoining, uan_no, namineename, realtionship_with_nominee, nominee_mobile_no, nominee_adhar_no, bank_name, bank_branch, account_no, ifsc_code, gross_salary, working_hours_day, weekday_ot_type, sunday_ot_type, status, pfnumber, pan_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
        `;
            const values = [
                nextEmployeeId,
                employeetype,
                recruitment_type,
                contractor_vendor_name,
                work_orderno,
                employeename,
                designation,
                fathername,
                dateofbirth,
                adharno,
                phoneno,
                address,
                bloodgroup,
                emailid,
                marital_status,
                dateofjoining,
                uan_no,
                namineename,
                realtionship_with_nominee,
                nominee_mobile_no,
                nominee_adhar_no,
                bank_name,
                bank_branch,
                account_no,
                ifsc_code,
                gross_salary,
                working_hours_day,
                weekday_ot_type,
                sunday_ot_type,
                true,
                pfnumber,
                pan_number
            ];

            await client.query(query, values);
            const salarychangestatus = 'null';
            const monthyear = '999999';
            //call the function to finalize the wage
            await calculateSalaryComponentsStatutory(employeename, parseFloat(gross_salary), salarychangestatus, monthyear);
            await calculateSalaryComponentsReference(employeename, parseFloat(gross_salary), salarychangestatus, monthyear);
        }
        //send employee name 
        //res.status(201).send(`Employee details inserted successfully. Employee ID: ${nextEmployeeId}`);

    } catch (error) {
        console.error('Error inserting employee details:', error);
        res.status(500).send('Internal Server Error');
    }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//API endpoint to insert vendor employee details 
app.post('/employeesvendor', async (req, res) => {
    try {
        const {
            employeetype,
            recruitment_type,
            contractor_vendor_name,
            work_orderno,
            employeename,
            designation,
            gross_salary,
            working_hours_day,
            weekday_ot_type,
            sunday_ot_type,
        } = req.body;

        // Check if the employee already exists in the database
        const existingEmployeeQuery = 'SELECT employeename FROM employee WHERE employeename = $1';
        const existingEmployeeResult = await client.query(existingEmployeeQuery, [employeename]);

        // Check if the employee already exists in the employeevendor table
        const existingEmployeeQuery1 = 'SELECT employeename FROM employeevendor WHERE employeename = $1';
        const existingEmployeeResult1 = await client.query(existingEmployeeQuery1, [employeename]);

        if (existingEmployeeResult.rows.length > 0 || existingEmployeeResult1.rows.length > 0) {
            // Employee already exists, return an error response
            return res.status(400).json({ error: 'Employee already exists' });
        }


        // Insert employee details into the database
        const query = `
            INSERT INTO employeevendor (employeetype, recruitment_type, contractor_vendor_name, work_orderno, employeename, designation, gross_salary, working_hours_day, weekday_ot_type, sunday_ot_type, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;
        const values = [
            employeetype,
            recruitment_type,
            contractor_vendor_name,
            work_orderno,
            employeename,
            designation,
            gross_salary,
            working_hours_day,
            weekday_ot_type,
            sunday_ot_type,
            true,
        ];

        await client.query(query, values);

        res.status(201).send(`Employee details inserted successfully. Employee Name: ${employeename}`);
    } catch (error) {
        console.error('Error inserting employee details:', error);
        res.status(500).send('Internal Server Error');
    }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Endpoint to handle POST requests for employee name and gross salary
app.post('/employeewageupdate', async (req, res) => {
    // Extract employeename and grossalary from the request body
    const { employeename, grossalary, salarychangestatus, workorder_no, month, year } = req.body;

    // Convert month and year to strings and concatenate them
    const monthyear = month.toString() + year.toString();
    console.log("monthyear ", monthyear);
    // Perform any necessary validation on the input data
    if (!employeename || !grossalary) {
        return res.status(400).json({ error: 'Employee name and gross salary are required' });
    }

    // Calculate salary components and statutory deductions
    try {
        const getstatus = `select status from workingdata where employeename = $1 and monthyear = $2 and status = $3`;
        const getstatusresult = await client.query(getstatus, [employeename, monthyear, 'WORKING']);
        console.log("getstatusresult", getstatusresult.rows.length);
        if (getstatusresult.rows.length != 0) {
            await calculateSalaryComponentsStatutory(employeename, grossalary, salarychangestatus, monthyear);
        }
        await calculateSalaryComponentsReference(employeename, grossalary, salarychangestatus, monthyear);

        // Extract the month and year from the current date
        // const month = new Date().getMonth() + 1; // Adding 1 because months are zero-indexed
        // const year = new Date().getFullYear();

        // Convert month and year to strings and concatenate them
        //const monthyear = month.toString() + year.toString();
        //const monthyear = '022024';
        await calculateEmployeeWage(employeename, monthyear, workorder_no, res);
        if (getstatusresult.rows.length != 0) {
            await calculateEmployeeWagestatutory(employeename, monthyear, workorder_no, res);
        }
        // For demonstration purposes, let's just send back the received data
        res.status(201).send(employeename + " Salary Wage Updated Successfully");
    } catch (error) {
        console.error('Error calculating salary components:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// API to Update Employee Working Data
app.post('/updateemployeeworkingdata', async (req, res) => {
    try {
        // Extract employeename and grossalary from the request body
        const { employeename, monthyear, no_of_present_days, national_festival_holiday,
            weekday_no_of_hours_overtime, sunday_holiday_no_of_hours_overtime, advance_company,
            advance_third_party, negativeot, other_deduction, fines_damages_loss, work_orderno, earned_others } = req.body;
        // Calculate salary components and statutory deductions
        // const monthyear = "04-2024"; // Example monthyear string
        const parts = monthyear.split("-"); // Split the string by hyphen
        const month = parts[0]; // Extract month
        const year = parts[1]; // Extract year
        const monthyear1 = month + year; // Concatenate month and year
        console.log("monthyear1", monthyear1);
        console.log("earned_otherse", earned_others);
        // Check if employee exists
        const checkexist = `SELECT employeename FROM employee WHERE employeename = $1`;
        const checkexistresult = await client.query(checkexist, [employeename]);

        if (checkexistresult.rows.length === 0) {
            res.status(500).send("It is mandatory to add the employee before updating employee working data");
            return;
        }

        // Update working data
        await calculateworkingdata(employeename, monthyear1, no_of_present_days, national_festival_holiday, weekday_no_of_hours_overtime, sunday_holiday_no_of_hours_overtime, negativeot, advance_company, advance_third_party, fines_damages_loss, other_deduction, work_orderno, earned_others, res);
        await calculateEmployeeWage(employeename, monthyear1, work_orderno, res);

        // Check status
        const getstatus = `SELECT status FROM workingdata WHERE employeename = $1 AND monthyear = $2 AND status = $3 AND work_orderno = $4`;
        const getstatusresult = await client.query(getstatus, [employeename, monthyear1, 'WORKING', work_orderno]);

        if (getstatusresult.rows[0].length !== 0) {
            await calculateEmployeeWagestatutory(employeename, monthyear1, work_orderno, res);
        }
        // For demonstration purposes, let's just send back the received data
        res.status(201).send(`${employeename} Working data updated for the month ${month}`);
    } catch (error) {
        console.error('Error calculating salary components:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////
//API endpoint to insert employee details reading from excel file
app.post('/upload-employees-workingdata', async (req, res) => {
    try {
        const { workbook1 } = req.body;
        // Read the Excel file
        const workbook = xlsx.readFile(workbook1);
        const sheetName = workbook.SheetNames[0]; // Assuming the data is in the first sheet
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);
        // Loop through each row of data from Excel
        for (const row of data) {
            // Splitting the monthyear field by hyphen and extracting parts
            const parts = row.monthyear.split("-");
            const month = parts[0]; // Extracting month part
            const year = parts[1]; // Extracting year part

            // Formatting monthyear as MMYYYY
            const monthyearFormatted = month + year;
            row.monthyear = monthyearFormatted;
            //console.log(row.monthyear);
            await executeApiForEmployeeWorkingData(row, res);
            console.log(row.employeename);
        }


        res.status(200).send('Data inserted successfully.');
    } catch (error) {
        console.error('Error inserting employee details:', error);
        res.status(500).send('Internal Server Error');
    }
});

async function executeApiForEmployeeWorkingData(row, res) {
    try {
        const { employeename, monthyear, no_of_present_days, national_festival_holiday,
            weekday_no_of_hours_overtime, sunday_holiday_no_of_hours_overtime, advance_company,
            advance_third_party, nagativeot, other_deduction, fines_damages_loss, work_orderno } = row;

        console.log("monthyear1", monthyear);
        const monthyear1 = monthyear;

        const checkexist = `select employeename from employee where employeename = $1`
        const checkexistresult = await client.query(checkexist, [employeename]);

        if (checkexistresult.rows.length === 0) {
            //res.status(500).send("It is mandatory to add the employee before updating employee working data")
            return;
        }
        //const month = parseInt(monthyear.substring(0, 2));

        await calculateworkingdata(employeename, monthyear1, no_of_present_days, national_festival_holiday, weekday_no_of_hours_overtime, sunday_holiday_no_of_hours_overtime, nagativeot, advance_company, advance_third_party, fines_damages_loss, other_deduction, work_orderno, res);

        await calculateEmployeeWage(employeename, monthyear1, res);

        const getstatus = `select status from workingdata where employeename = $1 and monthyear = $2 and status = $3`;
        const getstatusresult = await client.query(getstatus, [employeename, monthyear1, 'WORKING']);

        if (getstatusresult.rows[0].length != 0) {
            await calculateEmployeeWagestatutory(employeename, monthyear1, res);
        }
        // For demonstration purposes, let's just send back the received data
        //res.status(201).send(employeename + " Working data updated for the month " + month);
    } catch (error) {
        console.error('Error calculating salary components:', error);
        //res.status(500).json({ error: 'Internal Server Error' });
    }
}
/////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// API to Update Employee deductions it includes salary advances from both company and third party
app.post('/updateemployeedeductions', async (req, res) => {
    // Extract employeename and grossalary from the request body
    const { employeename, monthyear, advance_company,
        advance_third_party, other_deduction, fines_damages_loss, work_orderno } = req.body;
    // Calculate salary components and statutory deductions
    try {
        const parts = monthyear.split("-");
        const month = parts[0]; // Extracting month part
        const year = parts[1]; // Extracting year part

        // Formatting monthyear as MMYYYY
        const monthyear1 = month + year;
        const checkexist = `SELECT employeename FROM employee WHERE employeename = $1`;
        const checkexistresult = await client.query(checkexist, [employeename]);

        if (checkexistresult.rows.length === 0) {
            res.status(500).send("It is mandatory to add the employee before updating employee working data");
            return;
        }
        //const month = parseInt(monthyear.substring(0, 2));

        // If a record exists, update the existing record with new values
        const updateQuery = `
            UPDATE workingdata
            SET 
                advance_company =  $1,
                advance_third_party = $2,
                other_deduction =  $3,
                fines_damages_loss =  $4
            WHERE employeename = $5 AND monthyear = $6 AND work_orderno = $7
        `;
        const updateValues = [
            advance_company,
            advance_third_party,
            other_deduction,
            fines_damages_loss,
            employeename,
            monthyear1,
            work_orderno
        ];
        await client.query(updateQuery, updateValues);

        await calculateEmployeeWage(employeename, monthyear1, work_orderno, res);
        await calculateEmployeeWagestatutory(employeename, monthyear1, work_orderno, res);
        // For demonstration purposes, let's just send back the received data
        res.status(201).send(`${employeename} Working data updated for the month ${month}`);
    } catch (error) {
        console.error('Error calculating salary components:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Calculate wage By reading data from attendance table
app.post('/calculatewage', async (req, res) => {
    try {
        const { month, year, workorderno } = req.body;

        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        // Convert month to its corresponding name
        const monthName = monthNames[month - 1]; // Adjusting for 0-based array index

        const retrivedata = `
                            SELECT 
                            employeename,
                            SUM(CASE WHEN day = 'WEEK DAY' THEN noOfPresentDays ELSE 0 END) AS no_of_present_days,
                            SUM(CASE WHEN day = 'WEEK DAY' THEN today_ot ELSE 0 END) AS weekdaytodayot,
                            SUM(CASE WHEN day = 'HOLIDAY'  THEN today_ot ELSE 0 END) AS sunday_ot,
                            SUM(nagativeot) AS nagativeot
                        FROM 
                            dailyattendance
                        WHERE 
                            EXTRACT(MONTH FROM in_date AT TIME ZONE 'UTC') = $1 
                            AND EXTRACT(YEAR FROM in_date AT TIME ZONE 'UTC') = $2
                            AND stataus = 'PENDING' 
                            AND work_orderno = $3
                        GROUP BY 
                            employeename
                    `;


        const retreivedataresult = await client.query(retrivedata, [month, year, workorderno]);
        const monthyear = month.toString() + year.toString();

        for (const employeeData of retreivedataresult.rows) {
            const employeename = employeeData.employeename;
            const noOfPresentDays = employeeData.no_of_present_days;
            const national_festival_holiday = 0;
            const weekdaytodayOT = employeeData.weekdaytodayot;
            const sunday_holiday_ot = employeeData.sunday_ot;
            const nagativeot = employeeData.nagativeot;
            const advance_company = 0;
            const advance_third_party = 0;
            const fines_damages_loss = 0;
            const other_deduction = 0;
            const erned_others = 0;
            //console.log(employeeData);

            console.log("Calling working data function");
            await calculateworkingdata(employeename, monthyear, noOfPresentDays, national_festival_holiday, weekdaytodayOT, sunday_holiday_ot, nagativeot, advance_company, advance_third_party, fines_damages_loss, other_deduction, workorderno, erned_others, res);

            //Updating computed status to dailyattendance table
            const updateattendacedata = `UPDATE dailyattendance d
                             SET stataus = $1
                             WHERE EXTRACT(MONTH FROM d.in_date AT TIME ZONE 'UTC') = $2 
                             AND EXTRACT(YEAR FROM d.in_date AT TIME ZONE 'UTC') = $3
                             AND d.work_orderno = $4`;

            await client.query(updateattendacedata, ['COMPUTED', month, year, workorderno]);

            const getemptype = `SELECT recruitment_type FROM employeevendor WHERE employeename = $1`;
            const getemptyperesult = await client.query(getemptype, [employeename]);

            const emptype = getemptyperesult.rows.length === 0 ? 'NULL' : 'VENDOR';

            if (emptype === 'VENDOR') {
                // Calculate wages for vendor employee
                await calculatevendorwage(employeename, monthyear, res);
            } else {
                // Calculate wages for regular employee
                console.log("Calling reference function");
                await calculateEmployeeWage(employeename, monthyear, workorderno, res);
                console.log("Calling statutaory function");
                await calculateEmployeeWagestatutory(employeename, monthyear, workorderno, res);
            }
        }

        res.send(`Wage Calculated For The Month ${monthName}_${year}_${workorderno}`);
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).send('Error retrieving data');
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Attendance Capturing
app.post('/dailyattendance', async (req, res) => {
    // Check if another request is already being processed
    if (isProcessing) {
        res.status(503).send('Service Unavailable: Another request is being processed. Please try again later.');
        return;
    }
    try {
        isProcessing = true; // Set processing flag to true
        const {
            employeename,
            date,
            day,
            in_date,
            in_time,
            out_date,
            out_time,
            ot_time_break,
            work_orderno
        } = req.body;


        // Check if the record already exists in dailyattendance table
        const checkAttendanceQuery = `
            SELECT employeename FROM dailyattendance
            WHERE employeename = $1 AND in_date = $2
        `;
        const checkAttendanceValues = [employeename, in_date]; // Change in_date to date
        const attendanceResult = await client.query(checkAttendanceQuery, checkAttendanceValues);

        if (attendanceResult.rows.length > 0) {
            res.status(409).send(`Attendance already recorded for this date and Employee Name: ${employeename}`);
            return;
        }

        // Convert in_time and out_time to Date objects
        const startTime = new Date(`${in_date}T${in_time}`);
        const endTime = new Date(`${out_date}T${out_time}`);

        // Check if startTime and endTime are valid dates
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            throw new Error('Invalid time format');
        }

        // Calculate the total working hours
        const workingMillis = endTime.getTime() - startTime.getTime();
        if (workingMillis < 0) {
            throw new Error('End time cannot be before start time');
        }
        const workingHours = workingMillis / (1000 * 60 * 60); // Convert milliseconds to hours

        console.log('Total working hours:', workingHours);

        const getemptype = `SELECT recruitment_type FROM employeevendor WHERE employeename = $1`;
        const getemptyperesult = await client.query(getemptype, [employeename]);
        let emptype = '';
        let getottypeworkinghours;
        let workinghoursperday;
        if (getemptyperesult.rows.length === 0) {
            getottypeworkinghours = `SELECT working_hours_day FROM employee WHERE employeename = $1`;
        } else {
            getottypeworkinghours = `SELECT working_hours_day FROM employeevendor WHERE employeename = $1`;
            emptype = 'VENDOR';
        }

        const getottypeworkinghoursresult = await client.query(getottypeworkinghours, [employeename]);

        if (getottypeworkinghoursresult.rows.length > 0) {
            workinghoursperday = getottypeworkinghoursresult.rows[0].working_hours_day;
            console.log("workinghoursperday", workinghoursperday);
        } else {
            console.error('No working hours found for the employee');
            // Handle the case where no working hours are found
            // For example, you might set a default value:
            workinghoursperday = 10; // Default to 8 hours if no working hours are found
        }

        let weekdaytodayOT = 0;
        let sunday_holiday_ot = 0;
        let noOfPresentDays = 0;
        let todayot = 0;
        let nagativeot = 0;
        let ot_time_break1 = 0;

        if (day === 'HOLIDAY') {
            sunday_holiday_ot = workingHours - ot_time_break1;
            todayot = sunday_holiday_ot;
        } else {
            if (workingHours !== 0) { // Ensure workingHours is not 0 before processing
                if (workingHours >= 4 && workingHours <= 6) {
                    // If the working hours are between 4 and 6 (inclusive), consider half-day work
                    weekdaytodayOT = 0;
                    todayot = weekdaytodayOT;
                    noOfPresentDays = 0.5; // Consider half-day as the employee is present for a part of the day
                } else {
                    // If the working hours are more than 6, calculate overtime
                    weekdaytodayOT = workingHours - workinghoursperday; // Calculate overtime hours
                    if (weekdaytodayOT > 0) {
                        weekdaytodayOT -= ot_time_break1; // Subtract the break time from overtime
                        todayot = weekdaytodayOT;
                    }

                    if (weekdaytodayOT < 0) {
                        // If overtime hours are negative, set them to 0 (no overtime)
                        nagativeot = weekdaytodayOT;
                        weekdaytodayOT = 0;
                    }
                    noOfPresentDays = 1; // Consider the full day as present
                }
            }
        }
        console.log(employeename);

        // Insert daily attendance details into the database
        const insertQuery = `
            INSERT INTO dailyattendance (employeename, date, day, in_date, in_time, out_date, out_time, today_ot, nagativeot, totalworkinghours, noOfPresentDays, stataus, work_orderno, muster_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `;
        const insertValues = [
            employeename,
            date,
            day,
            in_date,
            in_time,
            out_date,
            out_time,
            todayot,
            nagativeot,
            workingHours,
            noOfPresentDays,
            'PENDING',
            work_orderno,
            false
        ];
        await client.query(insertQuery, insertValues);

        res.status(201).send(`Daily attendance details inserted successfully For Employee Name: ${employeename}`);
    } catch (error) {
        console.error('Error inserting daily attendance details:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        // Ensure isProcessing flag is always reset to false
        isProcessing = false;
    }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////
//re-calculating the wage both ref and statutory

app.post('/re_calculate_wage', async (req, res) => {
    try {
        const { monthyear, work_orderno } = req.body;

        const get_data = `
            SELECT employeename, monthyear, work_orderno 
            FROM workingdata 
            WHERE monthyear = $1 AND work_orderno = $2 
            ORDER BY employeename
        `;
        const get_data_result = await client.query(get_data, [monthyear, work_orderno]);
        const data = get_data_result.rows;

        for (const employee of data) {
            //await calculateworkingdata(employee.employeename, monthyear, 0, 0, 0, 0, 0, 0, 0, 0, 0, work_orderno, Earned_Others);
            await calculateEmployeeWage(employee.employeename, monthyear, work_orderno);
            await calculateEmployeeWagestatutory(employee.employeename, monthyear, work_orderno);
        }

        res.status(200).send('Wage recalculation completed successfully.');
    } catch (error) {
        console.error('Error recalculating wage:', error);
        res.status(500).send('An error occurred while recalculating wages.');
    }
});

/////////////////////////////////////////////////////////////////////
// Function to get the total number of days in a month
function getDaysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
}

// Function to calculate the number of days excluding Sundays in a given month and year
function getWorkingDays(monthyear) {
    // Extract the month and year from monthyear (assuming month is the first two characters and year is the last four characters)
    const month = parseInt(monthyear.substring(0, 2));
    const year = parseInt(monthyear.substring(2));

    // Get the total number of days in the month
    const totalDays = getDaysInMonth(month, year);

    // Initialize the number of Sundays
    let sundaysCount = 0;

    // Loop through each day of the month
    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month - 1, day);
        // Check if the day is Sunday (0 is Sunday)
        if (date.getDay() === 0) {
            sundaysCount++;
        }
    }

    // Calculate the number of days excluding Sundays
    const workingDays = totalDays - sundaysCount;

    return workingDays;
}
//Function for to store employee working data
async function calculateworkingdata(employeeName, MonthYear, NoOfPresentDays, National_festival_holiday, WeekdaytodayOT, Sunday_holiday_ot, Nagativeot, Advance_company, Advance_third_party, Fines_damages_loss, Other_deduction, Work_Orderno, Earned_Others, res) {
    try {
        const employeename = employeeName;
        const monthyear = MonthYear;
        let noOfPresentDays = NoOfPresentDays;
        let national_festival_holiday = National_festival_holiday;
        let weekdaytodayOT = WeekdaytodayOT;
        let sunday_holiday_ot = Sunday_holiday_ot;
        let nagativeot = Nagativeot;
        let advance_company = Advance_company;
        let advance_third_party = Advance_third_party;
        let other_deduction = Other_deduction;
        let fines_damages_loss = Fines_damages_loss
        //console.log("Before initialization", Work_Orderno);
        const work_orderno = Work_Orderno;
        const earned_others = Earned_Others;
        console.log("from workingdata ", work_orderno);

        // Extract month from monthyear (assuming month is the first two characters)
        const month = parseInt(monthyear.substring(0, 2));

        // Set the default number of days in a month
        let no_of_Days_in_month = 26;

        // // Adjust the number of days based on the extracted month
        // if (month === 2) {
        //     no_of_Days_in_month = 25;
        // }
        //let no_of_Days_in_month = getWorkingDays(monthyear);

        // Check if the employee record exists for the given month
        const employeeQuery = `
            SELECT employeename 
            FROM workingdata 
            WHERE employeename = $1 AND monthyear = $2 AND work_orderno = $3
        `;
        const employeeValues = [employeename, monthyear, work_orderno];
        const employeeResult = await client.query(employeeQuery, employeeValues);

        if (employeeResult.rows.length === 0) {
            try {
                const get_ref_fixed_wage = `select * from employeefixedwagereference where employeename = $1 `;
                const get_ref_fixed_wage_result = await client.query(get_ref_fixed_wage, [employeename]);
                // reference wage details
                const ref_fixed_basic_da = parseFloat(get_ref_fixed_wage_result.rows[0].basic_da);
                const ref_fixed_hra = parseFloat(get_ref_fixed_wage_result.rows[0].hra);
                const ref_fixed_food_allowance = parseFloat(get_ref_fixed_wage_result.rows[0].food_allowance);
                const ref_fixed_site_allowance = parseFloat(get_ref_fixed_wage_result.rows[0].site_allowancce);
                const ref_fixed_mobile_allowance = 0;
                const ref_fixed_gross_salary = parseFloat(get_ref_fixed_wage_result.rows[0].grossalary);

                const get_working_hours_day = `select working_hours_day, weekday_ot_type, sunday_ot_type from employee where employeename = $1`;
                const get_working_hours_day_result = await client.query(get_working_hours_day, [employeename]);
                const working_hours_day = get_working_hours_day_result.rows[0].working_hours_day;
                const weekday_ot_type = get_working_hours_day_result.rows[0].weekday_ot_type;
                const sunday_ot_type = get_working_hours_day_result.rows[0].sunday_ot_type;

                console.log("-------------------------------------------------");
                console.log("EMployeename ", employeename);
                console.log("no_of_Days_in_month", no_of_Days_in_month);
                console.log("-------------------------------------------------");

                const ref_fixed_weekday_ot_price = customRound(((ref_fixed_gross_salary / no_of_Days_in_month) / working_hours_day) * weekday_ot_type);
                const ref_fixed_sunday_ot_price = customRound(((ref_fixed_gross_salary / no_of_Days_in_month) / working_hours_day) * sunday_ot_type);

                const get_statutory_fixed_wage = `select * from employeefixedwagestatutory where employeename = $1`;
                const get_statutory_fixed_wage_result = await client.query(get_statutory_fixed_wage, [employeename]);

                const statutory_fixed_basic_da = parseFloat(get_statutory_fixed_wage_result.rows[0].basic_da);
                const statutory_fixed_hra = parseFloat(get_statutory_fixed_wage_result.rows[0].hra);
                const statutory_fixed_food_allowance = parseFloat(get_statutory_fixed_wage_result.rows[0].food_allowance);
                const statutory_fixed_site_allowance = parseFloat(get_statutory_fixed_wage_result.rows[0].site_allowancce);
                const statutory_fixed_mobile_allowance = 0;
                const statutory_fixed_gross_salary = parseFloat(get_statutory_fixed_wage_result.rows[0].grossalary);


                // If no record exists for the employee and month, insert a new record
                const insertQuery = `
                INSERT INTO workingdata (
                    employeename, 
                    monthyear, 
                    no_of_days_in_month, 
                    no_of_present_days, 
                    national_festival_holiday,
                    weekday_no_of_hours_overtime, 
                    sunday_holiday_no_of_hours_overtime, 
                    advance_company,
                    advance_third_party,
                    nagativeot,
                    other_deduction,
                    fines_damages_loss,
                    ref_fixed_basic_da,
                    ref_fixed_hra,
                    ref_fixed_food_allowance,
                    ref_fixed_site_allowance,
                    ref_fixed_mobile_allowance,
                    ref_fixed_gross_salary,
                    ref_fixed_weekday_ot_price,
                    ref_fixed_sunday_ot_price,
                    statutory_fixed_basic_da,
                    statutory_fixed_hra,
                    statutory_fixed_food_allowance,
                    statutory_fixed_site_allowance,
                    statutory_fixed_mobile_allowance,
                    statutory_fixed_gross_salary,
                    status,
                    work_orderno,
                    earned_others
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,$28, $29)
            `;
                const insertValues = [
                    employeename,
                    monthyear,
                    no_of_Days_in_month,
                    noOfPresentDays,
                    national_festival_holiday,
                    weekdaytodayOT,
                    sunday_holiday_ot,
                    advance_company,
                    advance_third_party,
                    nagativeot,
                    other_deduction,
                    fines_damages_loss,
                    ref_fixed_basic_da,
                    ref_fixed_hra,
                    ref_fixed_food_allowance,
                    ref_fixed_site_allowance,
                    ref_fixed_mobile_allowance,
                    ref_fixed_gross_salary,
                    ref_fixed_weekday_ot_price,
                    ref_fixed_sunday_ot_price,
                    statutory_fixed_basic_da,
                    statutory_fixed_hra,
                    statutory_fixed_food_allowance,
                    statutory_fixed_site_allowance,
                    statutory_fixed_mobile_allowance,
                    statutory_fixed_gross_salary,
                    'WORKING',
                    work_orderno,
                    earned_others
                ];
                await client.query(insertQuery, insertValues);
                console.log("Working data Inserted for employee", employeename);

            } catch (error) {
                // Handle the error
                console.error("Error occurred:", error.message);
                // You might want to send an appropriate response or perform other error handling tasks
            }

        } else {
            // If a record exists, update the existing record with new values
            const updateQuery = `
                UPDATE workingdata
                SET no_of_present_days = no_of_present_days + $1, 
                    weekday_no_of_hours_overtime =  weekday_no_of_hours_overtime + $2, 
                    sunday_holiday_no_of_hours_overtime = sunday_holiday_no_of_hours_overtime + $3,
                    nagativeot = nagativeot + $4,
                    advance_company = advance_company + $5,
                    advance_third_party = advance_third_party + $6,
                    other_deduction = other_deduction + $7,
                    fines_damages_loss = fines_damages_loss + $8,
                    earned_others = earned_others + $12
                WHERE employeename = $9 AND monthyear = $10 AND work_orderno = $11
            `;
            const updateValues = [
                noOfPresentDays,
                weekdaytodayOT,
                sunday_holiday_ot,
                nagativeot,
                advance_company,
                advance_third_party,
                other_deduction,
                fines_damages_loss,
                employeename,
                monthyear,
                work_orderno,
                earned_others
            ];
            await client.query(updateQuery, updateValues);
            console.log("Working data Updated for employee", employeename);
        }
    } catch (error) {
        console.error('Error inserting or updating working data:', error);
        res.status(500).send('Internal Server Error');
    }
}
// end of employee working data calculations
///////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////
//Function to calculate employee wage for workmen reference
async function calculateEmployeeWage(employeeName, MonthYear, Work_Orderno, res) {
    try {
        const employeename = employeeName;
        const monthyear = MonthYear;
        const work_orderno = Work_Orderno;
        console.log("from employee reference");
        console.log("employeename", employeename);
        console.log("monthyear", monthyear);
        console.log("work_orderno", work_orderno);
        // Check if the employee record exists for the given month
        const employeewageQuery = `SELECT employeename FROM employeewagereference WHERE employeename = $1 AND monthyear = $2 AND work_orderno = $3`;
        const employeeValues = [employeename, monthyear, work_orderno];
        const employeeResult = await client.query(employeewageQuery, employeeValues);
        console.log("test1 reference");

        if (employeeResult.rows.length === 0) {

            //employee or workmen working data
            const workingdataQuery = `SELECT * FROM workingdata WHERE employeename = $1 and monthyear = $2 AND work_orderno = $3`;
            const workingdataResult = await client.query(workingdataQuery, [employeename, monthyear, work_orderno]);

            console.log("test1");
            const no_of_days_in_month = workingdataResult.rows[0].no_of_days_in_month;
            console.log("test2", no_of_days_in_month);
            const no_of_present_days = workingdataResult.rows[0].no_of_present_days;
            const national_festival_holiday = workingdataResult.rows[0].national_festival_holiday;
            const no_of_payable_days = parseFloat(no_of_present_days) + parseFloat(national_festival_holiday);
            //console.log("no_of_payable_days", no_of_payable_days);
            const weekday_no_of_hours_overtime = workingdataResult.rows[0].weekday_no_of_hours_overtime;
            const sunday_holiday_no_of_hours_overtime = workingdataResult.rows[0].sunday_holiday_no_of_hours_overtime;
            const advance_company = workingdataResult.rows[0].advance_company;
            const advance_third_party = workingdataResult.rows[0].advance_third_party;
            const nagativeot = workingdataResult.rows[0].nagativeot;
            const other_deduction = workingdataResult.rows[0].other_deduction;
            const fines_damages_loss = workingdataResult.rows[0].fines_damages_loss;
            const earned_others = workingdataResult.rows[0].earned_others;
            //const work_orderno =  workingdataResult.rows[0].work_orderno;

            //employee fixed wage data
            const employeefixedwage = `select * from employeefixedwagereference where employeename = $1`;
            const employeefixedwageresult = await client.query(employeefixedwage, [employeename]);

            const fixed_basic_da = employeefixedwageresult.rows[0].basic_da;
            const fixed_hra = employeefixedwageresult.rows[0].hra;
            const fixed_food_allowance = employeefixedwageresult.rows[0].food_allowance;
            const fixed_site_allowance = employeefixedwageresult.rows[0].site_allowancce;
            const ref_fixed_mobile_allowance = 0;
            //const fixed_gross_total = employeefixedwageresult.rows[0].grossalary;
            const fixed_weekday_ot_price_hr = employeefixedwageresult.rows[0].weekday_ot_price;
            const fixed_sunday_ot_price_hr = employeefixedwageresult.rows[0].sunday_ot_price;
            const weekday_ot_price = fixed_weekday_ot_price_hr;
            const sunday_ot_price = fixed_sunday_ot_price_hr;

            let nagativeotfinal = nagativeot;
            if (nagativeotfinal < 0) {
                nagativeotfinal = -nagativeotfinal;
            }

            //employee earned wage datas
            const earned_basic_da = customRound((fixed_basic_da / no_of_days_in_month) * no_of_payable_days);
            const earned_hra = customRound((fixed_hra / no_of_days_in_month) * no_of_payable_days);
            const earned_food_allowance = customRound((fixed_food_allowance / no_of_days_in_month) * no_of_payable_days);
            const earned_site_allowance = customRound((fixed_site_allowance / no_of_days_in_month) * no_of_payable_days);
            const mobile_allowance = 0;
            // const earned_orthes = 1073;
            let earned_weekday_ot_wage = customRound((weekday_no_of_hours_overtime - nagativeotfinal) * fixed_weekday_ot_price_hr);
            if (earned_weekday_ot_wage < 0) {
                earned_weekday_ot_wage = 0;
            }
            const earned_sunday_holiday_ot_wage = customRound(sunday_holiday_no_of_hours_overtime * fixed_sunday_ot_price_hr);
            const earned_ot_wage = customRound(earned_weekday_ot_wage + earned_sunday_holiday_ot_wage);
            const earned_gross_total = customRound(earned_basic_da + earned_hra + earned_food_allowance + earned_site_allowance + mobile_allowance + earned_ot_wage + earned_others);

            //employee deduction wage data
            let deduction_pt = 0;
            if (earned_gross_total >= 25000) {
                deduction_pt = 200;
            }
            //EPF deduction
            const queryget = `select pf_applicable_or_not from employee where employeename = $1`;
            const queriesresult = await client.query(queryget, [employeename]);
            const pf_applicable_or_not = queriesresult.rows[0].pf_applicable_or_not;
            let deduction_epf;
            if (pf_applicable_or_not === true) {
                deduction_epf = customRound(earned_basic_da * 0.12);
            } else {
                deduction_epf = 0;
            }

            const deduction_wcp = 0;
            const deduction_incometax = 0;
            const deduction_salary_advance_company = customRound(advance_company);
            const deduction_salary_advance_thirdparty = customRound(advance_third_party);
            const deduction_fines_damages_loss = customRound(fines_damages_loss);
            const deduction_others = customRound(other_deduction);
            const deduction_total = customRound(deduction_epf + deduction_wcp + deduction_pt + deduction_incometax + deduction_salary_advance_company + deduction_salary_advance_thirdparty + deduction_fines_damages_loss + deduction_others);


            //net payable
            const net_salary = earned_gross_total - deduction_total;
            // get employee designation
            const getDesignationQuery = `SELECT designation FROM employee WHERE employeename = $1`;
            const designationResult = await client.query(getDesignationQuery, [employeename]);
            const designation = designationResult.rows[0].designation;
            // Assuming you have calculated all the necessary values for insertion
            const insertQuery = `
            INSERT INTO employeewagereference (
                employeename,
                designation,
                earned_basic_da,
                earned_hra,
                earned_food_allowance,
                earned_site_allowance,
                mobile_allowance,
                earned_ot_wage,
                earned_others,
                earned_gross_total,
                deduction_epf,
                deduction_wcp,
                deduction_pt,
                deduction_incometax,
                deduction_salary_advance_company,
                deduction_salary_advance_thirdparty,
                deduction_fines_damages_loss,
                deduction_others,
                deduction_total,
                net_salary,
                DATE,
                monthyear,
                weekday_ot_price,
                sunday_ot_price,
                work_orderno
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`;

            const insertValues = [
                employeename,
                designation,
                earned_basic_da,
                earned_hra,
                earned_food_allowance,
                earned_site_allowance,
                mobile_allowance,
                earned_ot_wage,
                earned_others,
                earned_gross_total,
                deduction_epf,
                deduction_wcp,
                deduction_pt,
                deduction_incometax,
                deduction_salary_advance_company,
                deduction_salary_advance_thirdparty,
                deduction_fines_damages_loss,
                deduction_others,
                deduction_total,
                net_salary,
                new Date(),
                monthyear,
                weekday_ot_price,
                sunday_ot_price,
                work_orderno
            ];

            await client.query(insertQuery, insertValues);
            console.log("test12")

            console.log("Employtee wage data inserted successfully");
        } else {

            //employee or workmen working data
            const workingdataQuery = `SELECT * FROM workingdata WHERE employeename = $1 and monthyear = $2 and work_orderno = $3`;
            const workingdataResult = await client.query(workingdataQuery, [employeename, monthyear, work_orderno]);

            const no_of_days_in_month = workingdataResult.rows[0].no_of_days_in_month;
            const no_of_present_days = workingdataResult.rows[0].no_of_present_days;
            const national_festival_holiday = workingdataResult.rows[0].national_festival_holiday;
            const no_of_payable_days = parseFloat(no_of_present_days) + parseFloat(national_festival_holiday);
            console.log("no_of_payable_days", no_of_payable_days);
            const weekday_no_of_hours_overtime = workingdataResult.rows[0].weekday_no_of_hours_overtime;
            const sunday_holiday_no_of_hours_overtime = workingdataResult.rows[0].sunday_holiday_no_of_hours_overtime;
            const advance_company = workingdataResult.rows[0].advance_company;
            const advance_third_party = workingdataResult.rows[0].advance_third_party;
            const nagativeot = workingdataResult.rows[0].nagativeot;
            const other_deduction = workingdataResult.rows[0].other_deduction;
            const fines_damages_loss = workingdataResult.rows[0].fines_damages_loss;
            const earned_others = workingdataResult.rows[0].earned_others;
            //const fixed_weekday_ot_price_hr = workingdataResult.rows[0].ref_fixed_weekday_ot_price;
            // const fixed_sunday_ot_price_hr = workingdataResult.rows[0].ref_fixed_sunday_ot_price;
            //const weekday_ot_price = fixed_weekday_ot_price_hr;
            //console.log("weekday_ot_price", weekday_ot_price);
            // const sunday_ot_price = fixed_sunday_ot_price_hr;
            // console.log("sunday_ot_price", sunday_ot_price);

            //employee fixed wage data
            const employeefixedwage = `select * from employeefixedwagereference where employeename = $1`;
            const employeefixedwageresult = await client.query(employeefixedwage, [employeename]);

            const fixed_basic_da = employeefixedwageresult.rows[0].basic_da;
            const fixed_hra = employeefixedwageresult.rows[0].hra;
            const fixed_food_allowance = employeefixedwageresult.rows[0].food_allowance;
            const fixed_site_allowance = employeefixedwageresult.rows[0].site_allowancce;
            const ref_fixed_mobile_allowance = 0;
            //const fixed_gross_total = employeefixedwageresult.rows[0].grossalary;
            const fixed_weekday_ot_price_hr = employeefixedwageresult.rows[0].weekday_ot_price;
            const fixed_sunday_ot_price_hr = employeefixedwageresult.rows[0].sunday_ot_price;
            const weekday_ot_price = fixed_weekday_ot_price_hr;
            const sunday_ot_price = fixed_sunday_ot_price_hr;
            //const fixed_gross_total = employeefixedwageresult.rows[0].grossalary;


            let nagativeotfinal = nagativeot;
            if (nagativeotfinal < 0) {
                nagativeotfinal = -nagativeotfinal;
            }

            //employee earned wage data
            const earned_basic_da = customRound((fixed_basic_da / no_of_days_in_month) * no_of_payable_days);
            const earned_hra = customRound((fixed_hra / no_of_days_in_month) * no_of_payable_days);
            const earned_food_allowance = customRound((fixed_food_allowance / no_of_days_in_month) * no_of_payable_days);
            const earned_site_allowance = customRound((fixed_site_allowance / no_of_days_in_month) * no_of_payable_days);
            const earned_orthes = 0;
            let earned_weekday_ot_wage = customRound((weekday_no_of_hours_overtime - nagativeotfinal) * fixed_weekday_ot_price_hr);
            if (earned_weekday_ot_wage < 0) {
                earned_weekday_ot_wage = 0;
            }
            const earned_sunday_holiday_ot_wage = customRound(sunday_holiday_no_of_hours_overtime * fixed_sunday_ot_price_hr);
            const earned_ot_wage = customRound(earned_weekday_ot_wage + earned_sunday_holiday_ot_wage);
            const earned_gross_total = customRound(earned_basic_da + earned_hra + earned_food_allowance + earned_site_allowance + earned_orthes + earned_ot_wage + earned_others);

            //employee deduction wage data
            let deduction_pt = 0;
            if (earned_gross_total >= 25000) {
                deduction_pt = 200;
            }

            //EPF deduction
            const queryget = `select pf_applicable_or_not from employee where employeename = $1`;
            const queriesresult = await client.query(queryget, [employeename]);
            const pf_applicable_or_not = queriesresult.rows[0].pf_applicable_or_not;
            console.log("----------------------------------------------------------------------------------");
            console.log("pf_applicable_or_not", pf_applicable_or_not);
            console.log("----------------------------------------------------------------------------------");
            let deduction_epf;
            if (pf_applicable_or_not === true) {
                deduction_epf = customRound(earned_basic_da * 0.12);
            } else {
                deduction_epf = 0;
            }

            const deduction_wcp = 0;
            const deduction_incometax = 0;
            const deduction_salary_advance_company = customRound(advance_company);
            const deduction_salary_advance_thirdparty = customRound(advance_third_party);
            const deduction_fines_damages_loss = customRound(fines_damages_loss);
            const deduction_others = customRound(other_deduction);
            const deduction_total = customRound(deduction_epf + deduction_wcp + deduction_pt + deduction_incometax + deduction_salary_advance_company + deduction_salary_advance_thirdparty + deduction_fines_damages_loss + deduction_others);

            //net payable
            const net_salary = earned_gross_total - deduction_total;


            const updateemployeewage = `UPDATE employeewagereference
                    SET earned_basic_da = $1,
                    earned_hra = $2,
                    earned_food_allowance = $3,
                    earned_site_allowance = $4,
                    earned_ot_wage = $5,
                    earned_gross_total = $6,
                    deduction_epf = $7,
                    deduction_wcp = $8,
                    deduction_pt = $9,
                    deduction_incometax = $10,
                    deduction_salary_advance_company = $11,
                    deduction_salary_advance_thirdparty = $12,
                    deduction_fines_damages_loss = $13,
                    deduction_others = $14,
                    deduction_total =$15,
                    net_salary = $16,
                    DATE = $17,
                    weekday_ot_price = $18,
                    sunday_ot_price = $19,
                    earned_orthes = $20,
                    earned_others = $24
                    where employeename = $21 and monthyear = $22 and work_orderno = $23`;

            const updateValues = [
                earned_basic_da,
                earned_hra,
                earned_food_allowance,
                earned_site_allowance,
                earned_ot_wage,
                earned_gross_total,
                deduction_epf,
                deduction_wcp,
                deduction_pt,
                deduction_incometax,
                deduction_salary_advance_company,
                deduction_salary_advance_thirdparty,
                deduction_fines_damages_loss,
                deduction_others,
                deduction_total,
                net_salary,
                new Date(),
                weekday_ot_price,
                sunday_ot_price,
                earned_orthes,
                employeename,
                monthyear,
                work_orderno,
                earned_others
            ];

            await client.query(updateemployeewage, updateValues);

            console.log("at employee wage earned_gross_total", earned_gross_total);

            console.log("Employtee wage data updated successfully");
        }//end of updating employee wage

    } catch (error) {// end of try block
        console.error('Error calculating employee wage:', error.message);
        res.status(500).send('Internal Server Error');
        return;
    }
}
/////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////
//Function to calculate employee wage for workmen statutory
async function calculateEmployeeWagestatutory(employeeName, MonthYear, Work_Orderno, res) {
    try {
        const employeename = employeeName;
        const monthyear = MonthYear;
        const work_orderno = Work_Orderno;

        // console.log("from wage statutory");
        // console.log("EMployeename ", employeename);
        // console.log("Monthyer", monthyear);
        // console.log("work_order", work_orderno);
        // Check if the employee record exists for the given month
        const employeewageQuery = `SELECT employeename FROM employeewagestatutory WHERE employeename = $1 AND monthyear = $2 AND work_orderno = $3`;
        //const employeeValues = [employeename, monthyear, work_orderno];
        const employeeResult = await client.query(employeewageQuery, [employeename, monthyear, work_orderno]);

        if (employeeResult.rows.length === 0) {
            //employee or workmen working data
            const workingdataQuery = `SELECT * FROM workingdata WHERE employeename = $1 and monthyear = $2 and status = $3 AND work_orderno = $4`;
            const workingdataResult = await client.query(workingdataQuery, [employeename, monthyear, 'WORKING', work_orderno]);


            const no_of_days_in_month = workingdataResult.rows[0].no_of_days_in_month;
            const no_of_present_days = workingdataResult.rows[0].no_of_present_days;
            const national_festival_holiday = workingdataResult.rows[0].national_festival_holiday;
            const no_of_payable_days = parseFloat(no_of_present_days + national_festival_holiday);
            const weekday_no_of_hours_overtime = workingdataResult.rows[0].weekday_no_of_hours_overtime;
            const sunday_holiday_no_of_hours_overtime = workingdataResult.rows[0].sunday_holiday_no_of_hours_overtime;
            let total_ot_hrs_final = parseInt(weekday_no_of_hours_overtime + sunday_holiday_no_of_hours_overtime);
            const advance_company = workingdataResult.rows[0].advance_company;
            const advance_third_party = workingdataResult.rows[0].advance_third_party;
            //const nagativeot = workingdataResult.rows[0].nagativeot;
            const other_deduction = workingdataResult.rows[0].other_deduction;
            const fines_damages_loss = workingdataResult.rows[0].fines_damages_loss;


            if (parseFloat(total_ot_hrs_final) > no_of_payable_days) {
                total_ot_hrs_final = parseInt(no_of_payable_days);
            }

            //worker reference wage data 
            const getworkmenrefdata = `SELECT designation, net_salary FROM employeewagereference WHERE employeename = $1 AND monthyear = $2 AND work_orderno = $3`;
            const getworkmenrefdataresult = await client.query(getworkmenrefdata, [employeename, monthyear, work_orderno]);

            const designation = getworkmenrefdataresult.rows[0].designation;

            let statutory_total_ot = parseFloat(total_ot_hrs_final);

            //employee fixed wage data
            const employeefixedwage = `select * from employeefixedwagestatutory where employeename = $1`;
            const employeefixedwageresult = await client.query(employeefixedwage, [employeename]);

            const fixed_basic_da = employeefixedwageresult.rows[0].basic_da;
            const fixed_hra = employeefixedwageresult.rows[0].hra;
            const fixed_food_allowance = employeefixedwageresult.rows[0].food_allowance;
            const fixed_site_allowance = employeefixedwageresult.rows[0].site_allowancce;
            const fixed_gross_total = employeefixedwageresult.rows[0].grossalary;
            //const fixed_weekday_ot_price_hr = employeefixedwageresult.rows[0].weekday_ot_price;
            //const fixed_sunday_ot_price_hr = employeefixedwageresult.rows[0].sunday_ot_price;

            //employee earned wage data
            const earned_basic_da = customRound((fixed_basic_da / no_of_days_in_month) * no_of_payable_days);
            const earned_hra = customRound((fixed_hra / no_of_days_in_month) * no_of_payable_days);
            const earned_food_allowance = customRound((fixed_food_allowance / no_of_days_in_month) * no_of_payable_days);
            const earned_site_allowance = customRound((fixed_site_allowance / no_of_days_in_month) * no_of_payable_days);
            const mobile_allowance = 0;
            let ot_price_hr = customRound((fixed_gross_total / no_of_days_in_month) / 8);
            let earned_ot_wage = customRound(statutory_total_ot * (ot_price_hr * 2));
            let earned_incentive = 0;
            let earned_gross_total = customRound(earned_basic_da + earned_hra + earned_food_allowance + earned_site_allowance + mobile_allowance + earned_ot_wage + earned_incentive);


            let deduction_pt = 0;
            if (earned_gross_total >= 25000) {
                deduction_pt = 200;
            }

            //EPF deduction
            const queryget = `select pf_applicable_or_not from employee where employeename = $1`;
            const queriesresult = await client.query(queryget, [employeename]);
            const pf_applicable_or_not = queriesresult.rows[0].pf_applicable_or_not;
            let deduction_epf;
            if (pf_applicable_or_not == true) {
                deduction_epf = customRound(earned_basic_da * 0.12);
            } else {
                deduction_epf = 0;
            }

            const deduction_wcp = 0;
            const deduction_incometax = 0;
            const deduction_salary_advance_company = customRound(advance_company);
            const deduction_salary_advance_thirdparty = customRound(advance_third_party);
            const deduction_fines_damages_loss = customRound(fines_damages_loss);
            let deduction_others = customRound(other_deduction);
            let deduction_total = customRound(deduction_epf + deduction_wcp + deduction_pt + deduction_incometax + deduction_salary_advance_company + deduction_salary_advance_thirdparty + deduction_fines_damages_loss + deduction_others);

            const workmen_ref_net_salary = getworkmenrefdataresult.rows[0].net_salary;
            const net_salary = customRound(earned_gross_total - deduction_total);

            if (net_salary > workmen_ref_net_salary) {
                deduction_others = deduction_others + (net_salary - workmen_ref_net_salary);
                if (deduction_others > earned_ot_wage) {
                    deduction_others = 0;
                    ot_price_hr = 0;
                    earned_ot_wage = 0;
                }
            } else {
                earned_incentive = workmen_ref_net_salary - net_salary;
            }

            earned_gross_total = customRound(earned_basic_da + earned_hra + earned_food_allowance + earned_site_allowance + mobile_allowance + earned_ot_wage + earned_incentive);
            //let deduction_pt = 0;
            if (earned_gross_total >= 25000) {
                deduction_pt = 200;
            } else {
                deduction_pt = 0;
            }
            deduction_total = customRound(deduction_epf + deduction_wcp + deduction_pt + deduction_incometax + deduction_salary_advance_company + deduction_salary_advance_thirdparty + deduction_fines_damages_loss + deduction_others);


            let workmen_statutory_net_salary = customRound(earned_gross_total - deduction_total);

            if (workmen_statutory_net_salary > workmen_ref_net_salary) {
                deduction_others = deduction_others + (workmen_statutory_net_salary - workmen_ref_net_salary);
            } else {
                earned_incentive = earned_incentive + (workmen_ref_net_salary - workmen_statutory_net_salary);
            }
            deduction_total = customRound(deduction_epf + deduction_wcp + deduction_pt + deduction_incometax + deduction_salary_advance_company + deduction_salary_advance_thirdparty + deduction_fines_damages_loss + deduction_others);
            earned_gross_total = customRound(earned_basic_da + earned_hra + earned_food_allowance + earned_site_allowance + mobile_allowance + earned_ot_wage + earned_incentive);

            workmen_statutory_net_salary = customRound(earned_gross_total - deduction_total);

            console.log("From Statutory Before initialization", work_orderno);
            // Assuming you have calculated all the necessary values for insertion
            const insertQuery = `
            INSERT INTO employeewagestatutory (
                employeename,
                designation,
                statutory_total_ot,
                earned_basic_da,
                earned_hra,
                earned_food_allowance,
                earned_site_allowance,
                mobile_allowance,
                earned_ot_wage,
                incentive,
                others,
                earned_gross_total,
                deduction_epf,
                deduction_wcp,
                deduction_pt,
                deduction_incometax,
                deduction_salary_advance_company,
                deduction_salary_advance_thirdparty,
                deduction_fines_damages_loss,
                deduction_others,
                deduction_total,
                net_salary,
                DATE,
                monthyear,
                work_orderno
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`;

            const insertValues = [
                employeename,
                designation,
                statutory_total_ot,
                earned_basic_da,
                earned_hra,
                earned_food_allowance,
                earned_site_allowance,
                mobile_allowance,
                earned_ot_wage,
                earned_incentive,
                0,
                earned_gross_total,
                deduction_epf,
                deduction_wcp,
                deduction_pt,
                deduction_incometax,
                deduction_salary_advance_company,
                deduction_salary_advance_thirdparty,
                deduction_fines_damages_loss,
                deduction_others,
                deduction_total,
                workmen_statutory_net_salary,
                new Date(),
                monthyear,
                work_orderno
            ];

            await client.query(insertQuery, insertValues);

            console.log("Employtee Statutory wage data inserted successfully");
        } else {
            //employee or workmen working data
            const workingdataQuery = `SELECT * FROM workingdata WHERE employeename = $1 and monthyear =$2 AND work_orderno = $3`;
            const workingdataResult = await client.query(workingdataQuery, [employeename, monthyear, work_orderno]);


            const no_of_days_in_month = workingdataResult.rows[0].no_of_days_in_month;
            const no_of_present_days = workingdataResult.rows[0].no_of_present_days;
            const national_festival_holiday = workingdataResult.rows[0].national_festival_holiday;
            const no_of_payable_days = parseFloat(no_of_present_days + national_festival_holiday);
            const weekday_no_of_hours_overtime = workingdataResult.rows[0].weekday_no_of_hours_overtime;
            const sunday_holiday_no_of_hours_overtime = workingdataResult.rows[0].sunday_holiday_no_of_hours_overtime;
            let total_ot_hrs_final = parseInt(weekday_no_of_hours_overtime + sunday_holiday_no_of_hours_overtime);
            const advance_company = workingdataResult.rows[0].advance_company;
            const advance_third_party = workingdataResult.rows[0].advance_third_party;
            //const nagativeot = workingdataResult.rows[0].nagativeot;
            const other_deduction = workingdataResult.rows[0].other_deduction;
            const fines_damages_loss = workingdataResult.rows[0].fines_damages_loss;

            console.log("total_ot_hrs_final", total_ot_hrs_final);
            console.log("no_of_payable_days", no_of_payable_days);
            if (parseFloat(total_ot_hrs_final) > no_of_payable_days) {
                total_ot_hrs_final = no_of_payable_days;
            }

            //worker reference wage data 
            const getworkmenrefdata = `SELECT designation, net_salary FROM employeewagereference WHERE employeename = $1 AND monthyear = $2 AND work_orderno = $3`;
            const getworkmenrefdataresult = await client.query(getworkmenrefdata, [employeename, monthyear, work_orderno]);

            const designation = getworkmenrefdataresult.rows[0].designation;

            let statutory_total_ot = total_ot_hrs_final;
            console.log("statutory_total_ot", statutory_total_ot);


            //employee fixed wage data
            const employeefixedwage = `select * from employeefixedwagestatutory where employeename = $1`;
            const employeefixedwageresult = await client.query(employeefixedwage, [employeename]);

            const fixed_basic_da = employeefixedwageresult.rows[0].basic_da;
            const fixed_hra = employeefixedwageresult.rows[0].hra;
            const fixed_food_allowance = employeefixedwageresult.rows[0].food_allowance;
            const fixed_site_allowance = employeefixedwageresult.rows[0].site_allowancce;
            const fixed_gross_total = employeefixedwageresult.rows[0].grossalary;

            //employee earned wage data
            const earned_basic_da = customRound((fixed_basic_da / no_of_days_in_month) * no_of_payable_days);
            const earned_hra = customRound((fixed_hra / no_of_days_in_month) * no_of_payable_days);
            const earned_food_allowance = customRound((fixed_food_allowance / no_of_days_in_month) * no_of_payable_days);
            const earned_site_allowance = customRound((fixed_site_allowance / no_of_days_in_month) * no_of_payable_days);
            const mobile_allowance = 0;
            let ot_price_hr = customRound((fixed_gross_total / no_of_days_in_month) / 8);
            let earned_ot_wage = customRound(statutory_total_ot * (ot_price_hr * 2));
            let earned_incentive = 0;
            let earned_gross_total = customRound(earned_basic_da + earned_hra + earned_food_allowance + earned_site_allowance + mobile_allowance + earned_ot_wage + earned_incentive);
            console.log("earned_gross_total", earned_gross_total);
            let deduction_pt = 0;
            if (earned_gross_total >= 25000) {
                deduction_pt = 200;
            }
            //EPF deduction
            const queryget = `select pf_applicable_or_not from employee where employeename = $1`;
            const queriesresult = await client.query(queryget, [employeename]);
            const pf_applicable_or_not = queriesresult.rows[0].pf_applicable_or_not;
            let deduction_epf;
            if (pf_applicable_or_not == true) {
                deduction_epf = customRound(earned_basic_da * 0.12);
            } else {
                deduction_epf = 0;
            }

            const deduction_wcp = 0;
            const deduction_incometax = 0;
            const deduction_salary_advance_company = customRound(advance_company);
            const deduction_salary_advance_thirdparty = customRound(advance_third_party);
            const deduction_fines_damages_loss = customRound(fines_damages_loss);
            let deduction_others = customRound(other_deduction);
            let deduction_total = customRound(deduction_epf + deduction_wcp + deduction_pt + deduction_incometax + deduction_salary_advance_company + deduction_salary_advance_thirdparty + deduction_fines_damages_loss + deduction_others);
            const workmen_ref_net_salary = getworkmenrefdataresult.rows[0].net_salary;
            const net_salary = customRound(earned_gross_total - deduction_total);

            if (net_salary > workmen_ref_net_salary) {
                deduction_others = deduction_others + (net_salary - workmen_ref_net_salary);
                if (deduction_others > earned_ot_wage) {
                    deduction_others = 0;
                    ot_price_hr = 0;
                    earned_ot_wage = 0;
                }
            } else {
                earned_incentive = workmen_ref_net_salary - net_salary;
            }

            earned_gross_total = customRound(earned_basic_da + earned_hra + earned_food_allowance + earned_site_allowance + mobile_allowance + earned_ot_wage + earned_incentive);
            //let deduction_pt = 0;
            if (earned_gross_total >= 25000) {
                deduction_pt = 200;
            } else {
                deduction_pt = 0;
            }
            deduction_total = customRound(deduction_epf + deduction_wcp + deduction_pt + deduction_incometax + deduction_salary_advance_company + deduction_salary_advance_thirdparty + deduction_fines_damages_loss + deduction_others);


            let workmen_statutory_net_salary = customRound(earned_gross_total - deduction_total);

            if (workmen_statutory_net_salary > workmen_ref_net_salary) {
                deduction_others = deduction_others + (workmen_statutory_net_salary - workmen_ref_net_salary);
            } else {
                earned_incentive = earned_incentive + (workmen_ref_net_salary - workmen_statutory_net_salary);
            }
            earned_gross_total = customRound(earned_basic_da + earned_hra + earned_food_allowance + earned_site_allowance + mobile_allowance + earned_ot_wage + earned_incentive);
            deduction_total = customRound(deduction_epf + deduction_wcp + deduction_pt + deduction_incometax + deduction_salary_advance_company + deduction_salary_advance_thirdparty + deduction_fines_damages_loss + deduction_others);


            workmen_statutory_net_salary = customRound(earned_gross_total - deduction_total);

            const upadateQuery = `
                UPDATE employeewagestatutory 
                SET
                    earned_basic_da = $1,
                    earned_hra = $2,
                    earned_food_allowance = $3,
                    earned_site_allowance = $4,
                    mobile_allowance = $5,
                    earned_ot_wage = $6,
                    incentive = $7,
                    others = $8,
                    earned_gross_total = $9,
                    deduction_epf = $10,
                    deduction_wcp = $11,
                    deduction_pt = $12,
                    deduction_incometax = $13,
                    deduction_salary_advance_company = $14,
                    deduction_salary_advance_thirdparty = $15,
                    deduction_fines_damages_loss = $16,
                    deduction_others = $17,
                    deduction_total = $18,
                    net_salary = $19,
                    DATE = $20,
                    statutory_total_ot = $21
                WHERE 
                    employeename = $22 
                    AND monthyear = $23
                    AND work_orderno = $24
            `;

            const updateValues = [
                earned_basic_da,
                earned_hra,
                earned_food_allowance,
                earned_site_allowance,
                mobile_allowance,
                earned_ot_wage,
                earned_incentive,
                0,
                earned_gross_total,
                deduction_epf,
                deduction_wcp,
                deduction_pt,
                deduction_incometax,
                deduction_salary_advance_company,
                deduction_salary_advance_thirdparty,
                deduction_fines_damages_loss,
                deduction_others,
                deduction_total,
                workmen_statutory_net_salary,
                new Date(),
                statutory_total_ot,
                employeename,
                monthyear,
                work_orderno
            ];

            await client.query(upadateQuery, updateValues);

            console.log("Employtee Statutory wage data updated successfully");

        }//end of updating employee wage

    } catch (error) {// end of try block
        console.error('Error calculating employee wage:', error.message);
        res.status(500).send('Internal Server Error');
        return;
    }
}
/////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////
//Function to calculate eployee of vedor wage 
//Calculating vendor salry wage
async function calculatevendorwage(employeeName, MonthYear, res) {
    try {
        const employeename = employeeName;
        const monthyear = MonthYear;

        console.log("employee name", employeename);
        console.log("monthyear", monthyear);

        //check existence
        const checkexist = `select employeename from employeevendorwage where employeename = $1 and monthyear = $2`;
        const checkexistresult = await client.query(checkexist, [employeename, monthyear]);

        if (checkexistresult.rows.length === 0) {
            //employee or workmen working data
            const workingdataQuery = `
                SELECT * FROM workingdata
                WHERE employeename = $1 and monthyear =$2`;

            const workingdataResult = await client.query(workingdataQuery, [employeename, monthyear]);

            const no_of_days_in_month = workingdataResult.rows[0].no_of_days_in_month;
            const no_of_present_days = workingdataResult.rows[0].no_of_present_days;
            const national_festival_holiday = workingdataResult.rows[0].national_festival_holiday;
            const no_of_payable_days = no_of_present_days + national_festival_holiday;
            const weekday_no_of_hours_overtime = workingdataResult.rows[0].weekday_no_of_hours_overtime;
            const sunday_holiday_no_of_hours_overtime = workingdataResult.rows[0].sunday_holiday_no_of_hours_overtime;
            const salary_advance_company = customRound(workingdataResult.rows[0].advance_company);
            const salary_advance_thirdparty = customRound(workingdataResult.rows[0].advance_third_party);
            const nagativeot = workingdataResult.rows[0].nagativeot;
            const other_deduction = customRound(workingdataResult.rows[0].other_deduction);
            const fines_damages_loss = customRound(workingdataResult.rows[0].fines_damages_loss);

            const employeefixedwage = `select * from employeevendor where employeename = $1`;
            const employeefixedwageresult = await client.query(employeefixedwage, [employeename]);
            //const fixed_basic_da = employeefixedwageresult.rows[0].fixed_basic_da;
            const fixed_gross_total = employeefixedwageresult.rows[0].gross_salary;
            console.log("fixed_gross_total", fixed_gross_total);
            const working_hours_day = employeefixedwageresult.rows[0].working_hours_day;
            const weekday_ot_type = employeefixedwageresult.rows[0].weekday_ot_type
            const sunday_ot_type = employeefixedwageresult.rows[0].sunday_ot_type;
            const designation = employeefixedwageresult.rows[0].designation

            const weekday_ot_price_hr = customRound((fixed_gross_total / no_of_days_in_month / working_hours_day) * weekday_ot_type);
            const sunday_holiday_ot_price_hr = customRound((fixed_gross_total / no_of_days_in_month / working_hours_day) * sunday_ot_type);
            let nagativeotfinal = nagativeot;
            if (nagativeotfinal < 0) {
                nagativeotfinal = -nagativeotfinal;
            }

            const earned_salary = customRound((fixed_gross_total / no_of_days_in_month) * no_of_payable_days);
            //console.log(" ")
            const earned_otwage_weekday = customRound((weekday_no_of_hours_overtime - nagativeotfinal) * weekday_ot_price_hr);
            const earned_otwage_sunday_holiday = customRound(sunday_holiday_no_of_hours_overtime * sunday_holiday_ot_price_hr);
            const earned_otwage = customRound(earned_otwage_weekday + earned_otwage_sunday_holiday);
            //const earned_ot_wage = earned_otwage_weekday + 
            const gross_total = customRound(earned_salary + earned_otwage);

            //deduction wage
            const deduction_total = customRound(salary_advance_company + salary_advance_thirdparty + other_deduction + fines_damages_loss);
            const net_salary = customRound(gross_total - deduction_total);

            const insertquery = `INSERT INTO employeevendorwage ( 
                employeename,
                designation,
                weekday_ot_hours,
                holiday_ot_hours,
                payable_days,
                earned_salary,
                earned_ot_wage,
                earned_gross_salary,
                salary_advance_company,
                salary_advance_thirdparty,
                total_deduction,
                netsalary,
                monthyear,
                date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`;

            const currentDate = new Date();
            await client.query(insertquery, [
                employeename,
                designation,
                weekday_no_of_hours_overtime,
                sunday_holiday_no_of_hours_overtime,
                no_of_payable_days,
                earned_salary,
                earned_otwage,
                gross_total,
                salary_advance_company,
                salary_advance_thirdparty,
                deduction_total,
                net_salary,
                monthyear,
                currentDate
            ]);

            console.log("Vendor wage details stored successfully");

        } else {
            //employee or workmen working data
            const workingdataQuery = `
                SELECT * FROM workingdata
                WHERE employeename = $1 and monthyear =$2`;

            const workingdataResult = await client.query(workingdataQuery, [employeename, monthyear]);

            const no_of_days_in_month = workingdataResult.rows[0].no_of_days_in_month;
            const no_of_present_days = workingdataResult.rows[0].no_of_present_days;
            const national_festival_holiday = workingdataResult.rows[0].national_festival_holiday;
            const no_of_payable_days = no_of_present_days + national_festival_holiday;
            const weekday_no_of_hours_overtime = workingdataResult.rows[0].weekday_no_of_hours_overtime;
            const sunday_holiday_no_of_hours_overtime = workingdataResult.rows[0].sunday_holiday_no_of_hours_overtime;
            const salary_advance_company = customRound(workingdataResult.rows[0].advance_company);
            const salary_advance_thirdparty = customRound(workingdataResult.rows[0].advance_third_party);
            const nagativeot = workingdataResult.rows[0].nagativeot;
            const other_deduction = customRound(workingdataResult.rows[0].other_deduction);
            const fines_damages_loss = customRound(workingdataResult.rows[0].fines_damages_loss);

            const employeefixedwage = `select designation, gross_salary, working_hours_day, weekday_ot_type, sunday_ot_type from employeevendor where employeename = $1`;
            const employeefixedwageresult = await client.query(employeefixedwage, [employeename]);
            //const fixed_basic_da = employeefixedwageresult.rows[0].fixed_basic_da;
            const fixed_gross_total = employeefixedwageresult.rows[0].gross_salary;
            const working_hours_day = employeefixedwageresult.rows[0].working_hours_day;
            const weekday_ot_type = employeefixedwageresult.rows[0].weekday_ot_type
            const sunday_ot_type = employeefixedwageresult.rows[0].sunday_ot_type;
            const designation = employeefixedwageresult.rows[0].designation
            const weekday_ot_price_hr = customRound((fixed_gross_total / no_of_days_in_month / working_hours_day) * weekday_ot_type);
            console.log("fixed_gross_total", fixed_gross_total);
            console.log("no_of_days_in_month", no_of_days_in_month);
            console.log("working_hours_day", working_hours_day);
            console.log("weekday_ot_type", weekday_ot_type);
            console.log("weekday_ot_price_hr", weekday_ot_price_hr);
            const sunday_holiday_ot_price_hr = customRound((fixed_gross_total / no_of_days_in_month / working_hours_day) * sunday_ot_type);
            let nagativeotfinal = nagativeot;
            if (nagativeotfinal < 0) {
                nagativeotfinal = -nagativeotfinal;
            }

            const earned_salary = customRound((fixed_gross_total / no_of_days_in_month) * no_of_payable_days);
            const earned_otwage_weekday = customRound((weekday_no_of_hours_overtime - nagativeotfinal) * weekday_ot_price_hr);
            const earned_otwage_sunday_holiday = customRound(sunday_holiday_no_of_hours_overtime * sunday_holiday_ot_price_hr);
            const earned_otwage = customRound(earned_otwage_weekday + earned_otwage_sunday_holiday);
            //const earned_ot_wage = earned_otwage_weekday + 
            const gross_total = customRound(earned_salary + earned_otwage);

            //deduction wage
            const deduction_total = customRound(salary_advance_company + salary_advance_thirdparty + other_deduction + fines_damages_loss);
            const net_salary = customRound(gross_total - deduction_total);

            const updatequery = `UPDATE employeevendorwage SET
                weekday_ot_hours = $1,
                holiday_ot_hours = $2,
                payable_days = $3,
                earned_salary = $4,
                earned_ot_wage = $5,
                earned_gross_salary = $6,
                salary_advance_company = $7,
                salary_advance_thirdparty = $8,
                total_deduction = $9,
                netsalary = $10,
                date = $11
                where employeename = $12 and monthyear = $13`;

            const currentDate = new Date();
            await client.query(updatequery, [
                weekday_no_of_hours_overtime,
                sunday_holiday_no_of_hours_overtime,
                no_of_payable_days,
                earned_salary,
                earned_otwage,
                gross_total,
                salary_advance_company,
                salary_advance_thirdparty,
                deduction_total,
                net_salary,
                currentDate,
                employeename,
                monthyear
            ]);

            console.log("Vendor wage details updated successfully");
        }

    } catch (error) {// end of try block
        console.error('Error calculating employee wage:', error.message);
        res.status(500).send('Internal Server Error');
        return;
    }
}
////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GET employees name for attendance
app.get('/employeesnameforattendance', async (req, res) => {
    try {
        const employeeQuery = `SELECT employeename FROM employee ORDER BY employeename`;
        const employeeVendorQuery = `SELECT employeename FROM employeevendor`;

        const employeeResult = await client.query(employeeQuery);
        const employeeVendorResult = await client.query(employeeVendorQuery);

        // Concatenate the rows from both queries
        const allEmployeeNames = [...employeeResult.rows, ...employeeVendorResult.rows];

        res.json(allEmployeeNames);
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GET contractor name for employee form
app.get('/contractorname', async (req, res) => {
    try {
        const { rows } = await client.query(`SELECT contractor_name FROM contractor`);
        res.json(rows);
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//GET work order number for employee form
app.get('/workorderno', async (req, res) => {
    try {
        const { rows } = await client.query(`SELECT workorderno FROM workorderdata WHERE status != 'COMPLETED' ORDER BY workorderno`);
        res.json(rows);
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//API to get details for worker reference wage table
app.get('/employeewagereference', async (req, res) => {
    try {
        const query = `
            SELECT
                ey.id,
                e.employeename,
                e.designation,
                w.ref_fixed_basic_da,
                w.ref_fixed_hra,
                w.ref_fixed_food_allowance,
                w.ref_fixed_site_allowance,
                w.ref_fixed_gross_salary,
                w.ref_fixed_weekday_ot_price,
                w.ref_fixed_sunday_ot_price,
                w.no_of_days_in_month,
                w.no_of_present_days,
                w.national_festival_holiday,
                w.no_of_present_days + w.national_festival_holiday AS no_payable_days,
                w.weekday_no_of_hours_overtime + w.nagativeot AS weekday_no_of_hours_overtime,
                w.sunday_holiday_no_of_hours_overtime,
                e.earned_basic_da,
                e.earned_hra,
                e.earned_food_allowance,
                e.earned_site_allowance,
                e.earned_ot_wage,
                e.earned_others,
                e.earned_gross_total,
                e.deduction_wcp,
                e.deduction_epf,
                e.deduction_pt,
                e.deduction_incometax,
                e.deduction_salary_advance_company,
                e.deduction_salary_advance_thirdparty,
                e.deduction_fines_damages_loss,
                e.deduction_others,
                e.deduction_total,
                e.net_salary,
                e.monthyear,
                w.work_orderno
            FROM 
                employeewagereference e 
                JOIN workingdata w ON e.employeename = w.employeename AND e.monthyear = w.monthyear AND w.work_orderno = e.work_orderno
                JOIN employee ey ON ey.employeename = e.employeename
                ORDER BY e.employeename`;


        const { rows } = await client.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching employee wage data:', error.message); // Log the error message
        res.status(500).json({ error: 'Internal server error' });
    }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//API to get details for worker statutory wage table
app.get('/employeewagestatutory', async (req, res) => {
    try {
        //let monthyear = 22024;
        const query = `SELECT
            ey.id,
            e.employeename,
            e.designation,
            ey.uan_no,
            ey.pfnumber,
            w.statutory_fixed_basic_da,
            w.statutory_fixed_hra,
            w.statutory_fixed_food_allowance,
            w.statutory_fixed_site_allowance,
            w.statutory_fixed_gross_salary,
            w.no_of_days_in_month,
            w.no_of_present_days,
            w.national_festival_holiday,
            w.no_of_present_days + w.national_festival_holiday AS no_payable_days,
            e.statutory_total_ot,
            e.earned_basic_da,
            e.earned_hra,
            e.earned_food_allowance,
            e.earned_site_allowance,
            e.earned_ot_wage,
            e.incentive,
            e.others,
            e.earned_gross_total,
            e.deduction_wcp,
            e.deduction_epf,
            e.deduction_pt,
            e.deduction_incometax,
            e.deduction_salary_advance_company,
            e.deduction_salary_advance_thirdparty,
            e.deduction_fines_damages_loss,
            e.deduction_others,
            e.deduction_total,
            e.net_salary,
            e.monthyear,
            w.work_orderno
            FROM employeewagestatutory e 
            JOIN workingdata w ON e.employeename = w.employeename and e.monthyear = w.monthyear AND w.work_orderno = e.work_orderno
            JOIN employeefixedwagestatutory ef ON ef.employeename = e.employeename
            JOIN employee ey ON ey.employeename = e.employeename
            ORDER BY e.employeename`;
        const { rows } = await client.query(query);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching employee wage data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//API to get details for vedorwage table
app.get('/employeevendordata', async (req, res) => {
    try {
        //const monthyear = 32024;
        const query = `SELECT  
        ev.employeename,
        ev.designation,
        e.gross_salary,
        ev.weekday_ot_hours,
        ev.holiday_ot_hours,
        ev.payable_days,
        ev.earned_salary,
        ev.earned_ot_wage,
        ev.earned_gross_salary,
        ev.salary_advance_company,
        ev.salary_advance_thirdparty,
        ev.total_deduction,
        ev.netsalary,
        ev.monthyear
    FROM   
    employeevendorwage ev 
        INNER JOIN employeevendor e ON e.employeename = ev.employeename `;
        const { rows } = await client.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching employee wage data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////
//Muster Roll
// Function to fetch data from the database
async function fetchData() {
    try {
        const query = `
        SELECT employeename, TO_CHAR(in_date AT TIME ZONE 'UTC', 'DD-MM-YYYY') AS in_date
        FROM dailyattendance
        WHERE EXTRACT(MONTH FROM date) = 3;
      `;
        const result = await client.query(query);
        return result.rows;
    } catch (error) {
        console.error('Error executing query:', error);
    }
}

// Function to transform fetched data into the required format
async function transformData() {
    const fetchedData = await fetchData();

    // Initialize an object to store transformed data
    const transformedData = {};

    // Loop through each record in fetched data
    fetchedData.forEach(record => {
        const { employeename, in_date } = record;
        const dayOfMonth = parseInt(in_date.split('-')[0]); // Extract day of the month

        // If the day of the month doesn't exist in transformedData, initialize it
        if (!transformedData[dayOfMonth]) {
            transformedData[dayOfMonth] = {};
        }

        // Mark attendance for the employee on that day as 1
        transformedData[dayOfMonth][employeename] = 1;
    });

    // Fill in missing days with 0 attendance for each employee
    for (let day = 1; day <= 31; day++) {
        if (!transformedData[day]) {
            transformedData[day] = {};
        }

        fetchedData.forEach(record => {
            const { employeename } = record;
            if (!transformedData[day][employeename]) {
                transformedData[day][employeename] = 0;
            }
        });
    }

    return transformedData;
}

// Endpoint to fetch transformed attendance data
app.get('/api/attendance', async (req, res) => {
    try {
        const transformedData = await transformData();
        res.json(transformedData);
    } catch (error) {
        console.error('Error fetching and transforming data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/////////////////////////////////////////////////////////////////////////////




///////////////////////////////////////////////////////////////////////////////////////////
//Retreiving daily attendance details
app.get('/dailyattendancedata', async (req, res) => {
    try {
        // SQL query to fetch daily attendance data and group by employee and month/year
        const query = ` SELECT 
                            employeename, 
                            TO_CHAR(in_date AT TIME ZONE 'IST', 'DD-MM-YY') AS formatted_in_date,
                            noOfPresentDays AS Attendance,
                            TO_CHAR (date AT TIME ZONE 'IST', 'DD-MM-YY') AS formated_date,
                            TO_CHAR(in_time, 'HH24:MI') AS in_time,
                            TO_CHAR (out_date AT TIME ZONE 'IST', 'DD-MM-YY') AS formated_out_date,
                            TO_CHAR(out_time, 'HH24:MI') AS out_time,
                            totalworkinghours,
                            today_ot,
                            work_orderno,
                            stataus
                        FROM 
                            dailyattendance
                        ORDER BY 
                            EXTRACT(MONTH FROM in_date AT TIME ZONE 'IST') DESC,
                            employeename ASC,
                            formatted_in_date ASC,  
                            work_orderno

                            `;

        const { rows } = await client.query(query);


        // Send the grouped data as a response to the frontend
        res.json(rows);
    } catch (error) {
        console.error('Error fetching daily attendance data:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////
//delete daily attendance data
app.post('/deleteattendancedata', async (req, res) => {
    try {
        const { name, date } = req.body; // date format mm-dd-yyyy

        const [month, day, year] = date.split('-');
        const monthyear = month.toString() + year.toString();

        const getquery = `SELECT totalworkinghours, today_ot
                          FROM dailyattendance 
                          WHERE employeename = $1 AND in_date = $2 AND stataus != $3`;
        const resultgetquery = await client.query(getquery, [name, date, 'COMPUTED']);

        if (resultgetquery.rows.length === 0) {
            return res.status(404).json({ error: 'attendance data Computed for the given date' });
        }

        const totalworkinghours = resultgetquery.rows[0].totalworkinghours || 0;
        const today_ot = resultgetquery.rows[0].today_ot || 0;

        let sunday_ot = 0;
        let weekday_ot = 0;
        let presentdays = 0;

        if (totalworkinghours === today_ot) {
            sunday_ot = parseFloat(today_ot);
        } else {
            weekday_ot = parseFloat(today_ot);
            presentdays = 1;
        }

        const updatequery = `UPDATE workingdata 
                             SET 
                             no_of_present_days = no_of_present_days - $1,
                             weekday_no_of_hours_overtime = weekday_no_of_hours_overtime - $2,
                             sunday_holiday_no_of_hours_overtime = sunday_holiday_no_of_hours_overtime - $3
                             WHERE employeename = $4 AND monthyear = $5 AND status != $6`;
        await client.query(updatequery, [presentdays, weekday_ot, sunday_ot, name, monthyear, 'FREEZED']);

        const deleteQuery = `DELETE FROM dailyattendance WHERE employeename = $1 AND in_date = $2`;
        await client.query(deleteQuery, [name, date]);
        res.send(`${name} attendance data deleted for the date ${date}`);
    } catch (error) {
        console.error('Error deleting daily attendance data:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////
//retriving workorder details
app.get('/workorderdata', async (req, res) => {
    try {
        // SQL query to fetch daily attendance data and group by employee and month/year
        const query = ` SELECT 
                          workorderno, sitename, address, siteengineername, contactno,emailid, status
                        FROM 
                        workorderdata
                        ORDER BY 
                        workorderno `;

        const { rows } = await client.query(query);

        // Send the grouped data as a response to the frontend
        res.json(rows);
    } catch (error) {
        console.error('Error fetching daily attendance data:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////
//retreive working data
app.get('/workingdata&advances', async (req, res) => {
    try {
        // SQL query to fetch daily attendance data and group by employee and month/year
        const query = ` SELECT 
                          wd.employeename, wd.monthyear,e.work_orderno, w.sitename, e.contractor_vendor_name, wd.no_of_days_in_month, wd.no_of_present_days, wd.national_festival_holiday,
                          (wd.no_of_present_days + wd.national_festival_holiday) AS payable_days,
                          (wd.weekday_no_of_hours_overtime + wd.nagativeot) AS weekday_no_of_hours_overtime,
                          wd.sunday_holiday_no_of_hours_overtime, wd.other_deduction, wd.fines_damages_loss, wd.status,
                          wd.advance_company, advance_third_party, wd.work_orderno
                        FROM 
                        workingdata wd
                        JOIN employee e ON e.employeename = wd.employeename
                        JOIN workorderdata w ON w.workorderno = wd.work_orderno
                        ORDER BY 
                        monthyear DESC, wd.work_orderno, e.contractor_vendor_name,  wd.employeename`;

        const { rows } = await client.query(query);

        // Send the grouped data as a response to the frontend
        res.json(rows);
    } catch (error) {
        console.error('Error fetching daily attendance data:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////
//retreive working data
app.get('/employeefixedwagedata', async (req, res) => {
    try {
        // SQL query to fetch daily attendance data and group by employee and month/year
        const query = ` SELECT 
                           ef.employeename, e.designation, e.work_orderno, w.sitename, e.contractor_vendor_name, ef.grossalary, ef.weekday_ot_price, 
                           ef.sunday_ot_price, weekday_ot_type, sunday_ot_type
                        FROM 
                        employeefixedwagereference ef
                        JOIN employee e ON e.employeename = ef.employeename
                        JOIN workorderdata w ON w.workorderno = e.work_orderno
                        ORDER BY e.work_orderno, e.contractor_vendor_name, ef.grossalary `;

        const { rows } = await client.query(query);

        // Send the grouped data as a response to the frontend
        res.json(rows);
    } catch (error) {
        console.error('Error fetching daily attendance data:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////
//retreive working data
app.get('/employeedetails', async (req, res) => {
    try {
        // SQL query to fetch daily attendance data and group by employee and month/year
        const query = ` SELECT 
                           e.id AS employeeid, 
                           e.employeename, 
                           e.designation, 
                           TO_CHAR(e.dateofjoining AT TIME ZONE 'IST', 'DD-MM-YYYY') AS dateofjoining,
                           e.employeetype, 
                           e.recruitment_type, 
                           e.work_orderno, 
                           w.sitename, 
                           e.contractor_vendor_name, 
                           e.fathername, 
                           TO_CHAR(e.dateofbirth AT TIME ZONE 'IST', 'DD-MM-YYYY') AS dateofbirth,
                           e.adharno, 
                           e.phoneno, 
                           e.address, 
                           e.bloodgroup,
                           e.marital_status,  
                           e.emailid, 
                           e.status,
                           e.uan_no,
                           e.pfnumber,
                           e.pan_number,
                           e.namineename,
                           e.realtionship_with_nominee,
                           e.nominee_mobile_no,
                           e.nominee_adhar_no,
                           e.bank_name,
                           e.bank_branch,
                           e.account_no,
                           e.ifsc_code,
                           e.working_hours_day,
                           e.weekday_ot_type,
                           e.sunday_ot_type
                           
                        FROM 
                        employee e
                        JOIN workorderdata w ON w.workorderno = e.work_orderno
                        ORDER BY e.employeename`;

        const { rows } = await client.query(query);

        // You might want to check each row's status individually
        rows.forEach(row => {
            row.status = row.status === true ? 'ON DUTY' : 'LEFT';
        });


        // Send the grouped data as a response to the frontend
        res.json(rows);
    } catch (error) {
        console.error('Error fetching daily attendance data:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////
//retreive working data
app.get('/bankdetails', async (req, res) => {
    try {
        // SQL query to fetch daily attendance data and group by employee and month/year
        const query = ` SELECT 
                           e.id AS employeeid, e.employeename, bank_name, bank_branch, account_no, ifsc_code,  wd.work_orderno, 
                           contractor_vendor_name, ews.net_salary
                        FROM employee e
                        JOIN workorderdata w ON w.workorderno = e.work_orderno
                        JOIN employeewagestatutory ews ON ews.employeename = e.employeename
                        JOIN workingdata wd ON wd.employeename = ews.employeename
                        ORDER BY wd.work_orderno, e.contractor_vendor_name`;

        const { rows } = await client.query(query);

        // Send the grouped data as a response to the frontend
        res.json(rows);
    } catch (error) {
        console.error('Error fetching daily attendance data:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////Reports///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
//generating work order-wise attendance cards 

// Function to fetch data from the database
async function fetchData(Month, Year, workorderno) {
    try {
        const [month, year] = [Month, Year];
        const WorkOrderNo = workorderno;
        const query = `
            SELECT d.employeename, TO_CHAR(in_date AT TIME ZONE 'UTC', 'DD-MM-YYYY') AS in_date,
            in_time, TO_CHAR(out_date AT TIME ZONE 'UTC', 'DD-MM-YYYY') AS out_date, out_time,
            totalworkinghours, today_ot,nagativeot
            FROM dailyattendance d
            WHERE EXTRACT(MONTH FROM in_date AT TIME ZONE 'UTC') = $1 AND EXTRACT(YEAR FROM in_date AT TIME ZONE 'UTC') = $2 AND d.work_orderno = $3
            ORDER BY employeename, in_date`;
        const result = await client.query(query, [month, year, WorkOrderNo]); // Pass month, year, and WorkOrderNo to the query
        return result.rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}


// Function to generate PDFs for each employee
async function generatePDFs(data, Month, Year, WorkOrderno) {

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const [month, year, workorderno,] = [Month, Year, WorkOrderno];

    // Convert month to its corresponding name
    const monthName = monthNames[month - 1]; // Adjusting for 0-based array index

    const employees = {};
    data.forEach(row => {
        const employeeName = row.employeename;
        if (!employees[employeeName]) {
            employees[employeeName] = [];
        }
        employees[employeeName].push(row);
    });

    // Get the current user's downloads directory
    const src = path.join(os.homedir(), 'Downloads');

    const directoryPath = path.join(src, `Project_Wise_Attedance_Cadrs_${workorderno}_${monthName}_${year}`);
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath);
    }

    for (const employeeName in employees) {
        const employeeData = employees[employeeName];
        const pdfName = `${employeeName}_${workorderno}_${monthName}_${year}.pdf`;
        const filePath = path.join(directoryPath, pdfName);
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        doc.y = 20;
        doc.font('Helvetica-Bold').fontSize(14).text(`Attendance Report - ${monthName} ${year} - Employee: ${employeeName}`, { align: 'center' });
        //doc.moveDown();

        const headerXStart = 40;
        const tableHeaders = ['In Date', 'In Time', 'Out Date', 'Out Time', 'Working Hours', 'Today OT'];
        doc.font('Helvetica-Bold');
        doc.lineWidth(1);
        doc.fontSize(12);
        const cellWidth = 90;
        const cellHeight = 20;
        const headerYStart = doc.y;
        tableHeaders.forEach((header, index) => {
            const x = headerXStart + (index * cellWidth) + (1);
            const y = headerYStart + (cellHeight / 2);
            doc.text(header, x, y, { width: cellWidth, align: 'center', valign: 'center' });
            doc.rect(x - (1), y - (5), cellWidth, cellHeight);
        });

        doc.stroke();
        //let i = 1;
        let presentdays = 0;
        let totalOt = 0;
        let weekdayot = 0;
        let sundayot = 0;

        doc.font('Helvetica');
        const dataYStart = doc.y = 50;
        employeeData.forEach((entry, rowIndex) => {
            const rowData = [entry.in_date, entry.in_time, entry.out_date, entry.out_time, parseFloat(entry.totalworkinghours), parseFloat(entry.today_ot) + parseFloat(entry.nagativeot)];
            rowData.forEach((data, colIndex) => {
                if (colIndex === 5) { // Check if it's the column containing today's overtime
                    if (entry.totalworkinghours != entry.today_ot) {
                        weekdayot += parseFloat(entry.today_ot);
                        weekdayot += parseFloat(entry.nagativeot);
                        if (entry.totalworkinghours <= 5) {
                            presentdays += 0.5;
                        } else {
                            presentdays += 1;
                            //nagativeot = parseFloat(entry.nagativeot)
                        }
                    } else {
                        sundayot += parseFloat(entry.today_ot);
                    }
                    totalOt += parseFloat(entry.today_ot);
                    totalOt = totalOt + parseFloat(entry.nagativeot);
                }
                const x = headerXStart + (colIndex * cellWidth) + (1);
                const y = dataYStart + ((rowIndex + 1) * cellHeight) + (5);
                doc.text(data.toString(), x, y, { width: cellWidth, align: 'center', valign: 'center' });
                doc.rect(x - (1), y - (5), cellWidth, cellHeight);
            });
        });

        const tableHeaders1 = ['Present Days', `${presentdays}`, 'Total OT', `${totalOt}`, 'WeedDayOT', `${weekdayot}`, 'SunDayOT', `${sundayot}`];
        doc.font('Helvetica-Bold');
        doc.lineWidth(1);
        doc.fontSize(10);
        const cellWidth1 = 70;
        const cellHeight1 = 20;
        const headerYStart1 = doc.y;
        ///console.log("headerYStart1",headerYStart1);
        tableHeaders1.forEach((header, index) => {
            const x = headerXStart + (index * cellWidth1) + (1);
            const y = headerYStart1 + (cellHeight1 / 2);
            doc.text(header, x, y, { width: cellWidth1, align: 'center', valign: 'center' });
            doc.rect(x - (1), y - (5), cellWidth1, cellHeight1);
        });
        // Adding border to the page
        doc.rect(0, 0, doc.page.width, doc.page.height).stroke();

        doc.end();
        console.log(`Attendance Card generated: ${pdfName}`);
    }
}


// API endpoint to generate PDFs
app.post('/generateAttendancecards', async (req, res) => {
    try {
        const { month, year, workorderno } = req.body;
        const data = await fetchData(month, year, workorderno);
        await generatePDFs(data, month, year, workorderno);
        res.send(`Attendance Cards generated successfully! ${workorderno}`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while generating Attendance Cards.');
    }
});
///////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////
//generating Employee-wise attendance cards 

// Function to fetch data from the database
async function fetchData_employee_wise(Month, Year) {
    try {
        const [month, year] = [Month, Year];
        const query = `SELECT
            d.employeename,
            d.work_orderno,
            TO_CHAR(in_date AT TIME ZONE 'UTC', 'DD-MM-YYYY') AS in_date,
            in_time, TO_CHAR(out_date AT TIME ZONE 'UTC', 'DD-MM-YYYY') AS out_date, out_time,
            totalworkinghours, 
            today_ot,
            nagativeot
        FROM 
            dailyattendance d
        WHERE 
            EXTRACT(MONTH FROM in_date AT TIME ZONE 'UTC') = $1 AND 
            EXTRACT(YEAR FROM in_date AT TIME ZONE 'UTC') = $2 
         ORDER BY 
            employeename, 
            in_date`;

        const result = await client.query(query, [month, year]); // Pass month, year, and WorkOrderNo to the query
        return result.rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}


// Function to generate PDFs for each employee
async function generatePDFs_employee_wise(data, Month, Year) {

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const [month, year] = [Month, Year];

    // Convert month to its corresponding name
    const monthName = monthNames[month - 1]; // Adjusting for 0-based array index

    const employees = {};
    data.forEach(row => {
        const employeeName = row.employeename;
        if (!employees[employeeName]) {
            employees[employeeName] = [];
        }
        employees[employeeName].push(row);
    });

    // Get the current user's downloads directory
    const src = path.join(os.homedir(), 'Downloads');

    const directoryPath = path.join(src, `Employee_wise_Attedance_Cadrs_${monthName}_${year}`);
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath);
    }

    for (const employeeName in employees) {
        const employeeData = employees[employeeName];
        const pdfName = `${employeeName}_${monthName}_${year}.pdf`;
        const filePath = path.join(directoryPath, pdfName);
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        doc.y = 20;
        doc.font('Helvetica-Bold').fontSize(14).text(`Attendance Report - ${monthName} ${year} - Employee: ${employeeName}`, { align: 'center' });
        //doc.moveDown();

        const headerXStart = 40;
        const tableHeaders = ['Work Order No', 'In Date', 'In Time', 'Out Date', 'Out Time', 'Working Hours', 'Today OT'];
        doc.font('Helvetica-Bold');
        doc.lineWidth(1);
        doc.fontSize(12);
        const cell_Width = 80;
        const cell_Height = 30;
        const cellWidth = 80;
        const cellHeight = 20;
        const headerYStart = doc.y = 30;
        tableHeaders.forEach((header, index) => {
            const x = headerXStart + (index * cell_Width) + (1);
            const y = headerYStart + (cell_Height / 2);
            doc.text(header, x, y, { width: cell_Width, align: 'center', valign: 'center' });
            doc.rect(x - (1), y - (5), cell_Width, cell_Height);
        });

        doc.stroke();
        //let i = 1;
        let presentdays = 0;
        let totalOt = 0;
        let weekdayot = 0;
        let sundayot = 0;
        doc.font('Helvetica');
        const dataYStart = doc.y = 50;
        employeeData.forEach((entry, rowIndex) => {
            const rowData = [entry.work_orderno, entry.in_date, entry.in_time, entry.out_date, entry.out_time, parseFloat(entry.totalworkinghours), parseFloat(entry.today_ot) + parseFloat(entry.nagativeot)];
            rowData.forEach((data, colIndex) => {
                if (colIndex === 5) { // Check if it's the column containing today's overtime
                    if (entry.totalworkinghours != entry.today_ot) {
                        weekdayot += parseFloat(entry.today_ot);
                        weekdayot += parseFloat(entry.nagativeot);
                        if (entry.totalworkinghours <= 5) {
                            presentdays += 0.5;
                        } else {
                            presentdays += 1;
                            //nagativeot = parseFloat(entry.nagativeot)
                        }
                    } else {
                        sundayot += parseFloat(entry.today_ot);
                    }
                    totalOt += parseFloat(entry.today_ot);
                    totalOt = totalOt + parseFloat(entry.nagativeot);
                }
                const x = headerXStart + (colIndex * cellWidth) + (1);
                const y = dataYStart + ((rowIndex + 1) * cellHeight) + (5);
                doc.text(data.toString(), x, y, { width: cellWidth, align: 'center', valign: 'center' });
                doc.rect(x - (1), y - (5), cellWidth, cellHeight);
            });
        });

        const tableHeaders1 = ['Present Days', `${presentdays}`, 'Total OT', `${totalOt}`, 'WeedDayOT', `${weekdayot}`, 'SunDayOT', `${sundayot}`];
        doc.font('Helvetica-Bold');
        doc.lineWidth(1);
        doc.fontSize(10);
        const cellWidth1 = 70;
        const cellHeight1 = 20;
        const headerYStart1 = doc.y;
        ///console.log("headerYStart1",headerYStart1);
        tableHeaders1.forEach((header, index) => {
            const x = headerXStart + (index * cellWidth1) + (1);
            const y = headerYStart1 + (cellHeight1 / 2);
            doc.text(header, x, y, { width: cellWidth1, align: 'center', valign: 'center' });
            doc.rect(x - (1), y - (5), cellWidth1, cellHeight1);
        });


        // // Add text
        // doc.fontSize(8).text('Note : This is Computer Generated Attendance Card, Signature Not Required', {
        //     align: 'Left'
        // });

        // Adding border to the page
        doc.rect(0, 0, doc.page.width, doc.page.height).stroke();

        // // Add footer text
        // const footerText = 'Note : This is Computer Generated Attendance Card, Signature Not Required';
        // const textWidth = doc.widthOfString(footerText);
        // const textHeight = doc.heightOfString(footerText);

        // doc.fontSize(8).text(footerText, 10, doc.page.height - textHeight - 10, {
        //     align: 'left'
        // });

        // Finalize PDF file
        doc.end();
        console.log(`Attendance Card generated: ${pdfName}`);
    }
}


// API endpoint to generate PDFs
app.post('/generate__employee_wise_Attendance_card', async (req, res) => {
    try {
        const { month, year } = req.body;

        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        // Convert month to its corresponding name
        const monthName = monthNames[month - 1]; // Adjusting for 0-based array index

        const data = await fetchData_employee_wise(month, year);
        await generatePDFs_employee_wise(data, month, year);
        res.send(`Employee-wise Attendance Cards generated and downloaded successfully! For the Month ${monthName} ${year}`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while generating Attendance Cards.');
    }
});
///////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////
//generating the attendance card for given date
// Function to fetch data from the database
async function fetchData_indate(In_date, workorderno) {
    try {
        const [in_date] = [In_date];
        const WorkOrderNo = workorderno;
        const query = `
            SELECT d.employeename, 
                TO_CHAR(in_date AT TIME ZONE 'UTC', 'DD-MM-YYYY') AS in_date,
                in_time, 
                TO_CHAR(out_date AT TIME ZONE 'UTC', 'DD-MM-YYYY') AS out_date, 
                out_time,
                totalworkinghours, 
                today_ot,
                nagativeot
            FROM dailyattendance d
            WHERE   TO_CHAR(in_date, 'DD-MM-YYYY') = $1 
                    AND d.work_orderno = $2
                    ORDER BY d.employeename;`;
        const result = await client.query(query, [in_date, WorkOrderNo]); // Pass month, year, and WorkOrderNo to the query
        return result.rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

// Function to generate a single PDF with attendance data for a given date
async function generatePDFs_indate(data, In_date, WorkOrderno) {
    const in_date = In_date;
    const workorderno = WorkOrderno;

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const month = parseInt(in_date.split('-')[1]); // Extract month from Attendance_Date
    const year = parseInt(in_date.split('-')[2]); // Extract year from Attendance_Date

    // Convert month to its corresponding name
    const monthName = monthNames[month - 1]; // Adjusting for 0-based array index


    // Get the current user's downloads directory
    const src = path.join(os.homedir(), 'Downloads');

    // Create directory for storing the PDF
    const directoryPath = path.join(src, `Date_Wise_Attendance_Cards_${workorderno}_${monthName}`);
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath);
    }

    const pdfName = `${workorderno}_${in_date}.pdf`;
    const filePath = path.join(directoryPath, pdfName);
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // PDF header
    doc.y = 20;
    doc.font('Helvetica-Bold').fontSize(14).text(`Attendance Report For The Date - ${in_date}`, { align: 'center' });

    // Table header
    const headerXStart = 40;
    const tableHeaders = ['Emp Name', 'In Time', 'Out Date', 'Out Time', 'Working Hours', 'Today OT'];
    doc.font('Helvetica-Bold');
    doc.lineWidth(1);
    doc.fontSize(12);
    const cellWidth = 90;
    const cellHeight = 20;
    const headerYStart = doc.y + 20;  // Adjusted to avoid overlap
    tableHeaders.forEach((header, index) => {
        const x = headerXStart + (index * cellWidth);
        const y = headerYStart;
        doc.text(header, x, y, { width: cellWidth, align: 'center', valign: 'center' });
        doc.rect(x, y - 5, cellWidth, cellHeight).stroke();
    });

    // Function to wrap text within a cell
    const wrapText = (text, width) => {
        const words = text.split(' ');
        let lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = doc.widthOfString(currentLine + ' ' + word);
            if (width < cellWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    };

    // Table data
    doc.font('Helvetica');
    const dataYStart = headerYStart + cellHeight;
    let currentY = dataYStart;

    data.forEach((entry, rowIndex) => {
        const rowData = [entry.employeename, entry.in_time, entry.out_date, entry.out_time, parseFloat(entry.totalworkinghours), (parseFloat(entry.today_ot) + parseFloat(entry.nagativeot)).toFixed(1)];
        const maxLines = Math.max(...rowData.map(data => wrapText(data.toString(), cellWidth - 10).length));
        const heightNeeded = maxLines * cellHeight;

        if (currentY + heightNeeded > doc.page.height - 40) {
            // If content exceeds page height, start new page
            doc.addPage();
            currentY = dataYStart;
        }

        rowData.forEach((data, colIndex) => {
            if (data === undefined || data === null) {
                data = ''; // Default to empty string if data is undefined or null
            }

            const x = headerXStart + (colIndex * cellWidth);
            const y = currentY;

            const wrappedText = wrapText(data.toString(), cellWidth - 10);
            wrappedText.forEach((line, lineIndex) => {
                doc.text(line, x, y + (lineIndex * (doc.heightOfString('M') + 2)), { width: cellWidth, align: 'center', valign: 'center' });
            });
            doc.rect(x, y - 5, cellWidth, cellHeight * wrappedText.length).stroke();
        });

        currentY += heightNeeded;
    });

    // Adding border to the page
    doc.rect(0, 0, doc.page.width, doc.page.height).stroke();

    // Finalize the PDF
    doc.end();
    console.log(`Attendance Card generated: ${pdfName}`);
}

// API endpoint to generate PDFs
app.post('/generateAttendancecards_indate', async (req, res) => {
    try {
        const { in_date, workorderno } = req.body;
        //console.log("in_date",in_date);
        const data = await fetchData_indate(in_date, workorderno);
        //console.log("data-----------------------");
        //console.log(data);
        await generatePDFs_indate(data, in_date, workorderno);
        res.send(`Attendance Cards generated successfully! ${in_date}`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while generating Attendance Cards.');
    }
});
///////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////
//Gereating Pay Slips for both Reference and Statutory

//Function to convert netsalary to words
function convertToWords(amount) {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const scales = ['', 'THOUSAND', 'MILLION', 'BILLION'];


    function convertThreeDigit(num) {
        const hundreds = Math.floor(num / 100);
        const tensUnits = num % 100;

        let result = '';

        if (hundreds > 0) {
            result += ones[hundreds] + ' HUNDRED ';
        }

        if (tensUnits > 0) {
            if (tensUnits < 10) {
                result += ones[tensUnits];
            } else if (tensUnits < 20) {
                result += teens[tensUnits - 10];
            } else {
                const tensDigit = Math.floor(tensUnits / 10);
                const onesDigit = tensUnits % 10;
                result += tens[tensDigit];
                if (onesDigit > 0) {
                    result += ' ' + ones[onesDigit];
                }
            }
        }

        return result.trim();
    }

    if (amount === 0) {
        return 'zero';
    }

    let result = '';
    let scaleIndex = 0;

    while (amount > 0) {
        const threeDigits = amount % 1000;
        if (threeDigits > 0) {
            result = convertThreeDigit(threeDigits) + ' ' + scales[scaleIndex] + ' ' + result;
        }
        amount = Math.floor(amount / 1000);
        scaleIndex++;
    }

    return result.trim();
}

// Function to fetch data from the database workmen reference
async function fetchDataReference(Month, Year, workorderno) {
    try {
        const [month, year] = [Month, Year];

        // Convert month and year to strings and concatenate them
        const monthyear = month.toString() + year.toString();

        const query = `
        SELECT 
        e.id, 
        e.employeename, 
        e.designation,
        TO_CHAR(e.dateofjoining AT TIME ZONE 'UTC', 'DD-MM-YYYY') AS dateofjoining, 
        wd.no_of_days_in_month, 
        e.uan_no, 
        e.pfnumber,
        e.pan_number,
        e.account_no,
        (wd.no_of_present_days + wd.national_festival_holiday) AS payable_days, 
        wd.ref_fixed_gross_salary,
        (wd.weekday_no_of_hours_overtime + wd.nagativeot) AS weekday_no_of_hours_overtime, 
        wd.sunday_holiday_no_of_hours_overtime,
        wd.ref_fixed_weekday_ot_price, 
        wd.ref_fixed_sunday_ot_price,
        ((wd.weekday_no_of_hours_overtime + wd.nagativeot) * wd.ref_fixed_weekday_ot_price) AS weekday_total_ot_wage,
        (wd.sunday_holiday_no_of_hours_overtime * wd.ref_fixed_sunday_ot_price) AS holiday_total_ot_wage,
        ewr.earned_basic_da, 
        ewr.earned_hra, 
        ewr.earned_food_allowance, 
        ewr.earned_site_allowance, 
        ewr.mobile_allowance,
        ewr.earned_ot_wage,
        ewr.earned_others,
        ewr.deduction_epf, 
        ewr.deduction_pt, 
        ewr.deduction_incometax, 
        ewr.deduction_salary_advance_company,
        ewr.deduction_salary_advance_thirdparty, 
        ewr.deduction_fines_damages_loss, 
        ewr.deduction_others,
        ewr.earned_gross_total AS total_earnings, 
        ewr.deduction_total, 
        ewr.net_salary
    FROM 
        employee e   
    JOIN 
        workingdata wd ON e.employeename = wd.employeename
    JOIN 
        employeewagereference ewr ON e.employeename = ewr.employeename and wd.employeename = ewr.employeename 
        AND ewr.monthyear = wd.monthyear AND  ewr.work_orderno = wd.work_orderno
    WHERE 
         ewr.monthyear = $1 AND wd.work_orderno= $2 AND ewr.work_orderno= $2 AND wd.monthyear = $1`;

        const result = await client.query(query, [monthyear, workorderno]); // Pass month, year, and WorkOrderNo to the query
        return result.rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

// Main function to generate pay slip for workmen reference
function generatePaySlipsReference(data, Month, Year, WorkOrderno) {
    try {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const [month, year, workorderno] = [Month, Year, WorkOrderno];

        // Convert month to its corresponding name
        const monthName = monthNames[month - 1]; // Adjusting for 0-based array index

        // Define the path to the template file
        const templateFilePath = path.join(__dirname, '..', 'HRMS', 'src', 'templates', 'REFERENCE_PAYSLIP_FORMAT.docx');

        // Read the template file
        const templateContent = fs.readFileSync(templateFilePath, 'binary');

        // Get the current user's downloads directory
        const downloadsPath = path.join(os.homedir(), 'Downloads');

        // Loop through each employee data to generate pay slips
        data.forEach((employeeData) => {
            // Create a new instance of Docxtemplater for each employee
            const doc = new Docxtemplater();

            // Load the template content
            const zip = new PizZip(templateContent);
            doc.loadZip(zip);

            if (employeeData.uan_no === null) {
                employeeData.uan_no = '-';
            }
            if (employeeData.pfnumber === null) {
                employeeData.pfnumber = '-';
            }
            if (employeeData.pan_number === null) {
                employeeData.pan_number = '-';
            }

            let net_salary_words = '';
            //employeeData.net_salary = employeeData.net_salary - 2000;
            employeeData.weekday_no_of_hours_overtime = parseFloat(employeeData.weekday_no_of_hours_overtime);
            employeeData.sunday_holiday_no_of_hours_overtime = parseFloat(employeeData.sunday_holiday_no_of_hours_overtime);
            employeeData.net_salary_words = convertToWords(employeeData.net_salary);
            employeeData.payable_days = parseFloat(employeeData.payable_days);
            employeeData.weekday_total_ot_wage = customRound(employeeData.weekday_total_ot_wage);
            employeeData.holiday_total_ot_wage = customRound(employeeData.holiday_total_ot_wage);
            //employeeData.deduction_total = employeeData.deduction_total + 2000;

            // Set the data in the template for the current employee
            doc.setData(employeeData);
            //console.log(employeeData);

            // Render the document (replace placeholders with data)
            doc.render();

            // Get the rendered document as a buffers
            const buffer = doc.getZip().generate({ type: 'nodebuffer' });

            // Define the output file path for the current employee
            const employeeName = employeeData.employeename.replace(/ /g, '_'); // Replace spaces with underscores
            const outputFile = resolve(downloadsPath, `${workorderno}_${employeeName}_${monthName}_${year}_R.docx`);

            // Write the buffer to a new .docx file for the current employee
            fs.writeFileSync(outputFile, buffer);
            console.log(`Pay slip generated successfully for ${employeeName}.`);
        });

    } catch (error) {
        console.error('Error generating pay slips:', error);
    }
}

// Function to fetch data from the database workmen statutory
async function fetchDataStatutory(Month, Year, workorderno) {
    try {
        const [month, year] = [Month, Year];

        // Convert month and year to strings and concatenate them
        const monthyear = month.toString() + year.toString();

        const query = `
        SELECT 
        e.id, 
        e.employeename, 
        e.designation, 
        TO_CHAR(e.dateofjoining AT TIME ZONE 'UTC', 'DD-MM-YYYY') AS dateofjoining,
        wd.no_of_days_in_month, 
        e.uan_no, 
        e.pfnumber,
        e.pan_number,
        e.account_no,
        (wd.no_of_present_days + wd.national_festival_holiday) AS payable_days, 
        ews.statutory_total_ot,
        ews.earned_basic_da, 
        ews.earned_hra, 
        ews.earned_food_allowance, 
        ews.earned_site_allowance, 
        ews.mobile_allowance,
        ews.earned_ot_wage,
        ews.incentive,
        ews.others,
        ews.deduction_epf, 
        ews.deduction_pt, 
        ews.deduction_incometax, 
        ews.deduction_salary_advance_company,
        ews.deduction_salary_advance_thirdparty, 
        ews.deduction_fines_damages_loss, 
        ews.deduction_others,
        ews.earned_gross_total AS total_earnings, 
        ews.deduction_total, 
        ews.net_salary,
        w.address 
    FROM 
        employee e   
    JOIN 
        workingdata wd ON e.employeename = wd.employeename
    JOIN 
        workorderdata w ON w.workorderno = wd.work_orderno
    JOIN 
        employeewagestatutory ews ON e.employeename = ews.employeename and wd.employeename = ews.employeename 
        AND ews.monthyear = wd.monthyear
    WHERE 
         ews.monthyear = $1 AND wd.work_orderno= $2 AND wd.monthyear = $1 AND ews.work_orderno= $2`;

        const result = await client.query(query, [monthyear, workorderno]); // Pass month, year, and WorkOrderNo to the query
        return result.rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

// Main function to generate pay slip workmen statutory
function generatePaySlipsStatutory(data, Month, Year, WorkOrderno) {
    try {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const [month, year, work_orderno] = [Month, Year, WorkOrderno];

        // Convert month to its corresponding name
        const monthName = monthNames[month - 1]; // Adjusting for 0-based array index

        // Define the path to the template file
        const templateFilePath = path.join(__dirname, '..', 'HRMS', 'src', 'templates', 'STATUATORY_PAYSLIP_FORMAT.docx');

        // Read the template file
        const templateContent = fs.readFileSync(templateFilePath, 'binary');

        // Get the current user's downloads directory
        const downloadsPath = path.join(os.homedir(), 'Downloads');

        // Loop through each employee data to generate pay slips
        data.forEach((employeeData) => {
            // Create a new instance of Docxtemplater for each employee
            const doc = new Docxtemplater();

            // Load the template content
            const zip = new PizZip(templateContent);
            doc.loadZip(zip);

            if (employeeData.uan_no === null) {
                employeeData.uan_no = '-';
            }
            if (employeeData.pfnumber === null) {
                employeeData.pfnumber = '-';
            }
            if (employeeData.pan_number === null) {
                employeeData.pan_number = '-';
            }
            if (employeeData.account_no === null) {
                employeeData.account_no = '-';
            }

            //converting netsalary to words
            let net_salary_words = '';
            employeeData.net_salary_words = convertToWords(employeeData.net_salary);
            employeeData.payable_days = parseFloat(employeeData.payable_days);
            employeeData.statutory_total_ot = parseFloat(employeeData.statutory_total_ot);

            console.log(employeeData.net_salary);
            // Set the data in the template for the current employee
            doc.setData(employeeData);

            // Render the document (replace placeholders with data)
            doc.render();

            // Get the rendered document as a buffer
            const buffer = doc.getZip().generate({ type: 'nodebuffer' });

            // Define the output file path for the current employee
            const employeeName = employeeData.employeename.replace(/ /g, '_'); // Replace spaces with underscores
            const outputFile = resolve(downloadsPath, `${work_orderno}_${employeeName}_${monthName}_${year}_S.docx`);

            // Write the buffer to a new .docx file for the current employee
            fs.writeFileSync(outputFile, buffer);

            console.log(`Pay slip generated successfully for ${employeeName}.`);
        });

    } catch (error) {
        console.error('Error generating pay slips:', error);
    }
}


app.post('/generatePaySlips', async (req, res) => {
    try {
        const { month, year, workorderno, wagetype } = req.body;
        if (wagetype === 'reference') {
            const data = await fetchDataReference(month, year, workorderno);
            //console.log(data);

            // Call the main function to generate the pay slip
            await generatePaySlipsReference(data, month, year, workorderno);
            res.send('Pay Slips generated successfully For Workmen Reference');
        } else if (wagetype === 'statutory') {
            const data = await fetchDataStatutory(month, year, workorderno);

            // Call the main function to generate the pay slip
            await generatePaySlipsStatutory(data, month, year, workorderno);
            res.send(`Pay Slips generated successfully! for ${workorderno}`);
        } else {
            res.status(400).send('Invalid wage type specified.');
        }

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while generating Pay Slip.');
    }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
//Gereating Employee - wise Pay Slips for both Reference and Statutory

//Function to convert netsalary to words
function convertToWords1(amount) {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const scales = ['', 'THOUSAND', 'MILLION', 'BILLION'];


    function convertThreeDigit(num) {
        const hundreds = Math.floor(num / 100);
        const tensUnits = num % 100;

        let result = '';

        if (hundreds > 0) {
            result += ones[hundreds] + ' HUNDRED ';
        }

        if (tensUnits > 0) {
            if (tensUnits < 10) {
                result += ones[tensUnits];
            } else if (tensUnits < 20) {
                result += teens[tensUnits - 10];
            } else {
                const tensDigit = Math.floor(tensUnits / 10);
                const onesDigit = tensUnits % 10;
                result += tens[tensDigit];
                if (onesDigit > 0) {
                    result += ' ' + ones[onesDigit];
                }
            }
        }

        return result.trim();
    }

    if (amount === 0) {
        return 'zero';
    }

    let result = '';
    let scaleIndex = 0;

    while (amount > 0) {
        const threeDigits = amount % 1000;
        if (threeDigits > 0) {
            result = convertThreeDigit(threeDigits) + ' ' + scales[scaleIndex] + ' ' + result;
        }
        amount = Math.floor(amount / 1000);
        scaleIndex++;
    }

    return result.trim();
}

// Function to fetch data from the database workmen reference
async function fetchDataReference_employee_wise(Month, Year, workorderno) {
    try {
        const [month, year] = [Month, Year];

        // Convert month and year to strings and concatenate them
        const monthyear = month.toString() + year.toString();

        const query = `
        SELECT 
        e.id, 
        e.employeename, 
        e.designation,
        TO_CHAR(e.dateofjoining AT TIME ZONE 'UTC', 'DD-MM-YYYY') AS dateofjoining, 
        wd.no_of_days_in_month, 
        e.uan_no, 
        e.pfnumber,
        e.pan_number,
        e.account_no,
        (wd.no_of_present_days + wd.national_festival_holiday) AS payable_days, 
        wd.ref_fixed_gross_salary,
        (wd.weekday_no_of_hours_overtime + wd.nagativeot) AS weekday_no_of_hours_overtime, 
        wd.sunday_holiday_no_of_hours_overtime,
        wd.ref_fixed_weekday_ot_price, 
        wd.ref_fixed_sunday_ot_price,
        ((wd.weekday_no_of_hours_overtime + wd.nagativeot) * wd.ref_fixed_weekday_ot_price) AS weekday_total_ot_wage,
        (wd.sunday_holiday_no_of_hours_overtime * wd.ref_fixed_sunday_ot_price) AS holiday_total_ot_wage,
        ewr.earned_basic_da, 
        ewr.earned_hra, 
        ewr.earned_food_allowance, 
        ewr.earned_site_allowance, 
        ewr.mobile_allowance,
        ewr.earned_ot_wage,
        ewr.earned_others,
        ewr.deduction_epf, 
        ewr.deduction_pt, 
        ewr.deduction_incometax, 
        ewr.deduction_salary_advance_company,
        ewr.deduction_salary_advance_thirdparty, 
        ewr.deduction_fines_damages_loss, 
        ewr.deduction_others,
        ewr.earned_gross_total AS total_earnings, 
        ewr.deduction_total, 
        ewr.net_salary
    FROM 
        employee e   
    JOIN 
        workingdata wd ON e.employeename = wd.employeename
    JOIN 
        employeewagereference ewr ON e.employeename = ewr.employeename and wd.employeename = ewr.employeename 
        AND ewr.monthyear = wd.monthyear AND  ewr.work_orderno = wd.work_orderno
    WHERE 
         ewr.monthyear = $1 AND wd.work_orderno= $2 AND ewr.work_orderno= $2 AND wd.monthyear = $1`;

        const result = await client.query(query, [monthyear, workorderno]); // Pass month, year, and WorkOrderNo to the query
        return result.rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

// Main function to generate pay slip for workmen reference
async function generatePaySlipsReference_employee_wise(data, Month, Year) {
    try {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const monthName = monthNames[Month - 1]; // Adjusting for 0-based array index

        // Define the path to the template file
        const templateFilePath = path.join(__dirname, '..', 'HRMS', 'src', 'templates', 'REFERENCE_PAYSLIP_FORMAT.docx');

        // Read the template file
        const templateContent = fs.readFileSync(templateFilePath, 'binary');

        // Get the current user's downloads directory
        const downloadsPath = path.join(os.homedir(), 'Downloads');

        const directoryPath = path.join(downloadsPath, `Ref_Employee_wise_Pays_Slips_${monthName}_${Year}`);
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath);
        }

        // Loop through each employee data to generate pay slips
        for (const employeeData of Object.values(data)) {
            // Create a new instance of Docxtemplater for each employee
            const zip = new PizZip(templateContent);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            if (employeeData.uan_no === null) {
                employeeData.uan_no = '-';
            }
            if (employeeData.pfnumber === null) {
                employeeData.pfnumber = '-';
            }
            if (employeeData.pan_number === null) {
                employeeData.pan_number = '-';
            }

            employeeData.net_salary_words = convertToWords(employeeData.net_salary);
            employeeData.weekday_no_of_hours_overtime = parseFloat(employeeData.weekday_no_of_hours_overtime).toFixed(1);
            employeeData.sunday_holiday_no_of_hours_overtime = parseFloat(employeeData.sunday_holiday_no_of_hours_overtime).toFixed(1);
            employeeData.payable_days = parseFloat(employeeData.payable_days);
            employeeData.weekday_total_ot_wage = customRound(employeeData.weekday_total_ot_wage);
            employeeData.holiday_total_ot_wage = customRound(employeeData.holiday_total_ot_wage);

            // Set the data in the template for the current employee
            doc.setData(employeeData);

            // Render the document (replace placeholders with data)
            doc.render();

            // Get the rendered document as a buffer
            const buffer = doc.getZip().generate({ type: 'nodebuffer' });

            // Define the output file path for the current employee
            const employeeName = employeeData.employeename.replace(/ /g, '_'); // Replace spaces with underscores
            const outputFile = path.resolve(directoryPath, `${employeeName}_${monthName}_${Year}_R.docx`);

            // Write the buffer to a new .docx file for the current employee
            fs.writeFileSync(outputFile, buffer);
            console.log(`Pay slip generated successfully for ${employeeName}.`);
        }

    } catch (error) {
        console.error('Error generating pay slips:', error);
    }
}

// Function to fetch data from the database workmen statutory
async function fetchDataStatutory_employee_wise(Month, Year, workorderno) {
    try {
        const [month, year] = [Month, Year];

        // Convert month and year to strings and concatenate them
        const monthyear = month.toString() + year.toString();

        const query = `
        SELECT 
        e.id, 
        e.employeename, 
        e.designation, 
        TO_CHAR(e.dateofjoining AT TIME ZONE 'UTC', 'DD-MM-YYYY') AS dateofjoining,
        wd.no_of_days_in_month, 
        e.uan_no, 
        e.pfnumber,
        e.pan_number,
        e.account_no,
        (wd.no_of_present_days + wd.national_festival_holiday) AS payable_days, 
        ews.statutory_total_ot,
        ews.earned_basic_da, 
        ews.earned_hra, 
        ews.earned_food_allowance, 
        ews.earned_site_allowance, 
        ews.mobile_allowance,
        ews.earned_ot_wage,
        ews.incentive,
        ews.others,
        ews.deduction_epf, 
        ews.deduction_pt, 
        ews.deduction_incometax, 
        ews.deduction_salary_advance_company,
        ews.deduction_salary_advance_thirdparty, 
        ews.deduction_fines_damages_loss, 
        ews.deduction_others,
        ews.earned_gross_total AS total_earnings, 
        ews.deduction_total, 
        ews.net_salary,
        w.address 
    FROM 
        employee e   
    JOIN 
        workingdata wd ON e.employeename = wd.employeename
    JOIN 
        workorderdata w ON w.workorderno = wd.work_orderno
    JOIN 
        employeewagestatutory ews ON e.employeename = ews.employeename and wd.employeename = ews.employeename 
        AND ews.monthyear = wd.monthyear
    WHERE 
         ews.monthyear = $1 AND wd.work_orderno= $2 AND wd.monthyear = $1 AND ews.work_orderno= $2`;

        const result = await client.query(query, [monthyear, workorderno]); // Pass month, year, and WorkOrderNo to the query
        return result.rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

// Main function to generate pay slip workmen statutory
function generatePaySlipsStatutory_employee_wise(data, Month, Year) {
    try {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const [month, year] = [Month, Year];

        // Convert month to its corresponding name
        const monthName = monthNames[month - 1]; // Adjusting for 0-based array index

        // Define the path to the template file
        const templateFilePath = path.join(__dirname, '..', 'HRMS', 'src', 'templates', 'STATUATORY_PAYSLIP_FORMAT.docx');

        // Read the template file
        const templateContent = fs.readFileSync(templateFilePath, 'binary');

        // Get the current user's downloads directory
        const downloadsPath = path.join(os.homedir(), 'Downloads');
        const directoryPath = path.join(downloadsPath, `Sta_Employee_wise_Pays_Slips_${monthName}_${Year}`);
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath);
        }

        // Loop through each employee data to generate pay slips
        for (const employeeData of Object.values(data)) {
            // Create a new instance of Docxtemplater for each employee
            const doc = new Docxtemplater();

            // Load the template content
            const zip = new PizZip(templateContent);
            doc.loadZip(zip);

            if (employeeData.uan_no === null) {
                employeeData.uan_no = '-';
            }
            if (employeeData.pfnumber === null) {
                employeeData.pfnumber = '-';
            }
            if (employeeData.pan_number === null) {
                employeeData.pan_number = '-';
            }
            if (employeeData.account_no === null) {
                employeeData.account_no = '-';
            }

            //converting netsalary to words
            let net_salary_words = '';
            employeeData.net_salary_words = convertToWords(employeeData.net_salary);
            employeeData.payable_days = parseFloat(employeeData.payable_days);
            employeeData.statutory_total_ot = parseFloat(employeeData.statutory_total_ot);

            //console.log(employeeData.net_salary);
            // Set the data in the template for the current employee
            doc.setData(employeeData);

            // Render the document (replace placeholders with data)
            doc.render();

            // Get the rendered document as a buffer
            const buffer = doc.getZip().generate({ type: 'nodebuffer' });

            // Define the output file path for the current employee
            const employeeName = employeeData.employeename.replace(/ /g, '_'); // Replace spaces with underscores
            const outputFile = resolve(directoryPath, `${employeeName}_${monthName}_${year}_S.docx`);

            // Write the buffer to a new .docx file for the current employee
            fs.writeFileSync(outputFile, buffer);

            console.log(`Pay slip generated successfully for ${employeeName}.`);
        };

    } catch (error) {
        console.error('Error generating pay slips:', error);
    }
}


app.post('/generate_Employee_wise_PaySlips', async (req, res) => {
    try {
        const { month, year, wagetype } = req.body;
        const workordernoquery = `SELECT workorderno FROM workorderdata
                          ORDER BY workorderno`;
        const workordernoqueryresult = await client.query(workordernoquery);
        //console.log(workordernoqueryresult.rows);

        if (wagetype === 'reference') {

            // Object to store the results
            const dataResults = {};
            const data_employees = {};

            for (const row of workordernoqueryresult.rows) {
                const workorderno = row.workorderno;
                dataResults[workorderno] = await fetchDataReference_employee_wise(month, year, workorderno);

                for (const employeeRow of dataResults[workorderno]) {
                    const employeename = employeeRow.employeename;

                    if (data_employees[employeename]) {
                        // If employee details already exist, aggregate the new values with existing values

                        data_employees[employeename] = {
                            ...data_employees[employeename],
                            // Add the existing values with new values as required
                            payable_days: parseFloat(data_employees[employeename].payable_days) + parseFloat(employeeRow.payable_days),
                            weekday_no_of_hours_overtime: parseFloat(data_employees[employeename].weekday_no_of_hours_overtime) + parseFloat(employeeRow.weekday_no_of_hours_overtime),
                            sunday_holiday_no_of_hours_overtime: parseFloat(data_employees[employeename].sunday_holiday_no_of_hours_overtime) + parseFloat(employeeRow.sunday_holiday_no_of_hours_overtime),
                            weekday_total_ot_wage: parseFloat(data_employees[employeename].weekday_total_ot_wage) + parseFloat(employeeRow.weekday_total_ot_wage),
                            holiday_total_ot_wage: parseFloat(data_employees[employeename].holiday_total_ot_wage) + parseFloat(employeeRow.holiday_total_ot_wage),
                            ref_fixed_weekday_ot_price: parseFloat(data_employees[employeename].ref_fixed_weekday_ot_price),
                            ref_fixed_sunday_ot_price: parseFloat(data_employees[employeename].ref_fixed_sunday_ot_price),
                            earned_basic_da: data_employees[employeename].earned_basic_da + employeeRow.earned_basic_da,
                            earned_hra: data_employees[employeename].earned_hra + employeeRow.earned_hra,
                            earned_food_allowance: data_employees[employeename].earned_food_allowance + employeeRow.earned_food_allowance,
                            earned_site_allowance: data_employees[employeename].earned_site_allowance + employeeRow.earned_site_allowance,
                            mobile_allowance: data_employees[employeename].mobile_allowance + employeeRow.mobile_allowance,
                            earned_ot_wage: data_employees[employeename].earned_ot_wage + employeeRow.earned_ot_wage,
                            earned_others: data_employees[employeename].earned_others + employeeRow.earned_others,
                            deduction_epf: data_employees[employeename].deduction_epf + employeeRow.deduction_epf,
                            deduction_pt: data_employees[employeename].deduction_pt + employeeRow.deduction_pt,
                            deduction_incometax: data_employees[employeename].deduction_incometax + employeeRow.deduction_incometax,
                            deduction_salary_advance_company: data_employees[employeename].deduction_salary_advance_company + employeeRow.deduction_salary_advance_company,
                            deduction_salary_advance_thirdparty: data_employees[employeename].deduction_salary_advance_thirdparty + employeeRow.deduction_salary_advance_thirdparty,
                            deduction_fines_damages_loss: data_employees[employeename].deduction_fines_damages_loss + employeeRow.deduction_fines_damages_loss,
                            deduction_others: data_employees[employeename].deduction_others + employeeRow.deduction_others,
                            total_earnings: data_employees[employeename].total_earnings + employeeRow.total_earnings,
                            deduction_total: data_employees[employeename].deduction_total + employeeRow.deduction_total,
                            net_salary: data_employees[employeename].net_salary + employeeRow.net_salary,
                        };
                        // Adjust deduction_pt and deduction_total if total_earnings >= 25000
                        if (data_employees[employeename].total_earnings >= 25000) {
                            data_employees[employeename].deduction_pt = 200;
                            data_employees[employeename].deduction_total += 200;
                            data_employees[employeename].net_salary -= 200;
                        }
                    } else {
                        // If employee details do not exist, add them to the object
                        data_employees[employeename] = { ...employeeRow };
                    }
                }
            }
            res.json(data_employees);

            // // Call the main function to generate the pay slip
            await generatePaySlipsReference_employee_wise(data_employees, month, year);
            //res.send('Pay Slips generated successfully For Workmen Reference');
        } else if (wagetype === 'statutory') {

            // Object to store the results
            const dataResults = {};
            const data_employees = {};

            for (const row of workordernoqueryresult.rows) {
                const workorderno = row.workorderno;

                dataResults[workorderno] = await fetchDataStatutory_employee_wise(month, year, workorderno);
                for (const employeeRow of dataResults[workorderno]) {
                    const employeename = employeeRow.employeename;

                    if (data_employees[employeename]) {
                        // If employee details already exist, aggregate the new values with existing values
                        data_employees[employeename] = {
                            ...data_employees[employeename],
                            // Add the existing values with new values as required
                            payable_days: parseFloat(data_employees[employeename].payable_days) + parseFloat(employeeRow.payable_days),
                            statutory_total_ot: parseInt(data_employees[employeename].statutory_total_ot) + parseInt(employeeRow.statutory_total_ot),
                            earned_basic_da: data_employees[employeename].earned_basic_da + employeeRow.earned_basic_da,
                            earned_hra: data_employees[employeename].earned_hra + employeeRow.earned_hra,
                            earned_food_allowance: data_employees[employeename].earned_food_allowance + employeeRow.earned_food_allowance,
                            earned_site_allowance: data_employees[employeename].earned_site_allowance + employeeRow.earned_site_allowance,
                            mobile_allowance: data_employees[employeename].mobile_allowance + employeeRow.mobile_allowance,
                            earned_ot_wage: data_employees[employeename].earned_ot_wage + employeeRow.earned_ot_wage,
                            incentive: data_employees[employeename].incentive + employeeRow.incentive,
                            others: data_employees[employeename].others + employeeRow.others,
                            deduction_epf: data_employees[employeename].deduction_epf + employeeRow.deduction_epf,
                            deduction_pt: data_employees[employeename].deduction_pt + employeeRow.deduction_pt,
                            deduction_incometax: data_employees[employeename].deduction_incometax + employeeRow.deduction_incometax,
                            deduction_salary_advance_company: data_employees[employeename].deduction_salary_advance_company + employeeRow.deduction_salary_advance_company,
                            deduction_salary_advance_thirdparty: data_employees[employeename].deduction_salary_advance_thirdparty + employeeRow.deduction_salary_advance_thirdparty,
                            deduction_fines_damages_loss: data_employees[employeename].deduction_fines_damages_loss + employeeRow.deduction_fines_damages_loss,
                            deduction_others: data_employees[employeename].deduction_others + employeeRow.deduction_others,
                            total_earnings: data_employees[employeename].total_earnings + employeeRow.total_earnings,
                            deduction_total: data_employees[employeename].deduction_total + employeeRow.deduction_total,
                            net_salary: data_employees[employeename].net_salary + employeeRow.net_salary,
                        };

                        // Adjust deduction_pt and deduction_total if total_earnings >= 25000
                        if (data_employees[employeename].total_earnings >= 25000) {
                            data_employees[employeename].deduction_pt = 200;
                            data_employees[employeename].deduction_total += 200;
                            data_employees[employeename].net_salary -= 200;
                        }
                        if (data_employees[employeename].incentive > data_employees[employeename].deduction_others) {
                            data_employees[employeename].incentive - data_employees[employeename].deduction_others;
                        }
                    } else {
                        // If employee details do not exist, add them to the object
                        data_employees[employeename] = { ...employeeRow };
                    }
                }
            }
            //res.json(data_employees);

            //const data = await fetchDataStatutory1(month, year, workorderno);

            // Call the main function to generate the pay slip
            await generatePaySlipsStatutory_employee_wise(data_employees, month, year);
            res.send(`Workmen Statutory Pay Slips generated successfully! `);
        } else {
            res.status(400).send('Invalid wage type specified.');
        }

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while generating Pay Slip.');
    }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////////////////////////
//Generate Form T
// Function to fetch data from the database 
async function fetchDataStatutoryFormT(Month, Year, WorkOrderno) {
    try {

        //const [month, year] = MonthYear.split('-').map(Number); // Extract month and year from the provided format
        const month = Month;
        const year = Year;
        // Convert month and year to strings and concatenate them
        const monthyear = month.toString() + year.toString();

        const workorderno = WorkOrderno;


        const query = `
                    SELECT 
                e.id, 
                e.employeename, 
                e.designation,
                e.dateofjoining,  
                e.uan_no,
                e.pfnumber,
                wd.no_of_days_in_month, 
                wd.statutory_fixed_basic_da,
                wd.statutory_fixed_hra,
                wd.statutory_fixed_food_allowance,
                wd.statutory_fixed_site_allowance,
                wd.statutory_fixed_mobile_allowance,
                wd.statutory_fixed_gross_salary,
                e.account_no,
                wd.no_of_present_days,
                wd.national_festival_holiday,
                (wd.no_of_present_days + wd.national_festival_holiday) AS payable_days, 
                ews.statutory_total_ot,
                ews.earned_basic_da, 
                ews.earned_hra, 
                ews.earned_food_allowance, 
                ews.earned_site_allowance, 
                ews.mobile_allowance,
                ews.earned_ot_wage,
                ews.incentive,
                ews.others,
                ews.deduction_wcp,
                ews.deduction_epf, 
                ews.deduction_pt, 
                ews.deduction_incometax, 
                ews.deduction_salary_advance_company,
                ews.deduction_salary_advance_thirdparty, 
                ews.deduction_fines_damages_loss, 
                ews.deduction_others,
                ews.earned_gross_total AS total_earnings, 
                ews.deduction_total, 
                ews.net_salary,
                w.address,
                w.sitename
            FROM 
                employeewagestatutory ews

            JOIN 
                employee e ON e.employeename = ews.employeename
            JOIN 
                workingdata wd ON ews.employeename = wd.employeename AND wd.monthyear = ews.monthyear AND wd.work_orderno = ews.work_orderno
            JOIN 
                workorderdata w ON w.workorderno = wd.work_orderno
            WHERE 
                ews.monthyear = $1 AND wd.work_orderno = $2 AND ews.work_orderno = $2
            ORDER BY ews.employeename`;

        const result = await client.query(query, [monthyear, workorderno]); // Pass month, year, and WorkOrderNo to the query
        return result.rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

//Function to genarate FORM T
async function generateExcelFile(data, OutputFile) {
    try {
        const templateFilePath = path.join(__dirname, '..', 'HRMS', 'src', 'templates', 'FORM_T_STATUATORY.xlsx');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templateFilePath);

        // Get the current user's downloads directory
        const downloadsPath = path.join(os.homedir(), 'Downloads');

        const worksheet = workbook.getWorksheet(1);
        let i = 1;
        data.forEach((employee, index) => {
            const row = worksheet.getRow(index + 11); // Assuming data starts from the eleventh row
            console.log(employee);
            row.getCell('A').value = index + 1;
            row.getCell('B').value = employee.employeename;
            row.getCell('C').value = employee.id;
            row.getCell('D').value = 'MALE';
            row.getCell('E').value = employee.designation;
            row.getCell('F').value = employee.uan_no;

            row.getCell('G').value = employee.pfnumber;
            row.getCell('H').value = employee.statutory_fixed_basic_da;
            row.getCell('I').value = employee.statutory_fixed_hra;
            row.getCell('J').value = employee.statutory_fixed_food_allowance;
            row.getCell('K').value = employee.statutory_fixed_site_allowance;
            row.getCell('L').value = employee.statutory_fixed_gross_salary;

            row.getCell('M').value = employee.no_of_days_in_month;
            row.getCell('N').value = employee.payable_days;
            row.getCell('O').value = employee.statutory_total_ot;
            row.getCell('P').value = employee.earned_basic_da;
            row.getCell('Q').value = employee.earned_hra;
            row.getCell('R').value = employee.earned_food_allowance;

            row.getCell('S').value = employee.earned_site_allowance;
            row.getCell('T').value = employee.earned_ot_wage;
            row.getCell('U').value = employee.incentive;
            row.getCell('V').value = employee.total_earnings;
            row.getCell('W').value = employee.deduction_wcp;
            row.getCell('X').value = employee.deduction_epf;
            row.getCell('Y').value = employee.deduction_pt;
            row.getCell('Z').value = employee.deduction_incometax;
            row.getCell('AA').value = employee.deduction_salary_advance_company;
            row.getCell('AB').value = employee.deduction_salary_advance_thirdparty;
            row.getCell('AC').value = employee.deduction_fines_damages_loss;
            row.getCell('AD').value = employee.deduction_others;
            row.getCell('AE').value = employee.deduction_total;
            row.getCell('AF').value = employee.net_salary;
            row.getCell('AG').value = "Bank Transfer";


            // Add employee.sitename for 3rd row and AF column
            worksheet.getCell('AF3').value = employee.sitename;
            //console.log(data[2].sitename);
            //console.log(data[3].sitename);

            // Add employee.address for 5th row and AF column
            worksheet.getCell('AF5').value = employee.address;

            // Add borders to the cells
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            i ++;
      
        });
        // Save the modified workbook
        await workbook.xlsx.writeFile(OutputFile);

        //console.log(Form T generated successfully);
    } catch (error) {
        console.error('Error generating Form T:', error);
    }
}

async function generateStatutoryFormT(data, Month, Year) {
    try {

        //const workorderno = WorkOrderno;
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const [month, year] = [Month, Year];

        // Convert month to its corresponding name
        const monthName = monthNames[month - 1]; // Adjusting for 0-based array index

        const outputDirectory = path.join(os.homedir(), 'Downloads');

        // Ensure the directory exists before writing the files
        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, { recursive: true });
        }

        // Generate Excel file
        const excelFilePath = join(outputDirectory, `FORM_T_${monthName}_${year}.xlsx`);
        await generateExcelFile(data, excelFilePath);
        console.log(`Excel file generated successfully: ${excelFilePath}`);
    } catch (error) {
        console.error('Error generating attendance reports:', error);
    }
}

app.post('/generateFormT', async (req, res) => {
    try {
        const { month, year, workorderno } = req.body;

        const data = await fetchDataStatutoryFormT(month, year, workorderno);

        // Call the main function to generate the pay slip
        await generateStatutoryFormT(data, month, year, workorderno);

        res.send(`FORM T generated successfully! for the Work Order No. : ${workorderno}`);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while generating FORM T.');
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////////////////////////
//Generate Form T for all sights
// Function to fetch data from the database 
async function fetchDataStatutoryFormT_All_Site(Month, Year, WorkOrderno) {
    try {

        //const [month, year] = MonthYear.split('-').map(Number); // Extract month and year from the provided format
        const month = Month;
        const year = Year;
        // Convert month and year to strings and concatenate them
        const monthyear = month.toString() + year.toString();

        const workorderno = WorkOrderno;


        const query = `
                    SELECT 
                e.id, 
                e.employeename, 
                e.designation,
                e.dateofjoining,  
                e.uan_no,
                e.pfnumber,
                wd.no_of_days_in_month, 
                wd.statutory_fixed_basic_da,
                wd.statutory_fixed_hra,
                wd.statutory_fixed_food_allowance,
                wd.statutory_fixed_site_allowance,
                wd.statutory_fixed_mobile_allowance,
                wd.statutory_fixed_gross_salary,
                e.account_no,
                wd.no_of_present_days,
                wd.national_festival_holiday,
                (wd.no_of_present_days + wd.national_festival_holiday) AS payable_days, 
                ews.statutory_total_ot,
                ews.earned_basic_da, 
                ews.earned_hra, 
                ews.earned_food_allowance, 
                ews.earned_site_allowance, 
                ews.mobile_allowance,
                ews.earned_ot_wage,
                ews.incentive,
                ews.others,
                ews.deduction_wcp,
                ews.deduction_epf, 
                ews.deduction_pt, 
                ews.deduction_incometax, 
                ews.deduction_salary_advance_company,
                ews.deduction_salary_advance_thirdparty, 
                ews.deduction_fines_damages_loss, 
                ews.deduction_others,
                ews.earned_gross_total AS total_earnings, 
                ews.deduction_total, 
                ews.net_salary,
                w.address,
                w.sitename
            FROM 
                employeewagestatutory ews

            JOIN 
                employee e ON e.employeename = ews.employeename
            JOIN 
                workingdata wd ON ews.employeename = wd.employeename AND wd.monthyear = ews.monthyear AND wd.work_orderno = ews.work_orderno
            JOIN 
                workorderdata w ON w.workorderno = wd.work_orderno
            WHERE 
                ews.monthyear = $1 AND wd.work_orderno = $2 AND ews.work_orderno = $2
            ORDER BY ews.employeename`;

        const result = await client.query(query, [monthyear, workorderno]); // Pass month, year, and WorkOrderNo to the query
        return result.rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

//Function to genarate FORM T
async function generateExcelFile_All_Site(data, OutputFile) {
    try {
        const templateFilePath = path.join(__dirname, '..', 'HRMS', 'src', 'templates', 'FORM_T_STATUATORY.xlsx');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templateFilePath);

        // Get the current user's downloads directory
        const downloadsPath = path.join(os.homedir(), 'Downloads');

        const worksheet = workbook.getWorksheet(1);

        // Ensure index is defined and incremented correctly
        let index = 0;
        for (const employeeData of Object.values(data)) {
            const row = worksheet.getRow(index + 11); // Assuming data starts from the eleventh row
            //console.log(employeeData);
            row.getCell('A').value = index + 1;
            row.getCell('B').value = employeeData.employeename;
            row.getCell('C').value = employeeData.id;
            row.getCell('D').value = 'MALE';
            row.getCell('E').value = employeeData.designation;
            row.getCell('F').value = employeeData.uan_no;

            row.getCell('G').value = employeeData.pfnumber;
            row.getCell('H').value = employeeData.statutory_fixed_basic_da;
            row.getCell('I').value = employeeData.statutory_fixed_hra;
            row.getCell('J').value = employeeData.statutory_fixed_food_allowance;
            row.getCell('K').value = employeeData.statutory_fixed_site_allowance;
            row.getCell('L').value = employeeData.statutory_fixed_gross_salary;

            row.getCell('M').value = employeeData.no_of_days_in_month;
            row.getCell('N').value = employeeData.payable_days;
            row.getCell('O').value = employeeData.statutory_total_ot;
            row.getCell('P').value = employeeData.earned_basic_da;
            row.getCell('Q').value = employeeData.earned_hra;
            row.getCell('R').value = employeeData.earned_food_allowance;

            row.getCell('S').value = employeeData.earned_site_allowance;
            row.getCell('T').value = employeeData.earned_ot_wage;
            row.getCell('U').value = employeeData.incentive;
            row.getCell('V').value = employeeData.total_earnings;
            row.getCell('W').value = employeeData.deduction_wcp;
            row.getCell('X').value = employeeData.deduction_epf;
            row.getCell('Y').value = employeeData.deduction_pt;
            row.getCell('Z').value = employeeData.deduction_incometax;
            row.getCell('AA').value = employeeData.deduction_salary_advance_company;
            row.getCell('AB').value = employeeData.deduction_salary_advance_thirdparty;
            row.getCell('AC').value = employeeData.deduction_fines_damages_loss;
            row.getCell('AD').value = employeeData.deduction_others;
            row.getCell('AE').value = employeeData.deduction_total;
            row.getCell('AF').value = employeeData.net_salary;
            row.getCell('AG').value = "Bank Transfer";

            // Add borders to the cells
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

           // i ++;
            index++;
        }

        // Assuming the site name and address are common for all employees
        // Add employee.sitename for 3rd row and AF column
        if (data[0]) {
            worksheet.getCell('AD3').value = data[0].sitename;

            // Add employee.address for 5th row and AF column
            worksheet.getCell('AD5').value = data[0].address;
        }

        // Save the modified workbook
        await workbook.xlsx.writeFile(OutputFile);

        console.log('Form T generated successfully');
    } catch (error) {
        console.error('Error generating Form T:', error);
    }
}


async function generateStatutoryFormT_All_Site(data, Month, Year) {
    try {

        //const workorderno = WorkOrderno;
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const [month, year] = [Month, Year];

        // Convert month to its corresponding name
        const monthName = monthNames[month - 1]; // Adjusting for 0-based array index

        const outputDirectory = path.join(os.homedir(), 'Downloads');

        // Ensure the directory exists before writing the files
        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, { recursive: true });
        }

        // Generate Excel file
        const excelFilePath = join(outputDirectory, `FORM_T_${monthName}_${year}_All.xlsx`);
        console.log("calling excel fun");
        await generateExcelFile_All_Site(data, excelFilePath);
        console.log(`Excel file generated successfully: ${excelFilePath}`);
    } catch (error) {
        console.error('Error generating attendance reports:', error);
    }
}

app.post('/generateFormT_All_Site', async (req, res) => {
    try {
        const { month, year } = req.body;

        const workordernoquery = `SELECT workorderno FROM workorderdata
                          ORDER BY workorderno`;
        const workordernoqueryresult = await client.query(workordernoquery);

        const dataResults = {};
        const data_employees = {};

        for (const row of workordernoqueryresult.rows) {
            const workorderno = row.workorderno;
            dataResults[workorderno] = await fetchDataStatutoryFormT_All_Site(month, year, workorderno);

            for (const employeeRow of dataResults[workorderno]) {
                const employeename = employeeRow.employeename;

                if (data_employees[employeename]) {
                    // If employee details already exist, aggregate the new values with existing values

                    data_employees[employeename] = {
                        ...data_employees[employeename],
                        // Add the existing values with new values as required
                        no_of_present_days: parseFloat(data_employees[employeename].no_of_present_days) + parseFloat(employeeRow.no_of_present_days),
                        payable_days: parseFloat(data_employees[employeename].payable_days) + parseFloat(employeeRow.payable_days),
                        statutory_total_ot: parseFloat(data_employees[employeename].statutory_total_ot) + parseFloat(employeeRow.statutory_total_ot),
                        earned_basic_da: data_employees[employeename].earned_basic_da + employeeRow.earned_basic_da,
                        earned_hra: data_employees[employeename].earned_hra + employeeRow.earned_hra,
                        earned_food_allowance: data_employees[employeename].earned_food_allowance + employeeRow.earned_food_allowance,
                        earned_site_allowance: data_employees[employeename].earned_site_allowance + employeeRow.earned_site_allowance,
                        mobile_allowance: data_employees[employeename].mobile_allowance + employeeRow.mobile_allowance,
                        earned_ot_wage: data_employees[employeename].earned_ot_wage + employeeRow.earned_ot_wage,
                        incentive: data_employees[employeename].incentive + employeeRow.incentive,
                        others: data_employees[employeename].others + employeeRow.others,
                        deduction_wcp: data_employees[employeename].deduction_wcp + employeeRow.deduction_wcp,
                        deduction_epf: data_employees[employeename].deduction_epf + employeeRow.deduction_epf,
                        deduction_pt: data_employees[employeename].deduction_pt + employeeRow.deduction_pt,
                        deduction_incometax: data_employees[employeename].deduction_incometax + employeeRow.deduction_incometax,
                        deduction_salary_advance_company: data_employees[employeename].deduction_salary_advance_company + employeeRow.deduction_salary_advance_company,
                        deduction_salary_advance_thirdparty: data_employees[employeename].deduction_salary_advance_thirdparty + employeeRow.deduction_salary_advance_thirdparty,
                        deduction_fines_damages_loss: data_employees[employeename].deduction_fines_damages_loss + employeeRow.deduction_fines_damages_loss,
                        deduction_others: data_employees[employeename].deduction_others + employeeRow.deduction_others,
                        total_earnings: data_employees[employeename].total_earnings + employeeRow.total_earnings,
                        deduction_total: data_employees[employeename].deduction_total + employeeRow.deduction_total,
                        net_salary: data_employees[employeename].net_salary + employeeRow.net_salary,
                    };
                    // Adjust deduction_pt and deduction_total if total_earnings >= 25000
                    if (data_employees[employeename].total_earnings >= 25000 && data_employees[employeename].deduction_pt != 200) {
                        data_employees[employeename].deduction_pt = 200;
                        data_employees[employeename].deduction_total += 200;
                        data_employees[employeename].net_salary -= 200;
                    }
                } else {
                    // If employee details do not exist, add them to the object
                    data_employees[employeename] = { ...employeeRow };
                }
            }
        }
        //const data = await fetchDataStatutoryFormT(month, year, workorderno);


        // Call the main function to generate the pay slip
        //console.log(data_employees);
        //req.json(data_employees);
        console.log("calling function");
        await generateStatutoryFormT_All_Site(data_employees, month, year);
        res.send(`FORM T generated successfully! for the Work Order No. : ${month}`);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while generating FORM T.');
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////////////////////////
//Generate Form T
// Function to fetch data from the database 
async function fetchDataFormQ(Month, Year, workorderno) {
    try {
        const [month, year] = [Month, Year];
        const query = `
                        SELECT 
                        e.employeename,
                        e.address,
                        e.fathername,
                        TO_CHAR(e.dateofbirth AT TIME ZONE 'UTC', 'DD-MM-YYYY') AS dateofbirth,
                        TO_CHAR(e.dateofjoining AT TIME ZONE 'UTC', 'DD-MM-YYYY') AS dateofjoining,
                        e.designation,
                        e.id,
                        e.adharno,
                        e.pan_number,
                        wd.statutory_fixed_basic_da,
                        (wd.statutory_fixed_hra + wd.statutory_fixed_food_allowance + wd.statutory_fixed_site_allowance + wd.statutory_fixed_mobile_allowance) AS other_allowance,
                        wd.statutory_fixed_gross_salary
                    FROM 
                        employee e
                    JOIN
                        workingdata wd ON wd.employeename = e.employeename
                    WHERE 
                        EXTRACT(MONTH FROM dateofjoining AT TIME ZONE 'UTC') = $1 
                        AND EXTRACT(YEAR FROM dateofjoining AT TIME ZONE 'UTC') = $2
                        AND e.work_orderno = $3`;

        const result = await client.query(query, [month, year, workorderno]); // Pass month, year, and WorkOrderNo to the query
        return result.rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

// Main function to generate pay slip workmen statutory
function generateFormQ(data) {
    try {

        // Define the path to the template file
        const templateFilePath = path.join(__dirname, '..', 'HRMS', 'src', 'templates', 'FORMQ.docx');

        // Read the template file
        const templateContent = fs.readFileSync(templateFilePath, 'binary');

        // Get the current user's downloads directory
        const downloadsPath = path.join(os.homedir(), 'Downloads');
        let natureofwork;

        // Loop through each employee data to generate pay slips
        data.forEach((employeeData) => {
            // Create a new instance of Docxtemplater for each employee
            const doc = new Docxtemplater();
            switch (employeeData.designation) {
                case 'FITTER':
                    employeeData.natureofwork = 'FIT UP';
                    break;
                case 'HELPER':
                    employeeData.natureofwork = 'HELPING';
                    break;
                case 'RIGGER':
                    employeeData.natureofwork = 'RIGGING';
                    break;
                case 'GRINDER':
                    employeeData.natureofwork = 'GRINDING';
                    break;
                case 'FABRICATOR':
                    employeeData.natureofwork = 'FABRICATION';
                    break;
                default:
                    employeeData.natureofwork = 'WELDING';
            }

            // Load the template content
            const zip = new PizZip(templateContent);
            doc.loadZip(zip);

            // Set the data in the template for the current employee
            doc.setData(employeeData);

            // Render the document (replace placeholders with data)
            doc.render();

            // Get the rendered document as a buffer
            const buffer = doc.getZip().generate({ type: 'nodebuffer' });

            // Define the output file path for the current employee
            const employeeName = employeeData.employeename.replace(/ /g, '_'); // Replace spaces with underscores
            const outputFile = resolve(downloadsPath, `FORMQ_${employeeName}.docx`);

            // Write the buffer to a new .docx file for the current employee
            fs.writeFileSync(outputFile, buffer);

            console.log(`FORM Q generated successfully for ${employeeName}.`);
        });

    } catch (error) {
        console.error('Error generating FORM Q:', error);
    }
}

app.post('/generateFormQ', async (req, res) => {
    try {
        const { month, year, workorderno } = req.body;

        const data = await fetchDataFormQ(month, year, workorderno);

        // Call the main function to generate the pay slip
        await generateFormQ(data);
        res.send('FORM Q generated successfully!');

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while generating FORM Q.');
    }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////////////////
//Reading Attendance data from google sheets and storing data to respective table in the database
// Define route for fetching data from Google Apps Script
app.get('/fetchDataFromGoogleAppsScript', async (req, res) => {
    try {
        // Make an HTTP GET request to the URL of your deployed Google Apps Script web app
        const response = await axios.get('https://script.google.com/macros/s/AKfycbxmdYMxHFduuxIV_KlvxsRSONb_aF3n65hvQA1cyBOBqeBn5oX1tgMyme9KGKTbii_a/exec');

        // Assuming the data is structured as {data: [...]}, adjust as per your actual response structure
        const responseData = response.data.data;

        // Iterate over the data and store each item in the database
        for (const data of responseData) {
            const day = 'week day';

            // StoreDailyAttendanceData(name, day, inDate, inTime, outDate, outTime)
            await StoreDailyAttendanceData(data.Name, day, data.in_date, data.in_time, data.out_date, data.out_time);
            //res.status(201).send(`Daily attendance details inserted successfully For Employee Name: ${data.Name}`);
        }

        // // Send the data received from the Google Apps Script web app as the API response
        //res.json(responseData);
        res.status(201).send(`Daily attendance details inserted successfully`);
    } catch (error) {
        console.error('Error fetching data from Google Apps Script:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Function to convert date format from "YYYY-MM-DDTHH:mm:ss.sssZ" to "DD-MM-YYYY"
function formatDate(inputDate) {
    const date = new Date(inputDate);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // January is 0!
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
}

//Attendance Capturing
async function StoreDailyAttendanceData(employeename, day, In_Date, in_time, Out_Date, out_time) {
    try {

        date = new Date();
        // console.log(employeename);
        // console.log(day);
        //console.log(In_Date);
        //console.log(in_time);
        // console.log(out_date);
        // console.log(out_time);
        console.log("__________________________________________________");

        const in_date = formatDate(In_Date);
        const out_date = formatDate(Out_Date)
            ; console.log("................", in_date);
        // Check if the record already exists in dailyattendance table
        const checkAttendanceQuery = `
            SELECT employeename FROM dailyattendance
            WHERE employeename = $1 AND in_date = $2
        `;
        const checkAttendanceValues = [employeename, in_date]; // Change in_date to date
        const attendanceResult = await client.query(checkAttendanceQuery, checkAttendanceValues);

        if (attendanceResult.rows.length > 0) {

        } else {
            if (out_time === '23:59') {
                out_time = '24:00';
            }

            // Convert in_time and out_time to Date objects
            const inTimeParts = in_time.split(':').map(part => parseInt(part, 10));
            const outTimeParts = out_time.split(':').map(part => parseInt(part, 10));

            const startTime = new Date();
            startTime.setHours(inTimeParts[0], inTimeParts[1], 0, 0);

            const endTime = new Date();
            endTime.setHours(outTimeParts[0], outTimeParts[1], 0, 0);

            console.log(startTime);
            console.log(endTime);

            // Check if startTime and endTime are valid dates
            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                throw new Error('Invalid time format');
            }

            // Calculate the total working hours
            const workingMillis = endTime.getTime() - startTime.getTime();
            if (workingMillis < 0) {
                throw new Error('End time cannot be before start time');
            }
            const workingHours = workingMillis / (1000 * 60 * 60); // Convert milliseconds to hours

            console.log('Total working hours:', workingHours);

            const getemptype = `SELECT recruitment_type FROM employeevendor WHERE employeename = $1`;
            const getemptyperesult = await client.query(getemptype, [employeename]);
            let emptype = '';
            let getottypeworkinghours;
            let workinghoursperday;
            if (getemptyperesult.rows.length === 0) {
                getottypeworkinghours = `SELECT working_hours_day FROM employee WHERE employeename = $1`;
            } else {
                getottypeworkinghours = `SELECT working_hours_day FROM employeevendor WHERE employeename = $1`;
                emptype = 'VENDOR';
            }

            const getottypeworkinghoursresult = await client.query(getottypeworkinghours, [employeename]);

            if (getottypeworkinghoursresult.rows.length > 0) {
                workinghoursperday = getottypeworkinghoursresult.rows[0].working_hours_day;
                console.log("workinghoursperday", workinghoursperday);
            } else {
                console.error('No working hours found for the employee');
                // Handle the case where no working hours are found
                // For example, you might set a default value:
                workinghoursperday = 10; // Default to 8 hours if no working hours are found
            }

            let weekdaytodayOT = 0;
            let sunday_holiday_ot = 0;
            let noOfPresentDays = 0;
            let todayot = 0;
            let nagativeot = 0;
            let ot_time_break = 0;

            if (day === 'HOLIDAY') {
                sunday_holiday_ot = workingHours - ot_time_break;
                todayot = sunday_holiday_ot;
            } else {
                if (workingHours !== 0) { // Ensure workingHours is not 0 before processing
                    if (workingHours >= 4 && workingHours <= 6) {
                        // If the working hours are between 4 and 6 (inclusive), consider half-day work
                        weekdaytodayOT = 0;
                        todayot = weekdaytodayOT;
                        noOfPresentDays = 0.5; // Consider half-day as the employee is present for a part of the day
                    } else {
                        // If the working hours are more than 6, calculate overtime
                        weekdaytodayOT = workingHours - workinghoursperday; // Calculate overtime hours
                        if (weekdaytodayOT > 0) {
                            weekdaytodayOT -= ot_time_break; // Subtract the break time from overtime
                            todayot = weekdaytodayOT;
                        }

                        if (weekdaytodayOT < 0) {
                            // If overtime hours are negative, set them to 0 (no overtime)
                            nagativeot = weekdaytodayOT;
                            weekdaytodayOT = 0;
                        }
                        noOfPresentDays = 1; // Consider the full day as present
                    }
                }
            }
            console.log(employeename);
            console.log(in_date);
            // Insert daily attendance details into the database
            const insertQuery = `
            INSERT INTO dailyattendance (employeename, date, day, in_date, in_time, out_date, out_time, today_ot, nagativeot, totalworkinghours, noOfPresentDays, stataus)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;
            const insertValues = [
                employeename,
                date,
                day,
                in_date,
                in_time,
                out_date,
                out_time,
                todayot,
                nagativeot,
                workingHours,
                noOfPresentDays,
                'PENDING'
            ];
            await client.query(insertQuery, insertValues);
            console.log("Attendance Data Inserted", employeename);
        }
        //res.status(201).send(`Daily attendance details inserted successfully For Employee Name: ${employeename}`);
    } catch (error) {
        console.error('Error inserting daily attendance details:', error);
        res.status(500).send('Internal Server Error');
    }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////+

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/getworkingdata', async (req, res) => {
    try {
        const retrievedata = `SELECT employeename, no_of_present_days, national_festival_holiday, weekday_no_of_hours_overtime,
                                sunday_holiday_no_of_hours_overtime, advance_company, advance_third_party, other_deduction, fines_damages_loss,
                                work_orderno FROM workingdata ORDER BY monthyear, work_orderno`;
        const { rows } = await client.query(retrievedata);
        res.json(rows);

    } catch (error) {
        console.error('Error retrieving components:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////
//Update existing data for employee working data table
app.post('/editemployeeworkingdata', async (req, res) => {
    // Extract employeename and grossalary from the request body
    const { employeename, monthyear, no_of_present_days, national_festival_holiday,
        weekday_no_of_hours_overtime, sunday_holiday_no_of_hours_overtime, advance_company,
        advance_third_party, other_deduction, fines_damages_loss, work_orderno } = req.body;
    try {
        console.log(no_of_present_days);
        const parts = monthyear.split("-"); // Split the string by hyphen
        const month = parts[0]; // Extract month
        const year = parts[1]; // Extract year
        const monthyear1 = month + year; // Concatenate month and year
        console.log("monthyear1", monthyear1);

        const editdata = `UPDATE workingdata SET
                            no_of_present_days = $1,
                            national_festival_holiday = $2,
                            weekday_no_of_hours_overtime = $3,
                            sunday_holiday_no_of_hours_overtime = $4,
                            advance_company = $5,
                            advance_third_party = $6,
                            other_deduction = $7,
                            fines_damages_loss = $8
                            WHERE employeename = $9 AND monthyear = $10 AND work_orderno = $11`;

        // Execute the SQL query with parameters
        await client.query(editdata, [
            no_of_present_days, national_festival_holiday, weekday_no_of_hours_overtime,
            sunday_holiday_no_of_hours_overtime, advance_company, advance_third_party,
            other_deduction, fines_damages_loss, employeename, monthyear1, work_orderno
        ]);

        // Call necessary functions
        await calculateEmployeeWage(employeename, monthyear1, res);

        const getstatus = `SELECT status FROM workingdata WHERE employeename = $1 AND monthyear = $2 AND status = $3`;
        const getstatusresult = await client.query(getstatus, [employeename, monthyear1, 'WORKING']);

        if (getstatusresult.rows.length > 0) {
            await calculateEmployeeWagestatutory(employeename, monthyear1, res);
        }

        // For demonstration purposes, let's just send back the received data
        res.status(201).send(`${employeename} Working data updated for the month ${month}`);
    } catch (error) {
        console.error('Error calculating salary components:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////////////////////////
//Generate Bank Challen
// Function to fetch data from the database 
async function fetchDatagenerateBankChallenSBI(Month, Year, WorkOrderno, Bank) {
    try {

        //const [month, year] = MonthYear.split('-').map(Number); // Extract month and year from the provided format
        const month = Month;
        const year = Year;
        // Convert month and year to strings and concatenate them
        const monthyear = month.toString() + year.toString();

        const workorderno = WorkOrderno;
        const bank = Bank;
        console.log("bank", bank);

        const query = `
        SELECT 
                ews.employeename, e.contractor_vendor_name, e.bank_name, e.account_no, e.ifsc_code, ews.net_salary 
        FROM 
                employeewagestatutory ews
        JOIN 
                employee e ON e.employeename = ews.employeename
        WHERE 
                ews.work_orderno = $2 
                AND ews.monthyear = $1 
                AND e.ifsc_code LIKE $3 || '%'`;

        const result = await client.query(query, [monthyear, workorderno, bank]); // Pass month, year, and WorkOrderNo to the query
        return result.rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

//Function to genarate bank challen for SBI bank
async function generateBankChallenExcelFile(data, OutputFile) {
    try {
        const templateFilePath = path.join(__dirname, '..', 'HRMS', 'src', 'templates', 'BANK_CHALLEN.xlsx');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templateFilePath);

        // Get the current user's downloads directory
        const downloadsPath = path.join(os.homedir(), 'Downloads');

        const worksheet = workbook.getWorksheet(1);

        data.forEach((employee, index) => {
            const row = worksheet.getRow(index + 2); // Assuming data starts from the eleventh row
            //console.log(employee.employeename);
            row.getCell('A').value = index + 1;
            row.getCell('B').value = employee.employeename;
            row.getCell('C').value = employee.contractor_vendor_name;
            row.getCell('D').value = employee.bank_name;
            row.getCell('E').value = employee.account_no;
            row.getCell('F').value = employee.ifsc_code;
            row.getCell('G').value = employee.net_salary;

            // Add borders to the cells
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });
        // Save the modified workbook
        await workbook.xlsx.writeFile(OutputFile);

        //console.log(Form T generated successfully);
    } catch (error) {
        console.error('Error generating Form T:', error);
    }
}

// Function to fetch data from the database for Other Banks
async function fetchDatagenerateBankChallenOthers(Month, Year, WorkOrderno, Bank) {
    try {

        //const [month, year] = MonthYear.split('-').map(Number); // Extract month and year from the provided format
        const month = Month;
        const year = Year;
        // Convert month and year to strings and concatenate them
        const monthyear = month.toString() + year.toString();

        const workorderno = WorkOrderno;
        const bank = Bank;
        console.log("bank", bank);

        const query = `
        SELECT 
                ews.employeename, e.contractor_vendor_name, e.bank_name, e.account_no, e.ifsc_code, ews.net_salary 
        FROM 
                employeewagestatutory ews
        JOIN 
                employee e ON e.employeename = ews.employeename
        WHERE 
                ews.work_orderno = $2 
                AND ews.monthyear = $1 
                AND e.ifsc_code NOT LIKE $3 || '%'`;

        const result = await client.query(query, [monthyear, workorderno, bank]); // Pass month, year, and WorkOrderNo to the query
        return result.rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

async function generateBankChallen(data, Month, Year, WorkOrderno, bank1) {
    try {

        const workorderno = WorkOrderno;
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const [month, year, bank] = [Month, Year, bank1];

        // Convert month to its corresponding name
        const monthName = monthNames[month - 1]; // Adjusting for 0-based array index

        const outputDirectory = path.join(os.homedir(), 'Downloads');

        // Ensure the directory exists before writing the files
        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, { recursive: true });
        }

        // Generate Excel file
        const excelFilePath = join(outputDirectory, `BANK_CHALLLEN_${monthName}_${year}_${workorderno}_${bank}.xlsx`);
        await generateBankChallenExcelFile(data, excelFilePath);
        console.log(`Excel file generated successfully: ${excelFilePath}`);
    } catch (error) {
        console.error('Error generating attendance reports:', error);
    }
}

app.post('/apigenerateBankChallen', async (req, res) => {
    try {
        const { month, year, workorderno, bank } = req.body;
        let data = '';
        let bank1 = bank;
        if (bank === 'SBI') {
            data = await fetchDatagenerateBankChallenSBI(month, year, workorderno, bank1);
        } else {
            bank1 = 'SBI';
            data = await fetchDatagenerateBankChallenOthers(month, year, workorderno, bank1);
            bank1 = 'OTHERS';
        }
        //console.log(data);

        // Call the main function to generate the pay slip
        await generateBankChallen(data, month, year, workorderno, bank1);
        res.send('FORM T generated successfully!');

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while generating FORM T.');
    }
});
//////////////////////////////////////////////////////

////////////////////////////////////////////////////////
//Generate muster roll
app.post('/generate_muster_roll', async (req, res) => {
    try {
        const { workorder_no, month, year } = req.body;

        // Step 1: Fetch muster data
        const muster_data_query = `
            SELECT 
                employeename, 
                TO_CHAR(in_date AT TIME ZONE 'UTC', 'DD') AS date
            FROM 
                dailyattendance
            WHERE 
                EXTRACT(MONTH FROM in_date) = $1 
                AND EXTRACT(YEAR FROM in_date) = $2 
                AND work_orderno = $3 
                AND muster_status = FALSE
                AND day = 'WEEK DAY'
            ORDER BY employeename, in_date`;

        const muster_data_query_result = await client.query(muster_data_query, [month, year, workorder_no]);

        // Step 2: Prepare muster roll data
        const musterRollData = {};
        muster_data_query_result.rows.forEach(row => {
            const { employeename, date } = row;
            if (!musterRollData[employeename]) {
                musterRollData[employeename] = new Array(31).fill(''); // Default to 'A' (Absent)
            }
            musterRollData[employeename][parseInt(date, 10) - 1] = 'P'; // Mark Present
        });

        // Step 3: Insert muster roll data
        for (const [employeename, attendance] of Object.entries(musterRollData)) {
            const insert_query = `
                INSERT INTO muster_roll (
                    employeename, 
                    workorder_no, 
                    monthyear, 
                    "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", 
                    "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", 
                    "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"
                ) VALUES (
                    $1, $2, $3, 
                    $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 
                    $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, 
                    $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
                )`;

            const monthyear = `${month}${year}`;
            const values = [
                employeename,
                workorder_no,
                monthyear,
                ...attendance
            ];

            await client.query(insert_query, values);

            const update_query = `UPDATE dailyattendance 
                                    SET muster_status = TRUE
                                    WHERE employeename = $1 
                                        AND work_orderno = $2 
                                        AND EXTRACT(MONTH FROM in_date) = $3 
                                        AND EXTRACT(YEAR FROM in_date) = $4`;

            await client.query(update_query, [employeename, workorder_no, month, year]);
        }

        res.status(200).send('Muster Data generated successfully');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while generating Muster Data');
    }
});
//////////////////////////////////////////////////////

/////////////////////////////////////////////////
//download muster roll
app.post('/download_muster_roll', async (req, res) => {
    try {
        const { workorder_no, monthyear } = req.body;

        // let smonthyear;
        // if (monthyear.length == 5) {
        //     smonthyear = `${monthyear}`;
        // }
        console.log("workorder_no", workorder_no);
        console.log("monthyear", monthyear);
        //console.log("smonthyear",smonthyear);
        const muster_roll_data_query = `SELECT e.id, es.statutory_total_ot ,wd.no_of_present_days, m.* 
                                        FROM muster_roll m
                                        JOIN employee e ON e.employeename = m.employeename
                                        JOIN employeewagestatutory es ON es.employeename = m.employeename
                                        JOIN workingdata wd ON m.employeename = wd.employeename 
                                        WHERE m.workorder_no = $1 
                                            AND m.monthyear = $2 
                                            AND es.work_orderno = $1 
                                            AND es.monthyear = $2
                                            AND wd.monthyear = $2
                                            AND wd.work_orderno = $1
                                        `;
        const muster_roll_data_query_result = await client.query(muster_roll_data_query, [workorder_no, monthyear]);
        const data = muster_roll_data_query_result.rows;
        console.log(data);
        // Call the function to generate Excel file
        await generatemuster_rollExcelFile(data, monthyear, workorder_no);

        // Send success response to the client
        res.send(`Muster roll downloaded successfully for work order no ${workorder_no}`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while downloading Muster Roll');
    }
});


//Function to genarate Muster Roll Excel file
async function generatemuster_rollExcelFile(data, monthyear, workorder_no) {
    try {
        const ExcelJS = require('exceljs'); // Importing ExcelJS module
        const path = require('path');
        const os = require('os');

        const templateFilePath = path.join(__dirname, '..', 'HRMS', 'src', 'templates', 'Muster_Roll.xlsx');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templateFilePath);

        const worksheet = workbook.getWorksheet(1);
        let i = 1;
        data.forEach((employee, index) => {
            const row = worksheet.getRow(index + 11); // Assuming data starts from the second row

            row.getCell('A').value = i;
            row.getCell('B').value = employee.employeename;
            row.getCell('C').value = employee.id;
            row.getCell('D').value = employee["01"];
            row.getCell('E').value = employee["02"];
            row.getCell('F').value = employee["03"];
            row.getCell('G').value = employee["04"];
            row.getCell('H').value = employee["05"];
            row.getCell('I').value = employee["06"];
            row.getCell('J').value = employee["07"];
            row.getCell('K').value = employee["08"];
            row.getCell('L').value = employee["09"];
            row.getCell('M').value = employee["10"];
            row.getCell('N').value = employee["11"];
            row.getCell('O').value = employee["12"];
            row.getCell('P').value = employee["13"];
            row.getCell('Q').value = employee["14"];
            row.getCell('R').value = employee["15"];
            row.getCell('S').value = employee["16"];
            row.getCell('T').value = employee["17"];
            row.getCell('U').value = employee["18"];
            row.getCell('V').value = employee["19"];
            row.getCell('W').value = employee["20"];
            row.getCell('X').value = employee["21"];
            row.getCell('Y').value = employee["22"];
            row.getCell('Z').value = employee["23"];
            row.getCell('AA').value = employee["24"];
            row.getCell('AB').value = employee["25"];
            row.getCell('AC').value = employee["26"];
            row.getCell('AD').value = employee["27"];
            row.getCell('AE').value = employee["28"];
            row.getCell('AF').value = employee["29"];
            row.getCell('AG').value = employee["30"];
            row.getCell('AH').value = employee["31"];
            row.getCell('AI').value = parseFloat(employee.no_of_present_days);
            row.getCell('AJ').value = parseFloat(employee.statutory_total_ot);
           
            // Add other cell values similarly

            // Add borders to the cells
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            i += 1;
        });

        const outputFilePath = path.join(os.homedir(), 'Downloads', `Muster_Roll_${workorder_no}_${monthyear}.xlsx`);
        await workbook.xlsx.writeFile(outputFilePath);
        console.log('Muster Roll generated successfully.');
    } catch (error) {
        console.error('Error generating Muster Roll:', error);
    }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Generate Declaration Form
app.post('/download_declaration_form', async (req, res) => {
    try {
        const { work_orderno, monthyear } = req.body;
        const declaration_form_query = `SELECT 
                                es.employeename,
                                es.earned_gross_total, 
                                es.earned_basic_da, 
                                e.uan_no, 
                                es.deduction_epf,
                                wd.no_of_present_days
                            FROM 
                                employeewagestatutory es
                            JOIN
                                workingdata wd ON es.employeename = wd.employeename AND es.monthyear = wd.monthyear
                            JOIN 
                                employee e 
                            ON 
                                e.employeename = es.employeename
                            WHERE 
                                es.work_orderno = $1 
                                AND es.monthyear = $2 `;

        const declaration_form_query_result = await client.query(declaration_form_query, [work_orderno, monthyear]);
        const data = declaration_form_query_result.rows;
        console.log(data);
        // Call the function to generate Excel file
        await generate_Declaration_Form_ExcelFile(data, monthyear, work_orderno);

        // Send success response to the client
        res.send(`Declaration Form downloaded successfully for work order no ${work_orderno}`);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while downloading Declaration Form');
    }
})

//Function to genarate Declaration FOrm Excel file
async function generate_Declaration_Form_ExcelFile(data, monthyear, workorder_no) {
    try {
        const ExcelJS = require('exceljs'); // Importing ExcelJS module
        const path = require('path');
        const os = require('os');

        const templateFilePath = path.join(__dirname, '..', 'HRMS', 'src', 'templates', 'declaration_form.xlsx');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templateFilePath);

        const worksheet = workbook.getWorksheet(1);
        let i = 1;
        data.forEach((employee, index) => {
            const row = worksheet.getRow(index + 8); // Assuming data starts from the second row

            row.getCell('B').value = i;
            row.getCell('C').value = employee.employeename;
            row.getCell('D').value = employee.no_of_present_days;
            row.getCell('E').value = employee.earned_gross_total;
            row.getCell('F').value = employee.earned_basic_da;
            row.getCell('G').value = employee.uan_no;
            row.getCell('H').value = employee.deduction_epf;
            row.getCell('I').value = employee.deduction_epf;
            row.getCell('J').value = "-";
            row.getCell('K').value = "423100/48/2025/101";

            // Add other cell values similarly

            // Add borders to the cells
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            i += 1;
        });

        const outputFilePath = path.join(os.homedir(), 'Downloads', `Declaration_Form_${workorder_no}_${monthyear}.xlsx`);
        await workbook.xlsx.writeFile(outputFilePath);
        console.log('Muster Roll generated successfully.');
    } catch (error) {
        console.error('Error generating Muster Roll:', error);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////////
//ACCOUNTIONG
//////////////////////////////////////////////////////////////////////////
//read data from google sheets and store in it the database
app.get('/advances-accounting', async (req, res) => {
    try {
        // Make an HTTP GET request to the URL of your deployed Google Apps Script web app
        const response = await axios.get('https://script.google.com/macros/s/AKfycbxT7altS9KtG_7lCcFLtMun_Kh_2guo7gZvSPD6VCsSWXk0wCcj1Gm2Xsy6NV-wVR05/exec');
        //console.log(response);
        // Assuming the data is structured as {data: [...]}, adjust as per your actual response structure
        const responseData = response.data.data;
        //console.log(responseData);
        // Iterate over the data and store each item in the database
        for (const data of responseData) {
            await StoreAdvanceData(data.FROM_NAME, data.TO_NAME, data.AMOUNT, data.DESCRIPTION, data.date);
        }
        res.send("Data Received from google sheet and store in the database Succesfully");
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred');
    }
});

async function StoreAdvanceData(From, To, Amount, Description, Date) {
    try {
        const from = From;
        const to = To;
        const amount = Amount;
        const description = Description;
        const date = Date; // Assuming currentDate() function returns the current date

        const checkfromdata = `SELECT name FROM accounting_users WHERE name = $1`;
        const checkfromdataresult = await client.query(checkfromdata, [from]);

        const checktodata = `SELECT name FROM accounting_users WHERE name = $1`;
        const checktodataresult = await client.query(checktodata, [to]);

        // if (checkfromdataresult.rows.length > 0) {

        //     const insertquery = `INSERT INTO accounting_debit(name, amount, description, date) VALUES ($1, $2, $3, $4)`;
        //     await client.query(insertquery, [from, amount, description, date]);

        // } else {
        //     const insertnewuser = `INSERT INTO accounting_users(name) VALUES ($1)`;
        //     await client.query(insertnewuser, [from]);

        //     const insertquery = `INSERT INTO accounting_debit(name, amount, description, date) VALUES ($1, $2, $3, $4)`;
        //     await client.query(insertquery, [from, amount, description, date]);
        // }

        // if (checktodataresult.rows.length > 0) {
        //     const insertquery = `INSERT INTO accounting_credit(name, amount, description, date) VALUES ($1, $2, $3, $4)`;
        //     await client.query(insertquery, [to, amount, description, date]);
        // }else{
        //     const insertnewuser = `INSERT INTO accounting_users(name) VALUES ($1)`;
        //     await client.query(insertnewuser, [to]);

        //     const insertquery = `INSERT INTO accounting_credit(name, amount, description, date) VALUES ($1, $2, $3, $4)`;
        //     await client.query(insertquery, [to, amount, description, date]);
        // }

        if (checkfromdataresult.rows.length > 0) {

            const insertquery = `INSERT INTO accounting_data(from_name, to_name, amount, description, ledger_Date ) VALUES ($1, $2, $3, $4, $5)`;
            await client.query(insertquery, [from, to, amount, description, date]);

        } else {
            const insertnewuser = `INSERT INTO accounting_users(name) VALUES ($1)`;
            await client.query(insertnewuser, [from]);

            const insertquery = `INSERT INTO accounting_data(from_name, to_name, amount, description, ledger_Date ) VALUES ($1, $2, $3, $4, $5)`;
            await client.query(insertquery, [from, to, amount, description, date]);
        }

        if (checktodataresult.rows.length === 0) {
            const insertnewuser = `INSERT INTO accounting_users(name) VALUES ($1)`;
            await client.query(insertnewuser, [to]);
        }

    } catch (error) {
        console.error('Error:', error);
        // Assuming res object is available in the scope where this function is used
        res.status(500).send('An error occurred');
    }
}

//Generate Accounting Ledger
// Function to fetch data from the database 
let opening_balance = 0;
async function fetchDataaccounting(ename, convertedDate) {
    try {
        const name = ename;
        const date = convertedDate;

        const openingbalancequery = `
            SELECT             
                COALESCE(SUM(CASE WHEN to_name = $1 THEN amount ELSE 0 END), 0) AS credit, 
                COALESCE(SUM(CASE WHEN from_name = $1 THEN amount ELSE 0 END), 0) AS debit
            FROM 
                accounting_data 
            WHERE 
                (from_name = $1 OR to_name = $1) AND ledger_Date < $2`;

        const resultopeningbalance = await client.query(openingbalancequery, [name, date]);
        opening_balance = resultopeningbalance.rows[0].credit - resultopeningbalance.rows[0].debit;

        const query = `
            SELECT 
                from_name, 
                to_name, 
                CASE WHEN to_name = $1 THEN amount ELSE NULL END AS credit, 
                CASE WHEN from_name = $1 THEN amount ELSE NULL END AS debit,
                description, 
                TO_CHAR(ledger_Date  AT TIME ZONE 'UTC', 'DD-MM-YYYY') AS date
            FROM 
                accounting_data 
            WHERE 
                (from_name = $1 OR to_name = $1) AND ledger_Date >= $2
            ORDER BY 
            ledger_Date `;

        const result = await client.query(query, [name, convertedDate]);

        if (resultopeningbalance.rows.length === 0 || result.rows.length === 0) {
            // Handle case where no rows are returned
            return [];
        }
        return result.rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

//Function to genarate FORM T
async function generateExcelFileAccounting(data, OutputFile, Name, Date) {
    try {
        const name = Name;
        const date = Date;
        const templateFilePath = path.join(__dirname, '..', 'HRMS', 'src', 'templates', 'ledger.xlsx');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templateFilePath);

        // Get the current user's downloads directory
        const downloadsPath = path.join(os.homedir(), 'Downloads');

        const worksheet = workbook.getWorksheet(1);
        // Assuming data is an array of accounting objects with 'debit' and 'credit' properties
        let totaldebit = 0;
        let totalcredit = 0;

        data.forEach((accounting) => {
            //opening_balance1 = accounting.opening_balance;
            totaldebit += accounting.debit || 0; // If 'debit' is undefined or null, add 0
            totalcredit += accounting.credit || 0; // If 'credit' is undefined or null, add 0
        });
        if (opening_balance > 0) {
            totalcredit += opening_balance;
        } else {
            totaldebit = totaldebit - opening_balance;
        }

        data.forEach((accounting, index) => {

            if (accounting.from_name === name) {
                accounting.from_name = '';
            }
            if (accounting.to_name === name) {
                accounting.to_name = '';
            }
            if (accounting.debit === null) {
                accounting.debit = '';
            }
            if (accounting.credit === null) {
                accounting.credit = '';
            }

            const row = worksheet.getRow(index + 9); // Assuming data starts from the eleventh row

            row.getCell('A').value = index + 2;
            row.getCell('B').value = accounting.date;
            row.getCell('C').value = accounting.from_name;
            row.getCell('D').value = accounting.to_name;
            row.getCell('E').value = accounting.debit;
            row.getCell('F').value = accounting.credit;

            // Assuming accounting.from_name contains the original value
            var fromName = accounting.description;
            // Converting the value to uppercase
            var uppercaseFromName = fromName.toUpperCase();

            row.getCell('G').value = uppercaseFromName;
            // Add borders to the cells
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // // Add employee.sitename for 3rd row and AF column
            worksheet.getCell('B8').value = date;
            if (opening_balance > 0) {
                worksheet.getCell('F8').value = opening_balance;
            } else {
                worksheet.getCell('E8').value = opening_balance;
            }
            worksheet.getCell('A3').value = name;
            worksheet.getCell('G4').value = totaldebit;
            worksheet.getCell('G5').value = totalcredit;
            worksheet.getCell('G6').value = totalcredit - totaldebit;


            // // Add employee.address for 5th row and AF column
            // worksheet.getCell('AF5').value = data[4].address;

        });
        // Save the modified workbook
        await workbook.xlsx.writeFile(OutputFile);

        //console.log(Form T generated successfully);
    } catch (error) {
        console.error('Error generating Ledger:', error);
    }
}

async function generateAccountingledger(data, ename, convertedDate) {
    try {
        const name = ename;
        const date = convertedDate;
        const outputDirectory = path.join(os.homedir(), 'Downloads');

        // Ensure the directory exists before writing the files
        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, { recursive: true });
        }

        // Generate Excel file
        const excelFilePath = join(outputDirectory, `${name}_ledger.xlsx`);
        await generateExcelFileAccounting(data, excelFilePath, name, date);
        console.log(`Excel file generated successfully: ${excelFilePath}`);
    } catch (error) {
        console.error('Error generating:', error);
    }
}
//for downloding ledger 
app.post('/generateAccountingLedger', async (req, res) => {
    try {
        const { ename, date } = req.body;
        const [day, month, year] = date.split('-');
        const convertedDate = `${year}-${month}-${day}`;

        const data = await fetchDataaccounting(ename, convertedDate);
        //console.log(data);
        // Call the main function to generate the pay slip
        await generateAccountingledger(data, ename, date);
        res.send('Ledger generated successfully!');

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while generating Ledger.');
    }
});

//read user names from database and send to frontend
app.get('/accountingusername', async (req, res) => {
    try {
        const { rows } = await client.query(`SELECT name FROM accounting_users ORDER BY name`);
        res.json(rows);
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//read accounting data from database and send to frontend
app.post('/accountingdata', async (req, res) => {
    try {
        const { ename, date } = req.body;
        const name = ename;
        const datetosend = date;
        const [day, month, year] = date.split('-');
        const convertedDate = `${year}-${month}-${day}`;

        const data = await fetchDataaccounting(ename, convertedDate);

        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(404).json({ error: 'No accounting data found' });
        }

        let debittotal = 0;
        let credittotal = 0;

        // Calculate debittotal and credittotal
        data.forEach((entry) => {
            if (entry.from_name === name) {
                entry.from_name = '';
            }
            if (entry.to_name === name) {
                entry.to_name = '';
            }
            if (entry.debit === null) {
                entry.debit = '';
            }
            if (entry.credit === null) {
                entry.credit = '';
            }
            // Assuming accounting.from_name contains the original value
            var description = entry.description;
            // Converting the value to uppercase
            var uppercasedescription = description.toUpperCase();

            entry.description = uppercasedescription;

            debittotal += entry.debit || 0; // If 'debit' is undefined or null, add 0
            credittotal += entry.credit || 0; // If 'credit' is undefined or null, add 0
        });

        credittotal += opening_balance;
        // Append debittotal and credittotal to the response data
        const responseData = {
            accountingData: data,
            debittotal: debittotal,
            credittotal: credittotal,
            opening_balance: opening_balance,
            datetosend: datetosend
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////
//testing
// call this api for wage calculation refresh 
app.post('/testingdat', async (req, res) => {
    try {
        const { employeename, monthyear, work_orderno } = req.body;
        // const getquery = `SELECT employeename FROM workingdata WHERE monthyear = $1 AND work_orderno = $2 AND status = $3
        //                     ORDER BY employeename`;
        // const getqueryresult = await client.query(getquery, [monthyear, work_orderno, 'WORKING']);

        //console.log(getqueryresult.rows);
        let i = 1;
        //forloop to await each calculations 
        //for (const data of getqueryresult.rows) {
        await calculateEmployeeWage(employeename, monthyear, work_orderno, res)
        await calculateEmployeeWagestatutory(employeename, monthyear, work_orderno, res);
        //console.log(data.employeename);
        //console.log("i = ",i);
        //i+=1;
        // }

        // Respond once all calculations are done
        res.status(200).send('Calculation done successfully');
    } catch (error) {
        console.error('Error calculating employee wage:', error.message);
        res.status(500).send('Internal Server Error');
    }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//***********************************************//PROJECT COSTING ************************************************************
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////
//master entries
// POST endpoint to create a new costing user
app.post('/costing_users', async (req, res) => {
    const { name, designation, contact_no } = req.body;

    if (!name || !designation || !contact_no) {
        return res.status(400).json({ error: 'Name, designation, and contact number are required' });
    }

    try {
        // Check if the user already exists
        const { rowCount } = await client.query('SELECT * FROM costing_users WHERE name = $1 AND designation = $2 AND contact_no = $3', [name, designation, contact_no]);
        if (rowCount > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Insert the new user
        await client.query('INSERT INTO costing_users (name, designation, contact_no) VALUES ($1, $2, $3)', [name, designation, contact_no]);
        return res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error while executing query:', error);
        return res.status(500).json({ error: 'Failed to create user' });
    }
});
/////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////  
// POST endpoint to insert data into the PurchaseItems table
app.post('/costing_master_purchase_items', async (req, res) => {
    try {
        const { itemname, specification } = req.body;

        if (!itemname || !specification) {
            return res.status(400).json({ error: 'Item Name and specification are required' });
        }

        // Query to insert data into the table
        const query = `
        INSERT INTO PurchaseItems (itemname, specification) 
        VALUES ($1, $2) `;

        // Execute the query with the provided values
        await client.query(query, [itemname, specification]);

        // Send a success response with the inserted data
        res.status(201).json({ success: true, message: "Data storeed Sucessfully" });
    } catch (error) {
        console.error('Error inserting costing purchase items data:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
//////////////////////////////////////////////////////////

// POST endpoint to insert data into the PurchaseItems table
app.post('/costing_master_capital_items', async (req, res) => {
    try {
        const { itemname, specification } = req.body;

        if (!itemname || !specification) {
            return res.status(400).json({ error: 'Item Name and specification are required' });
        }

        // Query to insert data into the table
        const query = `
        INSERT INTO costing_capital_items (itemname, specification) 
        VALUES ($1, $2)`;

        // Execute the query with the provided values
        await client.query(query, [itemname, specification]);

        // Send a success response with the inserted data
        res.status(201).json({ success: true, message: "Data storeed Sucessfully" });
    } catch (error) {
        console.error('Error inserting costing capital items data:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
//////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////
// Express route to handle POST requests to /costing purchase
app.post('/costing_purchase', async (req, res) => {
    try {
        const {
            emp_name,
            work_orderno,
            item_name,
            specification,
            quantity,
            unit_cost,
            total_cost,
            description,
            approved_by
        } = req.body;

        if (!emp_name || !work_orderno || !item_name || !specification || !quantity || !unit_cost || !total_cost || !description || !approved_by) {
            return res.status(400).json({ error: 'All Details required, Please Fill' });
        }

        // Get the current date
        const purchase_date = new Date(); // This will create a new Date object with the current date and time

        // Insert query
        const insertQuery = `
      INSERT INTO costing_purchase 
        (emp_name, work_orderno, item_name, specification, quantity, unit_cost, total_cost, description, purchase_date, approved_by)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;


        // Execute the insert query with values from request body
        await client.query(insertQuery, [
            emp_name,
            work_orderno,
            item_name,
            specification,
            quantity,
            unit_cost,
            total_cost,
            description,
            purchase_date,
            approved_by
        ]);

        // Send success response
        res.status(201).json({ success: true, message: "Purchase Data Stored Successfully" });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////
// Express route to handle POST requests to /costing capital
app.post('/costing_capital', async (req, res) => {
    try {
        const {
            emp_name,
            work_orderno,
            item_name,
            specification,
            quantity,
            unit_cost,
            total_cost,
            description,
            approved_by
        } = req.body;

        if (!emp_name || !work_orderno || !item_name || !specification || !quantity || !unit_cost || !total_cost || !description || !approved_by) {
            return res.status(400).json({ error: 'All Details required, Please Fill' });
        }

        // Get the current date
        const purchase_date = new Date(); // This will create a new Date object with the current date and time

        // Insert query
        const insertQuery = `
      INSERT INTO costing_capital 
        (emp_name, work_orderno, item_name, specification, quantity, unit_cost, total_cost, description, purchase_date, approved_by)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;


        // Execute the insert query with values from request body
        await client.query(insertQuery, [
            emp_name,
            work_orderno,
            item_name,
            specification,
            quantity,
            unit_cost,
            total_cost,
            description,
            purchase_date,
            approved_by
        ]);

        // Send success response
        res.status(201).json({ success: true, message: "Capital Data Stored Successfully" });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
//////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////
// Express route to handle POST requests to /costing material transport
app.post('/costing_material_transport', async (req, res) => {
    try {
        const {
            emp_name,
            work_orderno,
            transport_type,
            source,
            destination,
            vehicle_type,
            number_of_km,
            cost,
            description,
        } = req.body;

        if (!emp_name || !work_orderno || !transport_type || !source || !destination || !vehicle_type || !number_of_km || !number_of_km || !cost || !description) {
            return res.status(400).json({ error: 'All Details required, Please Fill' });
        }

        // Get the current date
        const entry_date = new Date(); // This will create a new Date object with the current date and time

        // Query to insert data into the table
        const query = `
        INSERT INTO costing_material_transport (
          emp_name,
          work_orderno,
          transport_type,
          source,
          destination,
          vehicle_type,
          number_of_km,
          cost,
          description,
          entry_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

        // Execute the query with the provided values
        await client.query(query, [
            emp_name,
            work_orderno,
            transport_type,
            source,
            destination,
            vehicle_type,
            number_of_km,
            cost,
            description,
            entry_date
        ]);

        // Send a success response
        res.status(201).json({ success: true, message: 'Matrial Transport Data stored successfully' });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
/////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////
// Express route to handle POST requests to administrative expenses
app.post('/costing_administrative_expenses', async (req, res) => {
    try {
        const {
            emp_name,
            work_orderno,
            expense_type,
            quantity,
            unit_cost,
            travel_type,
            vehicle_type,
            source,
            destination,
            number_of_km,
            cost,
            description,
        } = req.body;

        if (!emp_name || !work_orderno || !expense_type || !quantity || !unit_cost || !travel_type || !vehicle_type || !source
            || !destination || !number_of_km || !cost || !description) {
            return res.status(400).json({ error: 'All Details required, Please Fill' });
        }

        // Get the current date
        const entry_date = new Date(); // This will create a new Date object with the current date and time

        // Query to insert data into the table
        const query = `
        INSERT INTO costing_administrative_expenses  (
          emp_name,
          work_orderno,
          expense_type,
          quantity,
          unit_cost,
          travel_type,
          vehicle_type,
          source,
          destination,
          number_of_km,
          cost,
          description,
          entry_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;

        // Execute the query with the provided values
        await client.query(query, [
            emp_name,
            work_orderno,
            expense_type,
            quantity,
            unit_cost,
            travel_type,
            vehicle_type,
            source,
            destination,
            number_of_km,
            cost,
            description,
            entry_date
        ]);

        // Send a success response
        res.status(201).json({ success: true, message: 'Adminstrative expenses Data stored successfully' });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////
// Express route to handle POST requests to /costing salary
app.post('/costing_salary', async (req, res) => {
    try {
        const {
            emp_name,
            work_orderno,
            salary_month,
            salary_year,
            number_of_employees,
            total_cost,
            description,
            approved_by
        } = req.body;

        if (!emp_name || !work_orderno || !salary_month || !salary_year || !number_of_employees || !total_cost || !description || !approved_by) {
            return res.status(400).json({ error: 'All Details required, Please Fill' });
        }

        // Get the current date
        const entry_date = new Date(); // This will create a new Date object with the current date and time

        // Insert query
        const insertQuery = `
            INSERT INTO costing_salary 
            (emp_name, work_orderno, salary_month, salary_year, number_of_employees, total_cost, description, enrty_date, approved_by)
            VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;

        // Execute the insert query with values from request body
        await client.query(insertQuery, [
            emp_name,
            work_orderno,
            salary_month,
            salary_year,
            number_of_employees,
            total_cost,
            description,
            entry_date,
            approved_by
        ]);

        // Send success response
        res.status(201).json({ success: true, message: "Salary Data Stored Successfully" });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
//////////////////////////////////////////////////////////



///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//get apis*****************************************************************************************************************
/////////////////////////////////////////
//Express route to handle GET requests for costing master data
app.get('/costing_master_data', async (req, res) => {
    try {
        //retrieve purchase master data
        const master_pirchase_query = `SELECT * FROM PurchaseItems`;
        const master_pirchase_query_result = await client.query(master_pirchase_query);

        //retrieve capital master data
        const master_capital_query = `SELECT * FROM costing_capital_items`;
        const master_capital_query_result = await client.query(master_capital_query);

        //Combine rusults into a single JSON object
        const response = {
            master_purchase_data: master_pirchase_query_result.rows,
            master_capital_data: master_capital_query_result.rows
        }
        res.status(200).json(response);
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})
////////////////////////////////////////

/////////////////////////////////////////
//Express route to handle GET requests for costing user names
app.get('/costing_user_names', async (req, res) => {
    try {
        const user_names_query = `SELECT name FROM costing_users`;
        const user_names_query_result = await client.query(user_names_query);

        res.status(200).json(user_names_query_result.rows);

    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})
/////////////////////////////////////////
// Express route to handle GET requests for costing purchase item name and specification
app.get('/costing_purchase_item_name_spec', async (req, res) => {
    try {
        // Query to retrieve item names and specifications
        const query = `
            SELECT itemname, specification 
            FROM PurchaseItems
            ORDER BY itemname, specification;`;

        // Execute the query
        const result = await client.query(query);

        // Extract rows from the result
        const rows = result.rows;

        // Transform rows into object with grouped specifications
        const purchase_items = {};
        rows.forEach(row => {
            if (!purchase_items[row.itemname]) {
                purchase_items[row.itemname] = [];
            }
            purchase_items[row.itemname].push(row.specification);
        });

        // Send response with the combined results
        res.status(200).json(purchase_items);

    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
///////////////////////////////////////////

///////////////////////////////////////////
// Express route to handle GET requests for costing capital item name and specification
app.get('/costing_capital_item_name_spec', async (req, res) => {
    try {
        // Query to retrieve item names and specifications
        const query = `
            SELECT itemname, specification 
            FROM costing_capital_items
            ORDER BY itemname, specification;`;

        // Execute the query
        const result = await client.query(query);

        // Extract rows from the result
        const rows = result.rows;

        // Transform rows into object with grouped specifications
        const capital_items = {};
        rows.forEach(row => {
            if (!capital_items[row.itemname]) {
                capital_items[row.itemname] = [];
            }
            capital_items[row.itemname].push(row.specification);
        });

        // Send response with the combined results
        res.status(200).json(capital_items);

    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
//////////////////////////////////////////

/////////////////////////////////////////
//Express route to handle GET requests for costing tables /purchase /capital /material transport /administrative expenses /salary
app.get('/costing_table_entries', async (req, res) => {
    try {
        //query to retrieve costing salary entries
        const purchase_query = `
            SELECT 
                *, TO_CHAR(purchase_date AT TIME ZONE 'UTC', 'DD-MM-YYYY')  AS purchase_date 
            FROM 
                costing_purchase
            ORDER BY 
                purchase_id DESC`;
        const purchase_query_result = await client.query(purchase_query);

        //query to retrieve costing salary entries
        const capital_query = `
            SELECT 
                *, TO_CHAR(purchase_date AT TIME ZONE 'UTC', 'DD-MM-YYYY')  AS purchase_date 
            FROM 
                costing_capital
            ORDER BY 
                capital_id DESC`;
        const capital_query_result = await client.query(capital_query);

        //query to retrieve costing material transport entries
        const material_transport_query = `
            SELECT 
                *, TO_CHAR(entry_date AT TIME ZONE 'UTC', 'DD-MM-YYYY')  AS entry_date 
            FROM 
                costing_material_transport
            ORDER BY 
                trasport_id DESC`;
        const material_transport_query_result = await client.query(material_transport_query);

        //query to retrieve costing material transport entries
        const administrative_expenses_query = `
            SELECT 
                *, TO_CHAR(entry_date AT TIME ZONE 'UTC', 'DD-MM-YYYY')  AS entry_date 
            FROM 
                costing_administrative_expenses
            ORDER BY 
                administrative_id DESC`;
        const administrative_expenses_query_result = await client.query(administrative_expenses_query);

        //query to retrieve costing salary entries
        const salary_query = `
            SELECT 
                *, TO_CHAR(enrty_date AT TIME ZONE 'UTC', 'DD-MM-YYYY')  AS enrty_date 
            FROM 
                costing_salary
            ORDER BY 
                salary_id DESC`;
        const salary_query_result = await client.query(salary_query);

        //Combine rusults into a single JSON object
        const response = {
            purchase_data: purchase_query_result.rows,
            capital_data: capital_query_result.rows,
            salary_data: salary_query_result.rows,
            material_transport_data: material_transport_query_result.rows,
            administrative_expenses: administrative_expenses_query_result.rows
        }

        res.status(200).json(response);

    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/////////////////////////////////////////

/////////////////////////////////////////
/*Express route to handle GET requests for costing charts /purchase /capital /material transport /administrative expenses /salary
to filter month wise total purchase*/
app.get('/costing_data_chart', async (req, res) => {
    try {
        //satrt point to retrieve purchase data chart************************************
        const get_data_query_purchase = `
        SELECT 
            work_orderno,
            SUM(total_cost) AS total_purchase_amount,
            ARRAY_AGG(DISTINCT TO_CHAR(purchase_date AT TIME ZONE 'UTC', 'MM-YYYY')) AS purchase_month 
        FROM 
            costing_purchase
        GROUP BY 
            EXTRACT(MONTH FROM purchase_date AT TIME ZONE 'UTC'),EXTRACT(YEAR FROM purchase_date AT TIME ZONE 'UTC'), work_orderno`;;

        const get_data_query_purchase_result = await client.query(get_data_query_purchase);

        const purchase_data_chart = {};

        // Loop through each row in the result
        get_data_query_purchase_result.rows.forEach(row => {
            const purchase_work_orderno = row.work_orderno;
            const purchase_month = row.purchase_month;
            const total_purchase_amount = row.total_purchase_amount;

            // Check if the work order number already exists in the chart data
            if (!purchase_data_chart[purchase_work_orderno]) {
                // If not, initialize an empty object for it
                purchase_data_chart[purchase_work_orderno] = {};
            }

            // Assign the total_purchase_amount to the corresponding purchase_month
            purchase_data_chart[purchase_work_orderno][purchase_month] = total_purchase_amount;
        });
        //end point to retrieve purchase data chart************************************

        //satrt point to retrieve capital data chart************************************
        const get_data_query_capital = `
        SELECT 
            work_orderno AS work_orderno_capital,
            SUM(total_cost) AS total_capital_amount,
            ARRAY_AGG(DISTINCT TO_CHAR(purchase_date AT TIME ZONE 'UTC', 'MM-YYYY')) AS capital_purchase_month 
        FROM 
            costing_capital
        GROUP BY 
            EXTRACT(MONTH FROM purchase_date AT TIME ZONE 'UTC'),EXTRACT(YEAR FROM purchase_date AT TIME ZONE 'UTC'), work_orderno`;;

        const get_data_query_capital_result = await client.query(get_data_query_capital);

        const capital_data_chart = {};

        // Loop through each row in the result
        get_data_query_capital_result.rows.forEach(row => {
            const capital_work_orderno = row.work_orderno_capital;
            const capital_purchase_month = row.capital_purchase_month;
            const total_capital_amount = row.total_capital_amount;

            // Check if the work order number already exists in the chart data
            if (!capital_data_chart[capital_work_orderno]) {
                // If not, initialize an empty object for it
                capital_data_chart[capital_work_orderno] = {};
            }

            // Assign the total_purchase_amount to the corresponding purchase_month
            capital_data_chart[capital_work_orderno][capital_purchase_month] = total_capital_amount;
        });
        //End point to retrieve capital data chart ************************************

        //satrt point to retrieve Material Transport data chart************************************
        const get_data_query_material = `
        SELECT 
            work_orderno AS work_orderno_material_transport,
            SUM(cost) AS total_material_transport_amount,
            ARRAY_AGG(DISTINCT TO_CHAR(entry_date AT TIME ZONE 'UTC', 'MM-YYYY')) AS material_transport_entry_month 
        FROM 
            costing_material_transport
        GROUP BY 
            EXTRACT(MONTH FROM entry_date AT TIME ZONE 'UTC'),EXTRACT(YEAR FROM entry_date AT TIME ZONE 'UTC'), work_orderno`;;

        const get_data_query_material_result = await client.query(get_data_query_material);

        const material_transport_data_chart = {};

        // Loop through each row in the result
        get_data_query_material_result.rows.forEach(row => {
            const material_transport_work_orderno = row.work_orderno_material_transport;
            const material_transport_purchase_month = row.material_transport_entry_month;
            const total_material_transport_amount = row.total_material_transport_amount;

            // Check if the work order number already exists in the chart data
            if (!material_transport_data_chart[material_transport_work_orderno]) {
                // If not, initialize an empty object for it
                material_transport_data_chart[material_transport_work_orderno] = {};
            }

            // Assign the total_purchase_amount to the corresponding purchase_month
            material_transport_data_chart[material_transport_work_orderno][material_transport_purchase_month] = total_material_transport_amount;
        });
        //End point to retrieve Material Transport data chart ************************************

        //satrt point to retrieve Administrative Expenses data chart************************************
        const get_data_query_administrative_expenses = `
        SELECT 
            work_orderno AS work_orderno_administrative_expenses,
            SUM(cost) AS total_administrative_expenses_amount,
            ARRAY_AGG(DISTINCT TO_CHAR(entry_date AT TIME ZONE 'UTC', 'MM-YYYY')) AS administrative_expenses_entry_month 
        FROM 
            costing_administrative_expenses
        GROUP BY 
            EXTRACT(MONTH FROM entry_date AT TIME ZONE 'UTC'),EXTRACT(YEAR FROM entry_date AT TIME ZONE 'UTC'), work_orderno`;;

        const get_data_query_administrative_expenses_result = await client.query(get_data_query_administrative_expenses);

        const administrative_expenses_data_chart = {};

        // Loop through each row in the result
        get_data_query_administrative_expenses_result.rows.forEach(row => {
            const administrative_expenses_work_orderno = row.work_orderno_administrative_expenses;
            const administrative_expenses_purchase_month = row.administrative_expenses_entry_month;
            const total_administrative_expenses_amount = row.total_administrative_expenses_amount;

            // Check if the work order number already exists in the chart data
            if (!administrative_expenses_data_chart[administrative_expenses_work_orderno]) {
                // If not, initialize an empty object for it
                administrative_expenses_data_chart[administrative_expenses_work_orderno] = {};
            }

            // Assign the total_purchase_amount to the corresponding purchase_month
            administrative_expenses_data_chart[administrative_expenses_work_orderno][administrative_expenses_purchase_month] = total_administrative_expenses_amount;
        });
        //End point to retrieve Administrative Expenses data chart ************************************

        //Combine rusults into a single JSON object
        const response = {
            purchase_data_chart: purchase_data_chart,
            capital_data_chart: capital_data_chart,
            matrial_trasport_data_chart: material_transport_data_chart,
            administrative_expenses_data_chart: administrative_expenses_data_chart
        }

        res.status(200).json(response); // Sending the result back to the client
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ error: 'Internal server error' }); // Sending an error response
    }
});
///////////////////////////////////////////

//////////////////////////////////////////
//Express route to handle GET requests for costing  /purchase /capital unit price difference as compared to two specified months
app.post('/costing_price_difference', async (req, res) => {
    try {
        //console.log('Request Body:', req.body);  // Log the request body

        const { from_month1, to_month2, year } = req.body;

        // Check if the selected months are the same
        if (to_month2 === from_month1 || from_month1 > to_month2) {
            res.status(400).send("Please select different months for comparison.");
            return;
        }

        const month_names = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

        const month1 = month_names[from_month1 - 1];
        const month2 = month_names[to_month2 - 1];

        // Purchase table price difference query
        const purchase_price_difference_query = `
        WITH ${month2}_data AS (
            SELECT 
                item_name,
                specification,
                AVG(unit_cost) AS avg_unit_cost_${month2}
            FROM 
                costing_purchase
            WHERE 
                EXTRACT(MONTH FROM purchase_date) = ${from_month1} AND EXTRACT(YEAR FROM purchase_date) = ${year}
            GROUP BY 
                item_name, 
                specification
        ),
        ${month1}_data AS (
            SELECT 
                item_name,
                specification,
                AVG(unit_cost) AS avg_unit_cost_${month1} 
            FROM 
                costing_purchase
            WHERE 
                EXTRACT(MONTH FROM purchase_date) = ${to_month2} AND EXTRACT(YEAR FROM purchase_date) = ${year}
            GROUP BY 
                item_name, 
                specification
        )
        SELECT 
        ${month1}_data.item_name,
        ${month1}_data.specification,
        ${month1}_data.avg_unit_cost_${month1},
            COALESCE(${month2}_data.avg_unit_cost_${month2}, 0) AS avg_unit_cost_${month2},
            (${month1}_data.avg_unit_cost_${month1} - COALESCE(${month2}_data.avg_unit_cost_${month2},${month1}_data.avg_unit_cost_${month1})) AS cost_difference
        FROM 
        ${month1}_data
        LEFT JOIN 
            ${month2}_data
        ON 
        ${month1}_data.item_name = ${month2}_data.item_name 
            AND ${month1}_data.specification = ${month2}_data.specification
        ORDER BY 
        ${month1}_data.item_name, 
        ${month1}_data.specification;
        `;
        const purchase_price_difference_query_result = await client.query(purchase_price_difference_query);

        // Capital price difference query
        const capital_price_difference_query = `
        WITH ${month2}_data AS (
            SELECT 
                item_name,
                specification,
                AVG(unit_cost) AS avg_unit_cost_${month2}
            FROM 
                costing_capital
            WHERE 
                EXTRACT(MONTH FROM purchase_date) = ${from_month1} AND EXTRACT(YEAR FROM purchase_date) = ${year}
            GROUP BY 
                item_name, 
                specification
        ),
        ${month1}_data AS (
            SELECT 
                item_name,
                specification,
                AVG(unit_cost) AS avg_unit_cost_${month1} 
            FROM 
                costing_capital
            WHERE 
                EXTRACT(MONTH FROM purchase_date) = ${to_month2} AND EXTRACT(YEAR FROM purchase_date) = ${year}
            GROUP BY 
                item_name, 
                specification
        )
        SELECT 
        ${month1}_data.item_name,
        ${month1}_data.specification,
        ${month1}_data.avg_unit_cost_${month1},
            COALESCE(${month2}_data.avg_unit_cost_${month2}, 0) AS avg_unit_cost_${month2},
            (${month1}_data.avg_unit_cost_${month1} - COALESCE(${month2}_data.avg_unit_cost_${month2},${month1}_data.avg_unit_cost_${month1})) AS cost_difference
        FROM 
        ${month1}_data
        LEFT JOIN 
            ${month2}_data
        ON 
        ${month1}_data.item_name = ${month2}_data.item_name 
            AND ${month1}_data.specification = ${month2}_data.specification
        ORDER BY 
        ${month1}_data.item_name, 
        ${month1}_data.specification`;

        const capital_price_difference_query_result = await client.query(capital_price_difference_query);

        // Combine results into a single JSON object
        const response = {
            purchase_price_diffrence_data: purchase_price_difference_query_result.rows,
            capital_price_diffrence_data: capital_price_difference_query_result.rows
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

///////////////////////////////////////////////
const bodyParser = require('body-parser');
const { ConversationPage } = require('twilio/lib/rest/conversations/v1/conversation');
const { default: ClientCapability } = require('twilio/lib/jwt/ClientCapability');
app.use(bodyParser.json());

const upload = multer({ dest: 'uploads/' });

app.post('/mergepdf', upload.fields([{ name: 'file1[]' }, { name: 'file2[]' }, { name: 'file3[]' }]), async (req, res) => {
    const { month, year } = req.body;
    const files1 = req.files['file1[]'];
    const files2 = req.files['file2[]'];
    const files3 = req.files['file3[]'] || [];

    try {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        const monthName = monthNames[month - 1];

        const downloadsPath = path.join(os.homedir(), 'Downloads');

        const getNormalizedEmployeeNameFromFile = (filename, format) => {
            let regexPattern;
            if (format === 1) {
                regexPattern = new RegExp(`VES001_(.+)_${monthName}_${year}_R`, 'i'); // Pattern for file1
            } else if (format === 2) {
                regexPattern = new RegExp(`(.+)_VES001_${monthName}_${year}`, 'i'); // Pattern for file2
            } else if (format === 3) {
                regexPattern = new RegExp(`(.+)`, 'i'); // Pattern for file3
            }
            const match = filename.match(regexPattern);
            console.log(`Matching filename: ${filename} with pattern ${regexPattern}`);
            return match ? match[1].replace(/[_ ]/g, '').trim().toLowerCase() : null;
        };

        const matchedFiles = [];

        files1.forEach(file1 => {
            const file1Name = path.basename(file1.originalname);
            const employeeName1 = getNormalizedEmployeeNameFromFile(file1Name, 1);
            console.log(`Employee name from file1: ${employeeName1}`);
            if (employeeName1) {
                const correspondingFile2 = files2 ? files2.find(file2 => {
                    const file2Name = path.basename(file2.originalname);
                    const employeeName2 = getNormalizedEmployeeNameFromFile(file2Name, 2);
                    return employeeName2 && employeeName2.includes(employeeName1);
                }) : null;

                const correspondingFile3 = files3 ? files3.find(file3 => {
                    const file3Name = path.basename(file3.originalname);
                    const employeeName3 = getNormalizedEmployeeNameFromFile(file3Name, 3);
                    return employeeName3 && employeeName3.includes(employeeName1);
                }) : null;

                if (correspondingFile2 || correspondingFile3) {
                    matchedFiles.push({
                        file1Path: file1.path,
                        file2Path: correspondingFile2 ? correspondingFile2.path : null,
                        file3Path: correspondingFile3 ? correspondingFile3.path : null,
                        employeeName: employeeName1
                    });
                    console.log(`Matched files for employee: ${employeeName1}`);
                }
            }
        });

        if (matchedFiles.length === 0) {
            console.log('No matching files found across all folders');
            return res.status(400).send({ success: false, message: 'No matching files found across all folders' });
        }

        const mergedFolderPath = path.join(downloadsPath, `Employee_mergedfiles_${monthName}_${year}`);
        if (!fs.existsSync(mergedFolderPath)) {
            fs.mkdirSync(mergedFolderPath, { recursive: true });
        }

        for (const { file1Path, file2Path, file3Path, employeeName } of matchedFiles) {
            console.log(`Processing files for employee: ${employeeName}`);
            const file1Bytes = fs.readFileSync(file1Path);
            const file2Bytes = file2Path ? fs.readFileSync(file2Path) : null;
            const file3Bytes = file3Path ? fs.readFileSync(file3Path) : null;

            const pdfDoc1 = await PDFLibDocument.load(file1Bytes);
            const mergedPdf = await PDFLibDocument.create();

            const pages1 = await mergedPdf.copyPages(pdfDoc1, pdfDoc1.getPageIndices());
            pages1.forEach(page => mergedPdf.addPage(page));

            if (file2Bytes) {
                const pdfDoc2 = await PDFLibDocument.load(file2Bytes);
                const pages2 = await mergedPdf.copyPages(pdfDoc2, pdfDoc2.getPageIndices());
                pages2.forEach(page => mergedPdf.addPage(page));
            }

            if (file3Bytes) {
                const pdfDoc3 = await PDFLibDocument.load(file3Bytes);
                const pages3 = await mergedPdf.copyPages(pdfDoc3, pdfDoc3.getPageIndices());
                pages3.forEach(page => mergedPdf.addPage(page));
            }

            const mergedFilePath = path.join(mergedFolderPath, `${employeeName.replace(/ /g, '_').toUpperCase()}.pdf`);
            const mergedPdfBytes = await mergedPdf.save();
            fs.writeFileSync(mergedFilePath, mergedPdfBytes);

            console.log(`Merged PDF saved at: ${mergedFilePath}`);

            fs.unlinkSync(file1Path);
            if (file2Path) fs.unlinkSync(file2Path);
            if (file3Path) fs.unlinkSync(file3Path);
        }

        res.status(200).send({ success: true, message: 'PDF files merged and downloaded successfully' });
    } catch (error) {
        console.error('Error merging PDF files:', error);
        res.status(500).send({ success: false, message: 'Error merging PDF files', error: error.message });
    }
});



///////////////////////////////////////
// POST endpoint to convert Word file to PDF
app.post('/convert', async (req, res) => {
    try {
        const { filePath } = req.body;

        if (!filePath) {
            return res.status(400).json({ error: "File path is required." });
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "File not found." });
        }

        // Read the Word file
        const wordFile = fs.readFileSync(filePath);

        // Convert Word file to HTML
        const { value } = await mammoth.convertToHtml({ buffer: wordFile });

        // Convert HTML to PDF
        pdf.create(value, { format: 'Letter' }).toFile(`${filePath.split('.docx')[0]}.pdf`, (err, result) => {
            if (err) {
                console.error("Error converting file:", err);
                return res.status(500).json({ error: "Error converting file." });
            }
            res.json({ success: true, pdfFilePath: result.filename });
        });
    } catch (error) {
        console.error("Error converting file:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


/////////////////////////////////////////////////////////////////////////////////////////////////////
//Generate Form T REFERENCE
// Function to fetch data from the database 
async function fetchDataRefFormT(Month, Year, WorkOrderno) {
    try {

        //const [month, year] = MonthYear.split('-').map(Number); // Extract month and year from the provided format
        const month = Month;
        const year = Year;
        // Convert month and year to strings and concatenate them
        const monthyear = month.toString() + year.toString();

        const workorderno = WorkOrderno;


        const query = `
                    SELECT 
                    e.id, 
                    e.employeename, 
                    wd.no_of_days_in_month, 
                    wd.ref_fixed_basic_da,
                    wd.ref_fixed_hra,
                    wd.ref_fixed_food_allowance,
                    wd.ref_fixed_site_allowance,
                    wd.ref_fixed_mobile_allowance,
                    wd.ref_fixed_gross_salary,
                    wd.ref_fixed_weekday_ot_price,
                    wd.ref_fixed_sunday_ot_price,
                    wd.no_of_present_days,
                    wd.national_festival_holiday,
                    (wd.no_of_present_days + wd.national_festival_holiday) AS payable_days, 
                    (wd.weekday_no_of_hours_overtime + wd.nagativeot) AS weekday_no_of_hours_overtime,
                    wd.sunday_holiday_no_of_hours_overtime,
                    (wd.weekday_no_of_hours_overtime + wd.sunday_holiday_no_of_hours_overtime) AS total_no_of_hours_overtime,
                    erf.earned_basic_da, 
                    erf.earned_hra, 
                    erf.earned_food_allowance, 
                    erf.earned_site_allowance, 
                    erf.mobile_allowance,
                    erf.earned_ot_wage,
                    erf.earned_others,
                    erf.earned_gross_total,
                    erf.deduction_wcp,
                    erf.deduction_epf, 
                    erf.deduction_pt, 
                    erf.deduction_incometax, 
                    erf.deduction_salary_advance_company,
                    erf.deduction_salary_advance_thirdparty, 
                    erf.deduction_fines_damages_loss, 
                    erf.deduction_others,
                    erf.deduction_total, 
                    erf.net_salary,
                    w.address,
                    w.sitename
                FROM 
                    employeewagereference erf
                JOIN 
                    employee e ON e.employeename = erf.employeename
                JOIN 
                    workingdata wd ON e.employeename = wd.employeename AND wd.monthyear = erf.monthyear AND wd.work_orderno = erf.work_orderno
                JOIN 
                    workorderdata w ON w.workorderno = wd.work_orderno
                WHERE 
                    erf.monthyear = $1 AND wd.work_orderno = $2 AND erf.work_orderno = $2
                ORDER BY 
                    e.employeename`;

        const result = await client.query(query, [monthyear, workorderno]); // Pass month, year, and WorkOrderNo to the query
        return result.rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

//Function to genarate FORM T
async function generateRefExcelFile(data, OutputFile) {
    try {
        const templateFilePath = path.join(__dirname, '..', 'HRMS', 'src', 'templates', 'ACTUAL_FORM_T.xlsx');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templateFilePath);

        // Get the current user's downloads directory
        const downloadsPath = path.join(os.homedir(), 'Downloads');

        const worksheet = workbook.getWorksheet(1);
        let i = 1;
        data.forEach((employee, index) => {
            const row = worksheet.getRow(index + 3); // Assuming data starts from the eleventh row
            console.log(employee);
            row.getCell('A').value = index + 1;
            row.getCell('B').value = employee.employeename;
            row.getCell('C').value = employee.id;
            row.getCell('D').value = employee.ref_fixed_basic_da;
            row.getCell('E').value = employee.ref_fixed_hra;
            row.getCell('F').value = employee.ref_fixed_food_allowance;
            row.getCell('G').value = employee.ref_fixed_site_allowance;
            row.getCell('H').value = employee.ref_fixed_gross_salary;
            row.getCell('I').value = employee.no_of_present_days;
            row.getCell('J').value = employee.national_festival_holiday;
            row.getCell('K').value = employee.payable_days;
            row.getCell('L').value = employee.total_no_of_hours_overtime;

            row.getCell('M').value = employee.earned_basic_da;
            row.getCell('N').value = employee.earned_hra;
            row.getCell('O').value = employee.earned_food_allowance;
            row.getCell('P').value = employee.earned_site_allowance;
            row.getCell('Q').value = employee.earned_ot_wage;
            row.getCell('R').value = employee.earned_others;
            row.getCell('S').value = employee.earned_gross_total;

            row.getCell('T').value = employee.deduction_wcp;
            row.getCell('U').value = employee.deduction_epf;
            row.getCell('V').value = employee.deduction_pt;
            row.getCell('W').value = employee.deduction_incometax;
            row.getCell('X').value = employee.deduction_salary_advance_company;
            row.getCell('Y').value = employee.deduction_salary_advance_thirdparty;
            row.getCell('Z').value = employee.deduction_fines_damages_loss;
            row.getCell('AA').value = employee.deduction_others;
            row.getCell('AB').value = employee.deduction_total;
            row.getCell('AC').value = employee.net_salary;
            


            
            // Add borders to the cells
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            i++;

        });
        // Save the modified workbook
        await workbook.xlsx.writeFile(OutputFile);

        //console.log(Form T generated successfully);
    } catch (error) {
        console.error('Error generating Form T:', error);
    }
}

async function generateRefFormT(data, Month, Year, workorderno) {
    try {

        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const [month, year] = [Month, Year];

        // Convert month to its corresponding name
        const monthName = monthNames[month - 1]; // Adjusting for 0-based array index

        const outputDirectory = path.join(os.homedir(), 'Downloads');

        // Ensure the directory exists before writing the files
        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, { recursive: true });
        }

        // Generate Excel file
        const excelFilePath = path.join(outputDirectory, `FORM_T_${monthName}_${year}_${workorderno}.xlsx`);
        await generateRefExcelFile(data, excelFilePath);
        console.log(`Excel file generated successfully: ${excelFilePath}`);
    } catch (error) {
        console.error('Error generating attendance reports:', error);
    }
}

app.post('/generateFormTRef', async (req, res) => {
    try {
        const { month, year, workorderno } = req.body;

        console.log(month);
        console.log(year);
        console.log(workorderno);

        const data = await fetchDataRefFormT(month, year, workorderno);

        // Call the main function to generate the pay slip
        await generateRefFormT(data, month, year, workorderno);

        res.send(`FORM T generated successfully! for the Work Order No. : ${workorderno}`);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while generating FORM T.');
    }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////
var name="Shankar k";
module.exports=client;