const path = require('path')
const tmp = require('tmp')
const { Storage } = require('@google-cloud/storage')
const shell = require('shelljs')
const log = require('../../logging')

module.exports = {
  recordVideo,
}

const storage = new Storage({
  keyFilename: path.resolve(__dirname, '../../logging-service-account.json'),
})
const bucket = storage.bucket('feeder-88e0a.appspot.com')

recordVideo()

async function recordVideo() {
  const { dirPath, cleanup } = await withTempDir()
  try {
    const fileName = `${new Date().toISOString()}.mp4`
    const filePath = path.resolve(dirPath, fileName)
    log.debug(`Camera capturing video to: ${filePath}`)
    await shell.exec(
      `ffmpeg -t 10 -f v4l2 -framerate 30 -video_size 1280x720 -c:v mjpeg -i /dev/video0 -f mp4 -vcodec h264_omx -r 30 -b:v 2M -maxrate 2M -bufsize 3M "${filePath}"`
    )

    const storagePath = `videos/${fileName}`
    log.debug(`Uploading to: ${storagePath}`)
    await bucket.upload(filePath, { destination: storagePath })

    // await firebase
    //   .storage()
    //   .ref(`captures/${fileName}`)
    //   .put('???')
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

        resolve({ dirPath, cleanup })
      }
    )
  })
}
