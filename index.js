'use strict'

const update = require('./update')
const logging = require('./logging')

logging.info('Checking for updates')
update()

logging.info('Starting daemon')
require('./daemon')()
