'use strict'

module.exports = {
  addShutdownTask,
  shutdown,
}

const tasks = []

function addShutdownTask(task) {
  tasks.unshift(task)
}

function shutdown() {
  tasks.forEach(task => task())
}
