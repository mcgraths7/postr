const firebase = require('firebase');

const { validateLoginData } = require('../../util/validators');

module.exports = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  const { isValid, errors } = validateLoginData(user);

  if (!isValid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return res.json({ token });
    })
    .catch(err => {
      console.error(err);
      return res
        .status(403)
        .json({ general: 'Wrong credentials, please try again' });
    });
};
