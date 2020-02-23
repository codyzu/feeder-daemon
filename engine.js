'use strict'

const commands = require('./commands')
const log = require('./logging')

module.exports = doCommandWork

async function doCommandWork(command) {
  log.info('Running command', {command})

  if (
    command.expiresAt !== undefined &&
    command.expiresAt.toDate() < new Date()
  ) {
    log.warn('Command expired', {command})
    return {
      isExpired: true,
    }
  }

  try {
    if (commands[command.command] === undefined) {
      throw new Error(`Command ${command.command} not found`)
    }

    const result = await commands[command.command](command.options)

    log.debug('Command executed successfully')

    if (result !== undefined) {
      return {
        ...result,
        isSuccess: true,
      }
    }

    return {
      isSuccess: true,
    }
  } catch (error) {
    log.error('Command error', error)
    return {
      isSuccess: false,
      error: error.stack,
    }
  }
}
