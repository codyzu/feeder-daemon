'use strict'

const path = require('path')
const tmp = require('tmp')
const firebase = require('firebase')
const shell = require('shelljs')
const shutdown = require('./shutdown')
const motor = require('./motor')
const log = require('./logging')

module.exports = {
  feed,
  console: consoleLog,
  wave,
  recordVideo,
  exit,
  reboot: rebootSystem,
  shutdown: shutdownSystem,
}

async function feed({isForward = true, speed = 500, duration = 1000} = {}) {
  log.debug('Feed command', {isForward, speed, duration})
  try {
    await motor.move(duration, isForward, speed)
  } finally {
    motor.stop()
  }
}

async function consoleLog({message = ''} = {}) {
  log.info('Console log command', {commandMessage: message})
}

async function wave() {
  log.debug('Wave command')
  try {
    await motor.move(20, true, 500)
    await motor.move(20, false, 500)
    // Await getMotor().move(200, false, 100)
  } finally {
    motor.stop()
  }
}

async function exit() {
  log.debug('Exit command')
  return {
    postSave: () => {
      shutdown.shutdown()
    },
  }
}

async function rebootSystem() {
  log.debug('Reboot System command')
  return {
    postSave: () => {
      shutdown.shutdown()
      shell.exec('reboot')
    },
  }
}

async function shutdownSystem() {
  log.debug('Shutdown System command')
  return {
    postSave: () => {
      shutdown.shutdown()
      shell.exec('shutdown -h now')
    },
  }
}

async function recordVideo() {
  log.debug('Record video command')
  const {dirPath, cleanup} = await withTempDir()
  try {
    const fileName = `${new Date().toString()}.mp4`
    const filePath = path.resolve(dirPath, fileName)
    await shell.exec(
      `ffmpeg -t 10 -f v4l2 -framerate 30 -video_size 1280x720 -c:v mjpeg -i /dev/video0 -f mp4 -vcodec h264_omx -r 30 -b:v 1M -maxrate 1M -bufsize 2M "${filePath}"`
    )
    await firebase
      .storage()
      .ref(`captures/${fileName}`)
      .put('???')
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
