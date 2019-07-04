const { reduceUserDetails } = require('../../util/validators');
const { db } = require('../../util/admin');

module.exports = (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({
        message: `Successfully updated user ${req.user.handle}`,
      });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
