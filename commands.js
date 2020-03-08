'use strict'

const shell = require('shelljs')
const shutdown = require('./shutdown')
const motor = require('./motor')
const log = require('./logging')

module.exports = {
  feed,
  console: consoleLog,
  wave,
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
  return () => {
    shutdown.shutdown()
  }
}

async function rebootSystem() {
  log.debug('Reboot System command')
  return () => {
    shutdown.shutdown()
    shell.exec('reboot')
  }
}

async function shutdownSystem() {
  log.debug('Shutdown System command')
  return () => {
    shutdown.shutdown()
    shell.exec('shutdown -h now')
  }
}
