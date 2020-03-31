const path = require('path')
const tmp = require('tmp')
const {Storage} = require('@google-cloud/storage')
const shell = require('shelljs')
const firebase = require('firebase')
const {nanoid} = require('nanoid')
const log = require('../../logging')

module.exports = {
  captureVideo,
  captureImage,
}

const storage = new Storage({
  keyFilename: path.resolve(__dirname, '../../logging-service-account.json'),
})
const bucket = storage.bucket('feeder-88e0a.appspot.com')

async function captureVideo() {
  return capture({
    fileExentsion: '.mp4',
    generateCaptureCommand: filePath =>
      `ffmpeg -t 10 -f v4l2 -framerate 30 -video_size 1280x720 -c:v mjpeg -i /dev/video0 -f mp4 -vcodec h264_omx -r 30 -b:v 3M -maxrate 3M -bufsize 6M "${filePath}"`,
    storageBasePath: 'videos',
    documentKey: 'lastVideo',
  })
}

async function captureImage() {
  return capture({
    fileExentsion: '.jpg',
    // --skip 30 to let the webcam stablize and focus before capturing the image
    generateCaptureCommand: filePath =>
      `fswebcam --resolution 1280x720 --skip 30 --jpeg 85 "${filePath}"`,
    storageBasePath: 'images',
    documentKey: 'lastImage',
  })
}

async function capture({
  fileExentsion,
  generateCaptureCommand,
  storageBasePath,
  documentKey,
}) {
  const {dirPath, cleanup} = await withTempDir()
  try {
    const fileName = `${nanoid()}${fileExentsion}`
    const filePath = path.resolve(dirPath, fileName)
    log.debug(`Capturing: ${filePath}`)
    await shell.exec(generateCaptureCommand(filePath))

    const storagePath = `${storageBasePath}/${fileName}`
    log.debug(`Uploading to: ${storagePath}`)
    await bucket.upload(filePath, {destination: storagePath})

    const updates = {[documentKey]: storagePath}
    log.debug(`Updating feeder document`, {updates})
    await updateFeederDocument(updates)
  } finally {
    cleanup()
  }
}

function withTempDir() {
  return new Promise((resolve, reject) => {
    tmp.dir(
      {
        unsafeCleanup: true,
        prefix: 'capture_',
      },
      (err, dirPath, cleanup) => {
        if (err) {
          return reject(err)
        }

        resolve({dirPath, cleanup})
      }
    )
  })
}

function updateFeederDocument(updates) {
  const {uid} = firebase.auth().currentUser
  return firebase
    .firestore()
    .doc(`feeders/${uid}`)
    .update(updates)
}
