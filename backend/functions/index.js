const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const firebase = require('firebase');

const firebaseConfig = {
  apiKey: 'AIzaSyAx-q9UOGbHAmex5_u1gkgvnlLD4E8YSCA',
  authDomain: 'postr-7e7e0.firebaseapp.com',
  databaseURL: 'https://postr-7e7e0.firebaseio.com',
  projectId: 'postr-7e7e0',
  storageBucket: 'postr-7e7e0.appspot.com',
  messagingSenderId: '353182075833',
  appId: '1:353182075833:web:9a2af7e6dd6621f5',
};

const app = express();

// ? There was an issue that required a service account to be added
const serviceAccount = require('./serviceAccount.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
// ? Initialize Firebase with above config
firebase.initializeApp(firebaseConfig);

// ? Create a local db object for reference

const db = admin.firestore();

// * CRUD Routes for Posts

app.get('/posts', (request, response) => {
  db.collection('posts')
    .orderBy('createdAt', 'desc')
    .get()
    .then(data => {
      let posts = [];
      data.forEach(doc => {
        posts.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          updatedAt: doc.data().updatedAt,
        });
      });
      return response.status(200).json(posts);
    })
    .catch(err => {
      response.status(500).json({ error: `Something went wrong... ${err}` });
      console.error(err);
    });
});

app.post('/post', (request, response) => {
  const newPost = {
    userHandle: request.body.userHandle,
    body: request.body.body,
    createdAt: new Date().toISOString(),
  };

  db.collection('posts')
    .add(newPost)
    // eslint-disable-next-line promise/always-return
    .then(doc => {
      response
        .status(200)
        .json({ message: `Document: ${doc.id} created successfully.` });
    })
    .catch(err => {
      console.error(err);
      response.status(500).json({ error: `Something went wrong... ${err}` });
    });
});

// * CRUD Routes for Users

app.post('/signup', (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle,
  };
  // TODO: Validate form inputs
  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return response
          .status(400)
          .json({ handle: `This handle is already taken` });
      }
      return firebase
        .auth()
        .createUserWithEmailAndPassword(newUser.email, newUser.password);
    })
    .then(data => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(userToken => {
      token = userToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId,
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return response.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        return response.status(400).json({ error: `Email is already in use` });
      } else {
        return response
          .status(500)
          .json({ error: `Something went wrong... ${err}` });
      }
    });
});

exports.api = functions.region('us-east1').https.onRequest(app);
