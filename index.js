
const mongoose  = require("mongoose");
const express = require('express');
const session = require('express-session');
const nocache = require('nocache');
const bodyParser = require('body-parser')
require('dotenv').config();
const passport = require('./passport');


const { v4: uuidv4 } = require('uuid');



const app = express();



//session 
app.use(session({
    secret: uuidv4(),
    resave: true,
    saveUninitialized: true
}));
 
app.use(nocache());

app.use(passport.initialize());
app.use(passport.session());

 
//db connect
mongoose.connect(process.env.DB_HOST, {
}).then(() => {
    console.log('Connected to the database');
}).catch((error) => {
    console.log('Database connection error:', error);
});

 




// bodyparser
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: false }));


// Admin_Routes
const adminRoute = require("./Routes/adminRoute");
app.use('/admin', adminRoute);



// User_Routes 
const userRoute = require("./Routes/userRoute");
app.use('/', userRoute);



const port = process.env.PORT; 

app.listen(port, () => {
    console.log(`Listening to the server on http://localhost:${port}`);
}); 
  