const { db } = require('../../util/admin');

module.exports = (req, res) => {
  if (req.body.body.trim() === '') {
    return res.status(400).json({ body: 'Body must not be empty' });
  }

  const newPost = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
  };

  db.collection('posts')
    .add(newPost)
    .then(doc => {
      const resPost = newPost;
      resPost.postId = doc.id;
      res.status(201).json(resPost);
    })
    .catch(err => {
      res.status(500).json({ error: 'something went wrong' });
      console.error(err);
    });
};
