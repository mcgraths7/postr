const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const firebase = require('firebase');
const Sentry = require('@sentry/node');

const app = express();

// ? Initialize Sentry error tracking

Sentry.init({
  dsn: 'https://a673b46e84ef4235bbf4682aab7c7025@sentry.io/1496470',
});

app.use(Sentry.Handlers.requestHandler());

require('./firebaseconfig.js');

// ? There was an issue that required a service account to be added
const serviceAccount = require('./serviceAccount.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
// ? Initialize Firebase with above config
firebase.initializeApp(firebaseConfig);

// ? Create a local db object for reference

const db = admin.firestore();

// ? Helper functions

const isEmpty = string => {
  return string.trim() === '';
};

const isValidEmail = email => {
  // ? This regex matches valid emails
  const validEmailFormat = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return validEmailFormat.test(email);
};

const isStrongPassword = password => {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
  return strongRegex.test(password);
};

// ? Middleware functions

const authenticate = (request, response, next) => {
  let userToken;
  if (
    request.headers.authorization &&
    request.headers.authorization.startsWith('Bearer ')
  ) {
    userToken = request.headers.authorization = request.headers.authorization.split(
      'Bearer '
    )[1];
  } else {
    Sentry.captureEvent('Unauthorized Request');
    return response.status(403).json('Unauthorized');
  }
  return admin
    .auth()
    .verifyIdToken(userToken)
    .then(decodedToken => {
      request.user = decodedToken;
      console.log(decodedToken);
      return db
        .collection('users')
        .where('userId', '==', request.user.uid)
        .limit(1)
        .get();
    })
    .then(data => {
      request.user.handle = data.docs[0].data().handle;
      return next();
    })
    .catch(err => {
      Sentry.captureEvent(err);
      return response.status(403).json(err);
    });
};

// * CRUD Routes for Posts

app.get('/posts', authenticate, (request, response) => {
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
      Sentry.captureEvent(err);
      return response
        .status(500)
        .json({ error: `Something went wrong... ${err.code}` });
    });
});

app.post('/post', authenticate, (request, response) => {
  if (request.body.body.trim() === '') {
    Sentry.captureEvent('Body must have some content');
    return response.status(400).json({ body: `body must not be empty` });
  }

  const newPost = {
    userHandle: request.user.handle,
    body: request.body.body,
    createdAt: new Date().toISOString(),
  };

  return db
    .collection('posts')
    .add(newPost)
    .then(doc => {
      return response
        .status(200)
        .json({ message: `Document: ${doc.id} created successfully.` });
    })
    .catch(err => {
      Sentry.captureEvent(err);
      return response
        .status(500)
        .json({ error: `Something went wrong... ${err.code}` });
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

  let errors = {};

  if (isEmpty(newUser.email)) {
    errors.email = 'must not be empty';
  } else if (!isValidEmail(newUser.email)) {
    errors.email = 'must be valid';
  }

  if (isEmpty(newUser.password)) {
    errors.password = 'must not be empty';
  } else if (!isStrongPassword(newUser.password)) {
    errors.password =
      'must contain the following: 1 digit, 1 uppercase character, 1 lowercase character, at be least 8 characters long';
  } else if (newUser.password !== newUser.confirmPassword) {
    errors.password = 'passwords must match';
  }

  if (isEmpty(newUser.handle)) {
    errors.handle = 'must not be empty';
  }

  if (Object.keys(errors).length > 0) {
    response.status(400).json(errors);
  }

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
      Sentry.captureEvent(err);
      if (err.code === 'auth/email-already-in-use') {
        return response.status(400).json({ error: `Email is already in use` });
      } else {
        return response
          .status(500)
          .json({ error: `Something went wrong... ${err.code}` });
      }
    });
});

app.post('/login', (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password,
  };

  let errors = {};

  if (isEmpty(user['email'])) {
    errors.email = 'must not be empty';
  }

  if (isEmpty(user['password'])) {
    errors.password = 'must not be empty';
  }

  if (Object.keys(errors).length > 0) {
    return response.status(400).json(errors);
  }

  return firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return response.json({ token });
    })
    .catch(err => {
      Sentry.captureEvent(err);
      if (err.code === 'auth/wrong-password') {
        return response
          .status(403)
          .json({ general: 'incorrect email/password' });
      } else {
        return response
          .status(500)
          .json({ error: `Something went wrong... ${err.code}` });
      }
    });
});

app.use(Sentry.Handlers.errorHandler());

exports.api = functions.region('us-east1').https.onRequest(app);
