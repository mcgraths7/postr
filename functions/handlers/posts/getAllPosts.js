const { db } = require('../../util/admin');

module.exports = (req, res) => {
  db.collection('posts')
    .orderBy('createdAt', 'desc')
    .get()
    .then(data => {
      let posts = [];
      data.forEach(doc => {
        posts.push({
          postId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
        });
      });
      return res.json(posts);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
