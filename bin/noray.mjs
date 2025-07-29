import { Noray } from '../src/noray.mjs'

const noray = new Noray()
noray.start()

process.on('exit', () => noray.shutdown())
process.on('SIGINT', () => noray.shutdown())
