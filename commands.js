'use strict'

module.exports = {
  feed,
  console: consoleLog,
  wave,
}

let motor

function getMotor() {
  if (motor === undefined) {
    motor = require('./motor')
  }

  return motor
}

async function feed({isForward = true, speed = 500, duration = 0} = {}) {
  console.log('FEEDING:', isForward, speed, duration)
}

async function consoleLog({message = ''} = {}) {
  console.log('CONSOLE COMMAND:', message)
}

async function wave() {
  try {
    await getMotor().move(20, true, 500)
    await getMotor().move(20, false, 500)
    // Await getMotor().move(200, false, 100)
  } catch (error) {
    throw error
  } finally {
    getMotor().stop()
  }
}
