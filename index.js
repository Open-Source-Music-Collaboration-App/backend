const express = require('express');
const app = express();

const PORT = process.env.PORT || 3333;

app.get('/', (req, res) => {
    res.send('Hello World');
});

const server = app.listen(PORT, () => {
  console.log("server is running on port", server.address().port);
});