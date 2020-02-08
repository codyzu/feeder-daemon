'use strict'

const {Gpio} = require('pigpio')
const delay = require('delay')

module.exports = {
  move,
  ramp,
  stop,
}

const motor = new Gpio(27, {mode: Gpio.OUTPOUT})

async function stop() {
  console.log('Stop')
  motor.servoWrite(0)
}

async function move(time = 200, forward = true, speed = 30) {
  const fromZero = speed * (forward ? 1 : -1)
  const pulse = 1500 + fromZero
  console.log(pulse)
  motor.servoWrite(pulse)
  return delay(time)
}

async function ramp(time = 1000, forward = true) {
  const step = 10
  const interval = 50
  const multiplier = forward ? 1 : -1
  const inBounds = forward
    ? val => (val > 2000 ? 2000 : val)
    : val => (val < 1000 ? 1000 : val)

  const stepsLength = time / interval

  const steps = [...new Array(stepsLength).keys()]

  await steps.reduce(async prev => {
    const prevPulse = await prev
    const pulse = inBounds(prevPulse + step * multiplier)
    // Const pulse = (prevPulse + step) > maxSpeed ? maxSpeed : (prevPulse + step);
    console.log(pulse)
    motor.servoWrite(pulse)
    await delay(interval)
    return pulse
  }, 1500)
}
