const functions = require('firebase-functions');
const app = require('express')();
const auth = require('./util/auth');

const { db } = require('./util/admin');

const firebase = require('firebase');
const config = require('./util/config');

firebase.initializeApp(config);

const { getAllPosts, newPost } = require('./handlers/posts');
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
} = require('./handlers/users');

// Scream routes
app.get('/posts', getAllPosts);
app.post('/post', auth, newPost);

// users routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/me/image', auth, uploadImage);
// app.post('/me', auth, addUserDetails);

exports.api = functions.region('us-east1').https.onRequest(app);
