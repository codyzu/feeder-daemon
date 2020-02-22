'use strict'

const commands = require('./commands')
const log = require('./logging')

module.exports = doCommandWork

async function doCommandWork(commandDocument) {
  log.info('Running command', {commandDocument})

  if (
    commandDocument.expiresAt !== undefined &&
    commandDocument.expiresAt.toDate() < new Date()
  ) {
    log.warn('Command expired', {commandDocument})
    return {
      isExpired: true,
    }
  }

  try {
    if (commands[commandDocument.command] === undefined) {
      throw new Error(`Command ${commandDocument.command} not found`)
    }

    const result = await commands[commandDocument.command](
      commandDocument.options
    )

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
