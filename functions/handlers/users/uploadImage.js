const { admin, db } = require('../../util/admin');

module.exports = (req, res) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  let imageFileName;
  let imageToBeUploaded = {};

  const busboy = new BusBoy({ headers: req.headers });
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    // ? Splits the filename and retrieves the extension
    const imageExtension = filename.split('.').slice(-1)[0];
    if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
      return res.status(400).json({ error: `Invalid file format.` });
    }

    // ? Generates a random string and concatenates the extension
    imageFileName = `${Math.random()
      .toString(36)
      .substring(2, 15)}`
      .concat(
        `${Math.random()
          .toString(36)
          .substring(2, 15)}`
      )
      .concat(`.${imageExtension}`);

    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = {
      filepath,
      mimetype,
    };
    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on('finish', () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          contentType: imageToBeUploaded.mimetype,
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
          config.storageBucket
        }/o/${imageFileName}?alt=media`;
        return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: 'Image upload successful' });
      })
      .catch(err => {
        return res
          .status(500)
          .json({ error: `Something went wrong... ${err.code}` });
      });
  });
  busboy.end(req.rawBody);
};
