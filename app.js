const express = require('express');
const path = require('path');
const app = express();
const PORT = 4000;

// Removed the redundant declaration of the port variable
// const port = 4000;

// Ensure serverConfig is used if necessary
const serverConfig = require('./server'); // Uncomment this line if serverConfig is used somewhere in the app

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
