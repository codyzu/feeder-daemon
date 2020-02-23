'use strict'

module.exports = {
  addShutdownTask,
  shutdown,
}

const tasks = []

function addShutdownTask(task) {
  tasks.push(task)
}

function shutdown() {
  tasks.reverse().forEach(task => task())
}
