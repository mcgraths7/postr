const functions = require('firebase-functions');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');
const express = require('express');

const app = express();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.get('/posts', (request, response) => {
  admin
    .firestore()
    .collection('posts')
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

  admin
    .firestore()
    .collection('posts')
    .add(newPost)
    // eslint-disable-next-line promise/always-return
    .then(doc => {
      response
        .status(200)
        .json({ message: `Document: ${doc.id} created successfully.` });
    })
    .catch(err => {
      response.status(500).json({ error: `Something went wrong... ${err}` });
    });
});

exports.api = functions.region('us-east1').https.onRequest(app);
