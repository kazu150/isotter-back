const fs = require('fs');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const timelineRoutes = require('./routes/timeline');
const adminRoutes = require('./routes/admin');

const app = express();

const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'),
    {flags: 'a'}
);

app.use(helmet());
app.use(compression());
app.use(morgan('combined', {stream: accessLogStream}));

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString() + '-' + file.originalname)
    }
})

const fileFilter = (req, file, cb) => {
    if(
        file.mimetype === 'image/png' || 
        file.mimetype === 'image/jpg' || 
        file.mimetype === 'image/jpeg'
    ){
        cb(null, true);
    } else {
        cb(null, false);
    }
}

// app.use(bodyParser.urlencoded()); ←これはjson以外(form)のときに使う
app.use(bodyParser.json());
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('thumb'));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000, https://isotter.netlify.app/');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.use( '/timeline', timelineRoutes );
app.use( '/admin', adminRoutes );

app.use((error, req, res, next) => {
    console.log('サーバーサイドエラー:' + error)
    res.status(error.status || 500).json({
        errorMessage: error.message || なんかのエラー
    })
})

mongoose.connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.g5fjc.gcp.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?retryWrites=true&w=majority`
).
then(result => {
    app.listen(process.env.PORT || 8080);
})
.catch(err => console.log(err));