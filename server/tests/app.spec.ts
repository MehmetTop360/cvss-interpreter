import supertest from 'supertest'
import { afterAll, it } from 'vitest'
import createApp from '../src/app'
import { createTestDatabase } from './utils/database'

const database = await createTestDatabase()
const app = createApp(database)

afterAll(() => {
  database.destroy()
})

it('can launch the app', async () => {
  await supertest(app).get('/health').expect(200, 'OK')
})
