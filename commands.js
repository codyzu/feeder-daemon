'use strict'

const motor = require('./motor')

module.exports = {
  feed,
  console: consoleLog,
  wave,
}

async function feed({isForward = true, speed = 500, duration = 0} = {}) {
  console.log('FEEDING:', isForward, speed, duration)
}

async function consoleLog({message = ''} = {}) {
  console.log('CONSOLE COMMAND:', message)
}

async function wave() {
  try {
    await motor.move(20, true, 500)
    await motor.move(20, false, 500)
    // Await getMotor().move(200, false, 100)
  } catch (error) {
    throw error
  } finally {
    motor.stop()
  }
}
