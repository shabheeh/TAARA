
const express = require('express');
const session = require('express-session');
const nocache = require('nocache');
require('dotenv').config();
const passport = require('./passport');
const { v4: uuidv4 } = require('uuid');
const dbConnect = require('./Middlewares/dbConnect')
const adminRoute = require("./Routes/adminRoute");
const userRoute = require("./Routes/userRoute");
const path = require('path');


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
dbConnect() 




// bodyparser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// set View engine
app.set("view engine", "ejs");

// Admin_Routes
app.use('/admin', adminRoute);

// User_Routes 
app.use('/', userRoute);

app.use('*' , ( req, res ) => {
    res.render(path.join(__dirname, './Views/User/404.ejs'))
})

const port = process.env.PORT; 

app.listen(port, () => {
    console.log(`Listening to the server on http://localhost:${port}`);
}); 
  